const MOUTH_OPEN = {
  closed: 0,
  narrow: 0.32,
  open: 0.68,
  wide: 1,
};

const VISEMES = {
  closed: { jaw: 0.04, cavityX: 0.92, cavityY: 0.2, cavityZ: 1, teeth: false },
  narrow: { jaw: 0.12, cavityX: 1.12, cavityY: 0.62, cavityZ: 1, teeth: true },
  open: { jaw: 0.2, cavityX: 1.28, cavityY: 1.05, cavityZ: 1, teeth: true },
  wide: { jaw: 0.32, cavityX: 1.42, cavityY: 1.55, cavityZ: 1, teeth: true },
};

export function mouthOpenFromLip(lip) {
  return MOUTH_OPEN[lip] ?? 0;
}

export function visemeFromLip(lip) {
  return VISEMES[lip] ?? VISEMES.closed;
}

export function rigPoseFromScene(scene) {
  const lip = scene.lip;
  return {
    lip,
    gesture: scene.gesture ?? "idle",
    talking: scene.pose === "talk",
    viseme: visemeFromLip(lip),
    mouthOpen: mouthOpenFromLip(lip),
    headPitch: (scene.tilt ?? 0) + (scene.nod ?? 0),
    glassesDrop: scene.glasses ?? 0,
    breathe: scene.idleBreathe ?? 0,
    bounce: scene.bounce ?? 0,
  };
}
