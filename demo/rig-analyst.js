/**
 * Incredibles-adjacent sports analyst: square head, long neck, gold glasses,
 * polo + 0/1 tie, sitting at the broadcast desk. Procedural primitives, not a film mesh.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { addBroadcastSet, addFilmLights, disposeObject, skinMaterial } from "./rig-set.js";

export function createAnalystWorld(renderer) {
  const scene = new THREE.Scene();
  addFilmLights(scene, renderer);
  addBroadcastSet(scene);

  const camera = new THREE.PerspectiveCamera(30, 640 / 360, 0.1, 40);
  camera.position.set(0.02, 1.26, 3.45);
  camera.lookAt(0.05, 1.12, 0);

  const talent = new THREE.Group();
  talent.position.set(0.4, 0, 0.06);
  scene.add(talent);

  const shirt = new THREE.MeshToonMaterial({ color: 0xf3f6f8, gradientMap: toonRamp() });
  const cuff = new THREE.MeshToonMaterial({ color: 0x2f6aa8, gradientMap: toonRamp() });
  const skin = skinMaterial();
  const skinDeep = skinMaterial(0x6b3a2c);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.7, 0.4, 6, 0.14), shirt);
  torso.position.set(0, 0.96, 0);
  torso.castShadow = true;
  talent.add(torso);

  const collar = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.08, 0.22, 3, 0.03), shirt);
  collar.position.set(0, 1.28, 0.08);
  talent.add(collar);

  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), shirt);
    shoulder.position.set(sx * 0.42, 1.18, 0.02);
    shoulder.castShadow = true;
    talent.add(shoulder);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.36, 6, 12), shirt);
    arm.position.set(sx * 0.5, 0.9, 0.05);
    arm.rotation.z = sx * 0.2;
    talent.add(arm);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.07, 16), cuff);
    band.position.set(sx * 0.54, 0.7, 0.06);
    talent.add(band);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), skin);
    hand.position.set(sx * 0.38, 0.7, 0.42);
    hand.castShadow = true;
    talent.add(hand);
  }

  const tie = new THREE.Mesh(
    new THREE.BoxGeometry(0.095, 0.46, 0.02),
    new THREE.MeshStandardMaterial({ map: tieTexture(), roughness: 0.42 }),
  );
  tie.position.set(0, 0.96, 0.21);
  talent.add(tie);

  const badge = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 0.08, 0.02, 2, 0.01),
    new THREE.MeshStandardMaterial({ map: badgeTexture(), roughness: 0.35 }),
  );
  badge.position.set(0.24, 1.1, 0.21);
  talent.add(badge);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.34, 22), skinDeep);
  neck.position.set(0, 1.34, 0.02);
  neck.castShadow = true;
  talent.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 1.62, 0.04);
  talent.add(head);

  const skull = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.5, 0.4, 7, 0.14), skin);
  skull.castShadow = true;
  head.add(skull);

  const jawBone = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.18, 0.28, 5, 0.08), skin);
  jawBone.position.set(0, -0.16, 0.04);
  head.add(jawBone);

  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), skinMaterial(0xa8644c));
  cheekL.position.set(-0.15, -0.04, 0.15);
  head.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.15;
  head.add(cheekR);

  const nose = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.09, 0.08, 3, 0.02), skinDeep);
  nose.position.set(0, -0.02, 0.2);
  head.add(nose);

  const hair = new THREE.Mesh(
    new RoundedBoxGeometry(0.44, 0.16, 0.38, 4, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.68 }),
  );
  hair.position.set(0, 0.22, -0.02);
  head.add(hair);

  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), skinDeep);
  earL.position.set(-0.25, 0.0, 0);
  head.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.25;
  head.add(earR);
  const stud = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2e6c4, metalness: 1, roughness: 0.2 }),
  );
  stud.position.set(0.268, 0.0, 0.012);
  head.add(stud);

  const brow = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const browMesh = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.025, 0.03, 2, 0.01), brow);
    browMesh.position.set(sx * 0.11, 0.12, 0.18);
    browMesh.rotation.z = sx * -0.08;
    head.add(browMesh);
  }

  const eyeL = makeEye();
  eyeL.group.position.set(-0.11, 0.04, 0.18);
  head.add(eyeL.group);
  const eyeR = makeEye();
  eyeR.group.position.set(0.11, 0.04, 0.18);
  head.add(eyeR.group);

  const glasses = makeGlasses();
  head.add(glasses);

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, 0.13);
  head.add(jaw);
  const mouth = new THREE.Mesh(
    new RoundedBoxGeometry(0.17, 0.045, 0.09, 3, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x3a1512, roughness: 0.55 }),
  );
  jaw.add(mouth);
  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.032, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x8a3a32, roughness: 0.6 }),
  );
  inner.position.set(0, -0.006, 0.012);
  inner.visible = false;
  jaw.add(inner);
  const teeth = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.014, 0.032),
    new THREE.MeshStandardMaterial({ color: 0xf2ece4, roughness: 0.32 }),
  );
  teeth.position.set(0, 0.014, 0.022);
  teeth.visible = false;
  jaw.add(teeth);

  const glassesRestY = glasses.position.y;
  const talentRestY = talent.position.y;

  return {
    id: "analyst",
    scene,
    camera,
    apply(pose) {
      talent.position.y = talentRestY + pose.breathe * 0.004 + pose.bounce * 0.0014;
      head.rotation.x = pose.headPitch;
      head.rotation.z = pose.talking ? Math.sin(pose.bounce) * 0.02 : 0;
      jaw.rotation.x = pose.mouthOpen * 0.58;
      mouth.scale.set(1 + pose.mouthOpen * 0.18, 0.7 + pose.mouthOpen * 3.4, 1 + pose.mouthOpen * 0.45);
      inner.visible = pose.mouthOpen > 0.12;
      teeth.visible = pose.mouthOpen > 0.18;
      glasses.position.y = glassesRestY - pose.glassesDrop * 0.055;
      const glance = pose.talking ? 0.012 : 0;
      eyeL.pupil.position.x = glance;
      eyeR.pupil.position.x = glance;
    },
    dispose() {
      disposeObject(scene);
    },
  };
}

function makeGlasses() {
  const glasses = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd7b44a,
    metalness: 0.88,
    roughness: 0.2,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x8a4e3a,
    roughness: 0.12,
    transmission: 0.18,
    transparent: true,
    opacity: 0.32,
  });
  const frameL = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.11, 0.03, 3, 0.02), gold);
  frameL.position.set(-0.11, 0.04, 0.21);
  glasses.add(frameL);
  const frameR = frameL.clone();
  frameR.position.x = 0.11;
  glasses.add(frameR);
  const glassL = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.075), lens);
  glassL.position.set(-0.11, 0.04, 0.228);
  glasses.add(glassL);
  const glassR = glassL.clone();
  glassR.position.x = 0.11;
  glasses.add(glassR);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.02), gold);
  bridge.position.set(0, 0.04, 0.21);
  glasses.add(bridge);
  const armGL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.014, 0.014), gold);
  armGL.position.set(-0.22, 0.04, 0.15);
  armGL.rotation.y = 0.52;
  glasses.add(armGL);
  const armGR = armGL.clone();
  armGR.position.x = 0.22;
  armGR.rotation.y = -0.52;
  glasses.add(armGR);
  return glasses;
}

function makeEye() {
  const group = new THREE.Group();
  const white = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: 0xf4efe8, roughness: 0.22, clearcoat: 0.45 }),
  );
  group.add(white);
  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.021, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x1b1410, roughness: 0.32 }),
  );
  pupil.position.set(0, 0, 0.03);
  group.add(pupil);
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.007, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xf7f3ea }),
  );
  spark.position.set(0.012, 0.012, 0.042);
  group.add(spark);
  return { group, pupil };
}

function toonRamp() {
  const data = new Uint8Array([80, 80, 80, 255, 150, 150, 150, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function tieTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#1d4e9a";
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = "#e6c84a";
  g.font = "bold 28px monospace";
  g.fillText("0", 20, 50);
  g.fillText("1", 22, 100);
  g.fillText("0", 20, 150);
  g.fillText("1", 22, 200);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function badgeTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#2a5f9a";
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#f4f7fb";
  g.font = "bold 36px sans-serif";
  g.fillText("SEC", 78, 52);
  g.fillStyle = "#e6c84a";
  g.font = "bold 28px sans-serif";
  g.fillText("NATION", 48, 100);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

