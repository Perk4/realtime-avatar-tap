import { paintAvatar, sceneFromBlock } from "./avatar-scene.js";
import { paintAnalyst } from "./paint-analyst.js";
import { paintBlocks } from "./paint-blocks.js";

export const CHARACTER_IDS = ["analyst", "blocks", "tater"];

export const CHARACTERS = [
  { id: "analyst", label: "SEC Nation analyst (3D)", pipeline: "webgl3d" },
  { id: "blocks", label: "Block head (3D)", pipeline: "webgl3d" },
  { id: "tater", label: "Tater (2D fallback)", pipeline: "canvas2d" },
];

const PAINT = {
  tater: paintAvatar,
  analyst: paintAnalyst,
  blocks: paintBlocks,
};

export function parseCharacter(raw) {
  if (raw === "analyst" || raw === "blocks" || raw === "tater") {
    return raw;
  }
  return "analyst";
}

export function characterPipeline(id) {
  return id === "tater" ? "canvas2d" : "webgl3d";
}

export function composeScene(block, tick) {
  return {
    ...sceneFromBlock(block),
    gesture: tick.gesture,
    nod: tick.nod,
    glasses: tick.glasses,
    idleBreathe: tick.idleBreathe,
  };
}

export function paintCharacter(id, g, scene) {
  const paint = PAINT[id] ?? PAINT.tater;
  paint(g, scene);
}
