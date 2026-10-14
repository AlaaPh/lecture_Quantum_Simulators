// The chain widget: N sites in a row, bonds J1 (inside the unit cell, solid) and J2 (between cells, dashed),
// bars for the amplitude (signed) or the probability, site fill for the probability.
import { colors, cmapDiv, rgbToCss } from './theme.js';

export class ChainView {
  constructor(canvas, opts = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.opts = { mode: 'signed', sublattice: false, labels: true, ...opts };
    this.state = { amp: [0, 0, 0], prob: null, J1: 1, J2: 1 };
    this._resize();
    this.ro = new ResizeObserver(() => { this._resize(); this.draw(); });
    this.ro.observe(canvas);
  }
  _resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  set(s) { Object.assign(this.state, s); if (s.mode || s.sublattice !== undefined) Object.assign(this.opts, { mode: s.mode ?? this.opts.mode, sublattice: s.sublattice ?? this.opts.sublattice }); this.draw(); }
  draw() {
    const { amp, J1, J2 } = this.state;
    const prob = this.state.prob || amp.map((a) => a * a);
    const N = amp.length, c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    const m = Math.min(40, w * 0.08);
    const sp = N > 1 ? (w - 2 * m) / (N - 1) : 0;
    const r = Math.max(3, Math.min(14, sp * 0.3, h * 0.12));
    const yS = h * 0.72, barMax = h * 0.40, base = yS - r - 6;
    const xs = Array.from({ length: N }, (_, i) => (N > 1 ? m + i * sp : w / 2));
    // bonds
    for (let i = 0; i < N - 1; i++) {
      const inner = i % 2 === 0;
      const J = inner ? J1 : J2;
      ctx.strokeStyle = c.axis; ctx.lineWidth = Math.max(0.8, Math.min(5, 1 + 2.2 * Math.abs(J)));
      ctx.setLineDash(this.opts.sublattice && !inner ? [5, 4] : []);
      ctx.globalAlpha = Math.abs(J) < 1e-6 ? 0.15 : 0.9;
      ctx.beginPath(); ctx.moveTo(xs[i] + r, yS); ctx.lineTo(xs[i + 1] - r, yS); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // bars: probability (up from a baseline) or signed amplitude (around a mid baseline)
    const pmax = Math.max(1e-9, ...prob);
    const bw = Math.max(3, Math.min(18, sp * 0.45));
    const y0 = this.opts.mode === 'prob' ? base : base - barMax / 2;
    for (let i = 0; i < N; i++) {
      if (this.opts.mode === 'prob') {
        const hgt = prob[i] * barMax;
        ctx.fillStyle = c.psi; ctx.fillRect(xs[i] - bw / 2, y0 - hgt, bw, hgt);
      } else {
        const hgt = amp[i] * barMax / 2;
        ctx.fillStyle = rgbToCss(cmapDiv(amp[i]));
        ctx.fillRect(xs[i] - bw / 2, hgt >= 0 ? y0 - hgt : y0, bw, Math.abs(hgt));
      }
    }
    ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(m - r, Math.round(y0) + 0.5); ctx.lineTo(w - m + r, Math.round(y0) + 0.5); ctx.stroke();
    // sites
    for (let i = 0; i < N; i++) {
      const isA = i % 2 === 0;
      ctx.beginPath(); ctx.arc(xs[i], yS, r, 0, Math.PI * 2);
      ctx.fillStyle = c.surface; ctx.fill();
      ctx.globalAlpha = Math.min(1, 0.08 + 0.92 * (prob[i] / pmax)) * (prob[i] > 1e-6 ? 1 : 0.0);
      ctx.fillStyle = c.psi; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5; ctx.strokeStyle = this.opts.sublattice ? (isA ? c.fg : c['fg-2']) : c.fg; ctx.setLineDash(this.opts.sublattice && !isA ? [2, 2] : []); ctx.stroke(); ctx.setLineDash([]);
    }
    // labels
    if (this.opts.labels) {
      ctx.fillStyle = c['fg-2']; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = '11px ' + (getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace');
      const every = N <= 24 ? 1 : N <= 50 ? 5 : 10;
      for (let i = 0; i < N; i++) if ((i + 1) % every === 0 || i === 0 || N <= 24) ctx.fillText(String(i + 1), xs[i], yS + r + 4);
      if (this.opts.sublattice && N <= 24) { for (let i = 0; i < N; i++) ctx.fillText(i % 2 === 0 ? 'A' : 'B', xs[i], yS + r + 17); }
    }
  }
  dispose() { this.ro.disconnect(); }
}
