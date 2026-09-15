# About character looks and the animation graph

The tap still emits 40 ms lip and pose blocks from reply PCM. Character look and gesture overlay live in the demo. They read those blocks. They do not feed the tap.

## Overview

`realtime-avatar-tap` is a four-function ingest and emit loop. `openSession`, `ingestAudioChunk`, `emitAvatarBlock`, and `assertContinuous` turn signed 16-bit mono PCM into `{ t0Ms, durationMs, lip, pose }`. The local demo leads with a Three.js toon/PBR sports-analyst in a college-football broadcast studio. `tater` stays as a 2D canvas fallback. An animation graph can nod or slide glasses while the mouth still follows reply audio.

The live path is unchanged. Browser WebRTC still posts SDP to `POST /api/session`. The WAV hop still uses `POST /api/talk`. `OPENAI_API_KEY` stays on the server. Caller PCM is still not ingested.

## Key concepts

**AvatarBlock.** The tap's only visual product. `lip` is `closed`, `narrow`, `open`, or `wide`. `pose` is `rest` or `talk`. Lookup is window RMS, not a viseme dictionary.

**Scene.** `sceneFromBlock` maps a block to bounce, tilt, and `mouthH`. `composeScene` adds graph channels. `rigPoseFromScene` maps that to mouth open, head pitch, and glasses drop for the 3D rig.

**Graph tick.** `{ gesture, nod, glasses, idleBreathe }`. Additive overlay. It never writes `lip`.

**Character id.** `analyst` (default, WebGL), `blocks` (WebGL), or `tater` (canvas 2D). Parsed from `?character=` at the demo boundary.

**Pipeline.** `characterPipeline(id)` is `webgl3d` or `canvas2d`. The page shows one canvas and hides the other. It does not mix painters onto the WebGL buffer.

## How it works

Reply PCM (duplex remote track, or the WAV hop's `wavBase64`) is the only input to `ingestAudioChunk`. Each 640-sample window calls `emitAvatarBlock`. The demo then calls `tickGraph` and either `stage.apply` + `stage.render` or `paintCharacter`.

```mermaid
flowchart LR
  replyPcm["Live/WebRTC or WAV reply PCM"] --> ingest["ingestAudioChunk"]
  ingest --> emit["emitAvatarBlock"]
  emit --> block["AvatarBlock lip pose"]
  block --> compose["composeScene"]
  graph["anim-graph tick"] --> compose
  compose --> lips["visemes / jaw"]
  compose --> rig["headPitch glasses breathe"]
  lips --> frame["composed frame"]
  rig --> frame
  callerPcm["caller PCM"] -.-> x["not ingested"]
```

The graph clocks from wall time in the page so idle breathe still moves when no block is pumping. Tests pass explicit `nowMs`. After `pose` flips from `talk` to `rest`, the graph starts a nod. After 2.8 s of rest it starts a glasses slide. Nod and Glasses buttons call `triggerGesture` on the same object. **Preview lips** fetches `/fixture.wav` and plays it through the same `playReply` pump the GPT path uses, so lips move without `OPENAI_API_KEY`.

Lips stay on the block. A wide viseme plus a nod is a legal frame. The 3D rig rotates the head by `tilt + nod` and drops glasses by `glasses`. The graph does not write `lip`.

## Runtime and deploy

**Local.** `npm run demo` serves `demo/public`, `demo/` as `/lib/`, `dist/` as `/dist/`, and `node_modules/three` as `/vendor/three`. The page import map points `three` at `/vendor/three/three.module.js`. Open http://127.0.0.1:4173/. Default character is `analyst`.

**Static host.** The frontend is static ESM plus the Three.js build. A static host can serve `demo/public`, compiled `dist/`, `demo/*.js`, and the vendor copy. Conversation still needs a server that holds `OPENAI_API_KEY` and implements `POST /api/session` and `POST /api/talk`.

**Cloudflare Pages / Workers later.** Pages can host the static demo. A Worker (or Pages Function) would own `/api/session` and `/api/talk` so the key never ships to the browser. Three.js stays a static asset. No extra GPU product is required.

**Why this is not a LemonSlice GPU farm.** The avatar is a browser WebGL scene of procedural primitives. Lip drive is RMS windows on the CPU. Gestures are a tiny JS graph. There is no mesh sequence, no viseme-retarget farm, and no server-side renderer. `npm run demo:record` still paints Tater through the CPU raster. WebGL stills are dual-exported by Chrome against the running demo (`npm run demo:characters`).

## Where things live

- `src/avatar-tap.ts` — four primitives. Do not add character ids here.
- `demo/anim-graph.js` — gesture overlay. Does not write `lip`.
- `demo/characters.js` — id parse, pipeline, compose, 2D paint dispatch.
- `demo/rig-pose.js` — block + graph → mouth/head/glasses numbers. Node-testable.
- `demo/webgl-stage.js` — Three.js renderer host.
- `demo/rig-analyst.js` / `demo/rig-blocks.js` / `demo/rig-set.js` — procedural puppets and studio. Browser-only.
- `demo/paint-analyst.js` / `demo/paint-blocks.js` — 2D fallbacks and raster unit tests, not the product lead.
- `demo/public/demo.js` — switcher, graph buttons, reply-only ingest, canvas vs WebGL swap.

## Rendering options for this repo

Ranked for `npm run demo` in a browser, Node 22.6, no GPU product pipeline.

1. **Three.js toon/PBR hybrid (wired).** Lead path for `analyst` and `blocks`. Film lights, rim, sheen-as-SSS stand-in, broadcast set. Stills come from Chrome, not `demo/raster.js`.
2. **Canvas 2D.** Still used for `tater` and for Node paint tests. Rejected as the sports-analyst product look.
3. **Ready Player Me, VRM, or authored glTF.** Would beat procedural primitives. Needs downloaded meshes. Not in this slice.
4. **Video plate plus mouth overlay.** Blocked on plates and on the parked reply-driven mp4 path.

## Lip plus graph coexistence

The tap is a viseme clock, not a clip mixer. An animation graph can run beside it if both write different channels and one compose step adds them.

What this stub proves:

- `tickGraph` returns overlay numbers. It does not return `lip`.
- `composeScene` copies `block.lip` through.
- `rigPoseFromScene` opens the mouth from `lip` and adds nod to `headPitch`.
- Tests ingest reply PCM, ignore caller PCM, then trigger nod on the same block.

What a later graph can add without changing the tap: clip names, hold and blend, look-ats. Drive those from `pose` edges and from UI. Keep visemes on `emitAvatarBlock`.

## Gaps vs Pixar / The Incredibles

This is a stylized 3D *direction*, not a feature-film mesh.

- Geometries are capsules, rounded boxes, and spheres, not a sculpted head with blendshapes.
- Skin is `MeshPhysicalMaterial` sheen plus wrap lights, not true subsurface scattering or a texture set.
- Hair is a dark rounded slab, not grooms.
- Hands are spheres on the desk.
- No cloth sim, no facial muscle system, no eye refraction, no film-grade anti-aliasing beyond the renderer defaults.
- `blocks` is a second construction in the same studio, still primitive.

The broadcast cues are the desk, gold glasses, 0/1 tie, SEC Nation-style badge/mug, ESPN Analytics laptop, whiteboard, and office bokeh.

## Gotchas

`audioIn: "reply"` is a label. The tap does not enforce who wrote the PCM. The demo must not call `ingestAudioChunk` with mic samples. Duplex taps the remote track only.

The page graph clocks from `performance.now`, not `block.t0Ms`. Auto-nod only starts if the last block is `rest`. After a WAV reply whose last window is still `talk`, idle rAF will not nod until a later rest block. The Nod button still works.

Public package exports stay the four primitives. `src/avatar-tap.test.ts` asserts those names.

`demo/raster.js` cannot share the WebGL drawing buffer. Character stills for `analyst` / `blocks` are Chrome screenshots (`?shot=talk`). Tater stills stay on the CPU raster.
