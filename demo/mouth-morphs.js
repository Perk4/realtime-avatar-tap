/**
 * Bind-pose morph deltas for the Quaternius Superhero Male head.
 * The pack has no facial blendshapes. These targets stand in for Oculus-like
 * visemes so emitAvatarBlock lips can drive the mesh while the graph nods.
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
  const lift = new Float32Array(src.length);
  const count = src.length / 3;
  for (let i = 0; i < count; i++) {
    const x = src[i * 3];
    const y = src[i * 3 + 1];
    const z = src[i * 3 + 2];
    if (y < 1.54 || y > 1.73 || z < 0.02 || Math.abs(x) > 0.09) {
      continue;
    }
    const lip = mouthFalloff(x, y, z, 0.055);
    const chin = mouthFalloff(x, y + 0.03, z, 0.08);
    if (lip < 0.002 && chin < 0.002) {
      continue;
    }
    const lower = y <= MOUTH_CENTER.y ? 1 : Math.max(0, 1 - (y - MOUTH_CENTER.y) / 0.03);
    const upper = y >= MOUTH_CENTER.y ? 1 : Math.max(0, 1 - (MOUTH_CENTER.y - y) / 0.02);
    const side = x === 0 ? 0 : Math.sign(x);

    jaw[i * 3 + 1] = -0.09 * chin * lower - 0.034 * lip * lower;
    jaw[i * 3 + 2] = -0.048 * lip * lower - 0.012 * chin * lower;

    lift[i * 3 + 1] = 0.038 * lip * upper;
    lift[i * 3 + 2] = -0.02 * lip * upper;

    wide[i * 3] = 0.062 * side * lip;
    wide[i * 3 + 1] = 0.006 * lip * upper - 0.01 * lip * lower;
    wide[i * 3 + 2] = -0.012 * lip;

    funnel[i * 3] = -0.028 * side * lip;
    funnel[i * 3 + 2] = 0.04 * lip;
    funnel[i * 3 + 1] = -0.008 * lip * lower + 0.006 * lip * upper;
  }
  return { jaw, wide, funnel, lift };
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
  if (dict.lift !== undefined) {
    infl[dict.lift] = viseme.lift ?? 0;
  }
}
