/**
 * Three.js host for the Incredibles-style analyst and the block puppet.
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

  function mount(id) {
    if (world) {
      world.dispose();
      world = null;
    }
    characterId = id === "blocks" ? "blocks" : "analyst";
    world = characterId === "blocks" ? createBlocksWorld(renderer) : createAnalystWorld(renderer);
  }

  mount("analyst");

  return {
    renderer,
    get characterId() {
      return characterId;
    },
    setCharacter(id) {
      if (id === "tater") {
        return;
      }
      const next = id === "blocks" ? "blocks" : "analyst";
      if (next === characterId && world) {
        return;
      }
      mount(next);
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
