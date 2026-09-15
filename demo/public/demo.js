import {
  assertContinuous,
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "/dist/index.js";
import { HEIGHT, WIDTH } from "/lib/avatar-scene.js";
import { canvasGfx } from "/lib/canvas-gfx.js";
import {
  CHARACTERS,
  characterPipeline,
  composeScene,
  paintCharacter,
  parseCharacter,
} from "/lib/characters.js";
import { paintHud } from "/lib/paint-hud.js";
import { createGraph, tickGraph, triggerGesture } from "/lib/anim-graph.js";
import {
  BLOCK_MS,
  WINDOW_SAMPLES,
  downsampleTo16k,
  floatsToPcm16,
  pcm16ToFloat,
} from "/lib/pcm.js";
import { encodePcm16Wav } from "/lib/wav.js";

const canvas = document.querySelector("#avatar");
const canvas3d = document.querySelector("#avatar3d");
const liveOut = document.querySelector("#live-out");
const statusEl = document.querySelector("#status");
const blockEl = document.querySelector("#block");
const llmEl = document.querySelector("#llm");
const userEl = document.querySelector("#user-text");
const replyEl = document.querySelector("#reply-text");
const duplexButton = document.querySelector("#live-duplex");
const playButton = document.querySelector("#play-fixture");
const previewButton = document.querySelector("#preview-lips");
const micButton = document.querySelector("#use-mic");
const stopButton = document.querySelector("#stop");
const continuityButton = document.querySelector("#assert-continuous");
const characterRow = document.querySelector("#characters");
const nodButton = document.querySelector("#gesture-nod");
const glassesButton = document.querySelector("#gesture-glasses");

canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas3d.width = WIDTH;
canvas3d.height = HEIGHT;
const ctx = canvas.getContext("2d");
if (ctx === null) {
  throw new Error("canvas");
}
const gfx = canvasGfx(ctx);

let run = null;
let live = null;
let character = parseCharacter(new URLSearchParams(location.search).get("character"));
let graph = createGraph();
let lastBlock = { t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" };
const wallOrigin = performance.now();
const shotMode = new URLSearchParams(location.search).get("shot");
let stage = null;

duplexButton.addEventListener("click", () => {
  void startDuplex();
});
playButton.addEventListener("click", () => {
  void startFixture();
});
previewButton.addEventListener("click", () => {
  void startLocalPreview();
});
micButton.addEventListener("click", () => {
  void startMic();
});
stopButton.addEventListener("click", () => {
  void stopRun();
});
continuityButton.addEventListener("click", () => {
  try {
    const { before, after } = assertContinuous();
    statusEl.textContent = `assertContinuous ok: t0 ${before.t0Ms} → ${after.t0Ms}`;
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "assertContinuous failed";
  }
});
nodButton.addEventListener("click", () => {
  triggerGesture(graph, "nod", nowMs());
  paintFrame(lastBlock, nowMs());
});
glassesButton.addEventListener("click", () => {
  triggerGesture(graph, "glasses", nowMs());
  paintFrame(lastBlock, nowMs());
});
wireCharacterButtons();
if (shotMode) {
  document.body.classList.add("shot");
}
void bootStage().then(() => {
  if (shotMode) {
    requestAnimationFrame(() => {
      applyShotFromQuery();
    });
    return;
  }
  drawIdle();
  applyPreviewFromQuery();
  void loadStatus();
  if (!new URLSearchParams(location.search).get("preview")) {
    requestAnimationFrame(idleTick);
  }
});

async function loadStatus() {
  const response = await fetch("/api/status");
  live = await response.json();
  if (live?.enabled) {
    llmEl.textContent = `${live.model} → ${live.backend} (${live.voice}, ${live.duplex ?? "webrtc"})`;
    statusEl.textContent =
      "idle. Preview lips, Nod, or Glasses to test the avatar. Live duplex / Play fixture talk to GPT-Live.";
  } else {
    llmEl.textContent = "OPENAI_API_KEY missing on server";
    statusEl.textContent =
      "idle. Preview lips, Nod, or Glasses work without a key. Conversation needs OPENAI_API_KEY.";
  }
  if (!stage) {
    statusEl.textContent +=
      " WebGL unavailable; 2D painters active. Run npm install and restart npm run demo.";
  }
}

async function startDuplex() {
  await abortRun();
  userEl.textContent = "";
  replyEl.textContent = "";
  statusEl.textContent = "connecting WebRTC duplex";
  const session = openSession({ audioIn: "reply", videoOut: "avatar" });
  const audio = new AudioContext();
  const peer = new RTCPeerConnection();
  const current = {
    kind: "duplex",
    audio,
    peer,
    session,
    leftover: new Int16Array(0),
    events: null,
    microphone: null,
    closeTimer: 0,
    stopped: false,
    ready: false,
    finalized: false,
  };
  run = current;
  try {
    await startDuplexUnsafe(current);
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "duplex failed";
    await abortRun();
  }
}

async function startDuplexUnsafe(current) {
  current.peer.addEventListener("track", (event) => {
    if (run !== current || current.stopped) {
      return;
    }
    const stream = new MediaStream([event.track]);
    liveOut.srcObject = stream;
    void liveOut.play().catch(() => {});
    void tapRemoteStream(current, stream);
  });
  current.microphone = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  for (const track of current.microphone.getAudioTracks()) {
    current.peer.addTrack(track, current.microphone);
  }
  current.events = current.peer.createDataChannel("oai-events");
  current.events.addEventListener("message", (event) => {
    onDuplexEvent(current, event.data);
  });
  current.events.addEventListener("close", () => {
    if (run !== current || current.finalized) {
      return;
    }
    statusEl.textContent = "duplex disconnected";
    void abortRun();
  });
  const offer = await current.peer.createOffer();
  await current.peer.setLocalDescription(offer);
  await waitForIce(current.peer);
  const sdp = current.peer.localDescription?.sdp;
  if (!sdp) {
    throw new Error("missing local SDP offer");
  }
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sdp }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "session failed");
  }
  if (typeof payload.transport?.sdp !== "string") {
    throw new Error("missing remote SDP");
  }
  await current.peer.setRemoteDescription({
    type: "answer",
    sdp: payload.transport.sdp,
  });
  await current.audio.resume();
}

function onDuplexEvent(current, raw) {
  if (run !== current || current.stopped) {
    return;
  }
  const event = parseLiveEvent(raw);
  if (event === null) {
    return;
  }
  if (event.type === "session.started") {
    current.ready = true;
    statusEl.textContent = "duplex live. Speak anytime. Stop to hang up.";
    return;
  }
  if (event.type === "session.closed") {
    current.finalized = true;
    statusEl.textContent = "duplex ended";
    void abortRun();
    return;
  }
  if (event.type === "error") {
    statusEl.textContent = liveErrorMessage(event);
    return;
  }
  const inputText = transcriptDelta(event, "session.input_transcript.delta");
  if (inputText !== "") {
    userEl.textContent += inputText;
  }
  const outputText = transcriptDelta(event, "session.output_transcript.delta");
  if (outputText !== "") {
    replyEl.textContent += outputText;
  }
}

async function tapRemoteStream(current, stream) {
  const workletUrl = micWorkletUrl();
  await current.audio.audioWorklet.addModule(workletUrl);
  URL.revokeObjectURL(workletUrl);
  const source = current.audio.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(current.audio, "tap-mic");
  const silent = current.audio.createGain();
  silent.gain.value = 0;
  source.connect(node);
  node.connect(silent);
  silent.connect(current.audio.destination);
  node.port.onmessage = (event) => {
    if (run !== current || current.stopped) {
      return;
    }
    const pcm = floatsToPcm16(downsampleTo16k(event.data, current.audio.sampleRate));
    pushTapPcm(current, pcm);
  };
}

function pushTapPcm(current, pcm) {
  const merged = concatPcm([current.leftover, pcm]);
  let offset = 0;
  while (offset + WINDOW_SAMPLES <= merged.length) {
    ingestAudioChunk(current.session, merged.subarray(offset, offset + WINDOW_SAMPLES));
    emitAndDraw(current.session);
    offset += WINDOW_SAMPLES;
  }
  current.leftover = merged.subarray(offset);
}

function waitForIce(peer) {
  if (peer.iceGatheringState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      peer.removeEventListener("icegatheringstatechange", onState);
      reject(new Error("Timed out while gathering ICE candidates"));
    }, 10_000);
    const onState = () => {
      if (peer.iceGatheringState !== "complete") {
        return;
      }
      clearTimeout(timer);
      peer.removeEventListener("icegatheringstatechange", onState);
      resolve();
    };
    peer.addEventListener("icegatheringstatechange", onState);
    onState();
  });
}

async function startFixture() {
  await abortRun();
  try {
    statusEl.textContent = "sending fixture as user speech";
    const wav = await fetch("/speech-fixture.wav").then((res) => {
      if (!res.ok) {
        throw new Error("speech-fixture.wav missing");
      }
      return res.arrayBuffer();
    });
    await converse(new Blob([wav], { type: "audio/wav" }));
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "fixture failed";
  }
}

async function startLocalPreview() {
  await abortRun();
  try {
    statusEl.textContent = "previewing local fixture through the tap";
    const wav = await fetch("/fixture.wav").then((res) => {
      if (!res.ok) {
        throw new Error("fixture.wav missing");
      }
      return res.arrayBuffer();
    });
    const pcm = decodeBrowserWav(wav);
    statusEl.textContent = "avatar speaking (local preview)";
    await playReply(pcm);
    statusEl.textContent = "preview finished";
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "preview failed";
  }
}

async function bootStage() {
  try {
    const { createWebglStage } = await import("/lib/webgl-stage.js");
    stage = createWebglStage(canvas3d);
  } catch (error) {
    stage = null;
    const message = error instanceof Error ? error.message : String(error);
    document.body.dataset.webglError = message;
    console.error(error);
    statusEl.textContent =
      `Three.js failed to load (${message}). Showing 2D. Run npm install and restart npm run demo.`;
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
  const workletUrl = micWorkletUrl();
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
  statusEl.textContent = "listening. Stop to send the turn. Mouth waits for the reply.";
}

async function stopRun() {
  if (run !== null && run.kind === "duplex") {
    await hangupDuplex();
    return;
  }
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

async function hangupDuplex() {
  const current = run;
  if (current === null || current.kind !== "duplex") {
    await abortRun();
    return;
  }
  if (!current.ready || current.events === null || current.events.readyState !== "open") {
    await abortRun();
    return;
  }
  statusEl.textContent = "hanging up duplex";
  try {
    current.events.send(JSON.stringify({ type: "session.close" }));
  } catch {
    await abortRun();
    return;
  }
  current.closeTimer = window.setTimeout(() => {
    if (run === current && !current.finalized) {
      statusEl.textContent = "duplex hangup timed out";
      void abortRun();
    }
  }, 15_000);
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
  statusEl.textContent = "avatar speaking";
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
  await pumpPcm(run, pcm);
}

function pumpPcm(current, pcm) {
  const wallStart = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (run !== current || current.stopped) {
        resolve();
        return;
      }
      const elapsedMs = performance.now() - wallStart;
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
  window.clearTimeout(current.closeTimer);
  if (current.kind === "reply") {
    try {
      current.source.stop();
    } catch {
    }
    void current.audio.close();
  } else if (current.kind === "mic") {
    current.stream.getTracks().forEach((track) => track.stop());
    void current.audio.close();
  } else if (current.kind === "duplex") {
    current.microphone?.getTracks().forEach((track) => track.stop());
    try {
      current.events?.close();
    } catch {
    }
    current.peer.close();
    liveOut.srcObject = null;
    void current.audio.close();
  }
  run = null;
}

function emitAndDraw(session) {
  lastBlock = emitAvatarBlock(session);
  paintFrame(lastBlock, nowMs());
}

function paintFrame(block, clockMs) {
  const tick = tickGraph(graph, block, clockMs);
  const scene = composeScene(block, tick);
  const pipeline = characterPipeline(character);
  const use3d = pipeline === "webgl3d" && stage !== null;
  canvas.classList.remove("off");
  canvas3d.classList.toggle("off", !use3d);
  if (use3d) {
    stage.setCharacter(character);
    stage.apply(scene);
    stage.render();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    paintHud(gfx, scene, `   ${character}`);
  } else {
    paintCharacter(character, gfx, scene);
  }
  blockEl.textContent = JSON.stringify({
    t0Ms: block.t0Ms,
    durationMs: block.durationMs,
    lip: block.lip,
    pose: block.pose,
    gesture: tick.gesture,
    character,
    pipeline: use3d ? "webgl3d" : "canvas2d",
  });
  document.body.dataset.stageReady = "1";
}

function applyShotFromQuery() {
  if (!shotMode) {
    return;
  }
  graph = createGraph();
  if (shotMode === "talk") {
    lastBlock = { t0Ms: 80, durationMs: 40, lip: "wide", pose: "talk" };
    paintFrame(lastBlock, 80);
    return;
  }
  if (shotMode === "nod") {
    lastBlock = { t0Ms: 80, durationMs: 40, lip: "wide", pose: "talk" };
    triggerGesture(graph, "nod", 0);
    paintFrame(lastBlock, 340);
    return;
  }
  if (shotMode === "glasses") {
    lastBlock = { t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" };
    triggerGesture(graph, "glasses", 0);
    paintFrame(lastBlock, 410);
    return;
  }
  lastBlock = { t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" };
  paintFrame(lastBlock, 0);
}

function applyPreviewFromQuery() {
  const preview = new URLSearchParams(location.search).get("preview");
  if (!preview) {
    return;
  }
  graph = createGraph();
  if (preview === "talk") {
    lastBlock = { t0Ms: 80, durationMs: 40, lip: "wide", pose: "talk" };
    paintFrame(lastBlock, 80);
    return;
  }
  if (preview === "nod") {
    lastBlock = { t0Ms: 80, durationMs: 40, lip: "wide", pose: "talk" };
    triggerGesture(graph, "nod", 0);
    paintFrame(lastBlock, 340);
    return;
  }
  if (preview === "glasses") {
    lastBlock = { t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" };
    triggerGesture(graph, "glasses", 0);
    paintFrame(lastBlock, 410);
  }
}

function nowMs() {
  return performance.now() - wallOrigin;
}

function idleTick() {
  requestAnimationFrame(idleTick);
  if (run !== null && run.kind !== "mic") {
    return;
  }
  paintFrame(lastBlock, nowMs());
}

function wireCharacterButtons() {
  for (const item of CHARACTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.character = item.id;
    button.textContent = item.label;
    button.addEventListener("click", () => {
      setCharacter(item.id);
    });
    characterRow.append(button);
  }
  markCharacter();
}

function setCharacter(id) {
  character = parseCharacter(id);
  const url = new URL(location.href);
  url.searchParams.set("character", character);
  history.replaceState({}, "", url);
  markCharacter();
  paintFrame(lastBlock, nowMs());
}

function markCharacter() {
  for (const button of characterRow.querySelectorAll("button")) {
    button.classList.toggle("primary", button.dataset.character === character);
  }
}

function micWorkletUrl() {
  return URL.createObjectURL(
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

function parseLiveEvent(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const event = JSON.parse(raw);
    if (event && typeof event === "object" && typeof event.type === "string") {
      return event;
    }
  } catch {
    return null;
  }
  return null;
}

function transcriptDelta(event, type) {
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

function liveErrorMessage(event) {
  if (event.error && typeof event.error === "object" && typeof event.error.message === "string") {
    return event.error.message;
  }
  if (typeof event.message === "string") {
    return event.message;
  }
  return "live error";
}

function drawIdle() {
  const session = openSession({ audioIn: "idle", videoOut: "avatar" });
  emitAndDraw(session);
  userEl.textContent = "—";
  replyEl.textContent = "—";
}
