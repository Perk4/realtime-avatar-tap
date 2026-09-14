import { readFile } from "node:fs/promises";
import { talkTurn } from "./live-talk.js";
import { encodePcm16Wav, decodePcm16Wav } from "./wav.js";

const fixturePath = new URL("./public/fixture.wav", import.meta.url);
const wav = decodePcm16Wav(await readFile(fixturePath));
const turn = await talkTurn(wav.pcm);
process.stdout.write(
  JSON.stringify(
    {
      userText: turn.userText,
      replyText: turn.replyText,
      replySamples: turn.pcm.length,
      wavBytes: encodePcm16Wav(turn.pcm, 16_000).byteLength,
    },
    null,
    2,
  ) + "\n",
);
