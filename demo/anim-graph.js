export const GESTURES = ["idle", "nod", "glasses"];

const NOD_MS = 420;
const GLASSES_MS = 520;
const NOD_AFTER_TALK_MS = 80;
const NOD_WINDOW_MS = 160;
const GLASSES_EVERY_MS = 2800;
const AUTO_COOLDOWN_MS = 800;

export function createGraph() {
  return {
    active: "idle",
    startedAt: 0,
    lastTalkAt: null,
    lastAutoAt: 0,
  };
}

export function triggerGesture(graph, gesture, nowMs) {
  if (gesture !== "idle" && gesture !== "nod" && gesture !== "glasses") {
    throw new Error("gesture");
  }
  graph.active = gesture;
  graph.startedAt = nowMs;
}

export function tickGraph(graph, block, nowMs) {
  if (block.pose === "talk") {
    graph.lastTalkAt = nowMs;
  }

  expireActive(graph, nowMs);
  maybeAutoTrigger(graph, block, nowMs);

  const progress = gestureProgress(graph, nowMs);
  return {
    gesture: graph.active,
    nod: graph.active === "nod" ? Math.sin(progress * Math.PI) * -0.22 : 0,
    glasses: graph.active === "glasses" ? Math.sin(progress * Math.PI) : 0,
    idleBreathe: graph.active === "idle" ? Math.sin(nowMs / 380) * 2.5 : 0,
  };
}

function expireActive(graph, nowMs) {
  const duration = gestureDuration(graph.active);
  if (Number.isFinite(duration) && nowMs - graph.startedAt >= duration) {
    graph.active = "idle";
    graph.startedAt = nowMs;
  }
}

function maybeAutoTrigger(graph, block, nowMs) {
  if (graph.active !== "idle") {
    return;
  }
  if (
    block.pose === "rest" &&
    graph.lastTalkAt !== null &&
    nowMs - graph.lastTalkAt >= NOD_AFTER_TALK_MS &&
    nowMs - graph.lastTalkAt < NOD_AFTER_TALK_MS + NOD_WINDOW_MS
  ) {
    triggerGesture(graph, "nod", nowMs);
    graph.lastAutoAt = nowMs;
    return;
  }
  if (nowMs - graph.lastAutoAt < AUTO_COOLDOWN_MS) {
    return;
  }
  if (block.pose === "rest" && nowMs - graph.lastAutoAt >= GLASSES_EVERY_MS) {
    triggerGesture(graph, "glasses", nowMs);
    graph.lastAutoAt = nowMs;
  }
}

function gestureDuration(gesture) {
  switch (gesture) {
    case "nod":
      return NOD_MS;
    case "glasses":
      return GLASSES_MS;
    case "idle":
      return Number.POSITIVE_INFINITY;
    default: {
      const _exhaustive = gesture;
      throw new Error(String(_exhaustive));
    }
  }
}

function gestureProgress(graph, nowMs) {
  const duration = gestureDuration(graph.active);
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (nowMs - graph.startedAt) / duration));
}
