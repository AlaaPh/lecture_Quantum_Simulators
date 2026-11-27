// The Chern number of the bands of the Thouless pump (pump.js), first from the Zak phase along z, then from the plaquettes.
import { arrow } from '../lecture1/panels.js';
import { cmapDiv, rgbToCss } from '../theme.js';
import { TAU, font, tag, axes, minus, PERIOD_TICKS } from './draw.js';
import { zak, plaquette, chernGrid, gammaCurve, overlapAbs } from './aah.js';
import { drawBands } from './pump.js';
import { CODE } from './code.js';

const PI = Math.PI, STEP = TAU / 10;
const g0 = () => zak(3, 0) / PI, g1 = () => zak(3, PI / 2) / PI;      // γ of band 3 in units of π, M = 50
const ov12 = () => overlapAbs(3, 0, TAU / 50, 0);
const f = (v, d) => minus(v.toFixed(d));
const pic = (o) => () => o;
const ZERO = 'Exactly 0? Then the complex numbers are missing. In Python create the matrix with <code>np.zeros((5, 5), complex)</code>. In the overlap use <code>np.vdot(u, v)</code> or <code>u\'*v</code>.';
const COLUMN = 'This is band 2 or band 4: you took a neighbouring column. Band 3 is <code>V[:, 2]</code> in Python and <code>V(:, 3)</code> in MATLAB.';
const FLIP = 'The sign is reversed. Three things reverse it: +arg instead of −arg; the overlaps written the other way round, ⟨u<sub>s+1</sub>|u<sub>s</sub>⟩; or e<sup>−ik</sup> in the lower left corner of the matrix.';
const AROUND = 'The sign is reversed: you went around the square the other way, or took +arg.';

const steps = [
  { type: 'info', title: 'The Chern number in eight small questions', button: 'Start',
    html: `<p class="step-text">The Chern number of a band is the number of times its Zak phase γ grows by 2π in one period. For the SSH chain, γ followed from one complex number h. Now the Hamiltonian is a 5 × 5 matrix, so take the formula of the lecture:</p>
      <div class="step-formula"><span class="nb">γ = −arg(</span> <span class="nb">⟨u<sub>1</sub>|u<sub>2</sub>⟩ ⟨u<sub>2</sub>|u<sub>3</sub>⟩</span> <span class="nb">… ⟨u<sub>M</sub>|u<sub>1</sub>⟩ )</span></div>
      <p class="step-text">M is the number of values of k. u<sub>s</sub> is the eigenvector of H(k) for one band at <span class="nb">k<sub>s</sub> = 2π(s − 1)/M</span>. arg is the angle of a complex number, between −π and π (Python: <code>np.angle</code>, MATLAB: <code>angle</code>).</p>
      <p class="step-text">You build this formula in two steps: first one overlap, then the whole product.</p>`,
    pic: pic({ kind: 'bands', hi: 3 }) },
  { type: 'number', text: 'The overlap of two vectors u and v is a sum over the five waveguides n, with the complex conjugate of u:',
    formula: '⟨u|v⟩ = Σ u<sub>n</sub>* v<sub>n</sub>',
    extra: '<p class="step-text">Take z = 0 and band 3: the eigenvector of the third eigenvalue, counted from the lowest.</p>',
    ask: 'Calculate the overlap of u₁ (at k = 0) and u₂ (at k = 2π/50). Type its absolute value with four decimals.', label: '|⟨u₁|u₂⟩| =', unit: '', ref: ov12, tol: 0.00012, ph: '0.0000',
    hint: 'Band 3 is the third column of the eigenvectors: <code>V[:, 2]</code> from <code>np.linalg.eigh</code> in Python, <code>V(:, 3)</code> from <code>eig</code> in MATLAB. The overlap is <code>np.vdot(u1, u2)</code> or <code>u1\'*u2</code>. For k ≠ 0 the matrix is complex.',
    how: CODE.overlap, wrongs: [{ ref: 1, tol: 0.00003, text: '1.0000? Then either both vectors are the same (u₂ belongs to k = 2π/50, not to k = 0), or the imaginary part of the matrix is missing: in Python create it with <code>np.zeros((5, 5), complex)</code>.' },
      { ref: () => overlapAbs(4, 0, TAU / 50, 0), tol: 0.00012, text: 'This is band 4. Python counts the columns from 0: band 3 is <code>V[:, 2]</code>.' },
      { ref: () => overlapAbs(2, 0, TAU / 50, 0), tol: 0.00012, text: 'This is band 2. MATLAB counts the columns from 1: band 3 is <code>V(:, 3)</code>.' },
      { ref: 0.997, tol: 0.000001, text: 'Close. Type four decimals.' }],
    after: 'Almost 1: neighbouring eigenvectors are almost the same. The angle of this number depends on the phases your computer gave to u₁ and u₂; its absolute value does not. In the product of the next question these phases cancel.',
    pic: pic({ kind: 'ring', n: 2 }) },
  { type: 'number', text: 'Now all M = 50 values of k: <span class="nb">k<sub>s</sub> = 2π(s − 1)/50</span>. Multiply the 50 overlaps <span class="nb">⟨u₁|u₂⟩ ⟨u₂|u₃⟩ … ⟨u₅₀|u₁⟩</span>. The last one closes the loop.',
    ask: 'Calculate γ = −arg(product) for band 3 at z = 0.', label: 'γ =', unit: 'π', ref: g0, tol: 0.006, mod: 2, ph: '0.00',
    hint: 'Keep the 50 eigenvectors in a list and use the same u₁ at the start and at the end of the product.',
    how: CODE.zak, wrongs: [{ ref: () => -g0(), tol: 0.006, mod: 2, text: FLIP }, { ref: 0, tol: 0.0005, text: ZERO }, { ref: () => zak(2, 0) / PI, tol: 0.006, mod: 2, text: COLUMN }],
    after: () => `γ = ${f(g0(), 2)}π. γ/2π = ${f(g0() / 2, 2)} is the mean position of the light of band 3 at z = 0, counted in unit cells: about half of this light is in one unit cell, half in the next. Only the change of γ matters: γ is an angle and is fixed only up to 2π.`,
    pic: (ok) => (ok ? { kind: 'gamma', dots: 1 } : { kind: 'ring', n: 50 }) },
  { type: 'number', text: 'Go a quarter of a period further: <span class="nb">Ωz = π/2</span>. The five couplings have changed, so the matrix and its eigenvectors have changed too.', ask: 'Calculate γ of band 3 again.', label: 'γ =', unit: 'π', ref: g1, tol: 0.006, mod: 2, ph: '0.00',
    hint: 'Use your program for the couplings with Ωz = π/2. Nothing else changes.',
    how: CODE.zak2, wrongs: [{ ref: () => -g1(), tol: 0.006, mod: 2, text: FLIP }, { ref: g0, tol: 0.006, mod: 2, text: 'This is γ at z = 0 again. Put Ωz = π/2 into the positions of the waveguides.' }, { ref: 0, tol: 0.0005, text: ZERO }, { ref: () => zak(2, PI / 2) / PI, tol: 0.004, mod: 2, text: COLUMN },
      { ref: () => g1() * PI, tol: 0.006, text: 'This is γ in radians. The field is in units of π: divide by π.' }],
    after: () => `γ went from ${f(g0(), 2)}π to ${f(g1(), 2)}π. If the waveguides change slowly, the light of band 3 has moved by (${f(g1(), 2)} + ${(-g0()).toFixed(2)})/2 = ${((g1() - g0()) / 2).toFixed(2)} unit cells.`,
    pic: (ok) => ({ kind: 'gamma', dots: ok ? 2 : 1 }) },
  { type: 'choice', text: 'The picture shows γ/2π of band 3 for the whole period. Your two values are the dots. Your program gives γ only between −π and π; in the picture 2π is added after each jump, so the curve has no jumps.',
    ask: 'By how many unit cells does γ/2π grow in one period?', look: true, options: ['1', '2', '3'], ref: '2',
    hint: 'Read the curve at z = 0 and at z = L and take the difference.',
    after: 'γ/2π grows by 2. This number is the Chern number of band 3: C = 2. It is the number of unit cells the light moved in the part on the Thouless pump.',
    pic: (ok) => ({ kind: 'gamma', dots: 2, curve: true, rise: ok }) },
  { type: 'info', title: 'A second way: 10 × 10 small squares',
    html: `<p class="step-text">Divide k and Ωz, both from 0 to 2π, into 10 steps of 2π/10. This gives 10 × 10 small squares.</p>
      <p class="step-text">Each square gives a small phase F. The Chern number is the sum of all F, divided by 2π.</p>`,
    pic: pic({ kind: 'grid', band: 3, shown: false, first: true }) },
  { type: 'number', text: 'Go around the first square, a → b → c → d → a, and multiply the four overlaps. The picture shows the four corners.',
    formula: '<span class="nb">F = −arg(</span> <span class="nb">⟨u<sub>a</sub>|u<sub>b</sub>⟩ ⟨u<sub>b</sub>|u<sub>c</sub>⟩</span> <span class="nb">⟨u<sub>c</sub>|u<sub>d</sub>⟩ ⟨u<sub>d</sub>|u<sub>a</sub>⟩ )</span>',
    ask: 'Calculate F of band 3 for this square.', label: 'F =', unit: 'π', ref: () => plaquette(3, 0, 0, STEP) / PI, tol: 0.0008, ph: '0.000',
    hint: 'u<sub>a</sub> is the eigenvector of band 3 at k = 0, Ωz = 0; u<sub>b</sub> at k = 0, Ωz = 2π/10; u<sub>c</sub> at k = 2π/10, Ωz = 2π/10; u<sub>d</sub> at k = 2π/10, Ωz = 0.',
    how: CODE.plaquette, wrongs: [{ ref: () => -plaquette(3, 0, 0, STEP) / PI, tol: 0.0008, text: AROUND },
      { ref: () => plaquette(3, 0, 0, STEP), tol: 0.002, text: 'This is F in radians. The field is in units of π: divide by π.' }],
    after: 'F is a phase like γ, for the closed path around one small square. Such a phase is called a Berry phase.', pic: pic({ kind: 'corner' }) },
  { type: 'number', text: 'Calculate F for all 100 squares and add them. For corner a, k and Ωz each take the 10 values <span class="nb">0, 2π/10, …, 9 · 2π/10</span>. At k = 2π and at Ωz = 2π the matrix is the same as at 0.', label: 'sum =', unit: 'π', ref: () => chernGrid(3, 10).sum / PI, tol: 0.01, ph: '0.00',
    hint: 'Take −arg for every square first, then add the 100 values. Do not multiply all overlaps into one product.',
    how: CODE.sum, wrongs: [{ ref: () => -chernGrid(3, 10).sum / PI, tol: 0.01, text: AROUND },
      { ref: 0, tol: 0.01, text: 'You took arg of one product of all overlaps. Take −arg for every square first, then add the 100 values.' },
      { ref: 2, tol: 0.01, text: 'This is already sum/2π. The field asks for the sum in units of π.' },
      { ref: () => chernGrid(3, 10).sum, tol: 0.05, text: 'This is the sum in radians. The field is in units of π: divide by π.' }],
    after: '4π = 2 · 2π. The Chern number is C = sum/2π = 2: the same number as from γ. The sum is a whole number times 2π for any number of squares; 10 × 10 are enough for the right one.',
    pic: (ok) => ({ kind: 'grid', band: 3, shown: ok }) },
  { type: 'number', text: 'Change one thing: band 2 instead of band 3. Add F of all 100 squares again and divide by 2π.', label: 'C =', unit: '', ref: () => chernGrid(2, 10).C, tol: 0.01, ph: '0',
    hint: 'Band 2 is the second column: <code>V[:, 1]</code> in Python, <code>V(:, 2)</code> in MATLAB.',
    how: CODE.band2, wrongs: [{ ref: 3, tol: 0.01, text: AROUND }, { ref: 2, tol: 0.01, text: 'C = 2 belongs to band 3 (and to bands 1 and 5). Band 2 is the second column of the eigenvectors.' },
      { ref: -6, tol: 0.02, text: 'This is the sum in units of π. Divide by 2π: C = sum/2π.' }],
    after: 'Band 2 has C = −3: light of band 2 moves 3 unit cells per period in the other direction, if the period is long enough.',
    pic: (ok) => (ok ? { kind: 'grid', band: 2, shown: true } : { kind: 'bands', hi: 2, chern: [3] }) },
  { type: 'number', text: 'The five bands of this lattice have the Chern numbers 2, −3, 2, −3, 2.', ask: 'Add the five Chern numbers.', label: 'sum =', unit: '', ref: 0, tol: 0.001, ph: '0',
    hint: '2 − 3 + 2 − 3 + 2.', how: '2 − 3 + 2 − 3 + 2 = 0.',
    after: '0, always: the Chern numbers of all bands of such a matrix H(k) add up to zero.', pic: pic({ kind: 'bands', chern: [1, 2, 3, 4, 5], hiAll: true }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">You have calculated the Chern numbers of bands 3 and 2. All five bands of the lattice of the experiment: 2, −3, 2, −3, 2.</p>
      <p class="step-text">In the paper the light is a soliton. At low power it comes from the lowest band, C = 2; the calculation gives 2 unit cells per period. At high power the measurement gives one unit cell in two periods, in the other direction. There bands 1 and 2 act together: (2 − 3)/2 = −1/2.</p>
      <p class="step-text step-end">Jürgensen, Mukherjee, Jörg, Rechtsman, <a href="https://doi.org/10.1038/s41567-022-01871-x" target="_blank" rel="noopener">Nature Physics 19, 420 (2023)</a></p>`,
    pic: pic({ kind: 'bands', chern: [1, 2, 3, 4, 5], hiAll: true }) },
];

// ---------- pictures ----------
function drawGamma(ctx, w, h, c, st) {
  const g = gammaCurve(3), n = g.length - 1;
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 1], ylim: [-0.8, 1.8], xticks: PERIOD_TICKS, yticks: [-0.5, 0, 0.5, 1, 1.5], xlabel: 'z', ylabel: 'γ/2π (unit cells)', grid: [0, 1], pad: { r: st.curve ? 56 : 20 } });
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
  return st.curve ? 'γ/2π of band 3 during one period: the mean position of the light of band 3 in unit cells, if the waveguides change slowly.' : 'γ/2π of band 3 against z. Your values appear as dots.';
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
  const list = ['a = (0, 0)', 'b = (0, 2π/10)', 'c = (2π/10, 2π/10)', 'd = (2π/10, 0)'];      // written as (k, Ωz)
  tag(ctx, 'corners (k, Ωz):', X(1.25), Y(2.45), { color: c['fg-2'], bg: c.surface, px: 12.5, wt: 500, align: 'left' });
  list.forEach((t, i) => tag(ctx, t, X(1.25), Y(2.45) + 18 * (i + 1), { color: c.fg, bg: c.surface, px: 12.5, wt: 500, align: 'left' }));
  tag(ctx, 'F', (X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2, { color: c.psi, px: 17, wt: 600 });
  return 'The lower left corner of the 10 × 10 grid. The first square with its corners a, b, c, d and the direction of the path.';
}

function drawGrid(ctx, w, h, c, st) {
  const { F, sum } = chernGrid(st.band, 10), size = Math.min(w - 78, h - 62), l = Math.max(58, (w - size) / 2 + 14);
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 10], ylim: [0, 10], xticks: [[0, '0'], [5, 'π'], [10, '2π']], yticks: [[0, '0'], [5, 'π'], [10, '2π']], xlabel: 'k', ylabel: 'Ωz', pad: { l, r: w - l - size, t: h - 44 - size, b: 44 } });
  let top = 1e-12; for (const row of F) for (const v of row) top = Math.max(top, Math.abs(v));
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
    if (st.shown) { ctx.fillStyle = rgbToCss(cmapDiv(F[i][j] / top)); ctx.fillRect(X(i), Y(j + 1), X(i + 1) - X(i) + 0.5, Y(j) - Y(j + 1) + 0.5); }
  }
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i <= 10; i++) { ctx.moveTo(Math.round(X(i)) + 0.5, Y(0)); ctx.lineTo(Math.round(X(i)) + 0.5, Y(10)); ctx.moveTo(X(0), Math.round(Y(i)) + 0.5); ctx.lineTo(X(10), Math.round(Y(i)) + 0.5); }
  ctx.stroke();
  if (st.first) { ctx.fillStyle = c.psi; ctx.globalAlpha = 0.85; ctx.fillRect(X(0), Y(1), X(1) - X(0), Y(0) - Y(1)); ctx.globalAlpha = 1; tag(ctx, 'the first square', X(1) + 8, Y(0.5), { color: c.psi, bg: c.surface, px: 12.5, align: 'left' }); }
  if (st.shown) tag(ctx, `sum of all F = ${minus((sum / Math.PI).toFixed(0))}π`, X(5), Y(10) - 12, { color: c.fg, px: 13.5 });
  return st.shown ? `F of band ${st.band} in each of the 100 squares. One colour is F > 0, the other F < 0; a strong colour is a large |F|.` : 'The 10 × 10 squares of the grid. Each square gives one F.';
}

// The M = 50 values of k on a ring (k = 2π is k = 0 again). The first st.n of them are marked and named.
function drawRing(ctx, w, h, c, st) {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36, M = 50, at = (s) => [cx + R * Math.sin((TAU * s) / M), cy - R * Math.cos((TAU * s) / M)];
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  for (let s = 0; s < M; s++) { const [x, y] = at(s), on = s < st.n; ctx.fillStyle = on ? c.hpsi : c['fg-2']; ctx.globalAlpha = on ? 1 : 0.55; ctx.beginPath(); ctx.arc(x, y, on ? (st.n >= M && s > 1 ? 4.2 : 6) : 3.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  tag(ctx, 'u₁,  k = 0', at(0)[0] - 8, at(0)[1] - 18, { color: c.hpsi, px: 13.5, align: 'right' });
  tag(ctx, 'u₂,  k = 2π/50', at(1)[0] + 10, at(1)[1] - 14, { color: c.hpsi, px: 13.5, align: 'left' });
  if (st.n >= M) tag(ctx, 'u₅₀', at(M - 1)[0] - 10, at(M - 1)[1] - 34, { color: c.hpsi, px: 13.5, align: 'right' });
  const [ax, ay] = at(6), [bx, by] = at(8); arrow(ctx, ax + 16, ay, bx + 13, by + 4, c['fg-2'], 1.8, 8);
  tag(ctx, 'k grows', at(8)[0] + 22, at(8)[1] + 6, { color: c['fg-2'], px: 12.5, wt: 500, align: 'left' });
  tag(ctx, '50 values of k', cx, cy - 9, { color: c.fg, px: 14 }); tag(ctx, 'from 0 to 2π', cx, cy + 11, { color: c['fg-2'], px: 12.5, wt: 500 });
  return st.n >= M ? 'The 50 values of k, one eigenvector u at each. The product goes once around: after u₅₀ comes u₁ again.' : 'The 50 values of k. After the last one comes the first again: k = 2π is the same as k = 0.';
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'ring') return drawRing(ctx, w, h, c, st);
  if (st.kind === 'gamma') return drawGamma(ctx, w, h, c, st);
  if (st.kind === 'corner') return drawCorner(ctx, w, h, c);
  if (st.kind === 'grid') return drawGrid(ctx, w, h, c, st);
  return drawBands(ctx, w, h, c, st);
}
void font;

export const chern = { id: 'chern', title: 'Chern number', steps, draw };
