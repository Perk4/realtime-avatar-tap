import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  emitAvatarBlock,
  ingestAudioChunk,
  openSession,
} from "../src/avatar-tap.ts";
import { talkTurn } from "./live-talk.js";
import { WINDOW_SAMPLES } from "./pcm.js";
import { decodePcm16Wav } from "./wav.js";

const hasKey = Boolean(process.env.OPENAI_API_KEY);

test(
  "gpt-live-1 reply pcm drives the tap",
  { skip: hasKey ? false : "OPENAI_API_KEY missing" },
  async () => {
    const fixturePath = new URL("./public/fixture.wav", import.meta.url);
    const wav = decodePcm16Wav(await readFile(fixturePath));
    const turn = await talkTurn(wav.pcm, { pace: true });
    assert.ok(turn.pcm.length >= WINDOW_SAMPLES);
    const session = openSession({ audioIn: "reply", videoOut: "avatar" });
    const poses = new Set();
    for (let offset = 0; offset < turn.pcm.length; offset += WINDOW_SAMPLES) {
      ingestAudioChunk(session, turn.pcm.subarray(offset, offset + WINDOW_SAMPLES));
      poses.add(emitAvatarBlock(session).pose);
    }
    assert.ok(poses.has("talk"), "reply should move the mouth");
  },
);
