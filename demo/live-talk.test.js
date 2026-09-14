import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "../src/avatar-tap.ts";
import { chunkRms, talkTurn } from "./live-talk.js";
import { WINDOW_SAMPLES } from "./pcm.js";
import { decodePcm16Wav } from "./wav.js";

const hasKey = Boolean(process.env.OPENAI_API_KEY);

test("silent pcm stays below the live energy floor", () => {
  assert.equal(chunkRms(new Int16Array(640)), 0);
  assert.ok(chunkRms(new Int16Array(640).fill(4000)) > 0.01);
});

test(
  "gpt-live-1 reply pcm drives the tap",
  { skip: hasKey ? false : "OPENAI_API_KEY missing" },
  async () => {
    const fixturePath = new URL("./public/speech-fixture.wav", import.meta.url);
    const wav = decodePcm16Wav(await readFile(fixturePath));
    assert.equal(wav.sampleRate, 16_000);
    assert.ok(chunkRms(wav.pcm) > 0.01, "speech fixture must be audible");
    const turn = await talkTurn(wav.pcm, { pace: true });
    assert.ok(turn.pcm.length >= WINDOW_SAMPLES);
    assert.ok(chunkRms(turn.pcm) > 0.01, "reply must be audible");
    const session = openSession({ audioIn: "reply", videoOut: "avatar" });
    const poses = new Set();
    for (let offset = 0; offset < turn.pcm.length; offset += WINDOW_SAMPLES) {
      ingestAudioChunk(session, turn.pcm.subarray(offset, offset + WINDOW_SAMPLES));
      poses.add(emitAvatarBlock(session).pose);
    }
    assert.ok(poses.has("talk"), "reply should move the mouth");
  },
);
