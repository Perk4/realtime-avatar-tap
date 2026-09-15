const MOUTH_OPEN = {
  closed: 0,
  narrow: 0.32,
  open: 0.68,
  wide: 1,
};

const VISEMES = {
  closed: {
    jaw: 0.03,
    jawMorph: 0.04,
    wideMorph: 0.02,
    funnel: 0.05,
    cavityX: 0.88,
    cavityY: 0.16,
    cavityZ: 1,
    teeth: false,
  },
  narrow: {
    jaw: 0.11,
    jawMorph: 0.3,
    wideMorph: 0.12,
    funnel: 0.74,
    cavityX: 0.7,
    cavityY: 0.58,
    cavityZ: 1.06,
    teeth: true,
  },
  open: {
    jaw: 0.2,
    jawMorph: 0.58,
    wideMorph: 0.4,
    funnel: 0.2,
    cavityX: 1.14,
    cavityY: 0.95,
    cavityZ: 1,
    teeth: true,
  },
  wide: {
    jaw: 0.3,
    jawMorph: 0.88,
    wideMorph: 0.84,
    funnel: 0.08,
    cavityX: 1.4,
    cavityY: 1.22,
    cavityZ: 1,
    teeth: true,
  },
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
