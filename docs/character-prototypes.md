# About character looks and the animation graph

The tap still emits 40 ms lip and pose blocks from reply PCM. Character look and gesture overlay live in the demo. They read those blocks. They do not feed the tap.

## Overview

`realtime-avatar-tap` is a four-function ingest and emit loop. `openSession`, `ingestAudioChunk`, `emitAvatarBlock`, and `assertContinuous` turn signed 16-bit mono PCM into `{ t0Ms, durationMs, lip, pose }`. The local demo leads with a Three.js sports-analyst built on Microsoft Rocketbox `Sports_Male_04` (athletic football-player build, authored Oculus visemes, broadcast polo restyle). `tater` stays as a 2D canvas fallback. An animation graph can nod or slide glasses while the mouth still follows reply audio.

The live path is unchanged. Browser WebRTC still posts SDP to `POST /api/session`. The WAV hop still uses `POST /api/talk`. `OPENAI_API_KEY` stays on the server. Caller PCM is still not ingested.

## Key concepts

**AvatarBlock.** The tap's only visual product. `lip` is `closed`, `narrow`, `open`, or `wide`. `pose` is `rest` or `talk`. Lookup is window RMS, not a viseme dictionary.

**Scene.** `sceneFromBlock` maps a block to bounce, tilt, and `mouthH`. `composeScene` adds graph channels. `rigPoseFromScene` maps `lip` through `visemeFromLip` (jaw + cavity + mesh morph weights) plus head pitch and glasses drop.

**Graph tick.** `{ gesture, nod, glasses, idleBreathe }`. Additive overlay. It never writes `lip`. Nod peaks near half a radian so a close-up head reads like Tater's tilt.

**Character id.** `analyst` (default, WebGL mesh), `blocks` (WebGL primitives), or `tater` (canvas 2D). Parsed from `?character=` at the demo boundary.

**Pipeline.** `characterPipeline(id)` is `webgl3d` or `canvas2d`. WebGL paints the puppet. The 2D canvas stays on top as a transparent HUD so `lip` / `pose` / `gesture` stay on the picture the way Tater always did.

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

Lips stay on the block. A wide viseme plus a nod is a legal frame. The 3D camera is a talking-head close-up, not a wide desk establishing shot, so jaw, cavity, nod, and glasses land at Tater-like size on screen. The graph does not write `lip`.

## Runtime and deploy

**Local.** `npm run demo` serves `demo/public`, `demo/` as `/lib/`, `dist/` as `/dist/`, and `node_modules/three` as `/vendor/three`. The page import map points `three` at `/vendor/three/three.module.js`. Open http://127.0.0.1:4173/. Default character is `analyst`.

**Static host.** The frontend is static ESM plus the Three.js build. A static host can serve `demo/public`, compiled `dist/`, `demo/*.js`, and the vendor copy. Conversation still needs a server that holds `OPENAI_API_KEY` and implements `POST /api/session` and `POST /api/talk`.

**Cloudflare Pages / Workers later.** Pages can host the static demo. A Worker (or Pages Function) would own `/api/session` and `/api/talk` so the key never ships to the browser. Three.js stays a static asset. No extra GPU product is required.

**Why this is not a LemonSlice GPU farm.** The avatar is a browser WebGL scene of a MIT-licensed Rocketbox glTF plus its authored viseme morph set. Lip drive is RMS windows on the CPU. Gestures are a tiny JS graph. There is no mesh sequence farm and no server-side renderer. `npm run demo:record` still paints Tater through the CPU raster. WebGL stills are dual-exported by Chrome against the running demo (`npm run demo:characters`).

## Where things live

- `src/avatar-tap.ts` — four primitives. Do not add character ids here.
- `demo/anim-graph.js` — gesture overlay. Does not write `lip`.
- `demo/characters.js` — id parse, pipeline, compose, 2D paint dispatch.
- `demo/rig-pose.js` — block + graph → mouth/head/glasses numbers. Node-testable.
- `demo/webgl-stage.js` — Three.js renderer host.
- `demo/rig-analyst.js` / `demo/rig-blocks.js` / `demo/rig-set.js` / `demo/mouth-morphs.js` — mesh loader, morph visemes, studio. Browser-only except morph math, which Node tests.
- `demo/public/assets/analyst/` — vendored Rocketbox MIT GLB. See [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md).
- `demo/paint-analyst.js` / `demo/paint-blocks.js` — 2D fallbacks and raster unit tests, not the product lead.
- `demo/public/demo.js` — switcher, graph buttons, reply-only ingest, canvas vs WebGL swap.

## Rendering options for this repo

Ranked for `npm run demo` in a browser, Node 22.6, no GPU product pipeline.

1. **Three.js PBR mesh (wired).** Lead path for `analyst`: Rocketbox `Sports_Male_04` + Oculus visemes, film key/fill/rim. `blocks` stays a second primitive construction in the same studio. Stills come from Chrome, not `demo/raster.js`.
2. **Canvas 2D.** Still used for `tater` and for Node paint tests. Rejected as the sports-analyst product look.
3. **Ready Player Me / Mixamo / VRM.** RPM's hosted GLB CDN is gone. Mixamo is still a fine clip source. This slice vendors a MIT Rocketbox facial FBX instead of a dead URL.
4. **Video plate plus mouth overlay.** Blocked on plates and on the parked reply-driven mp4 path.

## Lip plus graph coexistence

The tap is a viseme clock, not a clip mixer. An animation graph can run beside it if both write different channels and one compose step adds them.

What this stub proves:

- `tickGraph` returns overlay numbers. It does not return `lip`.
- `composeScene` copies `block.lip` through.
- `rigPoseFromScene` maps `lip` through `visemeFromLip` (jaw + cavity) and adds nod to `headPitch`.
- Tests ingest reply PCM, ignore caller PCM, then trigger nod on the same block.

What a later graph can add without changing the tap: clip names, hold and blend, look-ats. Drive those from `pose` edges and from UI. Keep visemes on `emitAvatarBlock`.

## Gaps vs Pixar / The Incredibles

This is a game-cinematic sports-analyst on a real viseme-capable base, not a feature-film head.

- Rocketbox `Sports_Male_04` is a research/game avatar (MIT), not a Pixar sculpt or grooms. Proportions are athletic-realistic rather than Incredibles caricature.
- Mouth shapes are the pack's authored Oculus visemes, driven by the tap's four RMS lips (`closed`/`narrow`/`open`/`wide`), not a phoneme dictionary.
- Skin is `MeshPhysicalMaterial` sheen, not true SSS.
- No cloth sim, no facial muscle system, no eye refraction.
- `blocks` is still primitive, on purpose, as a second construction.

The broadcast cues are the desk, gold glasses, polo collar, SEC Nation badge/mug, ESPN Analytics laptop, whiteboard, and navy/gold polo restyle.

## Gotchas

`audioIn: "reply"` is a label. The tap does not enforce who wrote the PCM. The demo must not call `ingestAudioChunk` with mic samples. Duplex taps the remote track only.

The page graph clocks from `performance.now`, not `block.t0Ms`. Auto-nod only starts if the last block is `rest`. After a WAV reply whose last window is still `talk`, idle rAF will not nod until a later rest block. The Nod button still works.

Public package exports stay the four primitives. `src/avatar-tap.test.ts` asserts those names.

`demo/raster.js` cannot share the WebGL drawing buffer. Character stills for `analyst` / `blocks` are Chrome screenshots (`?shot=talk`). Tater stills stay on the CPU raster.
