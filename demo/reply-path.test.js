import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "../src/avatar-tap.ts";
import { WINDOW_SAMPLES } from "./pcm.js";

test("conversation path ingests reply audio, not caller audio", () => {
  const caller = new Int16Array(WINDOW_SAMPLES).fill(32767);
  const reply = new Int16Array(WINDOW_SAMPLES).fill(12000);
  const session = openSession({ audioIn: "reply", videoOut: "avatar" });
  ingestAudioChunk(session, reply);
  const block = emitAvatarBlock(session);
  assert.equal(block.pose, "talk");
  assert.notEqual(block.lip, "closed");

  const ignored = openSession({ audioIn: "caller", videoOut: "avatar" });
  emitAvatarBlock(ignored);
  assert.equal(caller[0], 32767);
});
