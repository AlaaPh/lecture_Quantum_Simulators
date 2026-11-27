// Small canvas helpers for the pictures of the workbook.
export const TAU = 2 * Math.PI;
const family = (mono) => getComputedStyle(document.documentElement).getPropertyValue(mono ? '--font-mono' : '--font-ui') || 'sans-serif';
export const font = (px, wt = 500, mono = false) => `${wt} ${px}px ${family(mono)}`;
export const minus = (s) => String(s).replace(/-/g, '−');

// A text, optionally on a small box of the background colour so that it stays readable on top of lines.
export function tag(ctx, text, x, y, { color, bg = null, px = 12.5, wt = 600, align = 'center', base = 'middle', mono = false } = {}) {
  ctx.save(); ctx.font = font(px, wt, mono); ctx.textAlign = align; ctx.textBaseline = base;
  if (bg) {
    const tw = ctx.measureText(text).width, x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    const y0 = base === 'middle' ? y - px * 0.65 : base === 'bottom' ? y - px * 1.25 : y - px * 0.1;
    ctx.fillStyle = bg; ctx.fillRect(x0 - 3, y0, tw + 6, px * 1.35);
  }
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}

// Axes on the left and at the bottom. Returns the two maps X(x), Y(y) from data to pixels and the plot box.
// xticks, yticks: arrays of values or of [value, label].
export function axes(ctx, c, w, h, { xlim, ylim, xticks = [], yticks = [], xlabel = '', ylabel = '', pad = {}, grid = [] }) {
  const p = { l: 54, r: 16, t: 16, b: 42, ...pad };
  const X = (x) => p.l + ((x - xlim[0]) / (xlim[1] - xlim[0])) * (w - p.l - p.r);
  const Y = (y) => h - p.b - ((y - ylim[0]) / (ylim[1] - ylim[0])) * (h - p.t - p.b);
  ctx.save();
  ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  for (const y of grid) { ctx.beginPath(); ctx.moveTo(p.l, Math.round(Y(y)) + 0.5); ctx.lineTo(w - p.r, Math.round(Y(y)) + 0.5); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, h - p.b); ctx.lineTo(w - p.r, h - p.b); ctx.stroke();
  ctx.fillStyle = c['fg-2']; ctx.font = font(12, 400);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const t of xticks) { const [v, s] = Array.isArray(t) ? t : [t, minus(t)]; ctx.beginPath(); ctx.moveTo(X(v), h - p.b); ctx.lineTo(X(v), h - p.b + 4); ctx.stroke(); ctx.fillText(s, X(v), h - p.b + 7); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const t of yticks) { const [v, s] = Array.isArray(t) ? t : [t, minus(t)]; ctx.beginPath(); ctx.moveTo(p.l - 4, Y(v)); ctx.lineTo(p.l, Y(v)); ctx.stroke(); ctx.fillText(s, p.l - 7, Y(v)); }
  ctx.font = font(12.5, 500);
  if (xlabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(xlabel, (p.l + w - p.r) / 2, h - 4); }
  if (ylabel) { ctx.save(); ctx.translate(13, (p.t + h - p.b) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ylabel, 0, 0); ctx.restore(); }
  ctx.restore();
  return { X, Y, box: p };
}

export const PERIOD_TICKS = [[0, '0'], [0.25, 'L/4'], [0.5, 'L/2'], [0.75, '3L/4'], [1, 'L']];

// A curve y = f(x) from x0 to x1 on the maps X, Y.
export function curve(ctx, X, Y, f, x0, x1, color, width = 2.2, n = 200) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = f(x); if (i) ctx.lineTo(X(x), Y(y)); else ctx.moveTo(X(x), Y(y)); }
  ctx.stroke(); ctx.restore();
}
// A dashed straight line between two points in pixels.
export function dash(ctx, x0, y0, x1, y1, color, width = 1.5) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
}
// A filled circle.
export function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
// Signed bars on the maps X, Y: bar i stands at x = i + 1 (waveguides are counted from 1). color: one colour or (i) → colour.
export function bars(ctx, X, Y, v, color, bw) {
  v.forEach((a, i) => { ctx.fillStyle = typeof color === 'function' ? color(i) : color; ctx.fillRect(X(i + 1) - bw / 2, Math.min(Y(a), Y(0)), bw, Math.max(1, Math.abs(Y(a) - Y(0)))); });
}
// A map of numbers as colours on axes: rows[r][j]; row r covers y from ylim[0] + r·step upward, column j stands at
// x = j + 1. color(value) → css colour. Returns what axes() returns.
export function heat(ctx, c, w, h, rows, color, opts) {
  const a = axes(ctx, c, w, h, opts), { X, Y } = a, n = rows[0].length, m = rows.length, y0 = opts.ylim[0], dy = (opts.ylim[1] - y0) / m;
  const bw = X(2) - X(1), bh = Y(y0) - Y(y0 + dy);
  for (let r = 0; r < m; r++) for (let j = 0; j < n; j++) { ctx.fillStyle = color(rows[r][j]); ctx.fillRect(X(j + 0.5), Y(y0 + (r + 1) * dy), bw + 0.6, bh + 0.6); }
  return a;
}
// Two coupled waveguides and, when solved, their two eigenvectors as bars: (1, 1) with E = +J and (1, −1) with E = −J.
export function pairPicture(ctx, w, h, c, J, solved) {
  const xs = [w * 0.3, w * 0.7], y = solved ? h * 0.24 : h * 0.5;
  ctx.strokeStyle = c['fg-2']; ctx.lineWidth = J > 1 ? 4 : 2; ctx.beginPath(); ctx.moveTo(xs[0], y); ctx.lineTo(xs[1], y); ctx.stroke();
  xs.forEach((x, n) => { dot(ctx, x, y, 14, c.psi); tag(ctx, String(n + 1), x, y + 28, { color: c.fg, px: 12.5 }); });
  tag(ctx, `J = ${J}`, w / 2, y - 16, { color: c['fg-2'], px: 13, wt: 500 });
  if (!solved) return `Two waveguides with the coupling J = ${J}.`;
  [[1, `E = +${J}`], [-1, `E = −${J}`]].forEach(([b, name], k) => {
    const y0 = h * (0.56 + 0.26 * k), u = h * 0.085;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xs[0], y0); ctx.lineTo(xs[1], y0); ctx.stroke();
    [1, b].forEach((v, m) => { ctx.fillStyle = c.psi; ctx.fillRect(xs[m] - 22, v > 0 ? y0 - u : y0, 44, u); });
    tag(ctx, name, w * 0.86, y0, { color: c.fg, px: 14 }); tag(ctx, `(1, ${minus(b)})`, w * 0.13, y0, { color: c['fg-2'], px: 13.5, wt: 500 });
  });
  return `Two waveguides and their two eigenvectors as bars, upward for +1 and downward for −1: in phase with E = +${J}, in antiphase with E = −${J}.`;
}
// A text with one raised part (the canvas has no superscript): base, then exp smaller and higher, then tail.
export function tagSup(ctx, base, exp, x, y, { color, px = 13, wt = 600, align = 'center', tail = '' } = {}) {
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = color;
  ctx.font = font(px, wt); const wb = ctx.measureText(base).width, wt2 = ctx.measureText(tail).width;
  ctx.font = font(px * 0.76, wt); const we = ctx.measureText(exp).width + 1;
  const x0 = align === 'center' ? x - (wb + we + wt2) / 2 : align === 'right' ? x - wb - we - wt2 : x;
  ctx.fillText(exp, x0 + wb + 1, y - px * 0.36);
  ctx.font = font(px, wt); ctx.fillText(base, x0, y); if (tail) ctx.fillText(tail, x0 + wb + we, y);
  ctx.restore();
}
