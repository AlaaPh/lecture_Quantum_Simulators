// Exercise 3: the SSH chain in k-space. H(k) and the complex number h(k) = J₁ + J₂e^{ik}, the Zak phase solved
// analytically and numerically (task 8), and the on-site potential that breaks chiral symmetry (Task 3).
// Conventions as in Exercises 1 and 2: i dψ/dz = Hψ with +J, J₁ inside the unit cell (A, B), J₂ between cells.
import { Canvas2D, arrow } from '../lecture1/panels.js';
import { Plot, niceTicks } from '../plots.js';
import { el, button, row, slider, toggle } from '../ui.js';
import { colors, invalidateTheme } from '../theme.js';
import { symEig, sshChain, fmt } from '../linalg.js';

const $ = (id) => document.getElementById(id);
const TAU = 2 * Math.PI, J2 = 1, NK = 240, SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const KS = Array.from({ length: NK + 1 }, (_, i) => (TAU * i) / NK);
const intTicks = (n, count) => niceTicks(0, n, Math.max(2, count)).filter((v) => Number.isInteger(v) && v >= 1 && v <= n);
const piTick = (v) => ({ '0': '0', '0.5': 'π/2', '1': 'π', '1.5': '3π/2', '2': '2π' })[String(Math.round((v / Math.PI) * 2) / 2)] ?? v.toFixed(1);
const inPi = (x, d = 2) => `${fmt(x / Math.PI, d)}π`;
const sub = (n) => String(n).split('').map((ch) => SUB[+ch]).join('');

// ---------- model ----------
let act = 0, playing = false;
let J1 = 0.5, k = 1.0, upper = true;                 // acts 1–3
let stage = 0;                                        // act 3: lines of the derivation shown
let M = 12, randomGauge = false, chi = [];            // act 4
let NS = 21, D = 0.5, selT = -1, eigT = null, gap0 = [];   // act 5

const hOf = (kk, j1 = J1) => ({ re: j1 + J2 * Math.cos(kk), im: J2 * Math.sin(kk) });
const absH = (kk, j1 = J1) => Math.hypot(j1 + J2 * Math.cos(kk), J2 * Math.sin(kk));
// dφ/dk for φ = arg h: Re(J₂e^{ik}·h*)/|h|²
const dphi = (kk, j1 = J1) => (J2 * J2 + j1 * J2 * Math.cos(kk)) / Math.max(1e-12, j1 * j1 + J2 * J2 + 2 * j1 * J2 * Math.cos(kk));
// φ(k), continuous on [0, 2π] with φ(0) = 0
function phiOf(kk, j1 = J1) { const h = hOf(kk, j1); let p = Math.atan2(h.im, h.re); if (j1 < J2 && (kk > Math.PI || (Math.abs(kk - Math.PI) < 1e-12 && p < 0))) p += TAU; return p; }
const winding = (j1 = J1) => (Math.abs(j1 - J2) < 1e-9 ? null : j1 < J2 ? 1 : 0);
// eigenvector of H(k) = [[Δ, h*], [h, −Δ]]: upper (cos(θ/2)e^{−iφ}, sin(θ/2)), lower (−sin(θ/2)e^{−iφ}, cos(θ/2)), cos θ = Δ/E
function eigvec(kk, j1, d, up) {
  const p = phiOf(kk, j1), E = Math.hypot(d, absH(kk, j1)) || 1e-12, th = Math.acos(Math.max(-1, Math.min(1, d / E)));
  const ca = up ? Math.cos(th / 2) : -Math.sin(th / 2), cb = up ? Math.sin(th / 2) : Math.cos(th / 2);
  return { a: { re: ca * Math.cos(p), im: -ca * Math.sin(p) }, b: { re: cb, im: 0 } };
}
// Zak phase of the lower band, γ = ½∮ dφ/dk·(1 − Δ/E) dk (periodic integrand: the rectangle rule converges fast)
function zakLower(j1, d) { const n = 1440; let s = 0; for (let i = 0; i < n; i++) { const kk = (TAU * i) / n; const E = Math.hypot(d, absH(kk, j1)); s += dphi(kk, j1) * (E > 1e-12 ? 1 - d / E : 1); } return (0.5 * s * TAU) / n; }
const runningZak = (kk) => 0.5 * (phiOf(kk) - phiOf(0));
const gapOf = (J) => 1 - 0.3 * Math.log(Math.max(J, 0.1) / J2);      // sketch only: J ∝ e^(−d/d₀)
const cmul = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
const cnum = (p, d = 3) => `(${fmt(p.re, d)}, ${fmt(p.im, d)})`;

// act 4: M points on the k circle, overlaps of neighbouring eigenvectors
function newPhases() { chi = Array.from({ length: 200 }, () => Math.random() * TAU); }
function discreteZak() {
  const us = Array.from({ length: M }, (_, s) => { const u = eigvec((TAU * s) / M, J1, 0, true); if (!randomGauge) return u; const g = { re: Math.cos(chi[s]), im: Math.sin(chi[s]) }; return { a: cmul(u.a, g), b: cmul(u.b, g) }; });
  const ov = us.map((u, s) => { const v = us[(s + 1) % M]; return { re: u.a.re * v.a.re + u.a.im * v.a.im + u.b.re * v.b.re + u.b.im * v.b.im, im: u.a.re * v.a.im - u.a.im * v.a.re + u.b.re * v.b.im - u.b.im * v.b.re }; });
  let prod = { re: 1, im: 0 }, naive = { re: 0, im: 0 };
  for (const c of ov) { prod = cmul(prod, c); naive = { re: naive.re - c.im, im: naive.im + (c.re - 1) }; }   // naive: Σ i(⟨uₛ|uₛ₊₁⟩ − 1)
  let gamma = -Math.atan2(prod.im, prod.re); gamma = ((gamma % TAU) + TAU) % TAU; if (gamma > TAU - 1e-6) gamma = 0;
  const steps = Array.from({ length: M }, (_, s) => { let d = phiOf((TAU * (s + 1)) / M) - phiOf((TAU * s) / M); if (s === M - 1) d = phiOf(TAU) - phiOf((TAU * s) / M); return d; });
  return { ov, args: ov.map((c) => -Math.atan2(c.im, c.re)), prod, gamma, naive, tooCoarse: steps.some((d) => Math.abs(d) >= Math.PI - 1e-9) };
}
// act 5: the finite chain with ±Δ on the A and B guides
function setupTask3() {
  eigT = symEig(sshChain(NS, J1, J2, D));
  const e0 = symEig(sshChain(NS, J1, J2, 0)), g0 = Math.abs(J1 - J2);
  gap0 = e0.vectors.filter((_, i) => Math.abs(e0.values[i]) < g0 - 1e-6);
  const ing = inGapT(); selT = ing.length ? ing[0] : -1;
}
const edgeT = () => Math.hypot(D, J1 - J2);
const inGapT = () => eigT.values.map((_, i) => i).filter((i) => Math.abs(eigT.values[i]) < edgeT() - 1e-6);
const overlap0 = (v) => Math.sqrt(gap0.reduce((s, g) => s + g.reduce((q, x, j) => q + x * v[j], 0) ** 2, 0));

// ---------- panels ----------
// h(k) in the complex plane: the circle with centre J₁ and radius J₂, the origin, and optionally the two phasors of u(k)
class PlanePanel extends Canvas2D {
  draw({ j1, kk, title, samples = null, inset = null }) {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    this.clear();
    if (w < 120 || h < 100) return;                       // pane still hidden or not laid out yet
    const strip = inset ? Math.min(132, w * 0.3) : 0, pw = w - strip;
    const x0 = -1.5, x1 = 3.4, yr = 1.5, top = 30, bot = 12;
    const s = Math.min((pw - 24) / (x1 - x0), (h - top - bot) / (2 * yr));
    const ox = 12 + (pw - 24 - s * (x1 - x0)) / 2 - s * x0, oy = top + (h - top - bot) / 2;
    const X = (re) => ox + s * re, Y = (im) => oy - s * im;
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, 12, 6);
    // axes
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(x0), oy); ctx.lineTo(X(x1), oy); ctx.moveTo(ox, Y(-yr)); ctx.lineTo(ox, Y(yr)); ctx.stroke();
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 400, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const v of [-1, 1, 2, 3]) { ctx.beginPath(); ctx.moveTo(X(v), oy - 3); ctx.lineTo(X(v), oy + 3); ctx.stroke(); ctx.fillText(String(v), X(v), oy + 5); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('Re h', X(x1), oy - 4); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Im h', ox + 6, Y(yr));
    // the circle h(k), k = 0 … 2π
    const nu = winding(j1), col = nu === 1 ? c.psi : c['fg-2'];
    ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(j1), oy, s * J2, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(j1), oy, s * J2, 0, TAU); ctx.stroke();
    const hk = hOf(kk, j1);
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(j1), oy); ctx.lineTo(X(hk.re), Y(hk.im)); ctx.stroke(); ctx.restore();
    ctx.fillStyle = c['fg-2']; ctx.beginPath(); ctx.arc(X(j1), oy, 3, 0, TAU); ctx.fill();
    ctx.font = this.font(11, 600, true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('J₁', X(j1), oy - 5);
    ctx.fillText('J₂', X(j1 + 0.5 * J2 * Math.cos(kk)) + 10 * Math.sin(kk), Y(0.5 * J2 * Math.sin(kk)) - 4 - 6 * Math.cos(kk));
    if (samples) samples.forEach((ks, i) => { const p = hOf(ks, j1); ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(X(p.re), Y(p.im), 3.2, 0, TAU); ctx.fill(); if (samples.length <= 16) { ctx.fillStyle = c['fg-2']; ctx.font = this.font(10, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), X(j1 + 1.17 * J2 * Math.cos(ks)), Y(1.17 * J2 * Math.sin(ks))); } });
    // the origin and the arrow h(k) with its angle φ
    const ph = phiOf(kk, j1);
    if (!samples) {
      ctx.strokeStyle = c.hpsi; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox, oy, 20, 0, -ph, ph > 0); ctx.stroke();
      arrow(ctx, ox, oy, X(hk.re), Y(hk.im), c.hpsi, 3, 9);
      ctx.fillStyle = c.hpsi; ctx.font = this.font(12, 600); ctx.textAlign = hk.re < 0 ? 'right' : 'left'; ctx.textBaseline = hk.im < 0 ? 'top' : 'bottom'; ctx.fillText('h(k)', X(hk.re) + (hk.re < 0 ? -7 : 7), Y(hk.im) + (hk.im < 0 ? 5 : -5));
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('φ', ox + 26 * Math.cos(ph / 2) - 3, oy - 26 * Math.sin(ph / 2));
    }
    ctx.fillStyle = c.surface; ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = nu === 1 ? c.psi : c['fg-2']; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(nu === null ? 'the circle passes through the origin: winding not defined' : nu === 1 ? 'origin inside the circle: winding ν = 1' : 'origin outside the circle: winding ν = 0', 12, h - 6);
    // the two components of u(k) as phasors
    if (inset) {
      const cx = w - strip / 2, R = Math.min(30, strip * 0.3, h * 0.115), rows = [['guide A', inset.a, c.v1, h * 0.29], ['guide B', inset.b, c.v3, h * 0.67]];
      ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('eigenvector u(k)', cx, top - 2);
      for (const [name, z, colr, cy] of rows) {
        ctx.fillStyle = c.surface; ctx.strokeStyle = colr; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
        const L = R * 0.9 * Math.SQRT2;
        arrow(ctx, cx, cy, cx + L * z.re, cy - L * z.im, c.psi, 2.6, 7);
        ctx.fillStyle = colr; ctx.font = this.font(11, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${name}: ${Math.round((Math.atan2(z.im, z.re) * 180) / Math.PI)}°`.replace('-', '−'), cx, cy + R + 4);
      }
    }
  }
}
// a Bloch state on a few unit cells: the same pair (a, b) in every cell, times e^{ikm}
class CellPanel extends Canvas2D {
  draw({ j1, kk, u, cells = 4, title }) {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    this.clear();
    if (w < 120 || h < 100) return;
    const g1 = gapOf(j1), g2 = gapOf(J2), total = cells * g1 + (cells - 1) * g2, sc = (w * 0.84) / total;
    const xA = (m) => w * 0.08 + sc * m * (g1 + g2), xB = (m) => xA(m) + sc * g1;
    const r = Math.max(9, Math.min(h * 0.2, sc * Math.min(g1, g2) * 0.27, 30)), yS = h * 0.52;
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, 12, 6);
    for (let m = 0; m < cells; m++) {
      // couplings: J₁ solid inside the cell, J₂ dashed to the next cell (as drawn in the lecture)
      ctx.strokeStyle = c.axis; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xA(m) + r, yS); ctx.lineTo(xB(m) - r, yS); ctx.stroke();
      if (m < cells - 1) { ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xB(m) + r, yS); ctx.lineTo(xA(m + 1) - r, yS); ctx.stroke(); ctx.restore(); }
      // the unit cell
      const bx = xA(m) - r - 5, bw = xB(m) - xA(m) + 2 * r + 10, by = yS - r - 10, bh = 2 * r + 36;
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh); ctx.restore();
      ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(`cell m = ${m}`, bx + bw / 2, by - 3);
      ctx.fillStyle = c.hpsi; ctx.font = this.font(11, 600, true); ctx.textBaseline = 'top'; ctx.fillText(m === 0 ? '× 1' : `× e^(ik·${m})`, bx + bw / 2, by + bh + 4);
      const bl = { re: Math.cos(kk * m), im: Math.sin(kk * m) };
      for (const [x, z, colr, name] of [[xA(m), cmul(u.a, bl), c.v1, 'A'], [xB(m), cmul(u.b, bl), c.v3, 'B']]) {
        ctx.fillStyle = c.surface; ctx.strokeStyle = colr; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yS, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, yS); ctx.lineTo(x + r * 0.9, yS); ctx.stroke();
        const L = r * 0.9 * Math.SQRT2; arrow(ctx, x, yS, x + L * z.re, yS - L * z.im, c.psi, 2.4, 6);
        ctx.fillStyle = colr; ctx.font = this.font(11, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(name, x, yS + r + 5);
      }
    }
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 600, true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('J₁', (xA(0) + xB(0)) / 2, yS - 5); if (cells > 1) ctx.fillText('J₂', (xB(0) + xA(1)) / 2, yS - 6);
  }
}

const cellPanel = new CellPanel($('pane-cell').querySelector('canvas'));
const planePanel = new PlanePanel($('pane-plane').querySelector('canvas'));
const pad = { l: 46, r: 12, t: 26, b: 32 };
const bandPlot = new Plot($('pane-band').querySelector('canvas'), { pad });
const phiPlot = new Plot($('pane-phi').querySelector('canvas'), { pad });
const berryPlot = new Plot($('pane-berry').querySelector('canvas'), { pad });
const ovPlot = new Plot($('pane-ov').querySelector('canvas'), { pad });
const eigPlot = new Plot($('pane-eig').querySelector('canvas'), { pad });
const statePlot = new Plot($('pane-state').querySelector('canvas'), { pad });
const zakdPlot = new Plot($('pane-zakd').querySelector('canvas'), { pad });
const eqsBox = $('pane-eqs'), stepsBox = $('pane-steps'), numBox = $('pane-num');
const panes = { cell: $('pane-cell'), eqs: eqsBox, band: $('pane-band'), plane: $('pane-plane'), phi: $('pane-phi'), steps: stepsBox, berry: $('pane-berry'), ov: $('pane-ov'), num: numBox, eig: $('pane-eig'), state: $('pane-state'), zakd: $('pane-zakd') };
const kTicks = [0, Math.PI / 2, Math.PI, 1.5 * Math.PI, TAU];

function drawBand({ levels = false } = {}) {
  const c = colors(), E = KS.map((x) => absH(x)), g = Math.abs(J1 - J2), e = absH(k);
  bandPlot.begin({ xlim: [0, TAU * (levels ? 1.09 : 1)], ylim: [-3.3, 3.3], xticks: kTicks, xtickFmt: piTick, xlabel: 'wavenumber k (phase per unit cell)', ylabel: 'E(k)', title: levels ? 'bands E(k) = ±|h(k)| · right: levels of the 20-guide chain' : 'the two bands E(k) = ±|h(k)|' });
  if (g > 1e-9) bandPlot.hspan(-g, g, { color: c.hpsi, alpha: 0.1 });
  bandPlot.line(KS, E, { color: c.psi, width: upper ? 2.6 : 1.6 }); bandPlot.line(KS, E.map((x) => -x), { color: c.psi, width: upper ? 1.6 : 2.6 });
  bandPlot.vline(k, { color: c.hpsi, width: 1.2, dash: [4, 3] });
  bandPlot.dots([k, k], [e, -e], { color: c.hpsi, r: 4.5 });
  bandPlot.text(k, upper ? e : -e, `${upper ? '+' : '−'}|h| = ${fmt(upper ? e : -e)}`, { color: c.hpsi, dx: k > 4.6 ? -9 : 9, dy: upper ? -11 : 11, align: k > 4.6 ? 'right' : 'left', font: '11px sans-serif' });
  if (levels) {
    const ev = symEig(sshChain(20, J1, J2, 0)).values, ctx = bandPlot.ctx;
    bandPlot.vline(TAU, { color: c.line });
    for (const v of ev) { const edge = Math.abs(v) < g - 1e-6; ctx.strokeStyle = edge ? c.hpsi : c.fg; ctx.lineWidth = edge ? 2.4 : 1.2; ctx.beginPath(); ctx.moveTo(bandPlot.x(TAU * 1.015), bandPlot.y(v)); ctx.lineTo(bandPlot.x(TAU * 1.08), bandPlot.y(v)); ctx.stroke(); }
  }
  bandPlot.end();
}
function drawPhi() {
  const c = colors(), nu = winding();
  phiPlot.begin({ xlim: [0, TAU], ylim: [-1.15, 2.15], xticks: kTicks, xtickFmt: piTick, yticks: [-1, 0, 1, 2], ytickFmt: (v) => (v === 0 ? '0' : v === 1 ? 'π' : v === 2 ? '2π' : '−π'), xlabel: 'wavenumber k', ylabel: 'φ(k)', title: nu === 1 ? 'φ(k) = arg h(k): it gains 2π over the Brillouin zone' : nu === 0 ? 'φ(k) = arg h(k): it returns to where it started' : 'φ(k) = arg h(k): it jumps at k = π, where h = 0' });
  phiPlot.hline(0, { color: c.line }); phiPlot.hline(2, { color: c.line, dash: [4, 4] });
  phiPlot.line(KS, KS.map((x) => phiOf(x) / Math.PI), { color: c.psi, width: 2.2 });
  phiPlot.vline(k, { color: c.hpsi, width: 1.2, dash: [4, 3] }); phiPlot.dots([k], [phiOf(k) / Math.PI], { color: c.hpsi, r: 4.5 });
  phiPlot.end();
}
function drawBerry() {
  const c = colors();
  if (stage < 2) {
    berryPlot.begin({ xlim: [0, TAU], ylim: [-1.15, 2.15], xticks: kTicks, xtickFmt: piTick, yticks: [-1, 0, 1, 2], ytickFmt: (v) => (v === 0 ? '0' : v === 1 ? 'π' : v === 2 ? '2π' : '−π'), xlabel: 'wavenumber k', ylabel: 'φ(k)', title: 'the angle φ(k) of h(k)' });
    berryPlot.hline(0, { color: c.line }); berryPlot.line(KS, KS.map((x) => phiOf(x) / Math.PI), { color: c.psi, width: 2.2 });
    berryPlot.vline(k, { color: c.hpsi, width: 1.2, dash: [4, 3] }); berryPlot.dots([k], [phiOf(k) / Math.PI], { color: c.hpsi, r: 4.5 }); berryPlot.end(); return;
  }
  const A = KS.map((x) => 0.5 * dphi(x)), lo = Math.max(-6, Math.min(-0.3, ...A) * 1.1), hi = Math.min(6, Math.max(1.1, ...A) * 1.1);
  berryPlot.begin({ xlim: [0, TAU], ylim: [lo, hi], xticks: kTicks, xtickFmt: piTick, xlabel: 'wavenumber k', ylabel: 'A(k)', title: stage >= 3 ? `A(k) = ½·dφ/dk · shaded area = ${inPi(runningZak(k))}` : 'Berry connection A(k) = ½·dφ/dk' });
  if (stage >= 3) { const n = KS.findIndex((x) => x > k + 1e-9), xs = KS.slice(0, n < 0 ? KS.length : n).concat([k]), ys = xs.map((x) => 0.5 * dphi(x)); berryPlot.band(xs, xs.map(() => 0), ys.map((y) => Math.max(0, y)), { color: c.psi, alpha: 0.28 }); berryPlot.band(xs, ys.map((y) => Math.min(0, y)), xs.map(() => 0), { color: c.hpsi, alpha: 0.28 }); }
  berryPlot.hline(0, { color: c.line }); berryPlot.line(KS, A, { color: c.psi, width: 2.2 });
  berryPlot.vline(k, { color: c.hpsi, width: 1.2, dash: [4, 3] }); berryPlot.dots([k], [0.5 * dphi(k)], { color: c.hpsi, r: 4.5 });
  berryPlot.end();
}
const line = (i, cls, lines, note, now = true) => `<div class="rk-step ${cls}${now ? ' now' : ' done'}">${lines.map((l) => `<code>${l}</code>`).join('')}<span class="note">${note}</span></div>`;
function eqsText() {
  const h = hOf(k);
  return [`<div class="t">one unit cell m: guide A and guide B · J₁ = ${fmt(J1)} inside the cell, J₂ = ${fmt(J2)} to the next cell</div>`,
    line(0, 'st', ['ψ(A, m) = a·e^(ikm)      ψ(B, m) = b·e^(ikm)'], 'Bloch state: the same pair (a, b) in every cell, phase k per cell'),
    line(1, 'k1', ['E·a = J₁·b + J₂·e^(−ik)·b'], 'guide A couples to B in its own cell and to B in cell m − 1'),
    line(2, 'k3', ['E·b = J₁·a + J₂·e^(+ik)·a'], 'guide B couples to A in its own cell and to A in cell m + 1'),
    line(3, 'k2', ['H(k) = [ 0   h* ]      h(k) = J₁ + J₂·e^(ik)', '       [ h   0  ]'], 'one 2 × 2 matrix for every k replaces the N × N matrix'),
    line(4, 'k4', ['E(k) = ±|h(k)| = ±√(J₁² + J₂² + 2J₁J₂·cos k)'], `now: k = ${inPi(k)}, h = ${cnum(h, 2)}, E = ±${fmt(absH(k), 3)}`),
    '<div class="t why">The lecture writes H with −J. The eigenvalues ±|h(k)| and the Zak phase are the same.</div>'].join('');
}
function stepsText() {
  const h = hOf(k), nu = winding(), ph = phiOf(k), out = [`<div class="t">J₁ = ${fmt(J1)}, J₂ = ${fmt(J2)} · k = ${inPi(k)}</div>`];
  const L = [
    ['st', ['H(k) = [ 0   h* ]      h(k) = J₁ + J₂·e^(ik) = |h|·e^(iφ(k))', '       [ h   0  ]'], `all of H(k) is one complex number: length |h|, angle φ. Now: h = ${cnum(h, 2)}, |h| = ${fmt(absH(k), 3)}, φ = ${inPi(ph)}`],
    ['k1', ['E± = ±|h|        u±(k) = ( ±e^(−iφ(k)), 1 ) / √2'], 'the eigenvectors. Equal intensity on A and B at every k. Only the phase φ(k) between the two guides depends on k.'],
    ['k2', ['A(k) = i⟨u|∂ₖu⟩ = i·½·(−i·dφ/dk) = ½·dφ/dk'], `Berry connection: how fast the phase of the eigenvector turns with k. Closed form: dφ/dk = (J₂² + J₁J₂cos k)/|h|². Now: A = ${fmt(0.5 * dphi(k), 3)}`],
    ['k3', ['γ = ∮ A(k) dk = ½·[φ(2π) − φ(0)]'], `Zak phase: A(k) integrated once through the Brillouin zone. Only the net turn of φ counts. Up to this k: ${inPi(runningZak(k))}`],
    ['k4', ['φ(2π) − φ(0) = 2π·ν'], 'ν = how often h(k) goes around the origin: 1 if J₂ > J₁ (the circle encloses the origin), 0 if J₂ < J₁.'],
    ['st', [nu === null ? 'γ: not defined at J₁ = J₂' : `γ = π·ν = ${nu === 1 ? 'π' : '0'}        (J₁ ${J1 < J2 ? '<' : '>'} J₂)`], nu === null ? 'h(π) = 0: the gap is closed, φ(π) has no value.' : 'γ is defined modulo 2π: the equally valid choice u·e^(iφ(k)) shifts it by 2πν, so 0 and π are the two distinct values. Checks: J₂ = 0 gives h = J₁, φ = 0, γ = 0. J₁ = 0 gives h = J₂e^(ik), φ = k, γ = π.'],
  ];
  for (let i = 0; i <= Math.min(stage, L.length - 1); i++) out.push(line(i, L[i][0], L[i][1], L[i][2], i === stage));
  if (stage < L.length - 1) out.push('<div class="t why">Press "next" for the next line.</div>');
  return out.join('');
}
function numText(z) {
  const nu = winding(), c0 = z.ov[0];
  return [`<div class="t">M = ${M} points kₛ = 2π·s/M on the k circle · upper band · J₁ = ${fmt(J1)}, J₂ = ${fmt(J2)}</div>`,
    line(0, 'k1', ['uₛ = u(kₛ)·e^(iχₛ)'], randomGauge ? 'every eigenvector carries a random phase χₛ, as an eigensolver may return it' : 'smooth choice: u(k) = (e^(−iφ(k)), 1)/√2, all χₛ = 0'),
    line(1, 'k2', ['⟨uₛ|uₛ₊₁⟩ = cos(Δφ/2)·e^(−iΔφ/2) · e^(i(χₛ₊₁ − χₛ))'], `first overlap: ${cnum(c0)}, −arg = ${inPi(z.args[0], 3)}`),
    line(2, 'st', ['γ = −arg( ⟨u₁|u₂⟩⟨u₂|u₃⟩ … ⟨u_M|u₁⟩ )', `  = ${inPi(z.gamma, 4)}`], `the product is ${cnum(z.prod)}. Every χₛ appears once with + and once with −: it cancels. Analytic result: ${nu === null ? 'not defined' : nu === 1 ? 'π' : '0'}`),
    line(3, 'k4', [`Σ i⟨uₛ|uₛ₊₁ − uₛ⟩ = ${fmt(z.naive.re, 3)}${z.naive.im >= 0 ? ' + ' : ' − '}${fmt(Math.abs(z.naive.im), 3)}i`], randomGauge ? 'the direct sum of i⟨u|Δu⟩ is meaningless with random phases' : `the direct sum of i⟨u|Δu⟩ works only for a smooth phase choice and many points (exact: ${nu === 1 ? '3.142' : '0'})`),
  ].join('');
}

// ---------- acts ----------
let kSlider = null;
const kCtl = () => { kSlider = slider({ id: 'k', label: '<i>k</i>', min: 0, max: TAU, step: TAU / 240, value: k, format: (v) => inPi(v), onInput: (v) => { k = v; setPlaying(false); render(); } }); return kSlider.root; };
const j1Ctl = (after) => slider({ id: 'J1', label: '<i>J</i>₁ (J₂ = 1)', min: 0, max: 2, step: 0.05, value: J1, onInput: (v) => { J1 = v; if (after) after(); render(); } }).root;
const acts = [
  {
    id: 'kspace', tab: '1 · k-space', heading: 'The SSH chain in k-space: from N × N to 2 × 2 (task 8a)',
    lead: 'The chain repeats after two guides. The unit cell holds guide A and guide B, coupled by J₁, and J₂ couples it to the next cell. In an infinite chain every eigenstate is a Bloch state: the same pair of amplitudes (a, b) in every cell, multiplied by e^(ikm) in cell m. Insert this into i dψ/dz = Hψ and two equations remain. Move k and follow the phasors and the point on the bands.',
    panes: ['cell', 'eqs', 'band'], canPlay: true,
    enter(ctl) { ctl.append(kCtl(), j1Ctl(), group('band', [button('upper', () => { upper = true; render(); }), button('lower', () => { upper = false; render(); })])); },
    caption() {
      const g = Math.abs(J1 - J2), n = symEig(sshChain(20, J1, J2, 0)).values.filter((v) => Math.abs(v) < g - 1e-6).length;
      return `band edges ±(J₁ + J₂) = ±${fmt(J1 + J2)} at k = 0 and ±|J₁ − J₂| = ±${fmt(g)} at k = π · gap 2|J₁ − J₂| = ${fmt(2 * g)} · the 20-guide chain has ${n === 0 ? 'no state' : n === 1 ? 'one state' : `${n} states`} in the gap${n ? ' (orange): edge states, which the bands of the infinite chain do not contain' : ''}`;
    },
    render() {
      cellPanel.draw({ j1: J1, kk: k, u: eigvec(k, J1, 0, upper), title: `Bloch state of the ${upper ? 'upper' : 'lower'} band: the same (a, b) in every cell, times e^(ikm)` });
      eqsBox.innerHTML = eqsText(); drawBand({ levels: true });
    },
  },
  {
    id: 'circle', tab: '2 · h(k)', heading: 'One complex number per k: h(k) = J₁ + J₂e^(ik)',
    lead: 'Everything H(k) contains is h(k). Its length |h(k)| is the band energy. Its angle φ(k) is the phase between the amplitudes on guide A and guide B. When k runs once through the Brillouin zone, h(k) runs once around a circle with centre J₁ and radius J₂. One question decides the topology: is the origin inside the circle?',
    panes: ['plane', 'band', 'phi'], canPlay: true,
    enter(ctl) { ctl.append(kCtl(), j1Ctl()); },
    caption() {
      const nu = winding();
      return nu === null ? 'J₁ = J₂: the circle passes through the origin. At k = π, h = 0: the gap closes and φ is not defined there.'
        : `centre J₁ = ${fmt(J1)}, radius J₂ = ${fmt(J2)}: the origin is ${nu ? 'inside' : 'outside'} the circle, so h(k) goes around it ${nu ? 'once' : 'zero times'} · winding number ν = ${nu} · now |h| = ${fmt(absH(k), 3)}, φ = ${inPi(phiOf(k))}`;
    },
    render() { planePanel.draw({ j1: J1, kk: k, title: 'h(k) in the complex plane, k from 0 to 2π' }); drawBand(); drawPhi(); },
  },
  {
    id: 'zak', tab: '3 · Zak phase by hand', heading: 'The Zak phase, solved by hand',
    lead: 'The Zak phase is the Berry phase an eigenstate collects when k goes once through the Brillouin zone. For the SSH chain it needs no numerics, because the eigenvector depends on k only through the angle φ(k) of h(k). Press "next" to build the result line by line, then press play and watch the integral grow.',
    panes: ['plane', 'steps', 'berry'], canPlay: true,
    enter(ctl) {
      ctl.append(group('derivation', [button('next', () => { stage = Math.min(5, stage + 1); render(); }), button('all', () => { stage = 5; render(); }), button('reset', () => { stage = 0; k = 0; setPlaying(false); render(); })]), kCtl(), j1Ctl());
    },
    caption() {
      const nu = winding();
      return nu === null ? 'J₁ = J₂: gap closed, the Zak phase is not defined.'
        : `J₁ ${J1 < J2 ? '<' : '>'} J₂: ν = ${nu}, Zak phase γ = ${nu ? 'π' : '0'} · ${nu ? 'a chain that starts with a complete unit cell then has an edge state at each end (Exercise 2, 20 guides)' : 'a chain that starts with a complete unit cell has no edge state (Exercise 2, 20 guides)'} · it depends on the unit cell: with J₂ inside the cell, 0 and π swap`;
    },
    render() { planePanel.draw({ j1: J1, kk: k, title: 'h(k) and the eigenvector u₊(k) = (e^(−iφ), 1)/√2', inset: eigvec(k, J1, 0, true) }); stepsBox.innerHTML = stepsText(); drawBerry(); },
  },
  {
    id: 'numeric', tab: '4 · Zak phase numerically', heading: 'The Zak phase on a computer (task 8b)',
    lead: 'A numerical eigensolver returns every eigenvector u(k) with an arbitrary phase, so a derivative ∂u/∂k cannot be taken. The remedy: take M points on the k circle and multiply the overlaps of neighbouring eigenvectors, γ = −arg ∏⟨uₛ|uₛ₊₁⟩. Every uₛ appears once as a ket and once as a bra, so its phase cancels. Switch the random phases on and check that γ stays.',
    panes: ['plane', 'num', 'ov'], canPlay: false,
    enter(ctl) {
      ctl.append(slider({ id: 'M', label: 'points <i>M</i>', min: 3, max: 60, step: 1, value: M, format: (v) => String(v), onInput: (v) => { M = v; render(); } }).root, j1Ctl(),
        toggle({ id: 'rand', label: 'random phase on every eigenvector', checked: randomGauge, onChange: (v) => { randomGauge = v; render(); } }).root, button('new random phases', () => { newPhases(); render(); }));
    },
    caption() {
      const z = discreteZak(), nu = winding();
      return `M = ${M}: γ = ${inPi(z.gamma, 4)} · analytic: ${nu === null ? 'not defined' : nu ? 'π' : '0'}${z.tooCoarse && nu !== null ? ' · too few points: between two neighbours φ changes by π or more, the product cannot tell which way round. Increase M.' : ''}${randomGauge ? ' · the single overlaps change with the random phases, their product does not' : ''}`;
    },
    render() {
      const c = colors(), z = discreteZak(), cum = []; z.args.reduce((s, a, i) => (cum[i] = s + a), 0);
      planePanel.draw({ j1: J1, kk: 0, title: `the M = ${M} sample points h(kₛ) on the circle`, samples: Array.from({ length: M }, (_, s) => (TAU * s) / M) });
      numBox.innerHTML = numText(z);
      const ys = z.args.map((a) => a / Math.PI), cy = cum.map((a) => a / Math.PI), lo = Math.min(-1.1, ...cy) - 0.1, hi = Math.max(1.1, ...cy) + 0.1;
      ovPlot.begin({ xlim: [0.5, M + 0.5], ylim: [lo, hi], xticks: intTicks(M, Math.floor(ovPlot.w / 60)), xlabel: 'overlap number s', ylabel: 'units of π', title: 'bars: −arg⟨uₛ|uₛ₊₁⟩ · line: their running sum, the last point is γ (mod 2π)' });
      ovPlot.hline(0, { color: c.line }); for (const v of [-1, 1]) ovPlot.hline(v, { color: c.line, dash: [4, 4] });
      const ctx = ovPlot.ctx, bw = Math.max(2, (ovPlot.x(2) - ovPlot.x(1)) * 0.6);
      ys.forEach((y, i) => { ctx.fillStyle = c.psi; ctx.globalAlpha = 0.75; const X = ovPlot.x(i + 1) - bw / 2, Y0 = ovPlot.y(0), Y1 = ovPlot.y(y); ctx.fillRect(X, Math.min(Y0, Y1), bw, Math.abs(Y1 - Y0)); ctx.globalAlpha = 1; });
      ovPlot.line(cy.map((_, i) => i + 1), cy, { color: c.hpsi, width: 2 }); ovPlot.dots([M], [cy[M - 1]], { color: c.hpsi, r: 4.5 });
      ovPlot.end();
    },
  },
  {
    id: 'task3', tab: '5 · Task 3', heading: 'Task 3: an on-site potential breaks chiral symmetry',
    lead: 'Add +Δ to the propagation constant of every A guide and −Δ to every B guide. In k-space this puts Δ on the diagonal: H(k) = [[Δ, h*], [h, −Δ]], bands ±√(Δ² + |h|²). The edge state of 21 guides has amplitude on A guides only, so it is shifted by exactly +Δ and keeps its shape. E = 0 was protected by chiral symmetry. With Δ ≠ 0 it is not, and the Zak phase is no longer 0 or π.',
    panes: ['eig', 'state', 'zakd'], canPlay: false,
    enter(ctl) {
      setupTask3();
      ctl.append(group('guides', [button('20', () => { NS = 20; setupTask3(); render(); }), button('21', () => { NS = 21; setupTask3(); render(); })]),
        slider({ id: 'D', label: 'on-site <i>Δ</i>', min: -1, max: 1, step: 0.05, value: D, onInput: (v) => { D = v; setupTask3(); render(); } }).root, j1Ctl(setupTask3));
    },
    caption() {
      const ing = inGapT(), g = zakLower(J1, D), nu = winding();
      let s = `bands ±√(Δ² + |h|²): gap edges ±${fmt(edgeT(), 3)} · `;
      if (!ing.length) s += 'no state in the gap: this chain has no edge state, with or without Δ.';
      else if (Math.abs(D) < 1e-9) s += `Δ = 0: ${ing.length === 1 ? 'one edge state' : `${ing.length} edge states`} at E = ${ing.map((i) => fmt(eigT.values[i], 4)).join(', ')}, protected by chiral symmetry.`;
      else s += ing.map((i) => { const v = eigT.vectors[i], onA = v.reduce((q, x, j) => q + (j % 2 === 0 ? x * x : 0), 0); return `edge state at E = ${fmt(eigT.values[i], 4)} on the ${onA > 0.5 ? 'A' : 'B'} guides (${onA > 0.5 ? '+Δ' : '−Δ'}), overlap with the Δ = 0 edge state${gap0.length > 1 ? 's' : ''} ${fmt(overlap0(v), 4)}`; }).join(' · ') + '.';
      return `${s} Zak phase of the lower band: ${inPi(((g % TAU) + TAU) % TAU, 3)}${Math.abs(D) < 1e-9 ? (nu === null ? '' : ', quantized') : ', not quantized: the winding number is not defined once Δ lifts h(k) out of the plane'}.`;
    },
    render() {
      const c = colors(), n = NS, ns = eigT.values.map((_, i) => i + 1), ing = inGapT(), ed = edgeT(), xt = intTicks(n, Math.floor(eigPlot.w / 70));
      eigPlot.begin({ xlim: [0.5, n + 0.5], ylim: [-3.4, 3.4], xticks: xt, xlabel: 'n = position in the sorted list of eigenvalues (lowest first)', ylabel: 'Eₙ', title: `eigenvalues, N = ${n}, J₁ = ${fmt(J1)}, J₂ = ${fmt(J2)}, Δ = ${fmt(D)} · ${ing.length} state${ing.length === 1 ? '' : 's'} in the gap` });
      eigPlot.hspan(-ed, ed, { color: c.hpsi, alpha: 0.1 });
      if (Math.abs(D) > 1e-9) { eigPlot.hline(D, { color: c.v1, dash: [5, 4], width: 1.3 }); eigPlot.hline(-D, { color: c.v3, dash: [5, 4], width: 1.3 }); eigPlot.text(1, D, '+Δ: A guides', { color: c.v1, dy: D > 0 ? -9 : 9, font: '11px sans-serif' }); eigPlot.text(1, -D, '−Δ: B guides', { color: c.v3, dy: D > 0 ? 9 : -9, font: '11px sans-serif' }); }
      eigPlot.dots(ns, eigT.values, { color: c.psi, r: 3.5, data: ns.map((v) => v - 1), tips: ns.map((v, i) => `n = ${v}: E = ${fmt(eigT.values[i], 4)}`) });
      if (ing.length) eigPlot.dots(ing.map((i) => i + 1), ing.map((i) => eigT.values[i]), { color: c.hpsi, r: 4.5, data: ing });
      if (selT >= 0) { const ctx = eigPlot.ctx; ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(eigPlot.x(selT + 1), eigPlot.y(eigT.values[selT]), 8, 0, TAU); ctx.stroke(); }
      eigPlot.end();
      const v = selT >= 0 ? eigT.vectors[selT] : null, m = v ? Math.max(0.3, ...v.map(Math.abs)) * 1.15 : 1;
      statePlot.begin({ xlim: [0.5, n + 0.5], ylim: [-m, m], xticks: xt, xlabel: 'guide j (A = odd, B = even)', ylabel: 'ψₙ(j)', title: v ? `eigenstate ${selT + 1}, E = ${fmt(eigT.values[selT], 4)} (click a dot above to choose another)` : 'no state in the gap · click a dot above to see that eigenstate' });
      statePlot.hline(0, { color: c.line });
      if (v) { const ctx = statePlot.ctx, bw = (statePlot.x(2) - statePlot.x(1)) * 0.7; v.forEach((x, j) => { ctx.fillStyle = j % 2 === 0 ? c.v1 : c.v3; const X = statePlot.x(j + 1) - bw / 2, Y0 = statePlot.y(0), Y1 = statePlot.y(x); ctx.fillRect(X, Math.min(Y0, Y1), bw, Math.abs(Y1 - Y0)); }); }
      statePlot.end();
      const ds = Array.from({ length: 81 }, (_, i) => -2 + i * 0.05), gs = ds.map((d) => zakLower(J1, d) / Math.PI), g = zakLower(J1, D) / Math.PI;
      zakdPlot.begin({ xlim: [-2, 2], ylim: [-0.25, 2.25], yticks: [0, 1, 2], ytickFmt: (y) => (y === 0 ? '0' : y === 1 ? 'π' : '2π'), xlabel: 'on-site potential Δ', ylabel: 'γ', title: 'Zak phase of the lower band versus Δ (2π is the same as 0)' });
      zakdPlot.hline(1, { color: c.line, dash: [4, 4] }); zakdPlot.vline(0, { color: c.line });
      zakdPlot.line(ds, gs, { color: c.psi, width: 2.2 }); zakdPlot.vline(D, { color: c.hpsi, width: 1.2, dash: [4, 3] }); zakdPlot.dots([D], [g], { color: c.hpsi, r: 4.5 });
      zakdPlot.text(D, g, `γ = ${fmt(g, 3)}π`, { color: c.hpsi, dx: D > 1 ? -9 : 9, dy: -11, align: D > 1 ? 'right' : 'left', font: '11px sans-serif' });
      zakdPlot.end();
    },
  },
];

// ---------- shell ----------
const group = (label, btns) => el('div', { class: 'group' }, [el('span', { class: 'group-label', text: label }), ...btns]);
const ctl = $('controls'), captionEl = $('caption');
let playBtn = null, timeEl = null, lastNow = 0;
function setPlaying(v) { playing = v; if (playBtn) playBtn.textContent = playing ? 'Pause' : 'Play'; }
function advance(dts) { if (k >= TAU - 1e-9) k = 0; k = Math.min(TAU, k + (dts * TAU) / 12); if (k >= TAU) setPlaying(false); }
function render() { const a = acts[act]; a.render(); captionEl.innerHTML = a.caption(); if (timeEl) timeEl.textContent = `k = ${inPi(k)}`; if (kSlider && a.canPlay) kSlider.set(k); }
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  if (playing) { advance(dt); render(); }
}
function showAct(i) {
  act = Math.max(0, Math.min(acts.length - 1, i));
  const a = acts[act];
  setPlaying(false); kSlider = null;
  $('stage').dataset.act = a.id;
  for (const [key, p] of Object.entries(panes)) p.hidden = !a.panes.includes(key);
  $('heading').textContent = a.heading; $('lead').textContent = a.lead;
  document.querySelectorAll('.acts a').forEach((x, n) => x.classList.toggle('active', n === act));
  ctl.innerHTML = ''; playBtn = null; timeEl = null;
  if (a.canPlay) { playBtn = button('Play', () => setPlaying(!playing), { kind: 'primary', id: 'play' }); timeEl = el('span', { class: 'time' }); ctl.append(row([playBtn, button('Restart', () => { k = 0; setPlaying(false); render(); }), timeEl])); }
  a.enter(ctl);
  render();
  location.hash = a.id;
}
eigPlot.onClick = (n) => { selT = n; render(); };
acts.forEach((a, i) => $('acts').append(el('a', { href: '#' + a.id, text: a.tab, onclick: (e) => { e.preventDefault(); showAct(i); } })));
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowRight') showAct(act + 1); if (e.key === 'ArrowLeft') showAct(act - 1);
  if (e.key === ' ' && !e.target.matches('button') && acts[act].canPlay) { e.preventDefault(); setPlaying(!playing); }
});
cellPanel.onRedraw = () => render(); planePanel.onRedraw = () => render();
[bandPlot, phiPlot, berryPlot, ovPlot, eigPlot, statePlot, zakdPlot].forEach((p) => { p.onRedraw = () => render(); });

// theme
const root = document.documentElement;
try { const th = localStorage.getItem('qsl-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('qsl-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  invalidateTheme(); render();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) { invalidateTheme(); render(); } });

newPhases(); setupTask3();
const startId = (location.hash || '#kspace').slice(1);
showAct(Math.max(0, acts.findIndex((a) => a.id === startId)));
window.addEventListener('hashchange', () => { const i = acts.findIndex((a) => a.id === location.hash.slice(1)); if (i >= 0 && i !== act) showAct(i); });
requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(frame); });
