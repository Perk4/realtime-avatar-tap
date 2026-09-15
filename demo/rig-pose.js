const MOUTH_OPEN = {
  closed: 0,
  narrow: 0.32,
  open: 0.68,
  wide: 1,
};

export function mouthOpenFromLip(lip) {
  return MOUTH_OPEN[lip] ?? 0;
}

export function rigPoseFromScene(scene) {
  return {
    lip: scene.lip,
    gesture: scene.gesture ?? "idle",
    talking: scene.pose === "talk",
    mouthOpen: mouthOpenFromLip(scene.lip),
    headPitch: (scene.tilt ?? 0) + (scene.nod ?? 0),
    glassesDrop: scene.glasses ?? 0,
    breathe: scene.idleBreathe ?? 0,
    bounce: scene.bounce ?? 0,
  };
}
