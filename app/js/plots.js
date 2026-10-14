// Minimal HiDPI canvas plotting with hover hits. Colors come from the theme tokens.
import { colors, cmapSeq, cmapDiv, rgbToCss } from './theme.js';

export function niceTicks(lo, hi, n = 5) {
  const span = hi - lo || 1;
  const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p, step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  const t = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) t.push(Math.abs(v) < 1e-12 ? 0 : v);
  return t;
}
const fmtTick = (v) => (Number.isInteger(v) ? String(v) : (Math.abs(v) >= 100 ? v.toFixed(0) : +v.toFixed(3)).toString());

export class Plot {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = { pad: { l: 52, r: 14, t: 26, b: 36 }, ...opts };
    this.xlim = [0, 1]; this.ylim = [0, 1];
    this.hits = [];
    this.hover = null;
    this.onRedraw = null;
    this._resize();
    this.ro = new ResizeObserver(() => { this._resize(); this.onRedraw && this.onRedraw(); });
    this.ro.observe(canvas);
    canvas.addEventListener('pointermove', (e) => this._pointer(e, 'move'));
    canvas.addEventListener('pointerleave', () => { if (this.hover) { this.hover = null; this.onHover && this.onHover(null); this._tip(null); } });
    canvas.addEventListener('pointerdown', (e) => this._pointer(e, 'down'));
  }
  _resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  _pointer(e, kind) {
    const r = this.canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 14;
    for (const h of this.hits) { const d = Math.hypot(h.x - mx, h.y - my); if (d < bd) { bd = d; best = h; } }
    if (kind === 'down') { if (best && this.onClick) this.onClick(best.data); return; }
    const changed = (best && best.data) !== (this.hover && this.hover.data);
    this.hover = best;
    if (changed) { this.onHover && this.onHover(best ? best.data : null); this._tip(best); }
  }
  _tip(hit) {
    if (!this.tipEl) {
      this.tipEl = document.createElement('div'); this.tipEl.className = 'plot-tip';
      this.canvas.parentElement.append(this.tipEl);
    }
    if (!hit || !hit.tip) { this.tipEl.hidden = true; return; }
    this.tipEl.hidden = false; this.tipEl.innerHTML = hit.tip;
    const left = Math.min(hit.x + 12, this.w - this.tipEl.offsetWidth - 4);
    this.tipEl.style.left = left + 'px'; this.tipEl.style.top = Math.max(2, hit.y - 30) + 'px';
  }
  x(v) { const p = this.opts.pad; return p.l + ((v - this.xlim[0]) / (this.xlim[1] - this.xlim[0])) * (this.w - p.l - p.r); }
  y(v) { const p = this.opts.pad; return this.h - p.b - ((v - this.ylim[0]) / (this.ylim[1] - this.ylim[0])) * (this.h - p.t - p.b); }
  begin({ xlim, ylim, xlabel = '', ylabel = '', title = '', xticks, yticks, grid = true, xtickFmt = fmtTick, ytickFmt = fmtTick } = {}) {
    const c = colors(), ctx = this.ctx, p = this.opts.pad;
    this.hits = [];
    this.xlim = xlim || this.xlim; this.ylim = ylim || this.ylim;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.font = '11px ' + (getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace');
    ctx.lineWidth = 1;
    const xt = xticks || niceTicks(this.xlim[0], this.xlim[1], Math.max(2, Math.floor((this.w - p.l - p.r) / 70)));
    const yt = yticks || niceTicks(this.ylim[0], this.ylim[1], Math.max(2, Math.floor((this.h - p.t - p.b) / 40)));
    if (grid) {
      ctx.strokeStyle = c.grid; ctx.beginPath();
      for (const v of xt) { const X = Math.round(this.x(v)) + 0.5; ctx.moveTo(X, p.t); ctx.lineTo(X, this.h - p.b); }
      for (const v of yt) { const Y = Math.round(this.y(v)) + 0.5; ctx.moveTo(p.l, Y); ctx.lineTo(this.w - p.r, Y); }
      ctx.stroke();
    }
    ctx.strokeStyle = c.line; ctx.beginPath();
    ctx.moveTo(p.l + 0.5, p.t); ctx.lineTo(p.l + 0.5, this.h - p.b + 0.5); ctx.lineTo(this.w - p.r, this.h - p.b + 0.5); ctx.stroke();
    ctx.fillStyle = c['fg-2']; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const v of xt) ctx.fillText(xtickFmt(v), this.x(v), this.h - p.b + 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const v of yt) ctx.fillText(ytickFmt(v), p.l - 6, this.y(v));
    ctx.font = '12px ' + (getComputedStyle(document.documentElement).getPropertyValue('--font-ui') || 'sans-serif');
    if (xlabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(xlabel, p.l + (this.w - p.l - p.r) / 2, this.h - 3); }
    if (ylabel) { ctx.save(); ctx.translate(13, p.t + (this.h - p.t - p.b) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ylabel, 0, 0); ctx.restore(); }
    if (title) { ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '600 12px ' + (getComputedStyle(document.documentElement).getPropertyValue('--font-ui') || 'sans-serif'); ctx.fillText(title, p.l, 6); }
    ctx.save(); ctx.beginPath(); ctx.rect(p.l, p.t, this.w - p.l - p.r, this.h - p.t - p.b); ctx.clip();
  }
  end() { this.ctx.restore(); }
  dots(xs, ys, { color, colors: cols, r = 3.5, data, tips, ring = false } = {}) {
    const ctx = this.ctx, c = colors();
    for (let i = 0; i < xs.length; i++) {
      const X = this.x(xs[i]), Y = this.y(ys[i]);
      ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fillStyle = cols ? cols[i] : (color || c.psi); ctx.fill();
      if (ring) { ctx.lineWidth = 1.5; ctx.strokeStyle = c.surface; ctx.stroke(); }
      this.hits.push({ x: X, y: Y, data: data ? data[i] : i, tip: tips ? tips[i] : null });
    }
  }
  line(xs, ys, { color, width = 2, dash, alpha = 1 } = {}) {
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color || colors().psi; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) { const X = this.x(xs[i]), Y = this.y(ys[i]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke(); ctx.restore();
  }
  band(xs, y0, y1, { color, alpha = 0.12 } = {}) {
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color || colors().psi; ctx.beginPath();
    for (let i = 0; i < xs.length; i++) { const X = this.x(xs[i]), Y = this.y(y0[i]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(this.x(xs[i]), this.y(y1[i]));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  hline(yv, { color, width = 1, dash, alpha = 1 } = {}) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color || colors()['fg-2']; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(this.x(this.xlim[0]), this.y(yv)); ctx.lineTo(this.x(this.xlim[1]), this.y(yv)); ctx.stroke(); ctx.restore();
  }
  vline(xv, { color, width = 1, dash, alpha = 1 } = {}) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color || colors()['fg-2']; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(this.x(xv), this.y(this.ylim[0])); ctx.lineTo(this.x(xv), this.y(this.ylim[1])); ctx.stroke(); ctx.restore();
  }
  hspan(y0, y1, { color, alpha = 0.1 } = {}) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color || colors().psi;
    ctx.fillRect(this.x(this.xlim[0]), this.y(y1), this.x(this.xlim[1]) - this.x(this.xlim[0]), this.y(y0) - this.y(y1)); ctx.restore();
  }
  text(xv, yv, str, { color, align = 'left', baseline = 'middle', dx = 0, dy = 0, font } = {}) {
    const ctx = this.ctx; ctx.save(); ctx.fillStyle = color || colors().fg; ctx.textAlign = align; ctx.textBaseline = baseline;
    if (font) ctx.font = font; ctx.fillText(str, this.x(xv) + dx, this.y(yv) + dy); ctx.restore();
  }
  // M[i][j] drawn with j along x (cells 0..ncol) and i along y (cells 0..nrow); cell (i,j) covers [j, j+1] x [i, i+1]
  heatmap(M, { cmap = 'seq', vmin, vmax, x0 = 0, y0 = 0, tips } = {}) {
    const ctx = this.ctx, nr = M.length, nc = M[0].length;
    if (vmin === undefined || vmax === undefined) { let lo = Infinity, hi = -Infinity; for (const r of M) for (const v of r) { lo = Math.min(lo, v); hi = Math.max(hi, v); } vmin = vmin ?? lo; vmax = vmax ?? hi; }
    const f = cmap === 'div' ? (v) => cmapDiv(v / Math.max(Math.abs(vmin), Math.abs(vmax), 1e-12)) : (v) => cmapSeq((v - vmin) / ((vmax - vmin) || 1));
    for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
      const X0 = this.x(x0 + j), X1 = this.x(x0 + j + 1), Y0 = this.y(y0 + i), Y1 = this.y(y0 + i + 1);
      ctx.fillStyle = rgbToCss(f(M[i][j]));
      ctx.fillRect(Math.min(X0, X1), Math.min(Y0, Y1), Math.abs(X1 - X0) + 0.6, Math.abs(Y1 - Y0) + 0.6);
      if (tips) this.hits.push({ x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, data: [i, j], tip: tips(i, j) });
    }
  }
  legend(items, { x = 8, y = 8, align = 'left' } = {}) {
    const ctx = this.ctx, c = colors(), p = this.opts.pad;
    ctx.save(); ctx.font = '11px ' + (getComputedStyle(document.documentElement).getPropertyValue('--font-ui') || 'sans-serif');
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const total = items.reduce((s, it) => s + 16 + ctx.measureText(it.label).width + 14, 0) - 14;
    let X = align === 'right' ? this.w - p.r - total - x : p.l + x; const Y = p.t + y;
    for (const it of items) {
      ctx.fillStyle = it.color; ctx.fillRect(X, Y - 4, 12, 8); ctx.fillStyle = c['fg-2']; ctx.fillText(it.label, X + 16, Y);
      X += 16 + ctx.measureText(it.label).width + 14;
    }
    ctx.restore();
  }
  dispose() { this.ro.disconnect(); if (this.tipEl) this.tipEl.remove(); }
}
