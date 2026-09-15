/**
 * Shared broadcast studio: film lights, whiteboard, desk, ESPN laptop, mug.
 * Browser-only (canvas textures). Do not import from Node unit tests.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

let areaLightsReady = false;

export function addFilmLights(scene, renderer) {
  if (!areaLightsReady) {
    RectAreaLightUniformsLib.init();
    areaLightsReady = true;
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.28;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xdde6ee, 0x1a140f, 0.22));

  const key = new THREE.DirectionalLight(0xffe2c4, 1.72);
  key.position.set(-2.4, 3.6, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.blurSamples = 16;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = -3.4;
  key.shadow.camera.right = 3.4;
  key.shadow.camera.top = 3.4;
  key.shadow.camera.bottom = -3.4;
  key.shadow.bias = -0.00018;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const keySoft = new THREE.RectAreaLight(0xffefd4, 7.5, 3.2, 1.8);
  keySoft.position.set(-1.9, 3.1, 3.4);
  keySoft.lookAt(0.1, 1.55, 0.1);
  scene.add(keySoft);

  const fill = new THREE.DirectionalLight(0x9bb8d4, 0.62);
  fill.position.set(3.4, 2.2, 3.0);
  scene.add(fill);

  const fillSoft = new THREE.RectAreaLight(0xb7cce4, 3.2, 2.4, 1.4);
  fillSoft.position.set(2.6, 2.0, 2.4);
  fillSoft.lookAt(0.1, 1.5, 0.1);
  scene.add(fillSoft);

  const rim = new THREE.DirectionalLight(0xe8eef6, 1.55);
  rim.position.set(0.55, 3.4, -4.6);
  scene.add(rim);

  const face = new THREE.SpotLight(0xffe6c8, 4.4, 8, 0.48, 0.55, 1.4);
  face.position.set(-0.45, 2.28, 1.85);
  face.target.position.set(0.08, 1.64, 0.08);
  scene.add(face);
  scene.add(face.target);

  const bounce = new THREE.PointLight(0xe8a070, 0.38, 6, 1.6);
  bounce.position.set(0.2, 0.82, 1.2);
  scene.add(bounce);

  const screen = new THREE.PointLight(0x3ec3e8, 0.45, 3.2, 2);
  screen.position.set(-0.52, 0.96, 0.72);
  scene.add(screen);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function addBroadcastSet(scene) {
  scene.background = new THREE.Color(0x2c333a);
  scene.fog = new THREE.Fog(0x2c333a, 8, 20);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9),
    new THREE.MeshStandardMaterial({ color: 0x3a424a, roughness: 0.86, metalness: 0.04 }),
  );
  wall.position.set(0.5, 2.3, -3.5);
  scene.add(wall);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 4.4),
    new THREE.MeshPhysicalMaterial({
      color: 0xb7c2c8,
      roughness: 0.08,
      metalness: 0.18,
      transmission: 0.42,
      thickness: 0.22,
      transparent: true,
      opacity: 0.58,
    }),
  );
  glass.position.set(2.7, 1.75, -2.15);
  glass.rotation.y = -0.2;
  scene.add(glass);

  addBokeh(scene);
  addWhiteboard(scene);
  addDesk(scene);
  addLaptop(scene);
  addMug(scene);
}

export function talkingHeadCamera(lookAt = [0, 1.62, 0.08], distance = 1.32) {
  const camera = new THREE.PerspectiveCamera(28, 640 / 360, 0.08, 40);
  const [lx, ly, lz] = lookAt;
  camera.position.set(lx + 0.06, ly + 0.08, lz + distance);
  camera.lookAt(lx, ly - 0.06, lz);
  return camera;
}

export function makeGoldGlasses() {
  const glasses = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd7b44a,
    metalness: 0.88,
    roughness: 0.2,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x8a4e3a,
    roughness: 0.12,
    transmission: 0.22,
    transparent: true,
    opacity: 0.28,
  });
  const frameL = new THREE.Mesh(new RoundedBoxGeometry(0.038, 0.024, 0.008, 3, 0.005), gold);
  frameL.position.set(-0.026, 0, 0);
  glasses.add(frameL);
  const frameR = frameL.clone();
  frameR.position.x = 0.026;
  glasses.add(frameR);
  const glassL = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.018), lens);
  glassL.position.set(-0.026, 0, 0.005);
  glasses.add(glassL);
  const glassR = glassL.clone();
  glassR.position.x = 0.026;
  glasses.add(glassR);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.005, 0.007), gold);
  glasses.add(bridge);
  const armGL = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.004, 0.004), gold);
  armGL.position.set(-0.048, 0, -0.014);
  armGL.rotation.y = 0.52;
  glasses.add(armGL);
  const armGR = armGL.clone();
  armGR.position.x = 0.048;
  armGR.rotation.y = -0.52;
  glasses.add(armGR);
  return glasses;
}

export function skinMaterial(color = 0x8a4e3a) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.44,
    metalness: 0,
    sheen: 0.72,
    sheenColor: new THREE.Color(0xffb089),
    sheenRoughness: 0.68,
    clearcoat: 0.16,
    clearcoatRoughness: 0.48,
  });
}

export function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) {
      obj.geometry.dispose();
    }
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (mat.map) {
          mat.map.dispose();
        }
        if (mat.gradientMap) {
          mat.gradientMap.dispose();
        }
        mat.dispose();
      }
    }
  });
  if (root.environment) {
    root.environment.dispose();
  }
}

function addBokeh(scene) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xc5d0d6, transparent: true, opacity: 0.38 });
  const specs = [
    [2.9, 2.45, -2.75, 0.58],
    [3.45, 1.55, -2.45, 0.36],
    [2.25, 2.95, -3.05, 0.26],
    [-2.85, 2.65, -3.15, 0.42],
    [3.1, 2.05, -2.2, 0.18],
  ];
  for (const [x, y, z, r] of specs) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat);
    ball.position.set(x, y, z);
    scene.add(ball);
  }
}

function addWhiteboard(scene) {
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(1.58, 1.88, 0.06, 4, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.34 }),
  );
  board.position.set(-1.22, 1.38, -0.42);
  board.castShadow = true;
  board.receiveShadow = true;
  scene.add(board);

  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(1.66, 1.96, 0.04, 3, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x3a4044, roughness: 0.5 }),
  );
  frame.position.set(-1.22, 1.38, -0.46);
  scene.add(frame);

  const chart = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 1.66),
    new THREE.MeshBasicMaterial({ map: whiteboardTexture() }),
  );
  chart.position.set(-1.22, 1.38, -0.386);
  scene.add(chart);
}

function addDesk(scene) {
  const top = new THREE.Mesh(
    new RoundedBoxGeometry(3.7, 0.08, 1.38, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1b4584, roughness: 0.32, metalness: 0.14 }),
  );
  top.position.set(0.18, 0.64, 0.44);
  top.receiveShadow = true;
  scene.add(top);

  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(3.64, 0.16, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x163a72, roughness: 0.42 }),
  );
  apron.position.set(0.18, 0.54, 0.44);
  scene.add(apron);
}

function addLaptop(scene) {
  const metal = new THREE.MeshStandardMaterial({ color: 0xd0d6dc, metalness: 0.58, roughness: 0.26 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.03, 0.44, 2, 0.01), metal);
  base.position.set(-0.58, 0.7, 0.6);
  base.castShadow = true;
  scene.add(base);

  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.42, 0.02, 2, 0.01), metal);
  lid.position.set(-0.58, 0.92, 0.4);
  lid.rotation.x = -0.2;
  scene.add(lid);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.34),
    new THREE.MeshStandardMaterial({
      map: labeledTexture("ESPN", "ANALYTICS", 512, 320, "#121820", "#3ec3e8", "#8fdfff"),
      emissive: 0x123040,
      emissiveIntensity: 0.7,
    }),
  );
  screen.position.set(-0.58, 0.92, 0.412);
  screen.rotation.x = -0.2;
  scene.add(screen);
}

function addMug(scene) {
  const ceramic = new THREE.MeshStandardMaterial({ color: 0x1d4e9a, roughness: 0.38 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 24), ceramic);
  cup.position.set(0.1, 0.76, 0.64);
  cup.castShadow = true;
  scene.add(cup);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.01, 8, 16, Math.PI),
    ceramic,
  );
  handle.position.set(0.15, 0.76, 0.64);
  handle.rotation.y = Math.PI / 2;
  scene.add(handle);
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.028),
    new THREE.MeshBasicMaterial({ map: labeledTexture("SEC", "NATION", 256, 96, "#163a72", "#f4f7fb", "#e6c84a") }),
  );
  badge.position.set(0.1, 0.78, 0.696);
  scene.add(badge);
}

function whiteboardTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 640;
  const g = c.getContext("2d");
  g.fillStyle = "#f4f7fb";
  g.fillRect(0, 0, 512, 640);
  g.strokeStyle = "#5b4db3";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(70, 90);
  g.quadraticCurveTo(180, 40, 280, 120);
  g.lineTo(120, 280);
  g.stroke();
  g.fillStyle = "#c43b3b";
  g.beginPath();
  g.arc(150, 210, 18, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2f6b3a";
  g.beginPath();
  g.arc(340, 160, 22, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#b45309";
  g.fillRect(300, 70, 46, 40);
  g.fillStyle = "#7f1d1d";
  g.fillRect(360, 78, 40, 40);
  const bars = [
    [90, 420, 48, 140, "#c9d2e0"],
    [160, 380, 48, 180, "#4f6fa8"],
    [230, 350, 48, 210, "#d27a3a"],
  ];
  for (const [x, y, w, h, color] of bars) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }
  g.fillStyle = "#1a3a6e";
  g.fillRect(80, 560, 180, 36);
  g.fillStyle = "#e8eef3";
  g.font = "bold 22px sans-serif";
  g.fillText("SEC NETWORK", 92, 585);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function labeledTexture(top, bottom, width, height, bg, c1, c2) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, width, height);
  g.fillStyle = c1;
  g.font = `bold ${Math.round(height * 0.22)}px sans-serif`;
  g.fillText(top, width * 0.08, height * 0.42);
  g.fillStyle = c2;
  g.font = `bold ${Math.round(height * 0.16)}px sans-serif`;
  g.fillText(bottom, width * 0.08, height * 0.68);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
