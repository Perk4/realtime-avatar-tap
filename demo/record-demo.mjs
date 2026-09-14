import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { emitAvatarBlock, ingestAudioChunk, openSession } from "../dist/index.js";
import { HEIGHT, WIDTH, paintAvatar, sceneFromBlock } from "./avatar-scene.js";
import { WINDOW_SAMPLES } from "./pcm.js";
import { createRaster, toPpm } from "./raster.js";
import { decodePcm16Wav } from "./wav.js";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixturePath = path.join(repoRoot, "demo", "public", "fixture.wav");
const artifactDir = path.join(repoRoot, "artifacts");
const mp4Path = path.join(artifactDir, "potato-avatar-demo.mp4");
const posterPath = path.join(artifactDir, "potato-avatar-demo.jpg");

const wav = decodePcm16Wav(await readFile(fixturePath));
if (wav.sampleRate !== 16_000) {
  throw new Error(`fixture sampleRate ${wav.sampleRate}`);
}

const session = openSession({ audioIn: "fixture", videoOut: "avatar" });
const frameDir = await mkdtemp(path.join(os.tmpdir(), "tater-frames-"));

try {
  let frame = 0;
  for (let offset = 0; offset < wav.pcm.length; offset += WINDOW_SAMPLES) {
    const end = Math.min(offset + WINDOW_SAMPLES, wav.pcm.length);
    ingestAudioChunk(session, wav.pcm.subarray(offset, end));
    const block = emitAvatarBlock(session);
    const raster = createRaster();
    paintAvatar(raster.gfx, sceneFromBlock(block));
    const name = `frame_${String(frame).padStart(4, "0")}.ppm`;
    await writeFile(path.join(frameDir, name), toPpm(raster.pixels));
    frame += 1;
  }
  if (frame === 0) {
    throw new Error("no frames");
  }
  await mkdir(artifactDir, { recursive: true });
  await execFileAsync("ffmpeg", [
    "-y",
    "-framerate",
    "25",
    "-i",
    path.join(frameDir, "frame_%04d.ppm"),
    "-i",
    fixturePath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    mp4Path,
  ]);
  await execFileAsync("ffmpeg", ["-y", "-ss", "1.1", "-i", mp4Path, "-frames:v", "1", posterPath]);
  process.stdout.write(`${mp4Path}\n${posterPath}\n${frame} frames\n`);
} finally {
  await rm(frameDir, { recursive: true, force: true });
}
