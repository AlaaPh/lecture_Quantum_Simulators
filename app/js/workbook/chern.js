// Part 3: the Chern number of the bands of the pump of part 2, first from the Zak phase along z, then from the plaquettes.
import { arrow } from '../lecture1/panels.js';
import { cmapSeq, cmapDiv, rgbToCss } from '../theme.js';
import { TAU, font, tag, axes, minus, PERIOD_TICKS } from './draw.js';
import { zak, plaquette, chernGrid, gammaCurve } from './aah.js';
import { drawBands } from './pump.js';
import { CODE } from './code.js';

const PI = Math.PI, STEP = TAU / 10;
const g0 = () => zak(3, 0) / PI, g1 = () => zak(3, PI / 2) / PI;      // γ of band 3 in units of π, M = 50
const f = (v, d) => minus(v.toFixed(d));
const pic = (o) => () => o;
const FLIP = 'The sign is reversed. Three things reverse it: +arg instead of −arg, the other direction around the loop, or e<sup>−ik</sup> in the lower left corner of the matrix.';

const steps = [
  { type: 'info', title: 'The Chern number in seven small questions', button: 'Start',
    html: `<p class="step-text">In part 1 the Zak phase came from the angle of h. With five waveguides per cell there is no single h, so take the formula of the lecture:</p>
      <div class="step-formula">γ = −arg( ⟨u₁|u₂⟩ ⟨u₂|u₃⟩ … ⟨u<sub>M</sub>|u₁⟩ )</div>
      <p class="step-text">u<sub>s</sub> is the eigenvector of one band at k<sub>s</sub> = 2π(s − 1)/M, and ⟨u|v⟩ = u₁*·v₁ + … + u₅*·v₅.</p>
      <p class="step-text">γ/2π is the position of the light of this band, in unit cells.</p>`,
    pic: pic({ kind: 'bands', hi: 3 }) },
  { type: 'number', text: 'Take z = 0, M = 50 values of k, and band 3. Band 3 is the third column of the eigenvectors, sorted by eigenvalue (Python: <code>V[:, 2]</code> from <code>np.linalg.eigh</code>; MATLAB: <code>V(:, 3)</code> from <code>eig</code>).',
    ask: 'Calculate γ.', label: 'γ =', unit: 'π', ref: g0, tol: 0.003, mod: 2,
    hint: 'Two usual mistakes: the complex conjugate in the overlap is missing (use <code>np.vdot(u, v)</code> or <code>u\'*v</code>), or the loop is not closed with ⟨u<sub>M</sub>|u₁⟩.',
    how: CODE.zak, wrongs: [{ ref: () => -g0(), tol: 0.003, mod: 2, text: FLIP }, { ref: () => g0() * PI, tol: 0.006, text: 'This is γ in radians. The field is in units of π: divide by π.' }],
    after: () => `γ = ${f(g0(), 2)}π, so γ/2π = ${f(g0() / 2, 2)}: the position of the light of band 3 at z = 0, in unit cells.`,
    pic: (ok) => ({ kind: 'gamma', dots: ok ? 1 : 0 }) },
  { type: 'number', text: 'Go a quarter of a period further: Ωz = π/2.', ask: 'Calculate γ of band 3 again.', label: 'γ =', unit: 'π', ref: g1, tol: 0.003, mod: 2,
    hint: 'Only the couplings change: use Ωz = π/2 in the positions of the waveguides.',
    how: CODE.zak2, wrongs: [{ ref: () => -g1(), tol: 0.003, mod: 2, text: FLIP }, { ref: g0, tol: 0.003, mod: 2, text: 'This is γ at z = 0 again. Put Ωz = π/2 into the positions of the waveguides.' }],
    after: () => `γ went from ${f(g0(), 2)}π to ${f(g1(), 2)}π. The light of band 3 moved by (${f(g1(), 2)} + ${(-g0()).toFixed(2)})/2 = ${((g1() - g0()) / 2).toFixed(2)} unit cells.`,
    pic: (ok) => ({ kind: 'gamma', dots: ok ? 2 : 1 }) },
  { type: 'choice', text: 'The picture shows γ/2π of band 3 for the whole period. Your two values are the dots.',
    ask: 'By how many unit cells does γ/2π grow in one period?', options: ['1', '2', '3'], ref: '2',
    hint: 'Read the curve at z = 0 and at z = L and take the difference.',
    after: 'γ grows by 2 · 2π. This number is the Chern number of band 3: C = 2. It is the number of unit cells the light moved in part 2.',
    pic: (ok) => ({ kind: 'gamma', dots: 2, curve: true, rise: ok }) },
  { type: 'number', text: 'The Chern number can also be calculated directly. Divide k and Ωz into 10 steps each. This gives 10 × 10 small squares. Walk around one square, a → b → c → d → a, and multiply the four overlaps:',
    formula: 'F = −arg( ⟨u<sub>a</sub>|u<sub>b</sub>⟩ ⟨u<sub>b</sub>|u<sub>c</sub>⟩ ⟨u<sub>c</sub>|u<sub>d</sub>⟩ ⟨u<sub>d</sub>|u<sub>a</sub>⟩ )',
    ask: 'Calculate F of band 3 for the first square: its corner a is k = 0, Ωz = 0.', label: 'F =', unit: 'π', ref: () => plaquette(3, 0, 0, STEP) / PI, tol: 0.0008,
    hint: 'The picture shows the four corners. The first step, a → b, goes in Ωz. Each step is 2π/10.',
    how: CODE.plaquette, wrongs: [{ ref: () => -plaquette(3, 0, 0, STEP) / PI, tol: 0.0008, text: 'The sign is reversed: you walked the other way round, or took +arg.' },
      { ref: () => plaquette(3, 0, 0, STEP), tol: 0.002, text: 'This is F in radians. The field is in units of π: divide by π.' }],
    after: 'F is the Berry phase of one small square.', pic: pic({ kind: 'corner' }) },
  { type: 'number', text: 'Calculate F for all 100 squares and add them.', label: 'sum =', unit: 'π', ref: () => chernGrid(3, 10).sum / PI, tol: 0.01,
    hint: 'Take every corner a = (2πi/10, 2πj/10) with i and j from 0 to 9. Add the 100 values of F; do not multiply all overlaps into one product.',
    how: CODE.sum, wrongs: [{ ref: () => -chernGrid(3, 10).sum / PI, tol: 0.01, text: 'The sign is reversed: you walked the other way round, or took +arg.' },
      { ref: 0, tol: 0.01, text: 'You took arg of one product of all overlaps. Take −arg for every square first, then add the 100 values.' },
      { ref: 2, tol: 0.01, text: 'This is already sum/2π. The field asks for the sum in units of π.' }],
    after: '4π = 2 · 2π. The Chern number is C = sum/2π = 2: the same number as from γ, and an exact integer already on this coarse grid.',
    pic: (ok) => ({ kind: 'grid', band: 3, shown: ok }) },
  { type: 'number', text: 'Change one thing: band 2 instead of band 3. Add F of all 100 squares again and divide by 2π.', label: 'C =', unit: '', ref: () => chernGrid(2, 10).C, tol: 0.01,
    hint: 'Band 2 is the second column: <code>V[:, 1]</code> in Python, <code>V(:, 2)</code> in MATLAB.',
    how: CODE.band2, wrongs: [{ ref: 3, tol: 0.01, text: 'The sign is reversed: you walked the other way round, or took +arg.' }, { ref: 2, tol: 0.01, text: 'This is still band 3. Take the second column of the eigenvectors.' },
      { ref: -6, tol: 0.02, text: 'This is the sum in units of π. Divide by 2π: C = sum/2π.' }],
    after: 'Band 2 has C = −3: three unit cells per period, in the other direction.',
    pic: (ok) => (ok ? { kind: 'grid', band: 2, shown: true } : { kind: 'bands', hi: 2, chern: [3] }) },
  { type: 'number', text: 'The five bands of this lattice have the Chern numbers 2, −3, 2, −3, 2.', ask: 'Add them.', label: 'sum =', unit: '', ref: 0, tol: 0.001,
    hint: '2 − 3 + 2 − 3 + 2.', how: '2 − 3 + 2 − 3 + 2 = 0.',
    after: '0, always: the Chern numbers of all bands of a lattice add up to zero.', pic: pic({ kind: 'bands', chern: [1, 2, 3, 4, 5], hiAll: true }) },
  { type: 'info', title: 'Done', end: true,
    html: `<p class="step-text">You have calculated the Chern numbers of the lattice of the experiment: 2, −3, 2, −3, 2.</p>
      <p class="step-text">In the paper the light is a soliton in the lowest band, C = 2. Calculated for low power: 2 unit cells per period. Measured at high power: one unit cell in two periods, in the other direction. There bands 1 and 2 act together: (2 − 3)/2 = −1/2.</p>
      <p class="step-text step-end">Jürgensen, Mukherjee, Jörg, Rechtsman, <a href="https://doi.org/10.1038/s41567-022-01871-x" target="_blank" rel="noopener">Nature Physics 19, 420 (2023)</a></p>`,
    pic: pic({ kind: 'bands', chern: [1, 2, 3, 4, 5], hiAll: true }) },
];

// ---------- pictures ----------
function drawGamma(ctx, w, h, c, st) {
  const g = gammaCurve(3), n = g.length - 1;
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 1], ylim: [-0.8, 1.8], xticks: PERIOD_TICKS, yticks: [-0.5, 0, 0.5, 1, 1.5], xlabel: 'z', ylabel: 'γ/2π (unit cells)', grid: [0, 1], pad: { r: st.rise ? 56 : 20 } });
  if (st.curve) { ctx.strokeStyle = c.psi; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath(); g.forEach((v, i) => { if (i) ctx.lineTo(X(i / n), Y(v)); else ctx.moveTo(X(0), Y(v)); }); ctx.stroke(); }
  const dots = [[0, g0() / 2], [0.25, g1() / 2]].slice(0, st.dots || 0);
  for (const [x, v] of dots) {
    ctx.fillStyle = c.hpsi; ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(x), Y(v), 6, 0, TAU); ctx.fill(); ctx.stroke();
    tag(ctx, f(v, 2), X(x) + 11, Y(v) + (st.curve ? 15 : 0), { color: c.hpsi, bg: c.surface, px: 12.5, align: 'left' });
  }
  if (st.rise) {
    const xr = X(1) + 14;
    arrow(ctx, xr, Y(g[0]), xr, Y(g[n]), c.hpsi, 2.2, 9);
    ctx.save(); ctx.strokeStyle = c.hpsi; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(0), Y(g[0])); ctx.lineTo(xr, Y(g[0])); ctx.stroke(); ctx.restore();
    tag(ctx, '+2', xr + 8, Y((g[0] + g[n]) / 2), { color: c.hpsi, px: 14, align: 'left' });
  }
  return st.curve ? 'γ/2π of band 3 during one period: the position of the light of band 3, in unit cells.' : 'γ/2π of band 3 against z. Your values appear as dots.';
}

// The lower left corner of the grid, large: the first square with its corners a, b, c, d and the way around it.
function drawCorner(ctx, w, h, c) {
  const { X, Y } = axes(ctx, c, w, h, { xlim: [-0.25, 2.6], ylim: [-0.25, 2.6], xticks: [[0, '0'], [1, '2π/10'], [2, '4π/10']], yticks: [[0, '0'], [1, '2π/10'], [2, '4π/10']], xlabel: 'k', ylabel: 'Ωz', pad: { l: 62 } });
  ctx.fillStyle = c.psi; ctx.globalAlpha = 0.16; ctx.fillRect(X(0), Y(1), X(1) - X(0), Y(0) - Y(1)); ctx.globalAlpha = 1;
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.2;
  for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(X(i), Y(0)); ctx.lineTo(X(i), Y(2.6)); ctx.moveTo(X(0), Y(i)); ctx.lineTo(X(2.6), Y(i)); ctx.stroke(); }
  const P = { a: [0, 0], b: [0, 1], c: [1, 1], d: [1, 0] }, order = ['a', 'b', 'c', 'd'], off = { a: [-14, 14], b: [-14, -14], c: [14, -14], d: [14, 14] };
  order.forEach((name, i) => {
    const p = P[name], q = P[order[(i + 1) % 4]], ax = X(p[0]), ay = Y(p[1]), bx = X(q[0]), by = Y(q[1]), ux = Math.sign(bx - ax), uy = Math.sign(by - ay);
    arrow(ctx, ax + ux * 12, ay + uy * 12, bx - ux * 12, by - uy * 12, c.hpsi, 2.4, 10);
  });
  for (const name of order) {
    const p = P[name]; ctx.fillStyle = c.hpsi; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 5, 0, TAU); ctx.fill();
    tag(ctx, name, X(p[0]) + off[name][0], Y(p[1]) + off[name][1], { color: c.fg, bg: c.surface, px: 15 });
  }
  tag(ctx, 'F', (X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2, { color: c.psi, px: 17, wt: 600 });
  return 'The lower left corner of the 10 × 10 grid. The first square with its corners a, b, c, d and the direction of the walk.';
}

function drawGrid(ctx, w, h, c, st) {
  const { F, sum } = chernGrid(st.band, 10), size = Math.min(w - 78, h - 62), l = Math.max(58, (w - size) / 2 + 14);
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 10], ylim: [0, 10], xticks: [[0, '0'], [5, 'π'], [10, '2π']], yticks: [[0, '0'], [5, 'π'], [10, '2π']], xlabel: 'k', ylabel: 'Ωz', pad: { l, r: w - l - size, t: h - 44 - size, b: 44 } });
  let top = 1e-12; for (const row of F) for (const v of row) top = Math.max(top, Math.abs(v));
  const allPos = F.every((row) => row.every((v) => v > -1e-9));
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
    if (st.shown) { ctx.fillStyle = rgbToCss(allPos ? cmapSeq(F[i][j] / top) : cmapDiv(F[i][j] / top)); ctx.fillRect(X(i), Y(j + 1), X(i + 1) - X(i) + 0.5, Y(j) - Y(j + 1) + 0.5); }
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(Math.round(X(i)) + 0.5, Math.round(Y(j + 1)) + 0.5, Math.round(X(i + 1) - X(i)), Math.round(Y(j) - Y(j + 1)));
  }
  if (st.shown) tag(ctx, `sum of all F = ${minus((sum / Math.PI).toFixed(0))}π`, X(5), Y(10) - 12, { color: c.fg, px: 13.5 });
  return st.shown ? `F of band ${st.band} in each of the 100 squares: a strong colour is a large |F|.` : 'The 10 × 10 squares of the grid. Each square gives one F.';
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'gamma') return drawGamma(ctx, w, h, c, st);
  if (st.kind === 'corner') return drawCorner(ctx, w, h, c);
  if (st.kind === 'grid') return drawGrid(ctx, w, h, c, st);
  return drawBands(ctx, w, h, c, st);
}
void font;

export const chern = { id: 'chern', chip: '3 · Chern number', next: null, steps, draw };
