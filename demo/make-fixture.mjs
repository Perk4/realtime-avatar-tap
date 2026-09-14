import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePcm16Wav } from "./wav.js";

const SAMPLE_RATE_HZ = 16_000;
const OUT = fileURLToPath(new URL("./public/fixture.wav", import.meta.url));

const SYLLABLES = [
  { amp: 0, ms: 160 },
  { amp: 0.022, ms: 280 },
  { amp: 0.09, ms: 320 },
  { amp: 0.42, ms: 360 },
  { amp: 0.09, ms: 280 },
  { amp: 0.022, ms: 240 },
  { amp: 0.38, ms: 320 },
  { amp: 0, ms: 200 },
];

const pcm = renderSyllables(SYLLABLES, SAMPLE_RATE_HZ);
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, encodePcm16Wav(pcm, SAMPLE_RATE_HZ));
process.stdout.write(`${OUT} ${pcm.length} samples\n`);

function renderSyllables(syllables, sampleRate) {
  const totalMs = syllables.reduce((sum, part) => sum + part.ms, 0);
  const pcmOut = new Int16Array(Math.round((totalMs / 1000) * sampleRate));
  let cursor = 0;
  let t = 0;
  for (const part of syllables) {
    const n = Math.round((part.ms / 1000) * sampleRate);
    for (let i = 0; i < n && cursor < pcmOut.length; i++) {
      const env = raisedCosine(i, n) * part.amp;
      const sample =
        env *
        (0.7 * Math.sin(2 * Math.PI * 180 * t) +
          0.25 * Math.sin(2 * Math.PI * 360 * t) +
          0.05 * Math.sin(2 * Math.PI * 540 * t));
      pcmOut[cursor] = floatToInt16(sample);
      cursor += 1;
      t += 1 / sampleRate;
    }
  }
  return pcmOut;
}

function raisedCosine(i, n) {
  if (n <= 1) {
    return 1;
  }
  const fade = Math.min(80, Math.floor(n / 4));
  if (i < fade) {
    return 0.5 - 0.5 * Math.cos((Math.PI * i) / fade);
  }
  if (i > n - fade) {
    return 0.5 - 0.5 * Math.cos((Math.PI * (n - i)) / fade);
  }
  return 1;
}

function floatToInt16(sample) {
  const clipped = Math.max(-1, Math.min(1, sample));
  return clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767);
}
