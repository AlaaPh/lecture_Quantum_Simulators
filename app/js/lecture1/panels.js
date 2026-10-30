// Canvas panels of the Lecture 1 instrument: the continuous wave in its wells, the chain of sites with
// bars and clocks, and the three modes. All HiDPI, all redrawn on demand.
import { colors, hexToRgb, rgbToCss } from '../theme.js';
import { fmt } from '../linalg.js';

export class Canvas2D {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.onRedraw = null;
    this._resize();
    this.ro = new ResizeObserver(() => { this._resize(); this.onRedraw && this.onRedraw(); });
    this.ro.observe(canvas);
  }
  _resize() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  font(size, weight = 400, mono = false) { return `${weight} ${size}px ${getComputedStyle(document.documentElement).getPropertyValue(mono ? '--font-mono' : '--font-ui')}`; }
  clear() { this.ctx.clearRect(0, 0, this.w, this.h); }
  dispose() { this.ro.disconnect(); }
}

// small arrow from (x0,y0) to (x1,y1)
export function arrow(ctx, x0, y0, x1, y1, color, width = 2, head = 7) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 0.5) return;
  const ux = dx / L, uy = dy / L;
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * head * 0.6, y1 - uy * head * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - uy * head * 0.5, y1 - uy * head + ux * head * 0.5); ctx.lineTo(x1 - ux * head + uy * head * 0.5, y1 - uy * head - ux * head * 0.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
export class ContinuumPanel extends Canvas2D {
  // cont: Continuum; amps: overlaps c_k; siteColors
  draw(cont, { siteColors, captured, labels, title }) {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    this.clear();
    const padL = 16, padR = 16, top = 26, bottom = h - 34;
    const X = (x) => padL + ((x + cont.L) / (2 * cont.L)) * (w - padL - padR);
    // potential landscape: V in [-V0, 0] -> [bottom, top+...]; the wave is drawn above the potential floor
    const vScale = (bottom - top) * 0.42 / Math.max(1, cont.V0);
    const Y = (v) => bottom - (v + cont.V0) * vScale * 0.9 - 4;
    ctx.beginPath(); ctx.moveTo(X(cont.x[0]), bottom);
    for (let i = 0; i < cont.N; i++) ctx.lineTo(X(cont.x[i]), Y(cont.V[i]));
    ctx.lineTo(X(cont.x[cont.N - 1]), bottom); ctx.closePath();
    ctx.fillStyle = c['surface-2']; ctx.fill(); ctx.strokeStyle = c.axis; ctx.lineWidth = 1.2; ctx.stroke();
    // well separators and labels
    const seps = cont.centers.slice(0, -1).map((cc, k) => (cc + cont.centers[k + 1]) / 2);
    ctx.setLineDash([3, 4]); ctx.strokeStyle = c.axis;
    for (const s of seps) { ctx.beginPath(); ctx.moveTo(X(s), top); ctx.lineTo(X(s), bottom); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.font = this.font(12, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    cont.centers.forEach((cc, k) => { ctx.fillStyle = siteColors[k]; ctx.fillText(labels ? labels[k] : `well ${k + 1}`, X(cc), bottom + 8); });
    // |psi|^2 (and a thin Re psi line): fixed amplitude scale so the picture stays comparable
    const rho = new Float64Array(cont.N); let rmax = 0;
    for (let i = 0; i < cont.N; i++) { rho[i] = cont.re[i] ** 2 + cont.im[i] ** 2; if (rho[i] > rmax) rmax = rho[i]; }
    const amp = (bottom - top) * 0.62 / 2.2, base = bottom - 2;
    const rgb = hexToRgb(c.psi);
    ctx.beginPath(); ctx.moveTo(X(cont.x[0]), base);
    for (let i = 0; i < cont.N; i++) ctx.lineTo(X(cont.x[i]), base - rho[i] * amp);
    ctx.lineTo(X(cont.x[cont.N - 1]), base); ctx.closePath();
    ctx.fillStyle = rgbToCss(rgb, 0.35); ctx.fill(); ctx.strokeStyle = c.psi; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < cont.N; i++) { const y = base - cont.re[i] * amp * 0.75; i ? ctx.lineTo(X(cont.x[i]), y) : ctx.moveTo(X(cont.x[i]), y); }
    ctx.strokeStyle = rgbToCss(rgb, 0.45); ctx.lineWidth = 1; ctx.stroke();
    // header
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(12); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(title || 'the wave ψ(x): |ψ|² filled, Re ψ thin', padL, 6);
    ctx.textAlign = 'right'; ctx.fillStyle = captured > 0.97 ? c['fg-2'] : c.hpsi;
    ctx.fillText(`${(captured * 100).toFixed(1)}% of the light in the three guided modes`, w - padR, 6);
  }
}

// ---------------------------------------------------------------------------------------------
export class ChainPanel extends Canvas2D {
  // state: { psi:{re,im}, siteColors, labels, J:[J12,J23], eps:[..], showHops, showEps, showDials, drive: (i)=>[{re,im,color,label}] | null, pct: bool, title }
  draw(s) {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h, n = s.psi.re.length;
    this.clear();
    const r = Math.max(5, Math.min(h * 0.19, w / (n * 3.2)));
    const xs = (s.xpos || Array.from({ length: n }, (_, k) => (k + 0.5) / n)).map((u) => w * 0.07 + w * 0.86 * u);
    const every = n <= 12 ? 1 : n <= 30 ? 5 : 10;
    const yS = h * 0.64, barMax = h * 0.3, barTop = yS - r - 10;
    const p = s.psi.re.map((a, i) => a * a + s.psi.im[i] ** 2);
    if (s.title) { ctx.fillStyle = c['fg-2']; ctx.font = this.font(12); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(s.title, 12, 6); }
    // bonds
    for (let i = 0; i < n - 1; i++) { ctx.strokeStyle = c.axis; ctx.lineWidth = 2.5; ctx.globalAlpha = Math.abs(s.J[i]) < 1e-6 ? 0.2 : 0.8; ctx.beginPath(); ctx.moveTo(xs[i] + r, yS); ctx.lineTo(xs[i + 1] - r, yS); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // hop arrows (both directions) with J labels, on-site rings with eps labels
    if (s.showHops) for (let i = 0; i < n - 1; i++) {
      const J = s.J[i], xm = (xs[i] + xs[i + 1]) / 2, lw = Math.max(1, Math.min(5, 1 + 2 * Math.abs(J)));
      ctx.strokeStyle = c.hpsi; ctx.fillStyle = c.hpsi; ctx.lineWidth = lw; ctx.globalAlpha = Math.abs(J) < 1e-6 ? 0.25 : 1;
      ctx.beginPath(); ctx.moveTo(xs[i] + r * 0.6, yS - r - 6); ctx.quadraticCurveTo(xm, yS - r - 44, xs[i + 1] - r * 0.6, yS - r - 6); ctx.stroke();
      arrow(ctx, xm + 6, yS - r - 25, xs[i + 1] - r * 0.6, yS - r - 6, c.hpsi, lw, 8);
      arrow(ctx, xm - 6, yS - r - 25, xs[i] + r * 0.6, yS - r - 6, c.hpsi, lw, 8);
      ctx.globalAlpha = 1; ctx.font = this.font(12, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = c.hpsi;
      ctx.fillText(`J = ${fmt(J)}`, xm, yS - r - 40);
    }
    if (s.showEps) for (let i = 0; i < n; i++) {
      const e = s.eps[i];
      ctx.strokeStyle = c.hpsi; ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.globalAlpha = Math.abs(e) < 1e-6 ? 0.25 : 1;
      ctx.beginPath(); ctx.arc(xs[i], yS, r + 7, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.font = this.font(12, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = c.hpsi;
      ctx.fillText(`ε${i + 1} = ${fmt(e)}`, xs[i], yS + r + (s.pct ? 26 : 10));
    }
    // gap dimension lines with labels (the physical distance between neighbouring guides)
    if (s.gapLabels) s.gapLabels.forEach((txt, i) => {
      if (!txt || i >= n - 1) return;
      const y = yS + r + 14, x0 = xs[i] + r, x1 = xs[i + 1] - r;
      ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.moveTo(x0, y - 4); ctx.lineTo(x0, y + 4); ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4); ctx.stroke();
      ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(txt, (x0 + x1) / 2, y + 5);
    });
    // bars (population) above the sites
    for (let i = 0; i < n; i++) {
      const bw = Math.max(8, r * 0.7), hgt = (p[i] / (s.barRef || 1)) * barMax;
      ctx.fillStyle = s.siteColors[i]; ctx.globalAlpha = 0.9; ctx.fillRect(xs[i] - bw / 2, barTop - hgt, bw, hgt); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(xs[i] - bw, barTop + 0.5); ctx.lineTo(xs[i] + bw, barTop + 0.5); ctx.stroke();
    }
    // sites
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(xs[i], yS, r, 0, 2 * Math.PI);
      ctx.fillStyle = c.surface; ctx.fill();
      ctx.fillStyle = s.siteColors[i]; ctx.globalAlpha = 0.12 + 0.75 * p[i]; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 2; ctx.strokeStyle = s.siteColors[i]; ctx.stroke();
      if (!s.showDials && r >= 9) { ctx.fillStyle = c.fg; ctx.font = this.font(Math.round(r * 0.8), 600, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), xs[i], yS + 1); }
      else if (!s.showDials && ((i + 1) % every === 0 || i === 0)) { ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(String(i + 1), xs[i], yS + r + 6); }
      if (s.pct) { ctx.fillStyle = c['fg-2']; ctx.font = this.font(12, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${Math.round(p[i] * 100)}%`, xs[i], yS + r + 8); }
      if (s.labels) { ctx.fillStyle = s.siteColors[i]; ctx.font = this.font(12, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(s.labels[i], xs[i], yS + r + (s.pct ? 24 : 8)); }
    }
    // dials: the clock hand = complex amplitude; the drive = contributions head to tail; the velocity at the tip
    if (s.showDials) for (let i = 0; i < n; i++) {
      const R = r * 0.86, cx = xs[i], cy = yS;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, cy); ctx.stroke(); // reference direction (phase 0)
      const hx = cx + R * s.psi.re[i], hy = cy - R * s.psi.im[i];
      if (s.drive) {
        const parts = s.drive(i); let px = cx, py = cy, sre = 0, sim = 0;
        const sc = s.driveScale * R;
        for (const q of parts) { const nx = px + sc * q.re, ny = py - sc * q.im; if (Math.hypot(q.re, q.im) > 1e-4) arrow(ctx, px, py, nx, ny, q.color, 2, 5); px = nx; py = ny; sre += q.re; sim += q.im; }
        // velocity of the hand: d psi_i/dt = -i (H psi)_i  ->  (re, im) = (sim, -sre); canvas y points down
        arrow(ctx, hx, hy, hx + sc * sim * 0.9, hy + sc * sre * 0.9, c.hpsi, 2.5, 7);
      }
      ctx.strokeStyle = c.psi; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = c.psi; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 2 * Math.PI); ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------------------------
export class ModesPanel extends Canvas2D {
  // eig: {values, vectors}; comps: [{re,im}] components of psi along the modes; siteColors
  draw({ eig, comps, siteColors, highlight = -1, title = 'the three modes (eigenstates)' }) {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h, n = eig.values.length;
    this.clear();
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(12); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, 12, 6);
    const colW = w / n;
    for (let m = 0; m < n; m++) {
      const x0 = colW * m, cx = x0 + colW / 2, v = eig.vectors[m];
      const hl = highlight === m;
      if (hl) { ctx.fillStyle = c['surface-2']; ctx.fillRect(x0 + 4, 24, colW - 8, h - 30); }
      // pattern: signed bars over a mini chain
      const bw = Math.min(18, colW / (n * 2.6)), gap = bw * 1.5, base = 70, bh = 30;
      const xs = v.map((_, k) => cx + (k - (n - 1) / 2) * gap);
      ctx.strokeStyle = c.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs[0], base); ctx.lineTo(xs[n - 1], base); ctx.stroke();
      v.forEach((a, k) => { ctx.fillStyle = siteColors[k]; const hh = a * bh; ctx.fillRect(xs[k] - bw / 2, hh >= 0 ? base - hh : base, bw, Math.abs(hh)); ctx.beginPath(); ctx.arc(xs[k], base, 3, 0, 2 * Math.PI); ctx.fill(); });
      ctx.fillStyle = c.fg; ctx.font = this.font(13, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`mode ${m + 1}`, cx, 26);
      ctx.fillStyle = c['fg-2']; ctx.font = this.font(12, 400, true); ctx.fillText(`E = ${fmt(eig.values[m])}`, cx, base + 42);
      // dial of the component c_m
      if (comps) {
        const R = Math.min(26, colW * 0.18), cy = h - R - 14, z = comps[m], pm = z.re * z.re + z.im * z.im;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fillStyle = c.surface; ctx.fill(); ctx.fillStyle = c.psi; ctx.globalAlpha = 0.1 + 0.7 * pm; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = c.line; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = c.psi; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.9 * z.re, cy - R * 0.9 * z.im); ctx.stroke();
        ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 400, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`|c${m + 1}|² = ${Math.round(pm * 100)}%`, cx, cy + R + 3);
      }
    }
  }
}
