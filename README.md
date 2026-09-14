# realtime-avatar-tap

Synchronous in-memory path from PCM chunks to timed lip and pose blocks. Four functions. No live media.

Source itch: Sidney Primas and LemonSlice, [Voice agents with Realtime Video](https://www.youtube.com/watch?v=z1dqv74SpUs) (AI Engineer). This package stops at the ingest and emit loop.

## Four primitives

1. **`openSession({ audioIn, videoOut })`.** Returns an opaque session. `audioIn` and `videoOut` are logical labels. An empty or whitespace-only label throws, and the error names the field.

2. **`ingestAudioChunk(session, pcm)`.** Appends signed 16-bit mono PCM onto the session ring. An empty chunk is a no-op. A drop is skipping this call.

3. **`emitAvatarBlock(session)`.** Reads the last 40 ms window, pads missing samples with silence, looks up lip and pose from window RMS, and advances the video clock by 40 ms. The same session still emits after a skipped ingest.

4. **`assertContinuous()`.** Opens one session with labels `mic` and `avatar`, ingests one full window, emits, skips the next ingest, and emits again. Throws `ContinuityError` if the second emit throws or the clock does not advance.

## Not in scope

A LemonSlice clone, GPU rendering, and live WebRTC.

## Run

Needs Node 22.6 or newer.

```sh
npm install
npm test
```

`npm test` builds `dist/` then runs `node --experimental-strip-types --test src/*.test.ts`. Consumers import compiled JS from `dist/` (`main` / `exports`), not TypeScript source.
