/**
 * Second 3D look: same film-lit studio, faceted clay figure (still PBR, not canvas potato).
 */
import * as THREE from "three";
import { addBroadcastSet, addFilmLights, disposeObject, skinMaterial } from "./rig-set.js";

export function createBlocksWorld(renderer) {
  const scene = new THREE.Scene();
  addFilmLights(scene, renderer);
  addBroadcastSet(scene);

  const camera = new THREE.PerspectiveCamera(30, 640 / 360, 0.1, 40);
  camera.position.set(0.02, 1.26, 3.45);
  camera.lookAt(0.05, 1.12, 0);

  const talent = new THREE.Group();
  talent.position.set(0.36, -0.22, 0.08);
  talent.scale.setScalar(0.78);
  scene.add(talent);

  const skin = skinMaterial(0xc47a4a);
  const shirt = new THREE.MeshStandardMaterial({ color: 0x1e6bb8, roughness: 0.52, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.86, roughness: 0.24 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.98, 0.5), shirt);
  torso.position.set(0, 0.74, 0);
  torso.castShadow = true;
  talent.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8), skin);
  neck.position.set(0, 1.34, 0);
  neck.castShadow = true;
  talent.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 1.5, 0);
  talent.add(head);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 0.64), skin);
  skull.position.y = 0.32;
  skull.castShadow = true;
  head.add(skull);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.24), skin);
  jaw.position.set(0, 0.04, 0.24);
  jaw.castShadow = true;
  head.add(jaw);

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.045, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x4a1020, roughness: 0.55 }),
  );
  mouth.position.set(0, 0.1, 0.36);
  head.add(mouth);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.04), dark);
    eye.position.set(sx * 0.15, 0.38, 0.34);
    head.add(eye);
  }

  const glasses = new THREE.Group();
  glasses.position.set(0, 0.38, 0.36);
  head.add(glasses);
  for (const sx of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.014, 8, 16), gold);
    rim.position.x = sx * 0.14;
    glasses.add(rim);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), gold);
  glasses.add(bridge);

  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.1, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x1c4fa0, roughness: 0.35 }),
  );
  badge.position.set(0.28, 0.98, 0.26);
  talent.add(badge);

  const talentRestY = talent.position.y;
  const mouthRestY = mouth.position.y;

  return {
    id: "blocks",
    scene,
    camera,
    apply(pose) {
      talent.position.y = talentRestY + pose.breathe * 0.004 + pose.bounce * 0.0014;
      head.rotation.x = pose.headPitch;
      jaw.scale.y = 1 + pose.mouthOpen * 2.2;
      mouth.scale.y = 1 + pose.mouthOpen * 5.5;
      mouth.position.y = mouthRestY - pose.mouthOpen * 0.035;
      glasses.position.y = 0.38 - pose.glassesDrop * 0.12;
    },
    dispose() {
      disposeObject(scene);
    },
  };
}
