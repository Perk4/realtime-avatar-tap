# Third-party character assets

The lead `analyst` mesh is **not** a box puppet and **not** a homemade sculpt. It starts from a published, license-clear base with authored facial visemes and is restyled in this repo.

## Base mesh (lead)

**Microsoft Rocketbox — `Sports_Male_04` (facial FBX)**

Athletic male from the Rocketbox avatar library. Short hair, broad shoulders, sports build — restyled here as an ex-college football player on a broadcast desk.

- Source: https://github.com/microsoft/Microsoft-Rocketbox
- Path in upstream: `Assets/Avatars/Professions/Sports_Male_04/Export/Sports_Male_04_facial.fbx`
- Preview still: https://github.com/microsoft/Microsoft-Rocketbox/blob/master/Assets/Avatars/Professions/Sports_Male_04/Sports_Male_04.png
- License: **MIT** (Copyright (c) 2020 Microsoft). Copy in `demo/public/assets/analyst/LICENSE.md`.
- Files used: converted `sports-male-04.glb` (hipoly mesh + 15 Oculus visemes + blink/jaw/smile/funnel morphs, JPEG albedo/normal).

### Candidates not used as the lead

| Candidate | License | Why not |
| --- | --- | --- |
| Quaternius Superhero Male | CC0 1.0 | Heroic mass, but **no facial blendshapes**. Homemade lip morphs snouted the nose. Demoted to `demo/public/assets/superhero/`. |
| Ready Player Me | RPM terms | Public avatar CDN discontinued Jan 2026; not downloadable here as a male football-player look. |
| Mixamo Remy | Mixamo ToS | Pixar-adjacent build, **no viseme morphs**. |
| Rocketbox `Business_Male_03` | MIT | Authored visemes, but a suit pundit — misses the football-player brief. |

## What we changed

- Albedo restyle on the body map: gym tank → navy broadcast polo with gold collar band and placket. Head/skin maps unchanged.
- Gold glasses parented to `Bip01 Head` (seated on the eye bones). Bind-pose T-pose is dropped toward a desk rest at load.
- Studio **key** (warm directional + rect area, PCF soft shadows) + **fill** (cool) + **rim** + face spot, ACES.
- Lip shapes: `visemeFromLip` maps tap `lip` (`closed` / `narrow` / `open` / `wide`) onto the template’s Oculus visemes (`viseme_sil`, `viseme_U`, `viseme_aa`, `viseme_I`, plus `jawOpen` / `mouthFunnel` / smile). Nod and glasses still come from `tickGraph` and never write `lip`.

## Runtime paths

Served from `demo/public/assets/analyst/` by `npm run demo`.
