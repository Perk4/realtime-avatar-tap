import { mkdir, unlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { composeScene, paintCharacter } from "./characters.js";
import { createGraph, tickGraph, triggerGesture } from "./anim-graph.js";
import { createRaster, toPpm } from "./raster.js";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(repoRoot, "artifacts", "characters");

const restBlock = { t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" };
const talkBlock = { t0Ms: 80, durationMs: 40, lip: "wide", pose: "talk" };

await mkdir(outDir, { recursive: true });

const shots = [];
for (const id of ["tater", "analyst", "blocks"]) {
  shots.push([id, "rest", restFrame(id)]);
  shots.push([id, "talk", talkFrame(id)]);
  shots.push([id, "nod", nodFrame(id)]);
}

for (const [id, pose, pixels] of shots) {
  const ppm = path.join(outDir, `${id}-${pose}.ppm`);
  const png = path.join(outDir, `${id}-${pose}.png`);
  await writeFile(ppm, toPpm(pixels));
  await execFileAsync("ffmpeg", ["-y", "-i", ppm, png]);
  await unlink(ppm);
  process.stdout.write(`${png}\n`);
}

function restFrame(id) {
  const graph = createGraph();
  return paint(id, restBlock, tickGraph(graph, restBlock, 0));
}

function talkFrame(id) {
  const graph = createGraph();
  return paint(id, talkBlock, tickGraph(graph, talkBlock, 80));
}

function nodFrame(id) {
  const graph = createGraph();
  triggerGesture(graph, "nod", 0);
  return paint(id, talkBlock, tickGraph(graph, talkBlock, 160));
}

function paint(id, block, tick) {
  const raster = createRaster();
  paintCharacter(id, raster.gfx, composeScene(block, tick));
  return raster.pixels;
}
