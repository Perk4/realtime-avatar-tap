# Third-party character assets

The lead `analyst` mesh is **not** a box puppet. It starts from a published, license-clear base and is restyled in this repo.

## Base mesh

**Quaternius — Universal Base Characters (standard / free pack)**  
Superhero Male full-body + Simple Parted hair.

- Pack page: https://quaternius.com/packs/universalbasecharacters.html
- itch.io: https://quaternius.itch.io/universal-base-characters
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (public domain dedication). Copy in `demo/public/assets/analyst/License_Standard.txt`.
- Files used: `Superhero_Male_FullBody.gltf` / `.bin`, `Hair_SimpleParted.gltf` / `.bin`, PBR maps.

Ready Player Me’s public avatar CDN was discontinued (Jan 2026), so this pack is the license-clear stylized humanoid we can actually vendor. Superhero proportions read as a Pixar-adjacent ex-college football player (broad shoulders, short neck-to-head, heroic mass). Mixamo Remy is ToS-ok but has no morphs. Microsoft Rocketbox `Business_Male_03` (MIT) has authored Oculus visemes but reads as a suit pundit, not the football-player brief. Mixamo remains usable for clips later; this slice does not redistribute Mixamo meshes.

## What we changed

- Albedo restyle `T_Analyst_Broadcast.png`: navy/gold broadcast polo (front torso, sleeves, and gold placket) over the original gray bodysuit islands. Face, eyes, and skin maps are unchanged.
- Hair tinted darker for an on-air look.
- Gold glasses, 0/1 tie, and SEC Nation badge parented to Head / spine bones.
- Studio key (warm area + directional with soft PCF shadows), cool fill, back rim.
- Lip shapes: the pack has **no** facial blendshapes. `demo/mouth-morphs.js` authors tight jaw / wide / funnel / lift deltas on lip verts and paints the mouth island on the albedo. `visemeFromLip` still maps tap `lip` values. Nod and glasses still come from `tickGraph` and never write `lip`.

## Runtime paths

Served from `demo/public/assets/analyst/` by `npm run demo`.
