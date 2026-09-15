import { HEIGHT, WIDTH } from "./avatar-scene.js";

export function paintHud(g, scene, extra) {
  g.fillRect(24, HEIGHT - 64, WIDTH - 48, 40, "#0c120f");
  const gesture = scene.gesture ?? "idle";
  g.fillText(
    `t0 ${scene.t0Ms}ms   lip ${scene.lip}   pose ${scene.pose}   ${gesture}${extra ?? ""}`,
    40,
    HEIGHT - 38,
    "#d7e6d4",
  );
}
