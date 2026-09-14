import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIVE_BACKEND,
  LIVE_MODEL,
  LIVE_SESSIONS_URL,
  LIVE_VOICE,
  createWebRtcSession,
  liveConfig,
  publicSessionView,
  webrtcSessionPayload,
} from "./live-talk.js";

test("live defaults stay gpt-live-1 / gpt-5.6-terra / marin and never include the key", () => {
  const previous = snapshotLiveEnv();
  try {
    delete process.env.OPENAI_LIVE_MODEL;
    delete process.env.OPENAI_LIVE_BACKEND;
    delete process.env.OPENAI_LIVE_VOICE;
    process.env.OPENAI_API_KEY = "sk-should-not-leak";
    const cfg = liveConfig();
    assert.equal(cfg.model, LIVE_MODEL);
    assert.equal(cfg.backend, LIVE_BACKEND);
    assert.equal(cfg.voice, LIVE_VOICE);
    assert.equal(cfg.duplex, "webrtc");
    assert.equal(cfg.enabled, true);
    assert.equal("apiKey" in cfg, false);
    assert.equal("OPENAI_API_KEY" in cfg, false);
    assert.ok(!JSON.stringify(cfg).includes("sk-should-not-leak"));
  } finally {
    restoreLiveEnv(previous);
  }
});

test("webrtc payload omits pcm format and keeps model/backend/voice", () => {
  const previous = snapshotLiveEnv();
  try {
    delete process.env.OPENAI_LIVE_MODEL;
    delete process.env.OPENAI_LIVE_BACKEND;
    delete process.env.OPENAI_LIVE_VOICE;
    const payload = webrtcSessionPayload("v=0\no=- 0 0 IN IP4 127.0.0.1\n");
    assert.equal(payload.session.model, "gpt-live-1");
    assert.equal(payload.session.delegation.responses.model, "gpt-5.6-terra");
    assert.equal(payload.session.audio.output.voice, "marin");
    assert.equal("format" in payload.session.audio, false);
    assert.equal(payload.transport.type, "webrtc");
    assert.match(payload.transport.sdp, /^v=0/);
  } finally {
    restoreLiveEnv(previous);
  }
});

test("webrtc payload rejects empty sdp", () => {
  assert.throws(() => webrtcSessionPayload("   "), /sdp/);
  assert.throws(() => webrtcSessionPayload(""), /sdp/);
});

test("public session view strips extras and secrets", () => {
  const view = publicSessionView({
    session: { id: "live_abc", extra: "nope" },
    transport: { type: "webrtc", sdp: "v=0-answer" },
    api_key: "sk-leak",
  });
  assert.deepEqual(view, {
    session: { id: "live_abc" },
    transport: { type: "webrtc", sdp: "v=0-answer" },
  });
  assert.ok(!JSON.stringify(view).includes("sk-leak"));
  assert.ok(!JSON.stringify(view).includes("nope"));
});

test("createWebRtcSession posts the server key and returns the public view", async (t) => {
  const previous = snapshotLiveEnv();
  process.env.OPENAI_API_KEY = "sk-test-secret";
  t.after(() => {
    restoreLiveEnv(previous);
  });
  const fakeFetch = async (url, init) => {
    assert.equal(url, LIVE_SESSIONS_URL);
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer sk-test-secret");
    const body = JSON.parse(init.body);
    assert.equal(body.transport.type, "webrtc");
    assert.equal(body.transport.sdp, "v=0-offer");
    assert.equal(body.session.model, "gpt-live-1");
    assert.ok(!init.body.includes("sk-test-secret"));
    return {
      ok: true,
      status: 201,
      async text() {
        return JSON.stringify({
          session: { id: "live_1", client_secret: "nope" },
          transport: { type: "webrtc", sdp: "v=0-answer" },
          api_key: "sk-test-secret",
        });
      },
    };
  };
  const view = await createWebRtcSession("v=0-offer", { fetch: fakeFetch });
  assert.deepEqual(view, {
    session: { id: "live_1" },
    transport: { type: "webrtc", sdp: "v=0-answer" },
  });
  assert.ok(!JSON.stringify(view).includes("sk-test-secret"));
});

test("createWebRtcSession surfaces OpenAI errors without the key", async (t) => {
  const previous = snapshotLiveEnv();
  process.env.OPENAI_API_KEY = "sk-test-secret";
  t.after(() => {
    restoreLiveEnv(previous);
  });
  const fakeFetch = async () => ({
    ok: false,
    status: 400,
    async text() {
      return JSON.stringify({ error: { message: "invalid sdp" } });
    },
  });
  await assert.rejects(() => createWebRtcSession("v=0-offer", { fetch: fakeFetch }), (error) => {
    assert.equal(error instanceof Error, true);
    assert.match(error.message, /invalid sdp/);
    assert.ok(!error.message.includes("sk-test-secret"));
    return true;
  });
});

function snapshotLiveEnv() {
  return {
    key: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_LIVE_MODEL,
    backend: process.env.OPENAI_LIVE_BACKEND,
    voice: process.env.OPENAI_LIVE_VOICE,
  };
}

function restoreLiveEnv(previous) {
  setEnv("OPENAI_API_KEY", previous.key);
  setEnv("OPENAI_LIVE_MODEL", previous.model);
  setEnv("OPENAI_LIVE_BACKEND", previous.backend);
  setEnv("OPENAI_LIVE_VOICE", previous.voice);
}

function setEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
