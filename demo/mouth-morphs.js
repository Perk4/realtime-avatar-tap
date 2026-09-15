/**
 * Bind-pose morph deltas for the Quaternius Superhero Male head.
 * The pack has no facial blendshapes; these targets are authored here so
 * visemeFromLip can drive jaw / wide / funnel together with the animation graph.
 */

export const MOUTH_CENTER = { x: 0, y: 1.656, z: 0.114 };

export function mouthFalloff(x, y, z, radius) {
  const dx = x - MOUTH_CENTER.x;
  const dy = y - MOUTH_CENTER.y;
  const dz = z - MOUTH_CENTER.z;
  const d = Math.sqrt(dx * dx + dy * dy * 0.82 + dz * dz);
  const t = Math.max(0, 1 - d / radius);
  return t * t;
}

export function buildMouthMorphs(positions) {
  if (!(positions instanceof Float32Array) && !Array.isArray(positions)) {
    throw new Error("positions");
  }
  const src = positions instanceof Float32Array ? positions : Float32Array.from(positions);
  if (src.length % 3 !== 0) {
    throw new Error("positions length");
  }
  const jaw = new Float32Array(src.length);
  const wide = new Float32Array(src.length);
  const funnel = new Float32Array(src.length);
  const count = src.length / 3;
  for (let i = 0; i < count; i++) {
    const x = src[i * 3];
    const y = src[i * 3 + 1];
    const z = src[i * 3 + 2];
    if (y < 1.54 || y > 1.73 || z < 0.02 || Math.abs(x) > 0.09) {
      continue;
    }
    const lip = mouthFalloff(x, y, z, 0.05);
    const chin = mouthFalloff(x, y + 0.028, z, 0.072);
    if (lip < 0.002 && chin < 0.002) {
      continue;
    }
    const lower = y <= MOUTH_CENTER.y ? 1 : Math.max(0, 1 - (y - MOUTH_CENTER.y) / 0.028);
    const upper = y >= MOUTH_CENTER.y ? 1 : Math.max(0, 1 - (MOUTH_CENTER.y - y) / 0.018);
    const side = x === 0 ? 0 : Math.sign(x);

    jaw[i * 3 + 1] = -0.052 * chin * lower - 0.02 * lip * lower + 0.014 * lip * upper;
    jaw[i * 3 + 2] = -0.03 * lip;

    wide[i * 3] = 0.038 * side * lip;
    wide[i * 3 + 1] = 0.005 * lip;
    wide[i * 3 + 2] = -0.006 * lip;

    funnel[i * 3] = -0.016 * side * lip;
    funnel[i * 3 + 2] = 0.024 * lip;
    funnel[i * 3 + 1] = -0.004 * lip * lower;
  }
  return { jaw, wide, funnel };
}

export function applyMorphInfluences(mesh, viseme) {
  const infl = mesh.morphTargetInfluences;
  const dict = mesh.morphTargetDictionary;
  if (!infl || !dict) {
    return;
  }
  if (dict.jaw !== undefined) {
    infl[dict.jaw] = viseme.jawMorph;
  }
  if (dict.wide !== undefined) {
    infl[dict.wide] = viseme.wideMorph;
  }
  if (dict.funnel !== undefined) {
    infl[dict.funnel] = viseme.funnel;
  }
}
