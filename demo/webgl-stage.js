/**
 * Three.js host for the Quaternius sports analyst and the block puppet.
 * Tater stays on the 2D canvas. This owns the WebGL canvas, including still capture.
 */
import * as THREE from "three";
import { createAnalystWorld } from "./rig-analyst.js";
import { createBlocksWorld } from "./rig-blocks.js";
import { rigPoseFromScene } from "./rig-pose.js";

export function createWebglStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const startW = Math.max(canvas.clientWidth || 0, canvas.width || 0, 640);
  const startH = Math.max(canvas.clientHeight || 0, canvas.height || 0, 360);
  renderer.setSize(startW, startH, false);

  let world = null;
  let characterId = "analyst";
  let loadGen = 0;
  let ready = Promise.resolve();

  async function mount(id) {
    const token = ++loadGen;
    if (world) {
      world.dispose();
      world = null;
    }
    characterId = id === "blocks" ? "blocks" : "analyst";
    if (characterId === "blocks") {
      world = createBlocksWorld(renderer);
      return;
    }
    const next = await createAnalystWorld(renderer);
    if (token !== loadGen) {
      next.dispose();
      return;
    }
    world = next;
  }

  ready = mount("analyst");

  return {
    renderer,
    whenReady() {
      return ready;
    },
    get characterId() {
      return characterId;
    },
    isReady() {
      return world !== null;
    },
    setCharacter(id) {
      if (id === "tater") {
        return ready;
      }
      const next = id === "blocks" ? "blocks" : "analyst";
      if (next === characterId && world) {
        return ready;
      }
      ready = mount(next);
      return ready;
    },
    apply(sceneState) {
      if (!world) {
        return;
      }
      world.apply(rigPoseFromScene(sceneState));
    },
    render() {
      if (!world) {
        return;
      }
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 360;
      const pr = renderer.getPixelRatio();
      if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
        renderer.setSize(w, h, false);
        world.camera.aspect = w / h;
        world.camera.updateProjectionMatrix();
      }
      renderer.render(world.scene, world.camera);
    },
    dispose() {
      if (world) {
        world.dispose();
      }
      renderer.dispose();
    },
  };
}
