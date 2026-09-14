import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const publicRoot = path.join(repoRoot, "demo", "public");
const demoRoot = path.join(repoRoot, "demo");
const distRoot = path.join(repoRoot, "dist");
const host = "0.0.0.0";
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  void handle(req, res);
});

server.listen(port, host, () => {
  process.stdout.write(`demo http://127.0.0.1:${port}/\n`);
});

async function handle(req, res) {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    const file = resolveFile(url.pathname);
    if (file === null) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("bad path");
      return;
    }
    const body = await fs.readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (error) {
    const missing = error && typeof error === "object" && "code" in error && error.code === "ENOENT";
    res.writeHead(missing ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
    res.end(missing ? "not found" : "error");
  }
}

function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname.split("?")[0] ?? "/");
  if (clean === "/" || clean === "") {
    return path.join(publicRoot, "index.html");
  }
  if (clean.startsWith("/dist/")) {
    return inside(distRoot, clean.slice("/dist/".length));
  }
  if (clean.startsWith("/lib/")) {
    return inside(demoRoot, clean.slice("/lib/".length));
  }
  return inside(publicRoot, clean.slice(1));
}

function inside(root, relative) {
  if (relative.includes("\0")) {
    return null;
  }
  const resolved = path.resolve(root, relative);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    return null;
  }
  return resolved;
}
