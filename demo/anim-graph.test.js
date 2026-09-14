import assert from "node:assert/strict";
import { test } from "node:test";
import { createGraph, tickGraph, triggerGesture } from "./anim-graph.js";

const rest = { t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" };
const talk = { t0Ms: 40, durationMs: 40, lip: "wide", pose: "talk" };

test("idle rest breathes and does not move the nod channel", () => {
  const graph = createGraph();
  const tick = tickGraph(graph, rest, 380);
  assert.equal(tick.gesture, "idle");
  assert.equal(tick.nod, 0);
  assert.notEqual(tick.idleBreathe, 0);
});

test("talk then rest auto-triggers a nod without changing lips", () => {
  const graph = createGraph();
  tickGraph(graph, talk, 40);
  tickGraph(graph, rest, 160);
  const tick = tickGraph(graph, rest, 280);
  assert.equal(tick.gesture, "nod");
  assert.ok(tick.nod < 0);
  assert.equal(rest.lip, "closed");
});

test("manual glasses trigger coexists with a wide viseme", () => {
  const graph = createGraph();
  triggerGesture(graph, "glasses", 0);
  const tick = tickGraph(graph, talk, 120);
  assert.equal(tick.gesture, "glasses");
  assert.ok(tick.glasses > 0);
  assert.equal(talk.lip, "wide");
});

test("unknown gesture throws", () => {
  const graph = createGraph();
  assert.throws(() => triggerGesture(graph, "dance", 0), /gesture/);
});
