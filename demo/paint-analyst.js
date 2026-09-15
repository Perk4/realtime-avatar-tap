import { HEIGHT, WIDTH } from "./avatar-scene.js";
import { paintHud } from "./paint-hud.js";

export function paintAnalyst(g, scene) {
  paintStudio(g);
  paintWhiteboard(g);

  const cx = 392;
  const cy = 142 + scene.bounce + (scene.idleBreathe ?? 0);
  g.save();
  g.translate(cx, cy);
  g.rotate(scene.tilt + (scene.nod ?? 0));

  paintTorso(g);
  paintTie(g);
  paintNeck(g);
  paintHead(g, scene);
  paintGlasses(g, scene);

  g.restore();

  paintDesk(g);
  paintLaptop(g);
  paintMug(g);
  paintHud(g, scene, "   analyst");
}

function paintStudio(g) {
  g.fillRect(0, 0, WIDTH, HEIGHT, "#6d7a82");
  g.fillEllipse(520, 80, 220, 90, "#8a969c");
  g.fillEllipse(120, 40, 160, 70, "#7b888f");
  g.fillRect(0, 0, 18, HEIGHT, "#c5cdd1");
  g.fillRect(WIDTH - 14, 0, 14, HEIGHT, "#9aa6ad");
}

function paintWhiteboard(g) {
  g.fillRoundRect(18, 22, 168, 214, 8, "#3a4044");
  g.fillRoundRect(24, 28, 156, 202, 6, "#f4f7fb");
  g.strokeLine(40, 52, 92, 44, "#5b4db3", 2);
  g.strokeLine(40, 52, 48, 118, "#5b4db3", 2);
  g.strokeLine(48, 118, 110, 96, "#5b4db3", 2);
  g.fillRect(44, 128, 18, 52, "#c9d2e0");
  g.fillRect(68, 148, 18, 32, "#4f6fa8");
  g.fillRect(92, 136, 18, 44, "#d27a3a");
  g.fillEllipse(52, 92, 10, 8, "#c43b3b");
  g.fillEllipse(128, 78, 12, 10, "#2f6b3a");
  g.fillRoundRect(36, 196, 72, 16, 4, "#1a3a6e");
}

function paintTorso(g) {
  g.fillEllipse(0, 108, 102, 52, "#dfe6ea");
  g.fillPolygon(
    [
      { x: -88, y: 72 },
      { x: 88, y: 72 },
      { x: 108, y: 168 },
      { x: -108, y: 168 },
    ],
    "#f3f6f8",
  );
  g.fillRect(-98, 72, 40, 20, "#2f6aa8");
  g.fillRect(58, 72, 40, 20, "#2f6aa8");
  g.fillRoundRect(22, 78, 36, 18, 4, "#2a5f9a");
  g.fillEllipse(36, 86, 4, 4, "#e8eef3");
}

function paintTie(g) {
  g.fillPolygon(
    [
      { x: -11, y: 74 },
      { x: 11, y: 74 },
      { x: 17, y: 160 },
      { x: 0, y: 172 },
      { x: -17, y: 160 },
    ],
    "#1d4e9a",
  );
  g.fillRect(-6, 88, 4, 6, "#e6c84a");
  g.fillRect(2, 102, 5, 5, "#e6c84a");
  g.fillRect(-7, 118, 4, 6, "#e6c84a");
  g.fillRect(3, 136, 5, 5, "#e6c84a");
}

function paintNeck(g) {
  g.fillRoundRect(-18, 38, 36, 58, 12, "#6b3a2c");
  g.fillRect(-12, 42, 10, 46, "#7c4636");
}

function paintHead(g, scene) {
  g.fillRoundRect(-64, -86, 128, 132, 20, "#5a2f24");
  g.fillRoundRect(-60, -84, 120, 126, 18, "#8a4e3a");
  g.fillEllipse(-30, -32, 24, 16, "#a8644c");
  g.fillEllipse(22, -40, 18, 12, "#7a4434");
  g.fillEllipse(54, -10, 12, 24, "#7a4434");
  g.fillEllipse(-62, -8, 12, 20, "#6b3a2c");
  g.fillEllipse(-24, 10, 12, 7, "#6b3a2c");

  paintEye(g, -26, -20, scene);
  paintEye(g, 28, -20, scene);

  const mouthW = 18 + scene.mouthH * 0.45;
  const mouthY = 40;
  g.fillEllipse(0, mouthY, mouthW, Math.max(4, scene.mouthH * 0.58), "#4a1c18");
  if (scene.mouthH > 12) {
    g.fillEllipse(0, mouthY + scene.mouthH * 0.08, mouthW * 0.55, scene.mouthH * 0.22, "#8a3a32");
  }
}

function paintEye(g, x, y, scene) {
  g.fillEllipse(x, y, 14, 16, "#f4efe8");
  const glance = scene.pose === "talk" ? Math.sin(scene.t0Ms / 90) * 3 : 0;
  g.fillEllipse(x + glance, y + 2, 7, 8, "#1b1410");
  g.fillEllipse(x + glance + 2, y - 2, 2.4, 2.4, "#f7f3ea");
}

function paintGlasses(g, scene) {
  const drop = (scene.glasses ?? 0) * 10;
  const y = -22 + drop;
  g.fillRoundRect(-48, y - 12, 44, 32, 7, "#d7b44a");
  g.fillRoundRect(-44, y - 8, 36, 24, 5, "#8a4e3a");
  g.fillEllipse(-26, y + 4, 11, 9, "#f4efe8");
  g.fillRoundRect(8, y - 12, 44, 32, 7, "#d7b44a");
  g.fillRoundRect(12, y - 8, 36, 24, 5, "#8a4e3a");
  g.fillEllipse(30, y + 4, 11, 9, "#f4efe8");
  g.fillRect(-6, y + 2, 18, 5, "#d7b44a");
  g.fillRect(-52, y - 2, 8, 3, "#c9a43e");
  g.fillRect(48, y - 2, 8, 3, "#c9a43e");
}

function paintDesk(g) {
  g.fillEllipse(WIDTH / 2, HEIGHT - 18, 340, 48, "#163a72");
  g.fillRect(0, HEIGHT - 78, WIDTH, 40, "#1b4584");
}

function paintLaptop(g) {
  g.fillRoundRect(78, 268, 132, 10, 3, "#c5ccd2");
  g.fillRoundRect(88, 196, 112, 76, 6, "#d7dee4");
  g.fillRoundRect(96, 204, 96, 58, 4, "#1b2430");
  g.fillRect(108, 248, 18, 6, "#3ec3e8");
  g.fillRect(130, 248, 18, 6, "#3ec3e8");
  g.fillRect(152, 248, 18, 6, "#3ec3e8");
}

function paintMug(g) {
  g.fillRoundRect(248, 248, 36, 42, 8, "#1d4e9a");
  g.fillEllipse(266, 248, 18, 6, "#163a72");
  g.fillEllipse(266, 252, 12, 4, "#2f6aa8");
  g.fillRoundRect(280, 258, 14, 18, 6, "#1d4e9a");
  g.fillRoundRect(256, 262, 20, 10, 3, "#f3f6f8");
}
