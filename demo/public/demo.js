import {
  assertContinuous,
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "/dist/index.js";
import { HEIGHT, WIDTH, paintAvatar, sceneFromBlock } from "/lib/avatar-scene.js";
import { canvasGfx } from "/lib/canvas-gfx.js";
import { stubLlm } from "/lib/llm-stub.js";
import {
  BLOCK_MS,
  WINDOW_SAMPLES,
  downsampleTo16k,
  floatsToPcm16,
  mixToMono,
} from "/lib/pcm.js";

const canvas = document.querySelector("#avatar");
const statusEl = document.querySelector("#status");
const blockEl = document.querySelector("#block");
const llmEl = document.querySelector("#llm");
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

const llm = stubLlm("unused");
llmEl.textContent = llm.enabled ? (llm.text ?? "") : llm.reason;

let run = null;

playButton.addEventListener("click", () => {
  void startFixture();
});
micButton.addEventListener("click", () => {
  void startMic();
});
stopButton.addEventListener("click", () => {
  stopRun();
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

async function startFixture() {
  stopRun();
  try {
    await startFixtureUnsafe();
  } catch (error) {
    stopRun(error instanceof Error ? error.message : "fixture failed");
  }
}

async function startFixtureUnsafe() {
  const audio = new AudioContext();
  const response = await fetch("/fixture.wav");
  if (!response.ok) {
    throw new Error("fixture.wav missing");
  }
  const bytes = await response.arrayBuffer();
  const decoded = await audio.decodeAudioData(bytes.slice(0));
  const pcm = floatsToPcm16(downsampleTo16k(mixToMono(decoded), decoded.sampleRate));
  const source = audio.createBufferSource();
  source.buffer = decoded;
  source.connect(audio.destination);
  await audio.resume();
  const session = openSession({ audioIn: "fixture", videoOut: "avatar" });
  run = {
    kind: "fixture",
    audio,
    source,
    session,
    timer: 0,
    stopped: false,
    windowsEmitted: 0,
  };
  statusEl.textContent = "playing fixture through ingestAudioChunk";
  source.start();
  pumpPcm(run, pcm, audio.currentTime);
}

async function startMic() {
  stopRun();
  try {
    await startMicUnsafe();
  } catch (error) {
    stopRun(error instanceof Error ? error.message : "mic failed");
  }
}

async function startMicUnsafe() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true },
    video: false,
  });
  const audio = new AudioContext();
  const session = openSession({ audioIn: "mic", videoOut: "avatar" });
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
    const chunk = floatsToPcm16(downsampleTo16k(event.data, audio.sampleRate));
    pending.push(chunk);
  };
  run = { kind: "mic", audio, stream, session, pending, timer: 0, stopped: false };
  statusEl.textContent = "mic open; chunks ingest every 40ms";
  tickMic(run);
}

function pumpPcm(current, pcm, startedAt) {
  if (run !== current || current.stopped) {
    return;
  }
  const elapsedMs = (current.audio.currentTime - startedAt) * 1000;
  const windowsDue = Math.floor(elapsedMs / BLOCK_MS) + 1;
  while (current.windowsEmitted < windowsDue) {
    const offset = current.windowsEmitted * WINDOW_SAMPLES;
    if (offset >= pcm.length) {
      stopRun("fixture finished");
      return;
    }
    ingestAudioChunk(current.session, pcm.subarray(offset, offset + WINDOW_SAMPLES));
    emitAndDraw(current.session);
    current.windowsEmitted += 1;
  }
  current.timer = window.setTimeout(() => pumpPcm(current, pcm, startedAt), BLOCK_MS / 2);
}

function tickMic(current) {
  if (run !== current || current.stopped) {
    return;
  }
  const taken = takeWindow(current.pending);
  if (taken !== null) {
    ingestAudioChunk(current.session, taken);
  }
  emitAndDraw(current.session);
  current.timer = window.setTimeout(() => tickMic(current), BLOCK_MS);
}

function takeWindow(pending) {
  let total = 0;
  for (const part of pending) {
    total += part.length;
  }
  if (total < WINDOW_SAMPLES) {
    return null;
  }
  const window = new Int16Array(WINDOW_SAMPLES);
  let filled = 0;
  while (filled < WINDOW_SAMPLES) {
    const head = pending[0];
    if (head === undefined) {
      break;
    }
    const need = WINDOW_SAMPLES - filled;
    if (head.length <= need) {
      window.set(head, filled);
      filled += head.length;
      pending.shift();
    } else {
      window.set(head.subarray(0, need), filled);
      pending[0] = head.subarray(need);
      filled += need;
    }
  }
  return window;
}

function emitAndDraw(session) {
  const block = emitAvatarBlock(session);
  paintAvatar(gfx, sceneFromBlock(block));
  blockEl.textContent = JSON.stringify(block);
}

function stopRun(message) {
  if (run === null) {
    statusEl.textContent = message ?? "idle";
    return;
  }
  window.clearTimeout(run.timer);
  run.stopped = true;
  if (run.kind === "fixture") {
    try {
      run.source.stop();
    } catch {
    }
    void run.audio.close();
  } else {
    run.stream.getTracks().forEach((track) => track.stop());
    void run.audio.close();
  }
  run = null;
  statusEl.textContent = message ?? "stopped";
}

function drawIdle() {
  const session = openSession({ audioIn: "idle", videoOut: "avatar" });
  emitAndDraw(session);
  statusEl.textContent = "idle. Play fixture or use mic.";
}
