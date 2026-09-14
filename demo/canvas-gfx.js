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
    fillPolygon(points, color) {
      if (points.length < 3) {
        return;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    },
    fillRoundRect(x, y, w, h, r, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      const rr = Math.min(r, w / 2, h / 2);
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, rr);
      } else {
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
      }
      ctx.fill();
    },
    strokeLine(x0, y0, x1, y1, color, lineWidth = 2) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    },
  };
}
