import { mkdir, mkdtemp, unlink, writeFile, rm } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { composeScene, paintCharacter } from "./characters.js";
import { createGraph, tickGraph, triggerGesture } from "./anim-graph.js";
import { createRaster, toPpm } from "./raster.js";
import { createDemoServer } from "./serve.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(repoRoot, "artifacts", "characters");
const chromeBin = process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable";

const restBlock = { t0Ms: 0, durationMs: 40, lip: "closed", pose: "rest" };
const talkBlock = { t0Ms: 80, durationMs: 40, lip: "wide", pose: "talk" };

await mkdir(outDir, { recursive: true });

for (const pose of ["rest", "talk", "nod"]) {
  const pixels = pose === "rest" ? restFrame("tater") : pose === "talk" ? talkFrame("tater") : nodFrame("tater");
  const ppm = path.join(outDir, `tater-${pose}.ppm`);
  const png = path.join(outDir, `tater-${pose}.png`);
  await writeFile(ppm, toPpm(pixels));
  await execFileAsync("ffmpeg", ["-y", "-i", ppm, png]);
  await unlink(ppm);
  process.stdout.write(`${png}\n`);
}

const server = createDemoServer();
const port = await listen(server);
try {
  const origin = `http://127.0.0.1:${port}`;
  await withChrome(async (capture) => {
    for (const id of ["analyst", "blocks"]) {
      for (const shot of ["rest", "talk", "nod", "glasses"]) {
        const png = path.join(outDir, `${id}-${shot}.png`);
        await capture(`${origin}/?character=${id}&shot=${shot}`, png, { width: 640, height: 360 });
        process.stdout.write(`${png}\n`);
      }
    }
    await capture(`${origin}/?character=analyst`, path.join(outDir, "ui-analyst.png"), {
      width: 1280,
      height: 900,
    });
    process.stdout.write(`${path.join(outDir, "ui-analyst.png")}\n`);
    await capture(`${origin}/?character=blocks`, path.join(outDir, "ui-blocks.png"), {
      width: 1280,
      height: 900,
    });
    process.stdout.write(`${path.join(outDir, "ui-blocks.png")}\n`);
    await capture(`${origin}/?character=tater`, path.join(outDir, "ui-tater.png"), {
      width: 1280,
      height: 900,
    });
    process.stdout.write(`${path.join(outDir, "ui-tater.png")}\n`);
    await capture(`${origin}/?character=analyst&preview=talk`, path.join(outDir, "ui-analyst-talk.png"), {
      width: 1280,
      height: 900,
    });
    process.stdout.write(`${path.join(outDir, "ui-analyst-talk.png")}\n`);
    await capture(`${origin}/?character=analyst&preview=nod`, path.join(outDir, "ui-analyst-nod.png"), {
      width: 1280,
      height: 900,
    });
    process.stdout.write(`${path.join(outDir, "ui-analyst-nod.png")}\n`);
    await capture(`${origin}/?character=analyst&preview=glasses`, path.join(outDir, "ui-analyst-glasses.png"), {
      width: 1280,
      height: 900,
    });
    process.stdout.write(`${path.join(outDir, "ui-analyst-glasses.png")}\n`);
  });
} finally {
  await closeServer(server);
}

function restFrame(id) {
  const graph = createGraph();
  return paint(id, restBlock, tickGraph(graph, restBlock, 0));
}

function talkFrame(id) {
  const graph = createGraph();
  return paint(id, talkBlock, tickGraph(graph, talkBlock, 80));
}

function nodFrame(id) {
  const graph = createGraph();
  triggerGesture(graph, "nod", 0);
  return paint(id, talkBlock, tickGraph(graph, talkBlock, 160));
}

function paint(id, block, tick) {
  const raster = createRaster();
  paintCharacter(id, raster.gfx, composeScene(block, tick));
  return raster.pixels;
}

function listen(httpServer) {
  return new Promise((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => {
      resolve(httpServer.address().port);
    });
  });
}

function closeServer(httpServer) {
  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function withChrome(fn) {
  const debugPort = await freePort();
  const userData = await mkdtemp(path.join(os.tmpdir(), "avatar-chrome-"));
  const child = spawn(
    chromeBin,
    [
      "--headless=new",
      "--no-sandbox",
      "--hide-scrollbars",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--enable-unsafe-swiftshader",
      "--remote-allow-origins=*",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userData}`,
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await waitHttp(`http://127.0.0.1:${debugPort}/json/version`, 12_000);
    const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
    const client = await cdpConnect(version.webSocketDebuggerUrl);
    try {
      await fn(async (pageUrl, outPath, size) => {
        await capturePage(client, pageUrl, outPath, size);
      });
    } finally {
      client.ws.close();
    }
  } finally {
    child.kill("SIGKILL");
    await sleep(200);
    await rm(userData, { recursive: true, force: true }).catch(() => {});
  }
}

async function capturePage(client, pageUrl, outPath, size) {
  const created = await client.send("Target.createTarget", { url: "about:blank" });
  const attached = await client.send("Target.attachToTarget", {
    targetId: created.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;
  const send = (method, params) => client.send(method, params, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: size.width,
    height: size.height,
    deviceScaleFactor: size.width === 640 ? 2 : 1,
    mobile: false,
  });
  await send("Page.navigate", { url: pageUrl });
  await waitReady(send, 12_000);
  await sleep(600);
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(outPath, Buffer.from(shot.data, "base64"));
  await client.send("Target.closeTarget", { targetId: created.targetId });
}

async function waitReady(send, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await send("Runtime.evaluate", {
      expression: "document.body?.dataset?.stageReady === '1'",
      returnByValue: true,
    });
    if (result.result?.value === true) {
      return;
    }
    await sleep(100);
  }
  throw new Error("stageReady timeout");
}

function cdpConnect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;
    ws.addEventListener("error", () => reject(new Error("cdp websocket")));
    ws.addEventListener("open", () => {
      resolve({
        ws,
        send(method, params = {}, sessionId) {
          const id = nextId++;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            const payload = { id, method, params };
            if (sessionId) {
              payload.sessionId = sessionId;
            }
            ws.send(JSON.stringify(payload));
          });
        },
      });
    });
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (!msg.id || !pending.has(msg.id)) {
        return;
      }
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        rej(new Error(msg.error.message ?? "cdp"));
        return;
      }
      res(msg.result);
    });
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function waitHttp(href, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(href);
      if (response.ok) {
        return;
      }
    } catch {
    }
    await sleep(80);
  }
  throw new Error(`timeout waiting for ${href}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
