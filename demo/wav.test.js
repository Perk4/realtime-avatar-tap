import assert from "node:assert/strict";
import { test } from "node:test";
import { decodePcm16Wav, encodePcm16Wav } from "./wav.js";

test("pcm16 wav round-trips mono 16k", () => {
  const pcm = new Int16Array([0, -32768, 32767, 8000]);
  const decoded = decodePcm16Wav(encodePcm16Wav(pcm, 16_000));
  assert.equal(decoded.sampleRate, 16_000);
  assert.deepEqual(Array.from(decoded.pcm), Array.from(pcm));
});

test("decode caps an unbounded data chunk to the file length", () => {
  const pcm = new Int16Array([100, -100, 200, -200]);
  const bytes = encodePcm16Wav(pcm, 16_000).slice();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint32(40, 0xffffffff, true);
  const decoded = decodePcm16Wav(bytes);
  assert.deepEqual(Array.from(decoded.pcm), Array.from(pcm));
});
