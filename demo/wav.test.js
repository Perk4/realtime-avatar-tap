import assert from "node:assert/strict";
import { test } from "node:test";
import { decodePcm16Wav, encodePcm16Wav } from "./wav.js";

test("pcm16 wav round-trips mono 16k", () => {
  const pcm = new Int16Array([0, -32768, 32767, 8000]);
  const decoded = decodePcm16Wav(encodePcm16Wav(pcm, 16_000));
  assert.equal(decoded.sampleRate, 16_000);
  assert.deepEqual(Array.from(decoded.pcm), Array.from(pcm));
});
