/**
 * Lead 3D analyst: Quaternius Universal Base Characters Superhero Male (CC0),
 * restyled as a Pixar-proportioned ex-college football player in a broadcast polo.
 * Morph visemes + Head-bone nod/glasses stay on the animation graph overlay.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { applyMorphInfluences, buildMouthMorphs } from "./mouth-morphs.js";
import {
  addBroadcastSet,
  addFilmLights,
  disposeObject,
  makeGoldGlasses,
  talkingHeadCamera,
} from "./rig-set.js";

const BODY_URL = "/assets/analyst/Superhero_Male_FullBody.gltf";
const HAIR_URL = "/assets/analyst/Hair_SimpleParted.gltf";

export async function createAnalystWorld(renderer) {
  const scene = new THREE.Scene();
  addFilmLights(scene, renderer);
  addBroadcastSet(scene);

  const camera = talkingHeadCamera([0.05, 1.655, 0.05]);
  const loader = new GLTFLoader();
  const [bodyGltf, hairGltf] = await Promise.all([loader.loadAsync(BODY_URL), loader.loadAsync(HAIR_URL)]);

  const talent = new THREE.Group();
  talent.position.set(0.08, 0, 0.04);
  scene.add(talent);
  talent.add(bodyGltf.scene);
  talent.add(hairGltf.scene);

  const bodyMesh = findSkinnedMesh(bodyGltf.scene, "SuperHero_Male") ?? findSkinnedMesh(bodyGltf.scene);
  const hairMesh = findSkinnedMesh(hairGltf.scene);
  if (!bodyMesh) {
    throw new Error("analyst mesh");
  }

  dressForStudio(bodyGltf.scene);
  dressHair(hairGltf.scene);
  installMouthMorphs(bodyMesh);
  poseBroadcastArms(bodyMesh.skeleton);
  bodyGltf.scene.traverse(enableShadows);
  hairGltf.scene.traverse(enableShadows);

  const head = bodyMesh.skeleton.getBoneByName("Head");
  const hairHead = hairMesh?.skeleton.getBoneByName("Head") ?? null;
  const spine = bodyMesh.skeleton.getBoneByName("spine_01");
  if (!head) {
    throw new Error("analyst head");
  }

  const glasses = makeGoldGlasses();
  glasses.position.set(0, 0.042, 0.078);
  glasses.scale.setScalar(1.05);
  head.add(glasses);

  const mouth = makeMouthCavity();
  mouth.group.position.set(0, -0.018, 0.1);
  head.add(mouth.group);

  const badge = makeBadge();
  const spine3 = bodyMesh.skeleton.getBoneByName("spine_03");
  if (spine3) {
    badge.position.set(0.07, 0.04, 0.09);
    spine3.add(badge);
  }

  const tie = makeTie();
  if (spine3) {
    tie.position.set(0, 0.02, 0.095);
    spine3.add(tie);
  }

  const headRest = head.quaternion.clone();
  const hairRest = hairHead ? hairHead.quaternion.clone() : null;
  const glassesRestY = glasses.position.y;
  const talentRestY = talent.position.y;
  const spineRest = spine ? spine.quaternion.clone() : null;

  return {
    id: "analyst",
    scene,
    camera,
    apply(pose) {
      const viseme = pose.viseme;
      talent.position.y = talentRestY + pose.breathe * 0.0012 + pose.bounce * 0.0004;
      head.quaternion.copy(headRest);
      head.rotateX(pose.headPitch);
      if (pose.talking) {
        head.rotateZ(Math.sin(pose.bounce) * 0.025);
      }
      if (hairHead && hairRest) {
        hairHead.quaternion.copy(hairRest);
        hairHead.rotateX(pose.headPitch);
        if (pose.talking) {
          hairHead.rotateZ(Math.sin(pose.bounce) * 0.025);
        }
      }
      if (spine && spineRest) {
        spine.quaternion.copy(spineRest);
        spine.rotateX(pose.breathe * 0.004);
      }
      applyMorphInfluences(bodyMesh, viseme);
      mouth.group.visible = viseme.teeth || viseme.jawMorph > 0.12;
      mouth.cavity.scale.set(viseme.cavityX * 0.7, viseme.cavityY * 0.55, 1);
      mouth.teeth.visible = viseme.teeth;
      mouth.teeth.scale.set(viseme.cavityX * 0.52, Math.max(0.4, viseme.cavityY * 0.36), 1);
      glasses.position.y = glassesRestY - pose.glassesDrop * 0.028;
      talent.updateMatrixWorld(true);
    },
    dispose() {
      disposeObject(scene);
    },
  };
}

function findSkinnedMesh(root, name) {
  let found = null;
  root.traverse((obj) => {
    if (found || !obj.isSkinnedMesh) {
      return;
    }
    if (!name || obj.name === name) {
      found = obj;
    }
  });
  return found;
}

function installMouthMorphs(mesh) {
  const position = mesh.geometry.getAttribute("position");
  const morphs = buildMouthMorphs(position.array);
  const jaw = new THREE.Float32BufferAttribute(morphs.jaw, 3);
  jaw.name = "jaw";
  const wide = new THREE.Float32BufferAttribute(morphs.wide, 3);
  wide.name = "wide";
  const funnel = new THREE.Float32BufferAttribute(morphs.funnel, 3);
  funnel.name = "funnel";
  const lift = new THREE.Float32BufferAttribute(morphs.lift, 3);
  lift.name = "lift";
  mesh.geometry.morphTargetsRelative = true;
  mesh.geometry.morphAttributes.position = [jaw, wide, funnel, lift];
  mesh.updateMorphTargets();
}

function poseBroadcastArms(skeleton) {
  const left = skeleton.getBoneByName("upperarm_l");
  const right = skeleton.getBoneByName("upperarm_r");
  const lowerL = skeleton.getBoneByName("lowerarm_l");
  const lowerR = skeleton.getBoneByName("lowerarm_r");
  if (left) {
    left.rotateZ(0.95);
  }
  if (right) {
    right.rotateZ(-0.95);
  }
  if (lowerL) {
    lowerL.rotateX(0.35);
  }
  if (lowerR) {
    lowerR.rotateX(0.35);
  }
}

function dressForStudio(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) {
      return;
    }
    const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (!src) {
      return;
    }
    const mat = new THREE.MeshPhysicalMaterial({
      map: src.map ?? null,
      normalMap: src.normalMap ?? null,
      roughnessMap: src.roughnessMap ?? src.metalnessMap ?? null,
      color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
      roughness: src.name === "MI_Eyes" ? 0.18 : 0.46,
      metalness: 0,
      sheen: src.name === "MI_Eyes" ? 0 : 0.42,
      sheenColor: new THREE.Color(0xffb089),
      sheenRoughness: 0.62,
      clearcoat: src.name === "MI_Eyes" ? 0.55 : 0.12,
      clearcoatRoughness: src.name === "MI_Eyes" ? 0.18 : 0.5,
      envMapIntensity: 0.85,
    });
    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
    }
    obj.material = mat;
  });
}

function dressHair(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) {
      return;
    }
    const src = obj.material;
    obj.material = new THREE.MeshPhysicalMaterial({
      map: src.map ?? null,
      normalMap: src.normalMap ?? null,
      color: new THREE.Color(0x1c1612),
      roughness: 0.52,
      metalness: 0,
      sheen: 0.18,
      sheenColor: new THREE.Color(0x3a2a22),
      envMapIntensity: 0.55,
    });
    if (obj.material.map) {
      obj.material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
}

function enableShadows(obj) {
  if (obj.isMesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
}

function makeMouthCavity() {
  const group = new THREE.Group();
  const cavity = new THREE.Mesh(
    new THREE.CircleGeometry(0.042, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: 0.92, side: THREE.DoubleSide }),
  );
  group.add(cavity);
  const teeth = new THREE.Mesh(
    new THREE.CircleGeometry(0.03, 16, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xf2ece4, roughness: 0.32, side: THREE.DoubleSide }),
  );
  teeth.position.set(0, 0.008, 0.0015);
  teeth.rotation.z = Math.PI;
  group.add(teeth);
  group.position.set(0, -0.018, 0.1);
  group.visible = false;
  return { group, cavity, teeth };
}

function makeBadge() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  g.fillStyle = "#163a72";
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#f4f7fb";
  g.font = "bold 36px sans-serif";
  g.fillText("SEC", 78, 52);
  g.fillStyle = "#e6c84a";
  g.font = "bold 28px sans-serif";
  g.fillText("NATION", 48, 100);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.055, 0.028),
    new THREE.MeshStandardMaterial({ map, roughness: 0.4 }),
  );
  return mesh;
}

function makeTie() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  g.fillStyle = "#1d4e9a";
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = "#e6c84a";
  g.font = "bold 28px monospace";
  g.fillText("0", 20, 50);
  g.fillText("1", 22, 100);
  g.fillText("0", 20, 150);
  g.fillText("1", 22, 200);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.14, 0.008),
    new THREE.MeshStandardMaterial({ map, roughness: 0.42 }),
  );
  return mesh;
}
