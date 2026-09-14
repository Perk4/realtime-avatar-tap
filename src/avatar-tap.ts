const brand: unique symbol = Symbol("realtime-avatar-tap/session");

export type Session = { readonly [brand]: void };

export type Lip = "closed" | "narrow" | "open" | "wide";
export type Pose = "rest" | "talk";

export type AvatarBlock = {
  readonly t0Ms: number;
  readonly durationMs: number;
  readonly lip: Lip;
  readonly pose: Pose;
};

export type ContinuityFailure = "emit-threw-after-drop" | "clock-rewound";

export class ContinuityError extends Error {
  readonly failure: ContinuityFailure;

  constructor(failure: ContinuityFailure) {
    super(messageFor(failure));
    this.name = "ContinuityError";
    this.failure = failure;
  }
}

export type ContinuityTrace = {
  readonly session: Session;
  readonly before: AvatarBlock;
  readonly after: AvatarBlock;
};

const SAMPLE_RATE_HZ = 16_000;
const BLOCK_MS = 40;
const WINDOW_SAMPLES = (SAMPLE_RATE_HZ * BLOCK_MS) / 1000;
const INT16_SCALE = 1 / 32768;

type SessionState = {
  readonly ring: Float32Array;
  written: number;
  blocksEmitted: number;
};

type FixtureRung = {
  readonly minRms: number;
  readonly lip: Lip;
  readonly pose: Pose;
};

const LADDER: readonly FixtureRung[] = [
  { minRms: 0.01, lip: "narrow", pose: "talk" },
  { minRms: 0.05, lip: "open", pose: "talk" },
  { minRms: 0.2, lip: "wide", pose: "talk" },
];

const states = new WeakMap<Session, SessionState>();

export function openSession(labels: {
  audioIn: string;
  videoOut: string;
}): Session {
  requireLabel(labels.audioIn, "audioIn");
  requireLabel(labels.videoOut, "videoOut");
  const session = Object.freeze({ [brand]: undefined }) as Session;
  states.set(session, {
    ring: new Float32Array(WINDOW_SAMPLES),
    written: 0,
    blocksEmitted: 0,
  });
  return session;
}

export function ingestAudioChunk(session: Session, pcm: Int16Array): void {
  const state = stateOf(session);
  if (pcm.length === 0) {
    return;
  }
  for (const sample of pcm) {
    state.ring[state.written % WINDOW_SAMPLES] = sample * INT16_SCALE;
    state.written += 1;
  }
}

export function emitAvatarBlock(session: Session): AvatarBlock {
  const state = stateOf(session);
  const { lip, pose } = lookup(rmsOf(peekLastN(state)));
  const t0Ms = state.blocksEmitted * BLOCK_MS;
  state.blocksEmitted += 1;
  return { t0Ms, durationMs: BLOCK_MS, lip, pose };
}

export function assertContinuous(): ContinuityTrace {
  const session = openSession({ audioIn: "mic", videoOut: "avatar" });
  ingestAudioChunk(session, new Int16Array(WINDOW_SAMPLES).fill(8000));
  const before = emitAvatarBlock(session);
  let after: AvatarBlock;
  try {
    after = emitAvatarBlock(session);
  } catch {
    throw new ContinuityError("emit-threw-after-drop");
  }
  if (after.t0Ms <= before.t0Ms) {
    throw new ContinuityError("clock-rewound");
  }
  return { session, before, after };
}

function requireLabel(value: string, field: "audioIn" | "videoOut"): void {
  if (value.trim().length === 0) {
    throw new Error(field);
  }
}

function stateOf(session: Session): SessionState {
  const state = states.get(session);
  if (state === undefined) {
    throw new Error("unknown session");
  }
  return state;
}

function peekLastN(state: SessionState): Float32Array {
  const window = new Float32Array(WINDOW_SAMPLES);
  const filled = Math.min(state.written, WINDOW_SAMPLES);
  const writeHead = state.written % WINDOW_SAMPLES;
  for (let i = 0; i < filled; i++) {
    const src = (writeHead - filled + i + WINDOW_SAMPLES) % WINDOW_SAMPLES;
    const sample = state.ring[src];
    if (sample === undefined) {
      continue;
    }
    window[WINDOW_SAMPLES - filled + i] = sample;
  }
  return window;
}

function rmsOf(window: Float32Array): number {
  let sumSquares = 0;
  for (const sample of window) {
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / WINDOW_SAMPLES);
}

function lookup(rms: number): { lip: Lip; pose: Pose } {
  let best: FixtureRung | undefined;
  for (const rung of LADDER) {
    if (rung.minRms <= rms && (best === undefined || rung.minRms >= best.minRms)) {
      best = rung;
    }
  }
  if (best === undefined) {
    return { lip: "closed", pose: "rest" };
  }
  return { lip: best.lip, pose: best.pose };
}

function messageFor(failure: ContinuityFailure): string {
  switch (failure) {
    case "emit-threw-after-drop":
      return "emit threw after a dropped ingest";
    case "clock-rewound":
      return "video clock did not advance";
    default: {
      const _exhaustive: never = failure;
      throw new Error(String(_exhaustive));
    }
  }
}
