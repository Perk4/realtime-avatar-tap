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

  const camera = talkingHeadCamera([0, 1.62, 0.08]);
  const loader = new GLTFLoader();
  const [bodyGltf, hairGltf] = await Promise.all([loader.loadAsync(BODY_URL), loader.loadAsync(HAIR_URL)]);

  const talent = new THREE.Group();
  talent.position.set(0.08, 0, 0.04);
  scene.add(talent);
  talent.add(bodyGltf.scene);
  talent.add(hairGltf.scene);

  const bodyMesh =
    findSkinnedMesh(bodyGltf.scene, "SuperHero_Male") ??
    findMeshByMaterial(bodyGltf.scene, "MI_Superhero_Male") ??
    findSkinnedMesh(bodyGltf.scene);
  const hairMesh = findSkinnedMesh(hairGltf.scene);
  if (!bodyMesh) {
    throw new Error("analyst mesh");
  }

  dressForStudio(bodyGltf.scene);
  dressHair(hairGltf.scene);
  installMouthMorphs(bodyMesh);
  const visemeAlbedo = attachVisemeAlbedo(bodyMesh);
  poseBroadcastArms(bodyMesh);
  bodyGltf.scene.traverse(enableShadows);
  hairGltf.scene.traverse(enableShadows);

  const head = bodyMesh.skeleton.getBoneByName("Head");
  const hairHead = hairMesh?.skeleton.getBoneByName("Head") ?? null;
  const spine = bodyMesh.skeleton.getBoneByName("spine_01");
  if (!head) {
    throw new Error("analyst head");
  }

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
      visemeAlbedo?.paint(viseme);
      glasses.position.y = glassesRestY - pose.glassesDrop * 0.028;
      glasses.rotation.x = pose.glassesDrop * 0.12;
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

function poseBroadcastArms(bodyMesh) {
  bodyMesh.updateMatrixWorld(true);
  const skeleton = bodyMesh.skeleton;
  const left = skeleton.getBoneByName("upperarm_l");
  const right = skeleton.getBoneByName("upperarm_r");
  const lowerL = skeleton.getBoneByName("lowerarm_l");
  const lowerR = skeleton.getBoneByName("lowerarm_r");
  if (left) {
    aimBoneY(left, new THREE.Vector3(0.18, -1, 0.22));
  }
  if (right) {
    aimBoneY(right, new THREE.Vector3(-0.18, -1, 0.22));
  }
  bodyMesh.updateMatrixWorld(true);
  if (lowerL) {
    aimBoneY(lowerL, new THREE.Vector3(0.12, -0.25, 0.85));
  }
  if (lowerR) {
    aimBoneY(lowerR, new THREE.Vector3(-0.12, -0.25, 0.85));
  }
  bodyMesh.updateMatrixWorld(true);
}

function aimBoneY(bone, worldTargetDir) {
  bone.updateWorldMatrix(true, false);
  const current = new THREE.Vector3(0, 1, 0).transformDirection(bone.matrixWorld).normalize();
  const target = worldTargetDir.clone().normalize();
  const axis = new THREE.Vector3().crossVectors(current, target);
  const axisLen = axis.length();
  if (axisLen < 1e-5) {
    return;
  }
  axis.divideScalar(axisLen);
  bone.rotateOnWorldAxis(axis, current.angleTo(target));
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
