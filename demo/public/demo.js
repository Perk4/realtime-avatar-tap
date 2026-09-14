import {
  assertContinuous,
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "/dist/index.js";
import { HEIGHT, WIDTH, paintAvatar, sceneFromBlock } from "/lib/avatar-scene.js";
import { canvasGfx } from "/lib/canvas-gfx.js";
import {
  BLOCK_MS,
  WINDOW_SAMPLES,
  downsampleTo16k,
  floatsToPcm16,
  mixToMono,
  pcm16ToFloat,
} from "/lib/pcm.js";
import { encodePcm16Wav } from "/lib/wav.js";

const canvas = document.querySelector("#avatar");
const statusEl = document.querySelector("#status");
const blockEl = document.querySelector("#block");
const llmEl = document.querySelector("#llm");
const userEl = document.querySelector("#user-text");
const replyEl = document.querySelector("#reply-text");
const playButton = document.querySelector("#play-fixture");
const micButton = document.querySelector("#use-mic");
const stopButton = document.querySelector("#stop");
const continuityButton = document.querySelector("#assert-continuous");

canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext("2d");
if (ctx === null) {
  throw new Error("canvas");
}
const gfx = canvasGfx(ctx);

let run = null;
let live = null;

playButton.addEventListener("click", () => {
  void startFixture();
});
micButton.addEventListener("click", () => {
  void startMic();
});
stopButton.addEventListener("click", () => {
  void stopAndTalk();
});
continuityButton.addEventListener("click", () => {
  try {
    const { before, after } = assertContinuous();
    statusEl.textContent = `assertContinuous ok: t0 ${before.t0Ms} → ${after.t0Ms}`;
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "assertContinuous failed";
  }
});

drawIdle();
void loadStatus();

async function loadStatus() {
  const response = await fetch("/api/status");
  live = await response.json();
  if (live?.enabled) {
    llmEl.textContent = `${live.model} → ${live.backend} (${live.voice})`;
    statusEl.textContent = "idle. Play fixture or use mic. Tater speaks the reply.";
  } else {
    llmEl.textContent = "OPENAI_API_KEY missing on server";
    statusEl.textContent = "idle. Conversation needs OPENAI_API_KEY.";
  }
}

async function startFixture() {
  await abortRun();
  try {
    statusEl.textContent = "sending fixture as user speech";
    const wav = await fetch("/fixture.wav").then((res) => {
      if (!res.ok) {
        throw new Error("fixture.wav missing");
      }
      return res.arrayBuffer();
    });
    await converse(new Blob([wav], { type: "audio/wav" }));
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "fixture failed";
  }
}

async function startMic() {
  await abortRun();
  try {
    await startMicUnsafe();
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "mic failed";
  }
}

async function startMicUnsafe() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true },
    video: false,
  });
  const audio = new AudioContext();
  const workletUrl = URL.createObjectURL(
    new Blob(
      [
        `class TapMic extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) this.port.postMessage(channel.slice());
    return true;
  }
}
registerProcessor("tap-mic", TapMic);`,
      ],
      { type: "application/javascript" },
    ),
  );
  await audio.audioWorklet.addModule(workletUrl);
  URL.revokeObjectURL(workletUrl);
  const node = new AudioWorkletNode(audio, "tap-mic");
  await audio.resume();
  const source = audio.createMediaStreamSource(stream);
  const silent = audio.createGain();
  silent.gain.value = 0;
  source.connect(node);
  node.connect(silent);
  silent.connect(audio.destination);
  const pending = [];
  node.port.onmessage = (event) => {
    if (run === null || run.kind !== "mic") {
      return;
    }
    pending.push(floatsToPcm16(downsampleTo16k(event.data, audio.sampleRate)));
  };
  run = { kind: "mic", audio, stream, pending, stopped: false };
  statusEl.textContent = "listening. Stop to send the turn. Mouth waits for Tater.";
}

async function stopAndTalk() {
  if (run === null || run.kind !== "mic") {
    await abortRun();
    return;
  }
  const pending = run.pending;
  await abortRun();
  const pcm = concatPcm(pending);
  if (pcm.length === 0) {
    statusEl.textContent = "no mic audio";
    return;
  }
  try {
    statusEl.textContent = "sending your speech";
    await converse(new Blob([encodePcm16Wav(pcm, 16_000)], { type: "audio/wav" }));
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "talk failed";
  }
}

async function converse(wavBlob) {
  const response = await fetch("/api/talk", { method: "POST", body: wavBlob });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "talk failed");
  }
  userEl.textContent = payload.userText || "(unrecognized)";
  replyEl.textContent = payload.replyText || "(no transcript)";
  const pcm = pcmFromBase64(payload.wavBase64);
  statusEl.textContent = "Tater speaking";
  await playReply(pcm);
  statusEl.textContent = "reply finished";
}

async function playReply(pcm) {
  const audio = new AudioContext();
  await audio.resume();
  const buffer = audio.createBuffer(1, pcm.length, 16_000);
  buffer.getChannelData(0).set(pcm16ToFloat(pcm));
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  const session = openSession({ audioIn: "reply", videoOut: "avatar" });
  run = {
    kind: "reply",
    audio,
    source,
    session,
    timer: 0,
    stopped: false,
    windowsEmitted: 0,
  };
  source.start();
  await pumpPcm(run, pcm, audio.currentTime);
}

function pumpPcm(current, pcm, startedAt) {
  return new Promise((resolve) => {
    const tick = () => {
      if (run !== current || current.stopped) {
        resolve();
        return;
      }
      const elapsedMs = (current.audio.currentTime - startedAt) * 1000;
      const windowsDue = Math.floor(elapsedMs / BLOCK_MS) + 1;
      while (current.windowsEmitted < windowsDue) {
        const offset = current.windowsEmitted * WINDOW_SAMPLES;
        if (offset >= pcm.length) {
          void current.audio.close();
          run = null;
          resolve();
          return;
        }
        ingestAudioChunk(current.session, pcm.subarray(offset, offset + WINDOW_SAMPLES));
        emitAndDraw(current.session);
        current.windowsEmitted += 1;
      }
      current.timer = window.setTimeout(tick, BLOCK_MS / 2);
    };
    tick();
  });
}

async function abortRun() {
  if (run === null) {
    return;
  }
  const current = run;
  current.stopped = true;
  window.clearTimeout(current.timer);
  if (current.kind === "reply") {
    try {
      current.source.stop();
    } catch {
    }
    void current.audio.close();
  } else if (current.kind === "mic") {
    current.stream.getTracks().forEach((track) => track.stop());
    void current.audio.close();
  }
  run = null;
}

function emitAndDraw(session) {
  const block = emitAvatarBlock(session);
  paintAvatar(gfx, sceneFromBlock(block));
  blockEl.textContent = JSON.stringify(block);
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

function pcmFromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const wavBytes = bytes.buffer;
  return decodeBrowserWav(wavBytes);
}

function decodeBrowserWav(buffer) {
  const view = new DataView(buffer);
  let offset = 12;
  let dataOffset = -1;
  let dataBytes = 0;
  while (offset + 8 <= buffer.byteLength) {
    const id = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === "data") {
      dataOffset = start;
      dataBytes = size;
      break;
    }
    offset = start + size + (size % 2);
  }
  if (dataOffset < 0) {
    throw new Error("reply wav");
  }
  return new Int16Array(buffer.slice(dataOffset, dataOffset + dataBytes));
}

function drawIdle() {
  const session = openSession({ audioIn: "idle", videoOut: "avatar" });
  emitAndDraw(session);
  userEl.textContent = "—";
  replyEl.textContent = "—";
}
