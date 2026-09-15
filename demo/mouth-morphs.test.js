import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MOUTH_CENTER,
  NOSE_ALBEDO_MAX_Y,
  buildMouthMorphs,
  mouthFalloff,
  paintMouthViseme,
  visemePaintEllipse,
} from "./mouth-morphs.js";
import { visemeFromLip } from "./rig-pose.js";

test("mouth falloff is 1 at the lip center and 0 far away", () => {
  assert.equal(mouthFalloff(MOUTH_CENTER.x, MOUTH_CENTER.y, MOUTH_CENTER.z, 0.05), 1);
  assert.equal(mouthFalloff(0, 0, 0, 0.05), 0);
});

test("jaw morph drops the chin and pulls the lip opening back", () => {
  const positions = new Float32Array([
    MOUTH_CENTER.x,
    MOUTH_CENTER.y - 0.012,
    MOUTH_CENTER.z,
    2,
    2,
    2,
  ]);
  const morphs = buildMouthMorphs(positions);
  assert.ok(morphs.jaw[1] < -0.004, String(morphs.jaw[1]));
  assert.ok(morphs.jaw[2] <= 0, String(morphs.jaw[2]));
  assert.equal(morphs.jaw[3], 0);
  assert.equal(morphs.jaw[4], 0);
  assert.equal(morphs.jaw[5], 0);
});

test("lift morph raises the upper lip", () => {
  const positions = new Float32Array([
    MOUTH_CENTER.x,
    MOUTH_CENTER.y + 0.012,
    MOUTH_CENTER.z,
  ]);
  const morphs = buildMouthMorphs(positions);
  assert.ok(morphs.lift[1] > 0.001, String(morphs.lift[1]));
});

test("wide and funnel morphs pull corners in opposite directions", () => {
  const positions = new Float32Array([
    0.02,
    MOUTH_CENTER.y,
    MOUTH_CENTER.z,
    -0.02,
    MOUTH_CENTER.y,
    MOUTH_CENTER.z,
  ]);
  const morphs = buildMouthMorphs(positions);
  assert.ok(morphs.wide[0] > 0);
  assert.ok(morphs.wide[3] < 0);
  assert.ok(morphs.funnel[0] < 0);
  assert.ok(morphs.funnel[3] > 0);
  assert.ok(morphs.funnel[2] > 0);
});

test("paintMouthViseme draws a cavity into a 2d context", () => {
  const calls = [];
  const ctx = {
    save() {
      calls.push("save");
    },
    restore() {
      calls.push("restore");
    },
    beginPath() {
      calls.push("beginPath");
    },
    ellipse(...args) {
      calls.push(["ellipse", ...args]);
    },
    fill() {
      calls.push("fill");
    },
    stroke() {
      calls.push("stroke");
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
  };
  paintMouthViseme(ctx, visemeFromLip("wide"));
  assert.ok(calls.includes("save"));
  assert.ok(calls.includes("fill"));
  assert.ok(calls.includes("restore"));
  const ellipse = calls.find((item) => Array.isArray(item) && item[0] === "ellipse");
  assert.ok(ellipse, "expected a mouth ellipse");
  assert.ok(Math.abs(ellipse[1] - 128) < 2, String(ellipse[1]));
});

test("talk visemes paint below the nose island and never use teeth white", () => {
  for (const lip of ["narrow", "open", "wide"]) {
    const face = visemePaintEllipse(visemeFromLip(lip));
    assert.ok(face, lip);
    assert.ok(face.cy - face.ry > NOSE_ALBEDO_MAX_Y, `${lip} top ${face.cy - face.ry}`);
  }
  const fills = [];
  const ctx = {
    save() {},
    restore() {},
    beginPath() {},
    ellipse() {},
    fill() {
      fills.push(ctx.fillStyle);
    },
    stroke() {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
  };
  paintMouthViseme(ctx, visemeFromLip("wide"));
  assert.equal(fills.includes("#f2ece4"), false);
  assert.ok(fills.every((color) => color.startsWith("#") && color !== "#ffffff"));
});

test("closed viseme leaves the authored albedo mouth alone", () => {
  const calls = [];
  const ctx = {
    save() {
      calls.push("save");
    },
    restore() {
      calls.push("restore");
    },
    beginPath() {},
    ellipse() {},
    fill() {
      calls.push("fill");
    },
    stroke() {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
  };
  paintMouthViseme(ctx, visemeFromLip("closed"));
  assert.equal(calls.length, 0);
  assert.equal(visemePaintEllipse(visemeFromLip("closed")), null);
});

test("viseme table keeps graph-safe channels and readable morph steps", () => {
  const closed = visemeFromLip("closed");
  const narrow = visemeFromLip("narrow");
  const open = visemeFromLip("open");
  const wide = visemeFromLip("wide");
  assert.equal(closed.teeth, false);
  assert.equal(wide.teeth, true);
  assert.ok(narrow.funnel > open.funnel);
  assert.ok(wide.jawMorph > open.jawMorph);
  assert.ok(wide.wideMorph > narrow.wideMorph);
  assert.ok(open.lift > narrow.lift);
  assert.ok(open.cavityY > narrow.cavityY);
  assert.ok(wide.cavityY > open.cavityY);
});
