import assert from "node:assert/strict";
import { test } from "node:test";
import { createGraph, tickGraph, triggerGesture } from "./anim-graph.js";
import { composeScene } from "./characters.js";
import { mouthOpenFromLip, rigPoseFromScene } from "./rig-pose.js";
import { emitAvatarBlock, ingestAudioChunk, openSession } from "../src/avatar-tap.ts";
import { WINDOW_SAMPLES } from "./pcm.js";

test("wide reply viseme opens the rig mouth more than silence", () => {
  const quiet = openSession({ audioIn: "reply", videoOut: "avatar" });
  ingestAudioChunk(quiet, new Int16Array(WINDOW_SAMPLES));
  const rest = emitAvatarBlock(quiet);
  const loud = openSession({ audioIn: "reply", videoOut: "avatar" });
  ingestAudioChunk(loud, new Int16Array(WINDOW_SAMPLES).fill(12000));
  const talk = emitAvatarBlock(loud);
  assert.equal(rest.lip, "closed");
  assert.ok(mouthOpenFromLip(talk.lip) > mouthOpenFromLip(rest.lip));
  assert.equal(mouthOpenFromLip("wide"), 1);
  assert.equal(mouthOpenFromLip("closed"), 0);
});

test("graph nod changes headPitch and leaves lip on the block", () => {
  const session = openSession({ audioIn: "reply", videoOut: "avatar" });
  ingestAudioChunk(session, new Int16Array(WINDOW_SAMPLES).fill(12000));
  const block = emitAvatarBlock(session);
  const graph = createGraph();
  triggerGesture(graph, "nod", 0);
  const scene = composeScene(block, tickGraph(graph, block, 80));
  const pose = rigPoseFromScene(scene);
  assert.equal(pose.lip, block.lip);
  assert.ok(pose.headPitch < 0);
  assert.ok(pose.mouthOpen > 0);
  assert.equal(pose.talking, true);
});

test("caller pcm still does not move a reply session", () => {
  const caller = new Int16Array(WINDOW_SAMPLES).fill(32767);
  const session = openSession({ audioIn: "reply", videoOut: "avatar" });
  const block = emitAvatarBlock(session);
  assert.equal(block.lip, "closed");
  assert.equal(mouthOpenFromLip(block.lip), 0);
  assert.equal(caller[0], 32767);
});
