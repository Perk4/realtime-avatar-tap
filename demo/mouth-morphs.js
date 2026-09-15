/**
 * Bind-pose morph deltas for the Quaternius Superhero Male head.
 * Keep the region on the lips/chin so the nose does not turn into a snout.
 * Texture visemes paint the authored mouth island (u≈0.186, v≈0.224 on 1024²).
 */

export const MOUTH_CENTER = { x: 0, y: 1.656, z: 0.114 };

/** Albedo mouth island on T_Analyst_Broadcast.png (1024², glTF v-down). */
export const MOUTH_ALBEDO = { cx: 190, cy: 230, restW: 18, restH: 5 };

export function mouthFalloff(x, y, z, radius) {
  const dx = x - MOUTH_CENTER.x;
  const dy = y - MOUTH_CENTER.y;
  const dz = z - MOUTH_CENTER.z;
  const d = Math.sqrt(dx * dx + dy * dy * 1.15 + dz * dz);
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
    if (y < 1.632 || y > 1.668 || z < 0.08 || Math.abs(x) > 0.042) {
      continue;
    }
    const lip = mouthFalloff(x, y, z, 0.028);
    const chin = y < MOUTH_CENTER.y - 0.004 ? mouthFalloff(x, y + 0.012, z, 0.036) : 0;
    if (lip < 0.01 && chin < 0.01) {
      continue;
    }
    const lower = y <= MOUTH_CENTER.y ? 1 : 0;
    const upper = y >= MOUTH_CENTER.y ? 1 : 0;
    const side = x === 0 ? 0 : Math.sign(x);

    jaw[i * 3 + 1] = -0.012 * chin * lower - 0.006 * lip * lower + 0.004 * lip * upper;
    jaw[i * 3 + 2] = -0.004 * lip;

    lift[i * 3 + 1] = 0.01 * lip * upper;
    lift[i * 3 + 2] = -0.003 * lip * upper;

    wide[i * 3] = 0.01 * side * lip;
    wide[i * 3 + 1] = 0.0015 * lip;

    funnel[i * 3] = -0.007 * side * lip;
    funnel[i * 3 + 2] = 0.006 * lip;
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

export function paintMouthViseme(ctx, viseme) {
  const open = viseme.jawMorph;
  const wide = viseme.wideMorph;
  const funnel = viseme.funnel;
  if (open < 0.12 && wide < 0.15 && funnel < 0.2) {
    return;
  }
  const { cx, cy } = MOUTH_ALBEDO;
  const mw = 9 + wide * 11 + funnel * 3;
  const mh = 2.4 + open * 9 + funnel * 3;
  ctx.save();
  ctx.fillStyle = "#2a1010";
  ctx.beginPath();
  ctx.ellipse(cx, cy + mh * 0.15, mw, mh, 0, 0, Math.PI * 2);
  ctx.fill();
  if (viseme.teeth && open > 0.2) {
    ctx.fillStyle = "#f2ece4";
    ctx.beginPath();
    ctx.ellipse(cx, cy - mh * 0.22, mw * 0.7, Math.max(1.2, mh * 0.32), 0, 0, Math.PI);
    ctx.fill();
  }
  ctx.strokeStyle = "#8a4e3a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy + mh * 0.15, mw, mh, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
