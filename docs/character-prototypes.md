# About character looks and the animation graph

The tap still emits 40 ms lip and pose blocks from reply PCM. Character look and gesture overlay live in the demo. They read those blocks. They do not feed the tap.

## Overview

`realtime-avatar-tap` is a four-function ingest and emit loop. `openSession`, `ingestAudioChunk`, `emitAvatarBlock`, and `assertContinuous` turn signed 16-bit mono PCM into `{ t0Ms, durationMs, lip, pose }`. The local demo used to paint one potato from that block. This prototype keeps that loop and adds two things the potato could not show: more than one character pipeline, and a small animation graph that can nod or slide glasses while the mouth still follows reply audio.

The live path is unchanged. Browser WebRTC still posts SDP to `POST /api/session`. The WAV hop still uses `POST /api/talk`. `OPENAI_API_KEY` stays on the server. Caller PCM is still not ingested.

## Key concepts

**AvatarBlock.** The tap's only visual product. `lip` is `closed`, `narrow`, `open`, or `wide`. `pose` is `rest` or `talk`. Lookup is window RMS, not a viseme dictionary.

**Scene.** `sceneFromBlock` maps a block to bounce, tilt, and `mouthH`. Painters consume this plus graph channels.

**Graph tick.** `{ gesture, nod, glasses, idleBreathe }`. Additive overlay. It never writes `lip`.

**Character id.** `tater`, `analyst`, or `blocks`. Parsed from `?character=` at the demo boundary.

## How it works

Reply PCM (duplex remote track, or the WAV hop's `wavBase64`) is the only input to `ingestAudioChunk`. Each 640-sample window calls `emitAvatarBlock`. The demo then calls `tickGraph` and `paintCharacter`.

```mermaid
flowchart LR
  replyPcm["reply PCM"] --> ingest["ingestAudioChunk"]
  ingest --> emit["emitAvatarBlock"]
  emit --> block["AvatarBlock lip pose"]
  block --> compose["composeScene"]
  graph["anim-graph tick"] --> compose
  compose --> paint["paintCharacter"]
  callerPcm["caller PCM"] -.-> x["not ingested"]
```

The graph clocks from wall time in the page so idle breathe still moves when no block is pumping. Tests pass explicit `nowMs`. After `pose` flips from `talk` to `rest`, the graph starts a nod. After 2.8 s of rest it starts a glasses slide. Nod and Glasses buttons call `triggerGesture` on the same object.

Lips stay on the block. A wide viseme plus a nod is a legal frame. The painter rotates the head by `tilt + nod` and drops glasses by `glasses`.

## Where things live

- `src/avatar-tap.ts` — four primitives. Do not add character ids here.
- `demo/anim-graph.js` — gesture overlay.
- `demo/characters.js` — id parse, compose, paint dispatch.
- `demo/paint-analyst.js` — 2D studio talking head aimed at the SEC Nation reference.
- `demo/paint-blocks.js` — faceted isometric head. A second construction, not a recolor of Tater.
- `demo/avatar-scene.js` — Tater plus `sceneFromBlock`.
- `demo/public/demo.js` — switcher, graph buttons, reply-only ingest.

## Rendering options for this repo

Ranked for `npm run demo` in a browser, Node 22.6, no GPU product pipeline.

1. **Richer canvas 2D.** Same gfx object the raster recorder already implements. No extra npm package. This prototype uses it for all three looks. Best fit.
2. **CSS or DOM puppet.** Cheap to switch. Hard to match the reference lighting. Skip unless we need HTML overlays.
3. **Three.js or WebGL from a CDN.** Real 3D lighting. A second canvas that `demo/raster.js` cannot paint, so `npm run demo:record` would fork. Not wired.
4. **Ready Player Me, VRM, or glTF.** Needs downloaded meshes and a loader. Too heavy for this demo.
5. **Video plate plus mouth overlay.** Matches a filmed look. Blocked on plates and on the parked reply-driven mp4 path.

## Lip plus graph coexistence

The tap is a viseme clock, not a clip mixer. An animation graph can run beside it if both write different channels and one compose step adds them.

What this stub proves:

- `tickGraph` returns overlay numbers. It does not return `lip`.
- `composeScene` copies `block.lip` through.
- Tests ingest reply PCM, ignore caller PCM, then trigger nod on the same block.

What a later graph can add without changing the tap: clip names, hold and blend, look-ats. Drive those from `pose` edges and from UI. Keep visemes on `emitAvatarBlock`.

## Gotchas

`audioIn: "reply"` is a label. The tap does not enforce who wrote the PCM. The demo must not call `ingestAudioChunk` with mic samples. Duplex taps the remote track only.

Do not use `Date.now` inside a Convex query. This graph is page and test code.

Public package exports stay the four primitives. `src/avatar-tap.test.ts` asserts those names.
