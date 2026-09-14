import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { LIVE_SESSIONS_URL } from "./live-talk.js";
import { createDemoServer } from "./serve.mjs";

test("GET /api/status reports webrtc duplex and omits the key", async (t) => {
  const previous = snapshotLiveEnv();
  t.after(() => restoreLiveEnv(previous));
  process.env.OPENAI_API_KEY = "sk-should-not-leak";
  delete process.env.OPENAI_LIVE_MODEL;
  delete process.env.OPENAI_LIVE_BACKEND;
  delete process.env.OPENAI_LIVE_VOICE;
  const server = await listen(t);
  const payload = await getJson(server, "/api/status");
  assert.equal(payload.enabled, true);
  assert.equal(payload.model, "gpt-live-1");
  assert.equal(payload.backend, "gpt-5.6-terra");
  assert.equal(payload.voice, "marin");
  assert.equal(payload.duplex, "webrtc");
  assert.ok(!JSON.stringify(payload).includes("sk-should-not-leak"));
});

test("POST /api/session rejects empty sdp", async (t) => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-secret";
  t.after(() => setEnv("OPENAI_API_KEY", previous));
  const server = await listen(t);
  const response = await postJson(server, "/api/session", { sdp: "  " });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "sdp");
});

test("POST /api/session is 503 when the server key is missing", async (t) => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  t.after(() => setEnv("OPENAI_API_KEY", previous));
  const server = await listen(t);
  const response = await postJson(server, "/api/session", { sdp: "v=0-offer" });
  assert.equal(response.status, 503);
  assert.equal(response.body.error, "OPENAI_API_KEY missing");
});

test("POST /api/session returns the public view and never the key", async (t) => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-secret";
  t.after(() => {
    setEnv("OPENAI_API_KEY", previous);
    mock.restoreAll();
  });
  const realFetch = globalThis.fetch.bind(globalThis);
  mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url).startsWith(LIVE_SESSIONS_URL)) {
      assert.equal(init.headers.Authorization, "Bearer sk-test-secret");
      const body = JSON.parse(init.body);
      assert.equal(body.transport.sdp, "v=0-offer");
      assert.ok(!init.body.includes("sk-test-secret"));
      return {
        ok: true,
        status: 201,
        async text() {
          return JSON.stringify({
            session: { id: "live_http", extra: "strip" },
            transport: { type: "webrtc", sdp: "v=0-answer" },
            api_key: "sk-test-secret",
          });
        },
      };
    }
    return realFetch(url, init);
  });
  const server = await listen(t);
  const response = await postJson(server, "/api/session", { sdp: "v=0-offer" });
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    session: { id: "live_http" },
    transport: { type: "webrtc", sdp: "v=0-answer" },
  });
  assert.ok(!JSON.stringify(response.body).includes("sk-test-secret"));
  assert.ok(!JSON.stringify(response.body).includes("strip"));
});

test("GET /vendor/three/three.module.js is the Three.js ESM build", async (t) => {
  const server = await listen(t);
  const response = await fetch(url(server, "/vendor/three/three.module.js"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /javascript/);
  const body = await response.text();
  assert.match(body, /WebGLRenderer/);
});

test("GET /vendor/three/jsm/geometries/RoundedBoxGeometry.js is reachable", async (t) => {
  const server = await listen(t);
  const response = await fetch(url(server, "/vendor/three/jsm/geometries/RoundedBoxGeometry.js"));
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /RoundedBoxGeometry/);
});

test("POST /api/talk still exists as the turn-based wav path", async (t) => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-secret";
  t.after(() => setEnv("OPENAI_API_KEY", previous));
  const server = await listen(t);
  const response = await fetch(url(server, "/api/talk"), {
    method: "POST",
    body: Buffer.from("not-a-wav"),
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
});

async function listen(t) {
  const server = createDemoServer();
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  );
  return server;
}

function url(server, pathname) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}${pathname}`;
}

async function getJson(server, pathname) {
  const response = await fetch(url(server, pathname));
  assert.equal(response.ok, true);
  return response.json();
}

async function postJson(server, pathname, value) {
  const response = await fetch(url(server, pathname), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

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
