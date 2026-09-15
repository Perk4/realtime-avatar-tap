/**
 * Lead 3D analyst: Quaternius Universal Base Characters Superhero Male (CC0),
 * restyled as a Pixar-proportioned ex-college football player in a broadcast polo.
 * Morph visemes + Head-bone nod/glasses stay on the animation graph overlay.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { applyMorphInfluences, buildMouthMorphs, paintMouthViseme } from "./mouth-morphs.js";
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

  const camera = talkingHeadCamera([0.06, 1.58, 0.08], 1.46);
  const loader = new GLTFLoader();
  const [bodyGltf, hairGltf] = await Promise.all([loader.loadAsync(BODY_URL), loader.loadAsync(HAIR_URL)]);

  const talent = new THREE.Group();
  talent.position.set(0.08, -0.12, 0.1);
  scene.add(talent);
  talent.add(bodyGltf.scene);
  talent.add(hairGltf.scene);

  const bodyMesh =
    findSkinnedMesh(bodyGltf.scene, "SuperHero_Male") ??
    findMeshByMaterial(bodyGltf.scene, "MI_Superhero_Male") ??
    findSkinnedMesh(bodyGltf.scene);
  const hairMesh = findSkinnedMesh(hairGltf.scene);
  const eyesMesh = findSkinnedMesh(bodyGltf.scene, "Eyes");
  const browMesh = findSkinnedMesh(bodyGltf.scene, "Eyebrows");
  if (!bodyMesh) {
    throw new Error("analyst mesh");
  }

  shareSkeleton(bodyMesh, [eyesMesh, browMesh]);
  seatEyeballs(eyesMesh);
  dressForStudio(bodyGltf.scene);
  dressHair(hairGltf.scene);
  installMouthMorphs(bodyMesh);
  const visemeAlbedo = attachVisemeAlbedo(bodyMesh);
  const armPose = bindSeatedArms(bodyMesh.skeleton);
  bodyGltf.scene.traverse(enableShadows);
  hairGltf.scene.traverse(enableShadows);
  if (eyesMesh) {
    eyesMesh.renderOrder = 2;
    eyesMesh.frustumCulled = false;
    eyesMesh.castShadow = false;
  }

  const headBones = uniqueBones([
    bodyMesh.skeleton.getBoneByName("Head"),
    hairMesh?.skeleton.getBoneByName("Head") ?? null,
    eyesMesh?.skeleton.getBoneByName("Head") ?? null,
    browMesh?.skeleton.getBoneByName("Head") ?? null,
  ]);
  if (headBones.length === 0) {
    throw new Error("analyst head");
  }
  const head = headBones[0];
  const spine = bodyMesh.skeleton.getBoneByName("spine_01");
  const spine2 = bodyMesh.skeleton.getBoneByName("spine_02");

  const glasses = makeGoldGlasses();
  // Head-local: eyes sit near (0, 0.102, 0.143) in bind pose.
  glasses.position.set(0, 0.104, 0.152);
  glasses.scale.setScalar(1.42);
  head.add(glasses);

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

  const headRests = headBones.map((bone) => bone.quaternion.clone());
  const glassesRestY = glasses.position.y;
  const talentRestY = talent.position.y;
  const spineRest = spine ? spine.quaternion.clone() : null;
  const spine2Rest = spine2 ? spine2.quaternion.clone() : null;
  const eyeMap = eyesMesh?.material?.map ?? null;

  return {
    id: "analyst",
    scene,
    camera,
    apply(pose) {
      const viseme = pose.viseme;
      talent.position.y = talentRestY + pose.breathe * 0.0012 + pose.bounce * 0.0004;
      const talkZ = pose.talking ? Math.sin(pose.bounce) * 0.025 : 0;
      for (let i = 0; i < headBones.length; i++) {
        const bone = headBones[i];
        bone.quaternion.copy(headRests[i]);
        bone.rotateX(pose.headPitch);
        bone.rotateZ(talkZ);
      }
      if (spine && spineRest) {
        spine.quaternion.copy(spineRest);
        spine.rotateX(pose.breathe * 0.004 + 0.12);
      }
      if (spine2 && spine2Rest) {
        spine2.quaternion.copy(spine2Rest);
        spine2.rotateX(0.08);
      }
      applySeatedArms(bodyMesh.skeleton, armPose, pose);
      applyMorphInfluences(bodyMesh, viseme);
      visemeAlbedo?.paint(viseme);
      if (eyeMap) {
        eyeMap.offset.x = pose.talking ? Math.sin(pose.bounce) * 0.028 : 0;
      }
      glasses.position.y = glassesRestY - pose.glassesDrop * 0.028;
      glasses.rotation.x = pose.glassesDrop * 0.12;
      talent.updateMatrixWorld(true);
      bodyMesh.skeleton.update();
      hairMesh?.skeleton.update();
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

function findMeshByMaterial(root, materialName) {
  let found = null;
  root.traverse((obj) => {
    if (found || !obj.isSkinnedMesh) {
      return;
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (mats.some((mat) => mat && mat.name === materialName)) {
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

function uniqueBones(bones) {
  const seen = new Set();
  const out = [];
  for (const bone of bones) {
    if (!bone || seen.has(bone)) {
      continue;
    }
    seen.add(bone);
    out.push(bone);
  }
  return out;
}

function shareSkeleton(bodyMesh, others) {
  for (const mesh of others) {
    if (!mesh || mesh.skeleton === bodyMesh.skeleton) {
      continue;
    }
    mesh.bind(bodyMesh.skeleton, mesh.bindMatrix);
  }
}

function seatEyeballs(mesh) {
  if (!mesh) {
    return;
  }
  // Bind-pose eyeballs sit behind the face surface (zmax 0.081 vs socket ~0.089).
  mesh.geometry.translate(0, 0, 0.02);
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
}

const ARM_NAMES = [
  "clavicle_l",
  "clavicle_r",
  "upperarm_l",
  "upperarm_r",
  "lowerarm_l",
  "lowerarm_r",
  "hand_l",
  "hand_r",
];

const ARM_DELTA = {
  clavicle_l: [0.1, 0.14, 0.2],
  clavicle_r: [0.1, -0.14, -0.2],
  upperarm_l: [0.62, 0.42, 1.28],
  upperarm_r: [0.62, -0.42, -1.28],
  lowerarm_l: [1.18, 0.18, 0.28],
  lowerarm_r: [1.18, -0.18, -0.28],
  hand_l: [0.22, 0.32, 0.16],
  hand_r: [0.22, -0.32, -0.16],
};

function eulerDelta(xyz) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(xyz[0], xyz[1], xyz[2], "XYZ"));
}

function bindSeatedArms(skeleton) {
  const rest = {};
  const seated = {};
  for (const name of ARM_NAMES) {
    const bone = skeleton.getBoneByName(name);
    if (!bone) {
      continue;
    }
    rest[name] = bone.quaternion.clone();
    seated[name] = rest[name].clone().multiply(eulerDelta(ARM_DELTA[name]));
  }
  return { rest, seated };
}

function applySeatedArms(skeleton, armPose, pose) {
  const breathe = pose.breathe * 0.00035;
  for (const name of ARM_NAMES) {
    const bone = skeleton.getBoneByName(name);
    const target = armPose.seated[name];
    if (!bone || !target) {
      continue;
    }
    bone.quaternion.copy(target);
    if (name.startsWith("clavicle")) {
      bone.rotateX(breathe);
    }
  }
}

function attachVisemeAlbedo(mesh) {
  const src = mesh.material?.map;
  const image = src?.image;
  if (!src || !image || !image.width) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = src.flipY;
  tex.wrapS = src.wrapS;
  tex.wrapT = src.wrapT;
  mesh.material.map = tex;
  mesh.material.needsUpdate = true;
  return {
    paint(viseme) {
      ctx.drawImage(image, 0, 0);
      paintMouthViseme(ctx, viseme);
      tex.needsUpdate = true;
    },
  };
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
      roughness: src.name === "MI_Eyes" ? 0.12 : 0.48,
      metalness: 0,
      sheen: src.name === "MI_Eyes" ? 0 : 0.38,
      sheenColor: new THREE.Color(0xffb089),
      sheenRoughness: 0.62,
      clearcoat: src.name === "MI_Eyes" ? 0.72 : 0.1,
      clearcoatRoughness: src.name === "MI_Eyes" ? 0.12 : 0.52,
      envMapIntensity: src.name === "MI_Eyes" ? 1.15 : 0.7,
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
