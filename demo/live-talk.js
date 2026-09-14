import WebSocket from "ws";

export const LIVE_MODEL = "gpt-live-1";
export const LIVE_BACKEND = "gpt-5.6-terra";
export const LIVE_VOICE = "marin";
export const LIVE_RATE_HZ = 16_000;

const LIVE_URL = "wss://api.openai.com/v1/live/sessions";
const CHUNK_SAMPLES = 640;
const SILENCE_MS = 900;
const REPLY_IDLE_MS = 1600;
const START_TIMEOUT_MS = 12_000;
const REPLY_TIMEOUT_MS = 45_000;
const ENERGY_RMS = 0.01;

export function liveConfig() {
  return {
    enabled: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_LIVE_MODEL ?? LIVE_MODEL,
    backend: process.env.OPENAI_LIVE_BACKEND ?? LIVE_BACKEND,
    voice: process.env.OPENAI_LIVE_VOICE ?? LIVE_VOICE,
    rateHz: LIVE_RATE_HZ,
  };
}

export function requireApiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY missing");
  }
  return key;
}

export async function talkTurn(pcm16k, options = {}) {
  if (!(pcm16k instanceof Int16Array) || pcm16k.length === 0) {
    throw new Error("pcm");
  }
  const key = requireApiKey();
  const cfg = liveConfig();
  const pace = options.pace !== false;
  const chunks = [];
  const inputParts = [];
  const outputParts = [];
  const eventTypes = [];

  const ws = new WebSocket(LIVE_URL, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  const started = onceType(ws, "session.started", START_TIMEOUT_MS, eventTypes);
  await openSocket(ws);
  ws.send(
    JSON.stringify({
      type: "session.start",
      session: {
        model: cfg.model,
        instructions:
          "You are Tater, a talking potato on a canvas. After the caller finishes speaking, always reply out loud in one or two short sentences. Be warm and a little absurd. Do not mention APIs, models, or keys.",
        audio: {
          format: { type: "audio/pcm", rate: LIVE_RATE_HZ },
          output: { voice: cfg.voice },
        },
        delegation: {
          type: "responses",
          responses: {
            model: cfg.backend,
          },
        },
      },
    }),
  );
  await started;

  const reply = collectReply(ws, eventTypes, inputParts, outputParts, chunks);
  try {
    await sendPaced(ws, pcm16k, pace);
    await sendSilence(ws, pace);
    reply.arm();
    const outputPcm = await reply.promise;
    await closeSession(ws);
    return {
      pcm: outputPcm,
      userText: inputParts.join(""),
      replyText: outputParts.join(""),
      events: eventTypes,
    };
  } catch (error) {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.terminate();
    }
    throw error;
  }
}

function openSocket(ws) {
  return new Promise((resolve, reject) => {
    const fail = (error) => {
      ws.off("open", ok);
      reject(error instanceof Error ? error : new Error("websocket"));
    };
    const ok = () => {
      ws.off("error", fail);
      resolve();
    };
    ws.once("open", ok);
    ws.once("error", fail);
  });
}

function onceType(ws, type, timeoutMs, eventTypes) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      reject(new Error(`timeout waiting for ${type}`));
    }, timeoutMs);
    const onMessage = (raw) => {
      const event = parseEvent(raw);
      if (event === null) {
        return;
      }
      eventTypes.push(event.type);
      if (event.type === "error") {
        clearTimeout(timer);
        ws.off("message", onMessage);
        reject(new Error(errorMessage(event)));
        return;
      }
      if (event.type === type) {
        clearTimeout(timer);
        ws.off("message", onMessage);
        resolve(event);
      }
    };
    ws.on("message", onMessage);
  });
}

function collectReply(ws, eventTypes, inputParts, outputParts, chunks) {
  let arm = () => {};
  const promise = new Promise((resolve, reject) => {
    let armed = false;
    let energySamples = 0;
    let idle = null;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout waiting for reply audio"));
    }, REPLY_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timer);
      if (idle !== null) {
        clearTimeout(idle);
      }
      ws.off("message", onMessage);
      ws.off("error", onError);
    };

    const scheduleIdle = () => {
      if (!armed || energySamples === 0) {
        return;
      }
      if (idle !== null) {
        clearTimeout(idle);
      }
      idle = setTimeout(finish, REPLY_IDLE_MS);
    };

    const finish = () => {
      cleanup();
      if (energySamples === 0) {
        reject(new Error("no reply audio"));
        return;
      }
      resolve(concatPcm(chunks));
    };

    arm = () => {
      if (armed) {
        return;
      }
      armed = true;
      scheduleIdle();
    };

    const onError = (error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error("websocket"));
    };

    const onMessage = (raw) => {
      const event = parseEvent(raw);
      if (event === null) {
        return;
      }
      eventTypes.push(event.type);
      if (event.type === "error") {
        cleanup();
        reject(new Error(errorMessage(event)));
        return;
      }
      const inputText = transcriptText(event, "session.input_transcript.delta");
      if (inputText !== "") {
        inputParts.push(inputText);
      }
      const outputText = transcriptText(event, "session.output_transcript.delta");
      if (outputText !== "") {
        outputParts.push(outputText);
      }
      if (event.type === "session.output_audio.delta" && typeof event.delta === "string") {
        const chunk = pcmFromBase64(event.delta);
        chunks.push(chunk);
        if (chunkRms(chunk) >= ENERGY_RMS) {
          energySamples += chunk.length;
          scheduleIdle();
        }
      }
      if (event.type === "session.closed" && armed) {
        finish();
      }
    };

    ws.on("message", onMessage);
    ws.once("error", onError);
  });
  return { promise, arm };
}

async function sendPaced(ws, pcm, pace) {
  for (let offset = 0; offset < pcm.length; offset += CHUNK_SAMPLES) {
    const slice = pcm.subarray(offset, offset + CHUNK_SAMPLES);
    sendAudio(ws, slice);
    if (pace) {
      await sleep((slice.length / LIVE_RATE_HZ) * 1000);
    }
  }
}

async function sendSilence(ws, pace) {
  const quiet = new Int16Array(Math.round((SILENCE_MS / 1000) * LIVE_RATE_HZ));
  await sendPaced(ws, quiet, pace);
}

function sendAudio(ws, pcm) {
  const bytes = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  ws.send(
    JSON.stringify({
      type: "session.input_audio.append",
      audio: bytes.toString("base64"),
    }),
  );
}

function closeSession(ws) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      resolve();
    };
    const timer = setTimeout(done, 4_000);
    const onMessage = (raw) => {
      const event = parseEvent(raw);
      if (event?.type === "session.closed") {
        done();
      }
    };
    ws.on("message", onMessage);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "session.close" }));
    } else {
      done();
    }
  });
}

function parseEvent(raw) {
  const text = typeof raw === "string" ? raw : raw.toString();
  try {
    const event = JSON.parse(text);
    if (event && typeof event === "object" && typeof event.type === "string") {
      return event;
    }
  } catch {
    return null;
  }
  return null;
}

function transcriptText(event, type) {
  if (event.type !== type) {
    return "";
  }
  if (typeof event.delta === "string") {
    return event.delta;
  }
  if (event.delta && typeof event.delta === "object" && typeof event.delta.text === "string") {
    return event.delta.text;
  }
  if (typeof event.transcript === "string") {
    return event.transcript;
  }
  if (typeof event.text === "string") {
    return event.text;
  }
  return "";
}

export function chunkRms(pcm) {
  if (!(pcm instanceof Int16Array) || pcm.length === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) {
    const sample = (pcm[i] ?? 0) / 32768;
    sum += sample * sample;
  }
  return Math.sqrt(sum / pcm.length);
}

function errorMessage(event) {
  if (event.error && typeof event.error === "object" && typeof event.error.message === "string") {
    return event.error.message;
  }
  if (typeof event.message === "string") {
    return event.message;
  }
  return "live error";
}

function pcmFromBase64(b64) {
  const buf = Buffer.from(b64, "base64");
  const even = buf.byteLength - (buf.byteLength % 2);
  return new Int16Array(buf.buffer, buf.byteOffset, even / 2);
}

function concatPcm(parts) {
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Int16Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
