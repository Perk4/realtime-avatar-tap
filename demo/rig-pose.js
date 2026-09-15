const MOUTH_OPEN = {
  closed: 0,
  narrow: 0.32,
  open: 0.68,
  wide: 1,
};

const VISEMES = {
  closed: {
    jaw: 0.03,
    jawMorph: 0.03,
    wideMorph: 0.02,
    funnel: 0.04,
    lift: 0.02,
    cavityX: 0.88,
    cavityY: 0.16,
    cavityZ: 1,
    teeth: false,
  },
  narrow: {
    jaw: 0.11,
    jawMorph: 0.28,
    wideMorph: 0.1,
    funnel: 0.82,
    lift: 0.22,
    cavityX: 0.72,
    cavityY: 0.62,
    cavityZ: 1.06,
    teeth: true,
  },
  open: {
    jaw: 0.2,
    jawMorph: 0.66,
    wideMorph: 0.32,
    funnel: 0.16,
    lift: 0.52,
    cavityX: 1.18,
    cavityY: 1.08,
    cavityZ: 1,
    teeth: true,
  },
  wide: {
    jaw: 0.3,
    jawMorph: 0.94,
    wideMorph: 0.92,
    funnel: 0.06,
    lift: 0.4,
    cavityX: 1.46,
    cavityY: 1.34,
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
