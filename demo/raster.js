import { HEIGHT, WIDTH } from "./avatar-scene.js";

export function createRaster() {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  const stack = [];
  let ox = 0;
  let oy = 0;
  let angle = 0;

  function mapPoint(x, y) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: ox + x * cos - y * sin,
      y: oy + x * sin + y * cos,
    };
  }

  function setPixel(ix, iy, rgb) {
    if (ix < 0 || iy < 0 || ix >= WIDTH || iy >= HEIGHT) {
      return;
    }
    const i = (iy * WIDTH + ix) * 3;
    pixels[i] = rgb[0];
    pixels[i + 1] = rgb[1];
    pixels[i + 2] = rgb[2];
  }

  function parseColor(color) {
    const n = Number.parseInt(color.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function unmapPoint(ix, iy) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = ix - ox;
    const dy = iy - oy;
    return {
      x: dx * cos + dy * sin,
      y: -dx * sin + dy * cos,
    };
  }

  const gfx = {
    fillRect(x, y, w, h, color) {
      const rgb = parseColor(color);
      const a = mapPoint(x, y);
      const b = mapPoint(x + w, y + h);
      const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x)));
      const x1 = Math.min(WIDTH - 1, Math.ceil(Math.max(a.x, b.x)));
      const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y)));
      const y1 = Math.min(HEIGHT - 1, Math.ceil(Math.max(a.y, b.y)));
      for (let iy = y0; iy <= y1; iy++) {
        for (let ix = x0; ix <= x1; ix++) {
          setPixel(ix, iy, rgb);
        }
      }
    },
    fillEllipse(x, y, rx, ry, color) {
      const rgb = parseColor(color);
      const rx2 = rx * rx;
      const ry2 = ry * ry;
      const x0 = Math.floor(-rx);
      const x1 = Math.ceil(rx);
      const y0 = Math.floor(-ry);
      const y1 = Math.ceil(ry);
      for (let ly = y0; ly <= y1; ly++) {
        for (let lx = x0; lx <= x1; lx++) {
          if ((lx * lx) / rx2 + (ly * ly) / ry2 > 1) {
            continue;
          }
          const p = mapPoint(x + lx, y + ly);
          setPixel(Math.round(p.x), Math.round(p.y), rgb);
        }
      }
    },
    fillText(text, x, y, color) {
      const rgb = parseColor(color);
      const p = mapPoint(x, y);
      glyphText(text, Math.round(p.x), Math.round(p.y), rgb, setPixel);
    },
    save() {
      stack.push({ ox, oy, angle });
    },
    restore() {
      const prev = stack.pop();
      if (prev === undefined) {
        return;
      }
      ox = prev.ox;
      oy = prev.oy;
      angle = prev.angle;
    },
    translate(x, y) {
      const p = mapPoint(x, y);
      ox = p.x;
      oy = p.y;
    },
    rotate(radians) {
      angle += radians;
    },
    fillPolygon(points, color) {
      if (points.length < 3) {
        return;
      }
      const rgb = parseColor(color);
      const mapped = points.map((p) => mapPoint(p.x, p.y));
      let minx = WIDTH;
      let miny = HEIGHT;
      let maxx = 0;
      let maxy = 0;
      for (const p of mapped) {
        minx = Math.min(minx, p.x);
        miny = Math.min(miny, p.y);
        maxx = Math.max(maxx, p.x);
        maxy = Math.max(maxy, p.y);
      }
      const x0 = Math.max(0, Math.floor(minx));
      const y0 = Math.max(0, Math.floor(miny));
      const x1 = Math.min(WIDTH - 1, Math.ceil(maxx));
      const y1 = Math.min(HEIGHT - 1, Math.ceil(maxy));
      for (let iy = y0; iy <= y1; iy++) {
        for (let ix = x0; ix <= x1; ix++) {
          if (pointInPolygon(ix + 0.5, iy + 0.5, mapped)) {
            setPixel(ix, iy, rgb);
          }
        }
      }
    },
    fillRoundRect(x, y, w, h, r, color) {
      const rgb = parseColor(color);
      const rr = Math.max(0, Math.min(r, w / 2, h / 2));
      const x1 = x + w;
      const y1 = y + h;
      const corners = [
        { cx: x + rr, cy: y + rr },
        { cx: x1 - rr, cy: y + rr },
        { cx: x + rr, cy: y1 - rr },
        { cx: x1 - rr, cy: y1 - rr },
      ];
      const minx = Math.max(0, Math.floor(Math.min(mapPoint(x, y).x, mapPoint(x1, y1).x, mapPoint(x, y1).x, mapPoint(x1, y).x)));
      const maxx = Math.min(WIDTH - 1, Math.ceil(Math.max(mapPoint(x, y).x, mapPoint(x1, y1).x, mapPoint(x, y1).x, mapPoint(x1, y).x)));
      const miny = Math.max(0, Math.floor(Math.min(mapPoint(x, y).y, mapPoint(x1, y1).y, mapPoint(x, y1).y, mapPoint(x1, y).y)));
      const maxy = Math.min(HEIGHT - 1, Math.ceil(Math.max(mapPoint(x, y).y, mapPoint(x1, y1).y, mapPoint(x, y1).y, mapPoint(x1, y).y)));
      for (let iy = miny; iy <= maxy; iy++) {
        for (let ix = minx; ix <= maxx; ix++) {
          const local = unmapPoint(ix, iy);
          if (insideRoundRect(local.x, local.y, x, y, x1, y1, rr, corners)) {
            setPixel(ix, iy, rgb);
          }
        }
      }
    },
    strokeLine(x0, y0, x1, y1, color, lineWidth = 2) {
      const rgb = parseColor(color);
      const a = mapPoint(x0, y0);
      const b = mapPoint(x1, y1);
      const half = Math.max(0.5, lineWidth / 2);
      const minx = Math.max(0, Math.floor(Math.min(a.x, b.x) - half - 1));
      const maxx = Math.min(WIDTH - 1, Math.ceil(Math.max(a.x, b.x) + half + 1));
      const miny = Math.max(0, Math.floor(Math.min(a.y, b.y) - half - 1));
      const maxy = Math.min(HEIGHT - 1, Math.ceil(Math.max(a.y, b.y) + half + 1));
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      for (let iy = miny; iy <= maxy; iy++) {
        for (let ix = minx; ix <= maxx; ix++) {
          let t = 0;
          if (len2 > 0) {
            t = ((ix - a.x) * dx + (iy - a.y) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
          }
          const px = a.x + t * dx;
          const py = a.y + t * dy;
          if (Math.hypot(ix - px, iy - py) <= half) {
            setPixel(ix, iy, rgb);
          }
        }
      }
    },
  };

  return { pixels, gfx };
}

export function toPpm(pixels) {
  const header = Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`);
  return Buffer.concat([header, Buffer.from(pixels)]);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i];
    const pj = points[j];
    const intersects =
      pi.y > y !== pj.y > y &&
      x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function insideRoundRect(px, py, x, y, x1, y1, rr, corners) {
  if (px >= x + rr && px <= x1 - rr && py >= y && py <= y1) {
    return true;
  }
  if (px >= x && px <= x1 && py >= y + rr && py <= y1 - rr) {
    return true;
  }
  const r2 = rr * rr;
  for (const corner of corners) {
    const dx = px - corner.cx;
    const dy = py - corner.cy;
    if (dx * dx + dy * dy <= r2) {
      return true;
    }
  }
  return false;
}

function glyphText(text, x, y, rgb, setPixel) {
  let cursor = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch] ?? GLYPHS["?"];
    for (let gy = 0; gy < 7; gy++) {
      const row = glyph[gy] ?? 0;
      for (let gx = 0; gx < 5; gx++) {
        if (((row >> (4 - gx)) & 1) === 1) {
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              setPixel(cursor + gx * 2 + dx, y + gy * 2 + dy - 7, rgb);
            }
          }
        }
      }
    }
    cursor += 12;
  }
}

const GLYPHS = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "?": [0x0e, 0x11, 0x02, 0x04, 0x04, 0x00, 0x04],
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  3: [0x0e, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  t: [0x00, 0x08, 0x1e, 0x08, 0x08, 0x09, 0x06],
  m: [0x00, 0x00, 0x1a, 0x15, 0x15, 0x15, 0x15],
  s: [0x00, 0x00, 0x0e, 0x10, 0x0e, 0x01, 0x1e],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  i: [0x00, 0x04, 0x00, 0x0c, 0x04, 0x04, 0x0e],
  p: [0x00, 0x00, 0x1e, 0x11, 0x1e, 0x10, 0x10],
  o: [0x00, 0x00, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  e: [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  n: [0x00, 0x00, 0x16, 0x19, 0x11, 0x11, 0x11],
  a: [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  r: [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
  w: [0x00, 0x00, 0x11, 0x11, 0x15, 0x15, 0x0a],
  d: [0x01, 0x01, 0x0d, 0x13, 0x11, 0x11, 0x0f],
  c: [0x00, 0x00, 0x0e, 0x10, 0x10, 0x11, 0x0e],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  g: [0x00, 0x00, 0x0f, 0x11, 0x0f, 0x01, 0x0e],
  u: [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0d],
  y: [0x00, 0x00, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  f: [0x06, 0x08, 0x1e, 0x08, 0x08, 0x08, 0x08],
  h: [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x11],
};
