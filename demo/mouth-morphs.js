/**
 * Bind-pose morph deltas for the Quaternius Superhero Male head.
 * Keep the region on the lips/chin so the nose does not turn into a snout.
 * Texture visemes paint the authored mouth slit only (u≈0.186, v≈0.226–0.235).
 * The nose island sits at v≈0.179–0.216 — never paint there, and never paint teeth white.
 */

export const MOUTH_CENTER = { x: 0, y: 1.656, z: 0.114 };

/** Albedo mouth slit on T_Analyst_Broadcast.png (1024², glTF v-down / canvas y-down). */
export const MOUTH_ALBEDO = { cx: 191, cy: 231, restW: 14, restH: 4 };

/** Inner-mouth cavity island (separate UV, visible only if the jaw opens onto it). */
export const INNER_MOUTH_ALBEDO = { cx: 128, cy: 706 };

/** Nose island max canvas-y. Face viseme paint must stay strictly below this. */
export const NOSE_ALBEDO_MAX_Y = 222;

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

    jaw[i * 3 + 1] = -0.016 * chin * lower - 0.008 * lip * lower + 0.005 * lip * upper;
    jaw[i * 3 + 2] = -0.005 * lip;

    lift[i * 3 + 1] = 0.012 * lip * upper;
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

/**
 * Face-island ellipse for a viseme, or null when the authored slit should stay.
 * Grown down into the chin so the top never crosses {@link NOSE_ALBEDO_MAX_Y}.
 */
export function visemePaintEllipse(viseme) {
  const open = viseme.jawMorph;
  const wide = viseme.wideMorph;
  const funnel = viseme.funnel;
  if (open < 0.12 && wide < 0.15 && funnel < 0.2) {
    return null;
  }
  const rx = 6.5 + wide * 6 + funnel * 1.5;
  const ry = 1.4 + open * 3.4 + funnel * 0.8;
  const cy = MOUTH_ALBEDO.cy + ry * 0.58;
  return { cx: MOUTH_ALBEDO.cx, cy, rx, ry };
}

export function paintMouthViseme(ctx, viseme) {
  const face = visemePaintEllipse(viseme);
  if (!face) {
    return;
  }
  ctx.save();
  const inner = INNER_MOUTH_ALBEDO;
  const innerRx = 8 + viseme.wideMorph * 5;
  const innerRy = 4 + viseme.jawMorph * 6;
  ctx.fillStyle = "#1a0808";
  ctx.beginPath();
  ctx.ellipse(inner.cx, inner.cy, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
