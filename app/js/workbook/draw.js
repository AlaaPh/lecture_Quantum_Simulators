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
