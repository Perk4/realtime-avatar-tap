import assert from "node:assert/strict";
import { test } from "node:test";
import { createGraph, tickGraph, triggerGesture } from "./anim-graph.js";
import { composeScene, parseCharacter, paintCharacter } from "./characters.js";
import { emitAvatarBlock, ingestAudioChunk, openSession } from "../src/avatar-tap.ts";
import { WINDOW_SAMPLES } from "./pcm.js";
import { createRaster } from "./raster.js";

test("parseCharacter falls back to tater", () => {
  assert.equal(parseCharacter("analyst"), "analyst");
  assert.equal(parseCharacter("blocks"), "blocks");
  assert.equal(parseCharacter("tater"), "tater");
  assert.equal(parseCharacter(null), "tater");
  assert.equal(parseCharacter("lemon"), "tater");
});

test("conversation path still ingests reply audio, not caller audio", () => {
  const caller = new Int16Array(WINDOW_SAMPLES).fill(32767);
  const reply = new Int16Array(WINDOW_SAMPLES).fill(12000);
  const session = openSession({ audioIn: "reply", videoOut: "avatar" });
  ingestAudioChunk(session, reply);
  const block = emitAvatarBlock(session);
  assert.equal(block.pose, "talk");
  assert.notEqual(block.lip, "closed");

  const ignored = openSession({ audioIn: "caller", videoOut: "avatar" });
  const rest = emitAvatarBlock(ignored);
  assert.equal(rest.lip, "closed");
  assert.equal(rest.pose, "rest");
  assert.equal(caller[0], 32767);
});

test("animation graph nod sits on top of reply visemes", () => {
  const session = openSession({ audioIn: "reply", videoOut: "avatar" });
  ingestAudioChunk(session, new Int16Array(WINDOW_SAMPLES).fill(12000));
  const block = emitAvatarBlock(session);
  const graph = createGraph();
  triggerGesture(graph, "nod", 0);
  const tick = tickGraph(graph, block, 80);
  const scene = composeScene(block, tick);
  assert.equal(scene.lip, block.lip);
  assert.equal(scene.pose, "talk");
  assert.ok(scene.nod < 0);
  assert.equal(scene.gesture, "nod");
});

test("each character paints a different rest frame", () => {
  const rest = {
    t0Ms: 0,
    durationMs: 40,
    lip: "closed",
    pose: "rest",
    bounce: 0,
    tilt: 0,
    mouthH: 5,
    gesture: "idle",
    nod: 0,
    glasses: 0,
    idleBreathe: 0,
  };
  const hashes = ["tater", "analyst", "blocks"].map((id) => {
    const raster = createRaster();
    paintCharacter(id, raster.gfx, rest);
    return hashPixels(raster.pixels);
  });
  assert.notEqual(hashes[0], hashes[1]);
  assert.notEqual(hashes[1], hashes[2]);
  assert.notEqual(hashes[0], hashes[2]);
});

test("analyst and blocks open the mouth when lip is wide", () => {
  const closed = baseScene("closed", 5);
  const wide = baseScene("wide", 54);
  for (const id of ["analyst", "blocks", "tater"]) {
    const rest = createRaster();
    const talk = createRaster();
    paintCharacter(id, rest.gfx, closed);
    paintCharacter(id, talk.gfx, wide);
    assert.notEqual(hashPixels(rest.pixels), hashPixels(talk.pixels), id);
  }
});

function baseScene(lip, mouthH) {
  return {
    t0Ms: 0,
    durationMs: 40,
    lip,
    pose: lip === "closed" ? "rest" : "talk",
    bounce: 0,
    tilt: 0,
    mouthH,
    gesture: "idle",
    nod: 0,
    glasses: 0,
    idleBreathe: 0,
  };
}

function hashPixels(pixels) {
  let hash = 0;
  for (let i = 0; i < pixels.length; i += 17) {
    hash = (hash * 33 + pixels[i]) >>> 0;
  }
  return hash;
}
