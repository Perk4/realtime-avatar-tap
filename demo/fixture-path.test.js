import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertContinuous,
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "../src/avatar-tap.ts";
import { sceneFromBlock } from "./avatar-scene.js";
import { WINDOW_SAMPLES } from "./pcm.js";
import { decodePcm16Wav } from "./wav.js";

const fixturePath = fileURLToPath(new URL("./public/fixture.wav", import.meta.url));

test("fixture wav through the four primitives yields talk and a moving clock", async () => {
  const wav = decodePcm16Wav(await readFile(fixturePath));
  assert.equal(wav.sampleRate, 16_000);
  assert.ok(wav.pcm.length >= WINDOW_SAMPLES * 4);

  const session = openSession({ audioIn: "fixture", videoOut: "avatar" });
  const lips = new Set();
  const poses = new Set();
  let lastT0 = -40;
  let blocks = 0;
  for (let offset = 0; offset < wav.pcm.length; offset += WINDOW_SAMPLES) {
    ingestAudioChunk(session, wav.pcm.subarray(offset, offset + WINDOW_SAMPLES));
    const block = emitAvatarBlock(session);
    assert.equal(block.durationMs, 40);
    assert.equal(block.t0Ms, lastT0 + 40);
    lips.add(block.lip);
    poses.add(block.pose);
    lastT0 = block.t0Ms;
    blocks += 1;
  }

  assert.ok(blocks >= 4);
  assert.ok(lips.has("closed"));
  assert.ok(lips.has("open") || lips.has("wide"));
  assert.ok(poses.has("talk"));
  assert.ok(sceneFromBlock({ t0Ms: 0, durationMs: 40, lip: "wide", pose: "talk" }).mouthH >
    sceneFromBlock({ t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" }).mouthH);
});

test("assertContinuous still advances one session after a dropped ingest", () => {
  const { before, after } = assertContinuous();
  assert.equal(before.t0Ms, 0);
  assert.equal(after.t0Ms, 40);
});
