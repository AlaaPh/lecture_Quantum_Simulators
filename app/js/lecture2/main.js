// Exercise 2: time evolution step by step (Euler, Runge–Kutta), the quantum walk and the band E(k),
// Bloch oscillations, and the SSH chain of Task 2. One instrument, four acts.
import { ChainPanel, Canvas2D, arrow } from '../lecture1/panels.js';
import { Plot, niceTicks } from '../plots.js';
import { el, button, row, slider, toggle } from '../ui.js';
import { colors, invalidateTheme } from '../theme.js';
import { symEig, evolveExact, prob, cnorm2, tightBinding, sshChain, rk4Step, matvec, fmt } from '../linalg.js';

const $ = (id) => document.getElementById(id);
const real = (v) => ({ re: v.slice(), im: v.map(() => 0) });
const intTicks = (n, count) => niceTicks(0, n, Math.max(2, count)).filter((v) => Number.isInteger(v) && v >= 1 && v <= n);
const wrapK = (k) => ((((k + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const piTick = (v) => { const r = v / Math.PI; const names = { '-1': '−π', '-0.5': '−π/2', '0': '0', '0.5': 'π/2', '1': 'π' }; return names[String(Math.round(r * 2) / 2)] ?? v.toFixed(1); };
const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

// ---------- model ----------
const J = 1, T_END = 12, DT_ROW = 0.1;
const N = 41, J0 = (N - 1) / 2;                      // acts 1–3: 41 guides, the middle one is guide 21
const HU = sshChain(N, J, J, 0), eigU = symEig(HU);  // the uniform chain
const E_MAX = Math.max(...eigU.values.map(Math.abs)), DZ_RK4 = (2 * Math.SQRT2) / E_MAX;
let act = 0, z = 0, playing = false;
// act 1: one step on one amplitude, i dψ/dz = E ψ
const E1 = 1;
let h1 = 1.0, psiR = { re: 1, im: 0 }, trailR = [], stage = 0, showEuler = false, stepsDone = 0, playClock = 0;
// act 2: stepping the chain
let useRK4 = true, dz = 0.2, psiS0 = null, psiS = null, zS = 0, stepRows = [], normHist = [];
// acts 2–3: a beam on the chain, exact propagation
let k0 = 1.0, width = 2, F = 0.3, eigB = eigU, psi0 = null, psi = null, rows = [];
// act 4: the SSH chain
let NS = 21, J1 = 2, J2 = 1, eigS = null, sel = -1, psiX0 = null, psiX = null;

const delta = (n, j) => real(Array.from({ length: n }, (_, i) => (i === j ? 1 : 0)));
function beamState(k, w) {
  if (w < 0.05) return delta(N, J0);
  const a = Array.from({ length: N }, (_, j) => Math.exp(-((j - J0) ** 2) / (4 * w * w)));
  const s = Math.sqrt(a.reduce((q, x) => q + x * x, 0));
  return { re: a.map((x, j) => (x / s) * Math.cos(k * (j - J0))), im: a.map((x, j) => (x / s) * Math.sin(k * (j - J0))) };
}
const centre = (p) => p.reduce((s, x, j) => s + (j + 1) * x, 0) / (p.reduce((s, x) => s + x, 0) || 1);
function eulerStep(H, p, h) { const hr = matvec(H, p.re), hi = matvec(H, p.im); return { re: p.re.map((x, i) => x + h * hi[i]), im: p.im.map((x, i) => x - h * hr[i]) }; }
function setupSSH() { eigS = symEig(sshChain(NS, J1, J2, 0)); sel = -1; }

// ---------- one amplitude: one Runge–Kutta step, piece by piece ----------
const fPush = (p) => ({ re: E1 * p.im, im: -E1 * p.re });                          // the derivative f(ψ) = −iEψ
const axpy = (p, k, a) => ({ re: p.re + a * k.re, im: p.im + a * k.im });
const exactStep = (p, h) => ({ re: p.re * Math.cos(E1 * h) + p.im * Math.sin(E1 * h), im: p.im * Math.cos(E1 * h) - p.re * Math.sin(E1 * h) });  // ψ·e^(−iE dz)
function rk4Parts(p, h) {
  const k1 = fPush(p), P2 = axpy(p, k1, h / 2), k2 = fPush(P2), P3 = axpy(p, k2, h / 2), k3 = fPush(P3), P4 = axpy(p, k3, h), k4 = fPush(P4);
  const kbar = { re: (k1.re + 2 * k2.re + 2 * k3.re + k4.re) / 6, im: (k1.im + 2 * k2.im + 2 * k3.im + k4.im) / 6 };
  return { k1, k2, k3, k4, P2, P3, P4, kbar, next: axpy(p, kbar, h), euler: axpy(p, k1, h), exact: exactStep(p, h) };
}
const rkFactor = (x) => ({ re: 1 - x * x / 2 + x ** 4 / 24, im: -x + x ** 3 / 6 });   // RK4 applied to e^(−ix): 1 + (−ix) + (−ix)²/2 + (−ix)³/6 + (−ix)⁴/24
const cnum = (p) => `(${fmt(p.re, 3)}, ${fmt(p.im, 3)})`;
const mag = (p) => Math.hypot(p.re, p.im);
const SUB = ['₁', '₂', '₃', '₄'];
const STAGES = [
  'ψ is the complex amplitude in the guide, drawn as a phasor in the complex plane. The equation i dψ/dz = Eψ gives its derivative at any point: f(ψ) = −iEψ, the phasor rotated by −90° and scaled by E. A step must estimate ψ after dz from such derivatives alone.',
  'k₁ = f(ψ) is the derivative at the start. Following it for the whole step gives the arrow dz·k₁: Euler’s estimate. The derivative is tangent to the circle, so a straight step leaves the circle.',
  'Go half a step along k₁ to the trial point P₂ and evaluate the derivative there: k₂. A derivative taken in the middle of the step is a better estimate than the one at the start.',
  'Back at ψ, go half a step along k₂ to P₃ and evaluate the derivative there: k₃. This corrects the midpoint estimate once more.',
  'Go a full step along k₃ to P₄, the estimate of the end point, and evaluate the derivative there: k₄.',
  'Average the four derivatives with weights 1, 2, 2, 1 (Simpson’s rule: each end once, the middle four times) and take one step along this mean derivative. The error of the step is of order dz⁵.',
];
class DialPanel extends Canvas2D {
  draw({ psi, h, parts, stage, trail, showEuler }) {
    const c = colors(), ctx = this.ctx, w = this.w, h0 = this.h;
    this.clear();
    const { k1, k2, k3, k4, P2, P3, P4, next, exact, euler } = parts;
    const from = [psi, P2, P3, P4], ks = [k1, k2, k3, k4], tips = from.map((p, i) => axpy(p, ks[i], h));
    const ext = 1.12 * Math.max(1.3, ...[psi, ...tips, next].map((p) => Math.max(Math.abs(p.re), Math.abs(p.im))));
    const cx = w * 0.5, cy = h0 * 0.53, R = Math.min(w * 0.5, h0 * 0.46) / ext;
    const X = (p) => cx + R * p.re, Y = (p) => cy - R * p.im;
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(12); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('one guide, i dψ/dz = Eψ · exact: ψ(z) = ψ(0)·e^(−iEz), the dashed circle', 12, 6);
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, cy); ctx.lineTo(w - 12, cy); ctx.moveTo(cx, 26); ctx.lineTo(cx, h0 - 8); ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = c['fg-2']; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 400, true); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('Re ψ', w - 14, cy - 4); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Im ψ', cx + 6, 26);
    const dot = (p, color, r = 4) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(p), Y(p), r, 0, 2 * Math.PI); ctx.fill(); };
    const lab = (txt, p, color, dx = 7, dy = -5, size = 12) => { ctx.fillStyle = color; ctx.font = this.font(size, 600); ctx.textAlign = dx < 0 ? 'right' : 'left'; ctx.textBaseline = dy > 0 ? 'top' : 'bottom'; ctx.fillText(txt, X(p) + dx, Y(p) + dy); };
    const dashed = (a, b, color) => { ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke(); ctx.restore(); };
    // where earlier steps landed
    ctx.save(); ctx.globalAlpha = 0.45; trail.forEach((p) => dot(p, c.psi, 2.5)); ctx.restore();
    // the phasor ψ
    ctx.strokeStyle = c.psi; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X(psi), Y(psi)); ctx.stroke(); dot(psi, c.psi, 4.5);
    lab('ψ', psi, c.psi, -8, -6);
    // the four derivatives: each drawn as the full-step arrow dz·k from the point where it was asked
    const kcol = [c.v1, c.v2, c.v3, c.hpsi];
    for (let i = 0; i < 4 && stage >= i + 1; i++) {
      ctx.save(); ctx.globalAlpha = stage === i + 1 ? 1 : 0.3;
      if (i >= 2) dashed(psi, from[i], kcol[i - 1]);
      if (i >= 1) { dot(from[i], kcol[i - 1], 4); lab('P' + SUB[i], from[i], kcol[i - 1], -7, 8, 11); }
      arrow(ctx, X(from[i]), Y(from[i]), X(tips[i]), Y(tips[i]), kcol[i], 2.2, 8); lab('dz·k' + SUB[i], tips[i], kcol[i]);
      ctx.restore();
    }
    if (stage >= 5) {
      arrow(ctx, X(psi), Y(psi), X(next), Y(next), c.psi, 3.2, 10); dot(next, c.psi, 5); lab('ψ_new', next, c.psi, 9, 10);
      ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(exact), Y(exact), 7.5, 0, 2 * Math.PI); ctx.stroke(); lab('exact', exact, c.fg, 11, -9, 11);
      if (showEuler) { dot(euler, c.v1, 5); lab('Euler', euler, c.v1, 9, 10); }
    }
  }
}
function rkText() {
  const q = rk4Parts(psiR, h1);
  const block = (i, cls, lines, note) => `<div class="rk-step ${cls}${stage === i ? ' now' : ''}">${lines.map((l) => `<code>${l}</code>`).join('')}<span class="note">${note}</span></div>`;
  const out = [`<div class="t">E = ${E1} · dz = ${fmt(h1)} · dψ/dz = f(ψ) = −iEψ</div>`, block(0, 'st', [`ψ = ${cnum(psiR)}`], 'start of the step')];
  const from = [psiR, q.P2, q.P3, q.P4], ks = [q.k1, q.k2, q.k3, q.k4];
  const how = ['', 'P₂ = ψ + ½dz·k₁', 'P₃ = ψ + ½dz·k₂', 'P₄ = ψ + dz·k₃'];
  const notes = ['derivative at the start', 'derivative at the midpoint, reached with k₁', 'derivative at the midpoint, reached with k₂', 'derivative at the end, reached with k₃'];
  for (let i = 0; i < 4 && stage >= i + 1; i++) {
    const lines = i ? [`${how[i]} = ${cnum(from[i])}`] : [];
    lines.push(`k${SUB[i]} = f(${i ? 'P' + SUB[i] : 'ψ'}) = ${cnum(ks[i])}`);
    out.push(block(i + 1, 'k' + (i + 1), lines, notes[i]));
  }
  if (stage >= 5) {
    const err = (p) => fmt(mag({ re: p.re - q.exact.re, im: p.im - q.exact.im }), 4);
    const lines = [`k̄ = (k₁ + 2k₂ + 2k₃ + k₄)/6 = ${cnum(q.kbar)}`, `ψ_new = ψ + dz·k̄ = ${cnum(q.next)}`, `exact = ψ·e^(−iE·dz) = ${cnum(q.exact)}`];
    if (showEuler) lines.push(`Euler = ψ + dz·k₁ = ${cnum(q.euler)}`);
    out.push(block(5, 'st', lines, `error of this step: RK4 ${err(q.next)}${showEuler ? `, Euler ${err(q.euler)}` : ''}`));
  }
  out.push(`<div class="t why">${STAGES[stage]}</div>`);
  return out.join('');
}

// ---------- panels ----------
const chainPanel = new ChainPanel($('pane-chain').querySelector('canvas'));
const dialPanel = new DialPanel($('pane-dial').querySelector('canvas'));
const rkBox = $('pane-rk');
const pad = { l: 46, r: 12, t: 26, b: 32 };
const propPlot = new Plot($('pane-prop').querySelector('canvas'), { pad });
const normPlot = new Plot($('pane-norm').querySelector('canvas'), { pad });
const bandPlot = new Plot($('pane-band').querySelector('canvas'), { pad });
const eigPlot = new Plot($('pane-eig').querySelector('canvas'), { pad });
const vecPlot = new Plot($('pane-vec').querySelector('canvas'), { pad });
const statePlot = new Plot($('pane-state').querySelector('canvas'), { pad });
const panes = { dial: $('pane-dial'), rk: $('pane-rk'), chain: $('pane-chain'), prop: $('pane-prop'), norm: $('pane-norm'), band: $('pane-band'), eig: $('pane-eig'), vec: $('pane-vec'), state: $('pane-state') };

function drawChain(p, { title, colorsAB = false } = {}) {
  const c = colors(), pr = prob(p), pMax = Math.max(...pr);
  const cols = Array.from({ length: p.re.length }, (_, i) => (colorsAB ? (i % 2 === 0 ? c.v1 : c.v3) : c.psi));
  chainPanel.draw({ psi: p, siteColors: cols, J: Array.from({ length: p.re.length - 1 }, () => 1), eps: p.re.map(() => 0), showDials: false, pct: false, barRef: Math.max(pMax, 1e-9), title: `${title} (bars relative to the brightest guide, ${(100 * pMax).toFixed(0)}%)` });
}
function drawProp(rowsIn, rowDz, { title = 'intensity along the way' } = {}) {
  const stride = Math.max(1, Math.ceil(rowsIn.length / 300)), rws = rowsIn.filter((_, i) => i % stride === 0), h = rowDz * stride;
  const nRows = Math.max(1, Math.round(T_END / h)), tTicks = [0, 2, 4, 6, 8, 10, 12].map((v) => v / h);
  const xt = intTicks(N, Math.floor(propPlot.w / 70));
  propPlot.begin({ xlim: [0.5, N + 0.5], ylim: [0, nRows], xticks: xt, yticks: tTicks, ytickFmt: (v) => String(Math.round(v * h)), xlabel: 'guide j', ylabel: 'propagation z', title });
  if (rws.length) { const late = rws.slice(Math.min(rws.length - 1, Math.round(0.5 / h))); propPlot.heatmap(rws, { cmap: 'seq', vmin: 0, vmax: Math.max(0.02, ...late.map((r) => Math.max(...r))), x0: 0.5, y0: 0 }); }
  propPlot.end();
}
function drawBand(kMark, { note = '' } = {}) {
  const c = colors();
  bandPlot.begin({ xlim: [-Math.PI, Math.PI], ylim: [-2.5, 2.5], xticks: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI], xtickFmt: piTick, xlabel: 'wavenumber k (phase step from guide to guide)', ylabel: 'E(k)', title: 'the band E(k) = 2J cos k, dots: the 41 eigenvalues of the finite chain (Exercise 1)' });
  const ks = linspace(-Math.PI, Math.PI, 241);
  bandPlot.line(ks, ks.map((k) => 2 * J * Math.cos(k)), { color: c.fg, width: 1.5 });
  const kn = eigU.values.map((_, i) => ((N - i) * Math.PI) / (N + 1)); // ascending E_i sits at k = (N - i) π/(N+1)
  bandPlot.dots(kn, eigU.values, { color: c.psi, r: 2.5 });
  const E = 2 * J * Math.cos(kMark), v = -2 * J * Math.sin(kMark), dk = 0.7;
  bandPlot.line([kMark - dk, kMark + dk], [E - v * dk, E + v * dk], { color: c.hpsi, width: 2 });
  bandPlot.dots([kMark], [E], { color: c.hpsi, r: 6 });
  bandPlot.text(kMark, E, `dE/dk = ${fmt(v)} = group velocity`, { color: c.hpsi, dx: kMark > 0.8 ? -12 : 12, dy: -16, align: kMark > 0.8 ? 'right' : 'left' });
  if (note) bandPlot.text(0, -2.3, note, { color: c['fg-2'], align: 'center' });
  bandPlot.end();
}
function drawEigSSH() {
  const c = colors(), n = eigS.values.length, ns = eigS.values.map((_, i) => i + 1), gap = Math.abs(J1 - J2);
  const xt = intTicks(n, Math.floor(eigPlot.w / 70));
  const inGap = gap > 1e-9 ? ns.filter((v) => Math.abs(eigS.values[v - 1]) < gap - 1e-6) : [];
  eigPlot.begin({ xlim: [0.5, n + 0.5], ylim: [-3.3, 3.3], xticks: xt, xlabel: 'n = position in the sorted list of eigenvalues (lowest first)', ylabel: 'Eₙ', title: `fig. 1: eigenvalues, N = ${n}, J₁ = ${fmt(J1)}, J₂ = ${fmt(J2)}${gap > 1e-9 ? ` · ${inGap.length} state${inGap.length === 1 ? '' : 's'} in the gap` : ''}` });
  if (gap > 1e-9) { eigPlot.hspan(-gap, gap, { color: c.hpsi, alpha: 0.12 }); eigPlot.text(1, gap, `gap ±|J₁ − J₂| = ±${fmt(gap)}`, { color: c.hpsi, dy: -10, font: '11px sans-serif' }); }
  eigPlot.dots(ns, eigS.values, { color: c.psi, r: 3.5, data: ns.map((v) => v - 1), tips: ns.map((v, i) => `n = ${v}: E = ${fmt(eigS.values[i], 4)}`) });
  if (inGap.length) { eigPlot.dots(inGap, inGap.map((v) => eigS.values[v - 1]), { color: c.hpsi, r: 4.5 }); eigPlot.text(inGap[inGap.length - 1], eigS.values[inGap[0] - 1], `edge state${inGap.length > 1 ? 's' : ''}: eigenvalue${inGap.length > 1 ? 's' : ''} ${inGap.join(', ')} of ${n} = row${inGap.length > 1 ? 's' : ''} ${inGap.join(', ')} of fig. 2`, { color: c.hpsi, dx: 12, dy: 4, align: 'left', font: '11px sans-serif' }); }
  if (sel >= 0) { const ctx = eigPlot.ctx; ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(eigPlot.x(sel + 1), eigPlot.y(eigS.values[sel]), 8, 0, 2 * Math.PI); ctx.stroke(); }
  eigPlot.end();
  const yt = intTicks(n, Math.floor(vecPlot.h / 40));
  vecPlot.begin({ xlim: [0.5, n + 0.5], ylim: [0.5, n + 0.5], xticks: xt, yticks: yt, xlabel: 'guide j', ylabel: 'supermode n', title: 'fig. 2: eigenstates ψₙ(j), blue < 0 < red' });
  vecPlot.heatmap(eigS.vectors, { cmap: 'div', x0: 0.5, y0: 0.5, tips: (i, j) => `n = ${i + 1}, j = ${j + 1}: ${fmt(eigS.vectors[i][j], 3)}` });
  if (sel >= 0) vecPlot.hline(sel + 1, { color: c.hpsi, width: 2 });
  vecPlot.end();
  // the selected eigenstate as signed bars, A sites and B sites in two colours
  const v = sel >= 0 ? eigS.vectors[sel] : null, m = v ? Math.max(0.3, ...v.map(Math.abs)) * 1.15 : 1;
  statePlot.begin({ xlim: [0.5, n + 0.5], ylim: [-m, m], xticks: xt, xlabel: 'guide j (A = odd, B = even)', ylabel: 'ψₙ(j)', title: sel >= 0 ? `supermode ${sel + 1} as signed bars, E = ${fmt(eigS.values[sel], 4)}` : 'click a dot in fig. 1 or a row in fig. 2 to see that supermode here' });
  statePlot.hline(0, { color: c.line });
  if (v) { const ctx = statePlot.ctx, bw = (statePlot.x(2) - statePlot.x(1)) * 0.7; v.forEach((x, j) => { ctx.fillStyle = j % 2 === 0 ? c.v1 : c.v3; const X = statePlot.x(j + 1) - bw / 2, Y0 = statePlot.y(0), Y1 = statePlot.y(x); ctx.fillRect(X, Math.min(Y0, Y1), bw, Math.abs(Y1 - Y0)); }); }
  statePlot.end();
}
function sshFacts() {
  const n = eigS.values.length, gap = Math.abs(J1 - J2);
  if (gap < 1e-9) return 'J₁ = J₂: no gap, this is the uniform chain of Exercise 1.';
  const inGap = eigS.values.map((E, i) => [E, i]).filter(([E]) => Math.abs(E) < gap - 1e-6);
  let s = `gap of width 2|J₁ − J₂| = ${fmt(2 * gap)} · `;
  if (!inGap.length) s += `no state in the gap: the chain ends on strong bonds (J₁ > J₂), trivial ends.`;
  else if (n % 2 === 1) {
    const [E, i] = inGap[0], v = eigS.vectors[i], left = v.slice(0, Math.floor(n / 2)).reduce((q, x) => q + x * x, 0) > 0.5;
    const xi = 1 / Math.abs(Math.log(J1 / J2));
    const g = left ? [1, 3, 5] : [n, n - 2, n - 4];
    s += `one state in the gap, E = ${fmt(E, 4)}: number ${i + 1} in the sorted list (${i} eigenvalues below, ${n - i - 1} above), row ${i + 1} of fig. 2 · it sits on guides ${g.join(', ')}, … (the ${left ? 'left' : 'right'} end: its first coupling ${left ? 'J₁' : 'J₂'} is the weak one), decaying over ξ = 1/|ln(J₁/J₂)| = ${fmt(xi)} unit cells.`;
  } else s += `${inGap.length} states in the gap at E = ${inGap.map(([E]) => fmt(E, 4)).join(', ')}: the symmetric and antisymmetric combinations of an edge state at each end; their overlap through the chain splits them by 2δ, exponentially small in N.`;
  const j0 = psiX0 ? psiX0.re.findIndex((x) => Math.abs(x - 1) < 1e-9) : -1;
  if (j0 >= 0 && inGap.length) {
    const ov = inGap.reduce((q, [, i]) => q + eigS.vectors[i][j0] ** 2, 0);
    s += ` Light launched into guide ${j0 + 1}: ${Math.round(ov * 100)}% of it is in the gap state${inGap.length > 1 ? 's' : ''}${ov > 0.005 ? ' and stays at this end, the rest spreads through the bands.' : `, so all of it spreads through the bands${j0 === 0 || j0 === n - 1 ? ': this end has no edge state' : ''}.`}`;
  }
  if (sel >= 0) {
    const v = eigS.vectors[sel]; let d = 0; for (let j = 0; j + 1 < n; j += 2) d += v[j] * v[j + 1];
    const E = eigS.values[sel];
    if (Math.abs(E) < gap - 1e-6) s += ` Selected: the gap state.`;
    else s += ` Selected: ${E < 0 ? 'lower' : 'upper'} band, ${d < 0 ? 'antisymmetric' : 'symmetric'} inside each J₁ dimer (ψ<sub>A</sub>ψ<sub>B</sub> ${d < 0 ? '<' : '>'} 0).`;
  }
  return s;
}

// ---------- acts ----------
const acts = [
  {
    id: 'rk', tab: '1 · One step', heading: 'How one step is computed: the four evaluations k₁…k₄ of Runge–Kutta',
    lead: 'One guide with propagation constant E: i dψ/dz = Eψ, so dψ/dz = f(ψ) = −iEψ. The exact solution ψ(0)·e^(−iEz) runs around a circle in the complex plane. A numerical step has to estimate ψ after dz, knowing only the derivative f at points of its choice. Euler evaluates f once, at the start. Runge–Kutta 4 evaluates f four times, k₁ to k₄, and averages them. Press "next" to build one step piece by piece.',
    panes: ['dial', 'rk'], canPlay: true,
    enter(ctl) {
      resetRK();
      ctl.append(group('build the step', [button('next', () => { nextStage(); render(); }), button('whole step', () => { wholeStep(); render(); }), button('reset', () => { resetRK(); render(); })]),
        slider({ id: 'h', label: 'step <i>E</i>·<i>dz</i>', min: 0.1, max: 3, step: 0.05, value: h1, onInput: (v) => { h1 = v; resetRK(); render(); } }).root,
        toggle({ id: 'euler', label: 'also show where Euler lands (k₁ only)', checked: showEuler, onChange: (v) => { showEuler = v; render(); } }).root);
    },
    caption() {
      const x = E1 * h1, mR = mag(rkFactor(x));
      return `<i>E</i>·dz = ${fmt(x)} · each step multiplies |ψ| by ${fmt(mR, 4)} (RK4) or ${fmt(Math.sqrt(1 + x * x), 3)} (Euler, = √(1 + (E dz)²)); exact: 1 · RK4 is stable up to E·dz = 2√2 = 2.83${x > 2 * Math.SQRT2 ? ', exceeded: it runs away now' : ''} · ${stepsDone} steps done, |ψ| = ${fmt(mag(psiR), 4)}`;
    },
    render() {
      dialPanel.draw({ psi: psiR, h: h1, parts: rk4Parts(psiR, h1), stage, trail: trailR, showEuler });
      rkBox.innerHTML = rkText();
    },
  },
  {
    id: 'step', tab: '2 · Stepping the chain', heading: 'The same recipe on 41 amplitudes at once',
    lead: 'Now the derivative is f(ψ) = −iHψ: each amplitude changes through the coupling to its neighbours, and one step of Euler or RK4 advances all 41 amplitudes together with the recipe of act 1. In Exercise 1 the propagation was computed by diagonalizing H; here it is integrated step by step, as in the coding task. The norm must stay 1: watch what each method does to it, and change dz.',
    panes: ['chain', 'prop', 'norm'], canPlay: true,
    enter(ctl) {
      psiS0 = delta(N, J0); restartStep();
      ctl.append(toggle({ id: 'rk4', label: 'Runge–Kutta 4 (off: Euler)', checked: useRK4, onChange: (v) => { useRK4 = v; restartStep(); } }).root,
        slider({ id: 'dz', label: 'step <i>dz</i>', min: 0.02, max: 1.6, step: 0.02, value: dz, onInput: (v) => { dz = v; restartStep(); } }).root,
        group('excite', [button('middle guide', () => { psiS0 = delta(N, J0); restartStep(); }), button('guide 1', () => { psiS0 = delta(N, 0); restartStep(); })]));
    },
    caption() {
      const last = normHist[normHist.length - 1];
      const state = `norm ${fmt(last.n, 4)}, error vs the exact solution ${fmt(last.e, 4)} at z = ${fmt(zS, 1)}`;
      if (!useRK4) return `Euler, dz = ${fmt(dz)}: each step multiplies the norm by up to √(1 + (E<sub>max</sub> dz)²) = ${fmt(Math.sqrt(1 + (E_MAX * dz) ** 2), 3)}, unstable for every dz, only slower for small dz · ${state}`;
      if (dz > DZ_RK4) return `RK4, dz = ${fmt(dz)} > 2√2/E<sub>max</sub> = ${fmt(DZ_RK4)}: unstable, the norm explodes · ${state}`;
      return `RK4, dz = ${fmt(dz)} < 2√2/E<sub>max</sub> = ${fmt(DZ_RK4)}: stable, the error shrinks like dz⁴, the norm drifts slowly · ${state}`;
    },
    render() {
      const c = colors();
      drawChain(psiS, { title: `the ${N} guides, stepped with ${useRK4 ? 'RK4' : 'Euler'}, dz = ${fmt(dz)}` });
      drawProp(stepRows, dz, { title: 'intensity along the way, one row per step' });
      const zs = normHist.map((h) => h.z), top = Math.min(3, Math.max(1.2, ...normHist.map((h) => Math.max(h.n, h.e))) * 1.08);
      normPlot.begin({ xlim: [0, T_END], ylim: [0, top], xlabel: 'propagation z', ylabel: 'norm, error', title: 'norm ‖ψ‖ (blue, must stay 1) and error ‖ψ − ψ_exact‖ (orange)' });
      normPlot.hline(1, { color: c['fg-2'], dash: [4, 4] });
      normPlot.line(zs, normHist.map((h) => h.n), { color: c.psi, width: 2 });
      normPlot.line(zs, normHist.map((h) => h.e), { color: c.hpsi, width: 2 });
      normPlot.end();
    },
  },
  {
    id: 'walk', tab: '3 · Beam and k', heading: 'A tilted beam moves sideways: the transverse wavenumber k',
    lead: 'One excited guide contains every wavenumber and spreads (discrete diffraction). A wide beam with a phase difference k between neighbouring guides is close to one Bloch mode of the infinite chain: it sits at one point of the band E(k) = 2J cos k and its centre moves with the group velocity dE/dk. The dots are the eigenvalues of the finite chain from Exercise 1, the same numbers.',
    panes: ['chain', 'prop', 'band'], canPlay: true,
    enter(ctl) {
      eigB = eigU; k0 = 1.0; width = 2; psi0 = beamState(k0, width); restartBeam();
      const sK = slider({ id: 'k', label: 'wavenumber <i>k</i>', min: -Math.PI, max: Math.PI, step: 0.05, value: k0, onInput: (v) => { k0 = v; psi0 = beamState(k0, width); restartBeam(); } });
      const sW = slider({ id: 'width', label: 'beam width', min: 0, max: 4, step: 0.1, value: width, format: (x) => x.toFixed(1) + ' guides', onInput: (v) => { width = v; psi0 = beamState(k0, width); restartBeam(); } });
      ctl.append(sK.root, sW.root, group('beam', [button('wide beam', () => { width = 2; sW.set(2); psi0 = beamState(k0, width); restartBeam(); }), button('one guide', () => { width = 0; sW.set(0); psi0 = beamState(k0, width); restartBeam(); })]));
    },
    caption() {
      if (width < 0.05) return 'one excited guide: all k at once, group velocities of both signs, the light spreads (discrete diffraction).';
      const v = -2 * J * Math.sin(k0), moved = centre(prob(psi)) - centre(prob(psi0));
      return `k = ${fmt(k0)}: the beam sits at E = ${fmt(2 * J * Math.cos(k0))} on the band, group velocity dE/dk = −2J sin k = ${fmt(v)} · the beam centre moved ${fmt(moved, 1)} guides in z = ${fmt(z, 1)}${z > 0.5 ? `, measured velocity ${fmt(moved / z)}` : ''}${Math.abs(v) < 0.2 ? ' · at a band extremum the group velocity is zero: the beam does not move, it only spreads' : ''}`;
    },
    render() {
      drawChain(psi, { title: `the ${N} guides, k = ${fmt(k0)}, width ${width.toFixed(1)}` });
      drawProp(rows, DT_ROW);
      drawBand(k0);
    },
  },
  {
    id: 'bloch', tab: '4 · Bloch oscillations', heading: 'A gradient of the propagation constants: Bloch oscillations',
    lead: 'Give the propagation constants a linear gradient across the array, εⱼ = F·j. In experiments: a temperature gradient across a polymer array (Pertsch et al. 1999), guides whose effective index grows linearly (Morandotti et al. 1999), curved waveguides (Chiodo et al. 2006), or an intensity gradient of the writing light in a photorefractive lattice (Trompeter et al. 2006). A phase gradient imprinted on the input, e.g. with an SLM, only sets k₀, the starting point on the band. This εⱼ is the optical analogue of a constant force on an electron in a crystal. The wavenumber then changes as k(z) = k₀ − F z, so the beam moves along the band E(k). At a band extremum the group velocity is zero and the beam turns around. It never leaves: it oscillates with period 2π/F over 4J/F guides.',
    panes: ['chain', 'prop', 'band'], canPlay: true,
    enter(ctl) {
      F = 0.3; k0 = 0; width = 2; rampChain(); psi0 = beamState(k0, width); restartBeam();
      const sF = slider({ id: 'F', label: 'gradient <i>F</i>', min: 0, max: 1, step: 0.02, value: F, onInput: (v) => { F = v; rampChain(); restartBeam(); } });
      const sW = slider({ id: 'width', label: 'beam width', min: 0, max: 4, step: 0.1, value: width, format: (x) => x.toFixed(1) + ' guides', onInput: (v) => { width = v; psi0 = beamState(k0, width); restartBeam(); } });
      ctl.append(sF.root, sW.root, group('beam', [button('wide beam', () => { width = 2; sW.set(2); psi0 = beamState(k0, width); restartBeam(); }), button('one guide', () => { width = 0; sW.set(0); psi0 = beamState(k0, width); restartBeam(); })]));
    },
    caption() {
      if (F < 1e-9) return 'F = 0: no gradient, k is constant, the beam moves or spreads as in act 3.';
      const kz = wrapK(k0 - F * z);
      const base = `F = ${fmt(F)}: k(z) = −F z = ${fmt(kz)} now, group velocity ${fmt(-2 * J * Math.sin(kz))} · period 2π/F = ${fmt(2 * Math.PI / F, 1)}`;
      return width < 0.05 ? `${base} · one excited guide: the light spreads out to ±2J/F = ±${fmt(2 * J / F, 1)} guides and refocuses into the start guide.` : `${base} · the beam oscillates over 4J/F = ${fmt(4 * J / F, 1)} guides and returns to its starting position.`;
    },
    render() {
      drawChain(psi, { title: `the ${N} guides, εⱼ = F·(j − ${J0 + 1}), F = ${fmt(F)}` });
      drawProp(rows, DT_ROW);
      drawBand(wrapK(k0 - F * z), { note: F > 1e-9 ? 'the marker moves along the band, dk/dz = −F; dE/dk there is the group velocity' : '' });
    },
  },
  {
    id: 'ssh', tab: '5 · SSH chain (Task 2)', heading: 'Task 2: alternating couplings, a gap, and the states in it: none, one or two',
    lead: 'Make the couplings alternate: J₁ inside each pair of guides, J₂ between pairs. The band splits into two with a gap of width 2|J₁ − J₂|. Let the weak coupling go to zero: the chain falls apart into dimers at ±J_strong, and a guide left without a partner stays at E = 0, in the gap. With 21 guides exactly one guide is left over, at the end whose first coupling is the weak one: J₁ < J₂ leaves guide 1, J₁ > J₂ leaves guide 21, never both. Exactly, for any J₁ ≠ J₂: an E = 0 state needs (Hψ)ⱼ = 0 on every even guide, J₁ψ₁ + J₂ψ₃ = 0, J₁ψ₃ + J₂ψ₅ = 0, …, so ψ₂ₘ₊₁ = (−J₁/J₂)ᵐ ψ₁: one solution only, on the odd guides, growing toward the end with the weak coupling, decay length 1/|ln(J₁/J₂)| unit cells. With 20 guides and J₁ < J₂ both ends are left over: two states at ±δ, the symmetric and antisymmetric combinations of the two edge states, δ exponentially small in N. With 20 guides and J₁ > J₂ there is none.',
    panes: ['eig', 'vec', 'state', 'chain'], canPlay: true,
    enter(ctl) {
      NS = 21; J1 = 2; J2 = 1; setupSSH(); psiX0 = delta(NS, NS - 1); restartSSH();
      const sJ = slider({ id: 'J1', label: '<i>J</i>₁ (J₂ = 1)', min: 0.5, max: 2, step: 0.05, value: J1, onInput: (v) => { J1 = v; setupSSH(); restartSSH(); } });
      const sM = slider({ id: 'mode', label: 'supermode <i>n</i>', min: 1, max: NS, step: 1, value: 1, format: (x) => x.toFixed(0), onInput: (v) => selectSSH(v - 1) });
      ctl.append(group('guides', [button('20', () => { NS = 20; setupSSH(); psiX0 = delta(NS, 0); restartSSH(); }), button('21', () => { NS = 21; setupSSH(); psiX0 = delta(NS, NS - 1); restartSSH(); })]), sJ.root, sM.root,
        group('excite', [button('guide 1', () => { psiX0 = delta(NS, 0); sel = -1; restartSSH(); }), button('last guide', () => { psiX0 = delta(NS, NS - 1); sel = -1; restartSSH(); }), button('middle guide', () => { psiX0 = delta(NS, Math.ceil(NS / 2) - 1); sel = -1; restartSSH(); })]));
      this._sM = sM;
    },
    caption() { return sshFacts(); },
    render() {
      drawEigSSH();
      drawChain(psiX, { title: `the ${NS} guides: intensity now (A guides green, B guides pink)`, colorsAB: true });
      if (this._sM) { this._sM.input.max = NS; if (sel >= 0) this._sM.set(sel + 1); else this._sM.set(Math.min(+this._sM.input.value, NS)); }
    },
  },
];

// ---------- act helpers ----------
function resetRK() { psiR = { re: 1, im: 0 }; trailR = []; stage = 0; stepsDone = 0; playClock = 0; setPlaying(false); }
function commitRK() { if (stepsDone >= 400) return; trailR.push(psiR); psiR = rk4Parts(psiR, h1).next; stepsDone++; stage = 0; }
function nextStage() { if (stage < 5) stage++; else commitRK(); }
function wholeStep() { if (stage < 5) stage = 5; else { commitRK(); stage = 5; } }
function restartStep() { psiS = { re: psiS0.re.slice(), im: psiS0.im.slice() }; zS = 0; z = 0; stepRows = [prob(psiS)]; normHist = [{ z: 0, n: 1, e: 0 }]; setPlaying(false); render(); }
function stepOnce() {
  psiS = useRK4 ? rk4Step(HU, psiS, dz) : eulerStep(HU, psiS, dz); zS += dz;
  const ex = evolveExact(eigU, psiS0, zS);
  const e = Math.sqrt(psiS.re.reduce((s, x, i) => s + (x - ex.re[i]) ** 2 + (psiS.im[i] - ex.im[i]) ** 2, 0));
  normHist.push({ z: zS, n: Math.sqrt(cnorm2(psiS)), e: Math.min(e, 1e6) }); stepRows.push(prob(psiS));
}
function rampChain() { eigB = symEig(tightBinding(Array.from({ length: N }, (_, j) => F * (j - J0)), Array.from({ length: N - 1 }, () => J))); }
function restartBeam() { z = 0; psi = psi0; rows = [prob(psi)]; setPlaying(false); render(); }
function sampleRows() { while (rows.length * DT_ROW <= z + 1e-9 && rows.length * DT_ROW <= T_END + 1e-9) rows.push(prob(evolveExact(eigB, psi0, rows.length * DT_ROW))); }
function restartSSH() { z = 0; psiX = { re: psiX0.re.slice(), im: psiX0.im.slice() }; setPlaying(false); render(); }
function selectSSH(n) { sel = n; psiX0 = real(eigS.vectors[n]); restartSSH(); }

// ---------- shell ----------
const group = (label, btns) => el('div', { class: 'group' }, [el('span', { class: 'group-label', text: label }), ...btns]);
const ctl = $('controls'), captionEl = $('caption');
let playBtn = null, timeEl = null, lastNow = 0;
function setPlaying(v) { playing = v; if (playBtn) playBtn.textContent = playing ? 'Pause' : 'Play'; }
function advance(dts) {
  const id = acts[act].id;
  if (id === 'rk') { playClock += dts; if (playClock >= 1.1) { playClock = 0; nextStage(); if (stepsDone >= 12 && stage === 0) setPlaying(false); } }
  else if (id === 'step') { z = Math.min(T_END, z + dts); let n = 0; while (zS + dz <= z + 1e-9 && n++ < 200) stepOnce(); if (z >= T_END) setPlaying(false); }
  else if (id === 'ssh') { z += dts; psiX = evolveExact(eigS, psiX0, z); }
  else { z += dts; if (z > T_END) { z = T_END; setPlaying(false); } psi = evolveExact(eigB, psi0, z); sampleRows(); }
}
function restartCurrent() { const id = acts[act].id; if (id === 'rk') { resetRK(); render(); } else if (id === 'step') restartStep(); else if (id === 'ssh') restartSSH(); else restartBeam(); }
function render() { const a = acts[act]; a.render(); captionEl.innerHTML = a.caption(); if (timeEl) timeEl.textContent = acts[act].id === 'rk' ? `${stepsDone} steps` : `z = ${fmt(acts[act].id === 'step' ? zS : z, 1)}`; }
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  if (playing) { advance(dt); render(); }
}
function showAct(i) {
  act = Math.max(0, Math.min(acts.length - 1, i));
  const a = acts[act];
  setPlaying(false); z = 0;
  $('stage').dataset.act = a.id;
  for (const [k, p] of Object.entries(panes)) p.hidden = !a.panes.includes(k);
  $('heading').textContent = a.heading; $('lead').textContent = a.lead;
  document.querySelectorAll('.acts a').forEach((x, k) => x.classList.toggle('active', k === act));
  ctl.innerHTML = '';
  playBtn = button('Play', () => setPlaying(!playing), { kind: 'primary', id: 'play' }); timeEl = el('span', { class: 'time' });
  ctl.append(row([playBtn, button('Restart', restartCurrent), timeEl]));
  a.enter(ctl);
  render();
  location.hash = a.id;
}
eigPlot.onClick = (n) => selectSSH(n);
vecPlot.onClick = (ij) => selectSSH(ij[0]);
acts.forEach((a, i) => $('acts').append(el('a', { href: '#' + a.id, text: a.tab, onclick: (e) => { e.preventDefault(); showAct(i); } })));
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowRight') showAct(act + 1); if (e.key === 'ArrowLeft') showAct(act - 1);
  if (e.key === ' ' && !e.target.matches('button')) { e.preventDefault(); setPlaying(!playing); }
});
chainPanel.onRedraw = () => render(); dialPanel.onRedraw = () => render();
[propPlot, normPlot, bandPlot, eigPlot, vecPlot, statePlot].forEach((p) => { p.onRedraw = () => render(); });

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

const startId = (location.hash || '#rk').slice(1);
showAct(Math.max(0, acts.findIndex((a) => a.id === startId)));
window.addEventListener('hashchange', () => { const i = acts.findIndex((a) => a.id === location.hash.slice(1)); if (i >= 0 && i !== act) showAct(i); });
requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(frame); });
