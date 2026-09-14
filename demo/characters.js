import { paintAvatar, sceneFromBlock } from "./avatar-scene.js";
import { paintAnalyst } from "./paint-analyst.js";
import { paintBlocks } from "./paint-blocks.js";

export const CHARACTER_IDS = ["tater", "analyst", "blocks"];

export const CHARACTERS = [
  { id: "tater", label: "Tater (potato)" },
  { id: "analyst", label: "SEC Nation analyst" },
  { id: "blocks", label: "Block head" },
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
  return "tater";
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
