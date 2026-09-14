import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertContinuous,
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "./avatar-tap.ts";
import * as tap from "./avatar-tap.ts";

test("openSession returns a handle and names empty label fields", () => {
  const session = openSession({ audioIn: "mic", videoOut: "avatar" });
  assert.deepEqual(emitAvatarBlock(session), {
    t0Ms: 0,
    durationMs: 40,
    lip: "closed",
    pose: "rest",
  });

  assert.throws(
    () => openSession({ audioIn: "", videoOut: "avatar" }),
    /audioIn/,
  );
  assert.throws(
    () => openSession({ audioIn: "mic", videoOut: "   " }),
    /videoOut/,
  );
});

test("quiet zeros emit closed rest at t0 0", () => {
  const session = openSession({ audioIn: "mic", videoOut: "avatar" });
  ingestAudioChunk(session, new Int16Array(640));
  assert.deepEqual(emitAvatarBlock(session), {
    t0Ms: 0,
    durationMs: 40,
    lip: "closed",
    pose: "rest",
  });
});

test("full-scale Int16 window emit is wide talk", () => {
  const session = openSession({ audioIn: "mic", videoOut: "avatar" });
  ingestAudioChunk(session, new Int16Array(640).fill(32767));
  const block = emitAvatarBlock(session);
  assert.equal(block.lip, "wide");
  assert.equal(block.pose, "talk");
});

test("drop keeps the same session and second emit t0Ms 40", () => {
  const session = openSession({ audioIn: "mic", videoOut: "avatar" });
  ingestAudioChunk(session, new Int16Array(640).fill(8000));
  const before = emitAvatarBlock(session);
  const after = emitAvatarBlock(session);
  assert.equal(before.t0Ms, 0);
  assert.equal(after.t0Ms, 40);
  assert.equal(emitAvatarBlock(session).t0Ms, 80);
});

test("assertContinuous returns t0 0 then 40 on one session", () => {
  const { session, before, after } = assertContinuous();
  assert.equal(before.t0Ms, 0);
  assert.equal(after.t0Ms, 40);
  assert.equal(after.durationMs, 40);
  assert.equal(emitAvatarBlock(session).t0Ms, 80);
});

test("public function names are the four primitives", () => {
  const names = Object.entries(tap)
    .filter(([, value]) => typeof value === "function" && !Error.isPrototypeOf(value))
    .map(([name]) => name)
    .sort();
  assert.deepEqual(names, [
    "assertContinuous",
    "emitAvatarBlock",
    "ingestAudioChunk",
    "openSession",
  ]);
});
