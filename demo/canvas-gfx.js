export function canvasGfx(ctx) {
  return {
    fillRect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    },
    fillEllipse(x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    fillText(text, x, y, color) {
      ctx.fillStyle = color;
      ctx.font = "16px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
    },
    save() {
      ctx.save();
    },
    restore() {
      ctx.restore();
    },
    translate(x, y) {
      ctx.translate(x, y);
    },
    rotate(radians) {
      ctx.rotate(radians);
    },
  };
}
