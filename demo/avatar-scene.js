import { paintHud } from "./paint-hud.js";

export const WIDTH = 640;
export const HEIGHT = 360;

const MOUTH_HEIGHT = {
  closed: 5,
  narrow: 18,
  open: 34,
  wide: 54,
};

export function sceneFromBlock(block) {
  const bounce = block.pose === "talk" ? Math.sin(block.t0Ms / 70) * 12 : 0;
  const tilt = block.pose === "talk" ? Math.sin(block.t0Ms / 110) * 0.08 : 0;
  return {
    t0Ms: block.t0Ms,
    durationMs: block.durationMs,
    lip: block.lip,
    pose: block.pose,
    bounce,
    tilt,
    mouthH: MOUTH_HEIGHT[block.lip],
  };
}

export function paintAvatar(g, scene) {
  g.fillRect(0, 0, WIDTH, HEIGHT, "#17211c");
  g.fillRect(24, 24, WIDTH - 48, HEIGHT - 48, "#101813");

  const cx = WIDTH / 2;
  const cy = HEIGHT * 0.46 + scene.bounce + (scene.idleBreathe ?? 0);
  g.save();
  g.translate(cx, cy);
  g.rotate(scene.tilt + (scene.nod ?? 0));

  g.fillEllipse(18, 28, 132, 158, "#c48a3a");
  g.fillEllipse(0, 0, 124, 150, "#e2b15a");
  g.fillEllipse(-36, -18, 38, 28, "#edc578");
  g.fillEllipse(40, -8, 22, 16, "#d69a45");

  drawEye(g, -42, -38, scene);
  drawEye(g, 42, -38, scene);

  g.fillEllipse(0, 12, 18, 10, "#c47a4a");

  const mouthW = 28 + scene.mouthH * 0.55;
  g.fillEllipse(0, 58, mouthW, scene.mouthH, "#4a1f1a");
  if (scene.mouthH > 12) {
    g.fillEllipse(0, 58 + scene.mouthH * 0.18, mouthW * 0.62, scene.mouthH * 0.38, "#8a3a32");
  }

  g.restore();
  paintHud(g, scene, "   tater");
}

function drawEye(g, x, y, scene) {
  g.fillEllipse(x, y, 22, 26, "#f4efe4");
  const glance = scene.pose === "talk" ? Math.sin(scene.t0Ms / 90) * 4 : 0;
  g.fillEllipse(x + glance, y + 4, 10, 12, "#1b1410");
  g.fillEllipse(x + glance + 3, y, 3.5, 3.5, "#f7f3ea");
}
