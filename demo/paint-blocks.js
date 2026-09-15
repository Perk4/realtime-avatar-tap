import { HEIGHT, WIDTH } from "./avatar-scene.js";
import { paintHud } from "./paint-hud.js";

export function paintBlocks(g, scene) {
  g.fillRect(0, 0, WIDTH, HEIGHT, "#141820");
  g.fillEllipse(420, 40, 180, 70, "#243044");
  g.fillRect(0, HEIGHT - 86, WIDTH, 86, "#1b2433");
  g.fillPolygon(
    [
      { x: 40, y: HEIGHT - 86 },
      { x: WIDTH - 40, y: HEIGHT - 86 },
      { x: WIDTH - 8, y: HEIGHT },
      { x: 8, y: HEIGHT },
    ],
    "#24324a",
  );

  const cx = WIDTH / 2 - 40;
  const cy = 96 + scene.bounce + (scene.idleBreathe ?? 0);
  g.save();
  g.translate(cx, cy);
  g.rotate(scene.tilt + (scene.nod ?? 0));

  isoCube(g, -70, 118, 140, 70, 36, "#e8eef4", "#c9d4de", "#9aadb8");
  isoCube(g, -18, 70, 36, 54, 18, "#8a4e3a", "#6b3a2c", "#4a281e");

  const glassesDrop = (scene.glasses ?? 0) * 18;
  isoCube(g, -52, -8, 104, 88, 28, "#c47a52", "#8a4e3a", "#5a3224");
  isoCube(g, -44, -2 + glassesDrop, 36, 22, 10, "#e6c84a", "#c9a43e", "#8a7020");
  isoCube(g, 8, -2 + glassesDrop, 36, 22, 10, "#e6c84a", "#c9a43e", "#8a7020");

  const mouthH = Math.max(10, scene.mouthH * 0.9);
  isoCube(g, -18, 44, 36, mouthH, 12, "#4a1c18", "#2a1010", "#1a0808");

  g.restore();
  paintHud(g, scene, "   blocks");
}

function isoCube(g, x, y, w, h, d, top, left, right) {
  const hx = w / 2;
  const dz = d * 0.55;
  g.fillPolygon(
    [
      { x, y },
      { x: x + hx, y: y - dz },
      { x: x + w, y },
      { x: x + hx, y: y + dz },
    ],
    top,
  );
  g.fillPolygon(
    [
      { x, y },
      { x: x + hx, y: y + dz },
      { x: x + hx, y: y + dz + h },
      { x, y: y + h },
    ],
    left,
  );
  g.fillPolygon(
    [
      { x: x + hx, y: y + dz },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x: x + hx, y: y + dz + h },
    ],
    right,
  );
}
