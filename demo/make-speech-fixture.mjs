import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resamplePcm16 } from "./pcm.js";
import { encodePcm16Wav } from "./wav.js";

const SAMPLE_RATE_HZ = 16_000;
const TTS_RATE_HZ = 24_000;
const LINE = "Hey Tater, tell me a short potato joke.";
const OUT = fileURLToPath(new URL("./public/speech-fixture.wav", import.meta.url));

const key = process.env.OPENAI_API_KEY;
if (!key) {
  throw new Error("OPENAI_API_KEY missing");
}

const response = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: LINE,
    instructions: "Speak clearly, conversational American English, unhurried.",
    response_format: "pcm",
  }),
});
if (!response.ok) {
  throw new Error(`tts ${response.status}: ${await response.text()}`);
}

const raw = Buffer.from(await response.arrayBuffer());
const even = raw.byteLength - (raw.byteLength % 2);
const pcm24 = new Int16Array(even / 2);
for (let i = 0; i < pcm24.length; i++) {
  pcm24[i] = raw.readInt16LE(i * 2);
}
const pcm = resamplePcm16(pcm24, TTS_RATE_HZ, SAMPLE_RATE_HZ);
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, encodePcm16Wav(pcm, SAMPLE_RATE_HZ));
process.stdout.write(`${OUT} ${pcm.length} samples from ${TTS_RATE_HZ} Hz PCM\n`);
