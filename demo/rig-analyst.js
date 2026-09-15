/**
 * Lead 3D analyst: Microsoft Rocketbox Sports_Male_04 (MIT), restyled as an
 * ex-college football player turned sports broadcaster. Authored Oculus visemes
 * plus Head-bone nod/glasses stay on the animation graph overlay.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { applyMorphInfluences } from "./mouth-morphs.js";
import {
  addBroadcastSet,
  addFilmLights,
  disposeObject,
  makeGoldGlasses,
  talkingHeadCamera,
} from "./rig-set.js";

const BODY_URL = "/assets/analyst/sports-male-04.glb";

export async function createAnalystWorld(renderer) {
  const scene = new THREE.Scene();
  addFilmLights(scene, renderer);
  addBroadcastSet(scene);

  const camera = talkingHeadCamera([0.02, 1.66, 0.04], 1.12);
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(BODY_URL);

  const talent = new THREE.Group();
  talent.position.set(0.06, 0, 0.08);
  scene.add(talent);
  talent.add(gltf.scene);

  const morphMeshes = findMorphMeshes(gltf.scene);
  if (morphMeshes.length === 0) {
    throw new Error("analyst mesh");
  }
  const bodyMesh = morphMeshes[0];
  const skeleton = pickSkeleton(gltf.scene, bodyMesh);
  dressForStudio(gltf.scene);
  gltf.scene.traverse(enableShadows);

  const head = findBone(skeleton, ["Bip01 Head", "Head", "mixamorig:Head", "Head_M"]);
  const spine = findBone(skeleton, ["Bip01 Spine", "spine_01", "Spine"]);
  const spine1 = findBone(skeleton, ["Bip01 Spine1", "spine_02", "Spine1"]);
  const lEye = findBone(skeleton, ["Bip01 LEye", "Bip01_LEye"]);
  const rEye = findBone(skeleton, ["Bip01 REye", "Bip01_REye"]);
  if (!head) {
    throw new Error("analyst head");
  }

  const glasses = makeGoldGlasses();
  glasses.scale.setScalar(1.42);
  scene.add(glasses);

  const headRest = head.quaternion.clone();
  const talentRestY = talent.position.y;
  const spineRest = spine ? spine.quaternion.clone() : null;
  const spine1Rest = spine1 ? spine1.quaternion.clone() : null;
  const glassesRig = {
    left: new THREE.Vector3(),
    right: new THREE.Vector3(),
    mid: new THREE.Vector3(),
    x: new THREE.Vector3(),
    y: new THREE.Vector3(),
    z: new THREE.Vector3(),
    mat: new THREE.Matrix4(),
  };

  talent.updateMatrixWorld(true);
  skeleton.update();
  placeGlasses(glasses, head, lEye, rEye, 0, glassesRig);

  return {
    id: "analyst",
    scene,
    camera,
    apply(pose) {
      const viseme = pose.viseme;
      talent.position.y = talentRestY + pose.breathe * 0.0012 + pose.bounce * 0.0004;
      const talkZ = pose.talking ? Math.sin(pose.bounce) * 0.02 : 0;
      head.quaternion.copy(headRest);
      // Head +X is crown; nod is a chin-down pitch around left/right.
      head.rotateZ(-pose.headPitch);
      head.rotateX(talkZ);
      if (spine && spineRest) {
        spine.quaternion.copy(spineRest);
        spine.rotateX(pose.breathe * 0.004);
      }
      if (spine1 && spine1Rest) {
        spine1.quaternion.copy(spine1Rest);
        spine1.rotateX(pose.breathe * 0.002);
      }
      for (const mesh of morphMeshes) {
        applyMorphInfluences(mesh, viseme);
      }
      talent.updateMatrixWorld(true);
      skeleton.update();
      placeGlasses(glasses, head, lEye, rEye, pose.glassesDrop, glassesRig);
    },
    dispose() {
      disposeObject(scene);
    },
  };
}

function pickSkeleton(root, fallbackMesh) {
  let best = fallbackMesh?.skeleton ?? null;
  root.traverse((obj) => {
    if (!obj.isSkinnedMesh || !obj.skeleton) {
      return;
    }
    if (!best || obj.skeleton.bones.length > best.bones.length) {
      best = obj.skeleton;
    }
  });
  return best;
}

function findBone(skeleton, names) {
  if (!skeleton) {
    return null;
  }
  for (const name of names) {
    const exact = skeleton.getBoneByName(name) ?? skeleton.getBoneByName(name.replace(/\s+/g, "_"));
    if (exact) {
      return exact;
    }
  }
  const normalized = names.map((name) => name.replace(/[\s_]+/g, "").toLowerCase());
  for (const bone of skeleton.bones) {
    const key = bone.name.replace(/[\s_]+/g, "").toLowerCase();
    if (normalized.includes(key)) {
      return bone;
    }
  }
  return null;
}

function findMorphMeshes(root) {
  const found = [];
  root.traverse((obj) => {
    if (obj.isSkinnedMesh && obj.morphTargetDictionary) {
      found.push(obj);
    }
  });
  return found;
}

function dressForStudio(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) {
      return;
    }
    const srcs = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = srcs.filter(Boolean).map((src) => {
      const isHead = /head/i.test(src.name ?? "");
      const mat = new THREE.MeshPhysicalMaterial({
        map: src.map ?? null,
        normalMap: src.normalMap ?? null,
        color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
        roughness: isHead ? 0.56 : 0.52,
        metalness: 0,
        sheen: isHead ? 0.46 : 0.16,
        sheenColor: new THREE.Color(0xffb089),
        sheenRoughness: 0.68,
        clearcoat: isHead ? 0.08 : 0.04,
        clearcoatRoughness: isHead ? 0.55 : 0.64,
        envMapIntensity: isHead ? 0.52 : 0.42,
      });
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
      }
      return mat;
    });
    obj.material = next.length === 1 ? next[0] : next;
  });
}

function enableShadows(obj) {
  if (obj.isMesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
}

function placeGlasses(glasses, head, lEye, rEye, drop, rig) {
  head.updateWorldMatrix(true, false);
  rig.x.setFromMatrixColumn(head.matrixWorld, 0).normalize();
  rig.y.setFromMatrixColumn(head.matrixWorld, 1).normalize();
  rig.z.setFromMatrixColumn(head.matrixWorld, 2).normalize();
  // Head +X crown, +Y forward, +Z left/right (Rocketbox Bip01).
  const up = rig.x;
  const forward = rig.y;
  const right = rig.z;
  if (lEye && rEye) {
    lEye.getWorldPosition(rig.left);
    rEye.getWorldPosition(rig.right);
    rig.mid.copy(rig.left).add(rig.right).multiplyScalar(0.5);
  } else {
    head.getWorldPosition(rig.mid);
    rig.mid.addScaledVector(up, 0.07).addScaledVector(forward, 0.08);
  }
  rig.mid.addScaledVector(right, -0.034);
  rig.mid.addScaledVector(forward, 0.038);
  rig.mid.addScaledVector(up, -0.01 - drop * 0.02);
  glasses.position.copy(rig.mid);
  rig.mat.makeBasis(right, up, forward);
  glasses.quaternion.setFromRotationMatrix(rig.mat);
}
