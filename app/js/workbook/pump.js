// Part 2: a Thouless pump. The lattice of Jürgensen, Mukherjee, Jörg and Rechtsman, Nature Physics 19, 420 (2023):
// five waveguides per unit cell, the couplings change along z because the waveguides are not straight.
import { cmapSeq, rgbToCss } from '../theme.js';
import { TAU, font, tag, axes, minus, PERIOD_TICKS } from './draw.js';
import { D, DELTA, xPos, couplings, eig, bandEdges, pumpRun, PUMP } from './aah.js';
import { CODE } from './code.js';

const x2 = xPos(2, 0), s12 = x2 - xPos(1, 0), J = couplings(0);
const f = (v, d) => minus(v.toFixed(d));
const E00 = () => eig(0, 0).values;
const pic = (o) => () => o;
const MATRIX = `<table class="step-matrix" aria-label="The 5 by 5 matrix H(k)"><tbody>
  <tr><td>0</td><td>J₁</td><td>0</td><td>0</td><td>J₅e<sup>−ik</sup></td></tr>
  <tr><td>J₁</td><td>0</td><td>J₂</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>J₂</td><td>0</td><td>J₃</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>J₃</td><td>0</td><td>J₄</td></tr>
  <tr><td>J₅e<sup>ik</sup></td><td>0</td><td>0</td><td>J₄</td><td>0</td></tr></tbody></table>`;

const steps = [
  { type: 'info', title: 'A Thouless pump in eight small questions', button: 'Start',
    html: `<p class="step-text">This is the lattice of an experiment: Jürgensen, Mukherjee, Jörg, Rechtsman, Nature Physics 19, 420 (2023).</p>
      <p class="step-text">The waveguides are not straight. Along z each one moves a little to the left and to the right. Waveguide n (n = 1, 2, 3, …) is at the position</p>
      <div class="step-formula">x<sub>n</sub>(z) = n·d + δ·cos(Ωz + 4πn/5 − 3π/10)</div>
      <p class="step-text">with d = 17.25 μm and δ = 1 μm. z is the distance along the waveguides; it plays the role of time. Ω = 2π/L, where L is the length of one period.</p>`,
    pic: pic({ kind: 'guides' }) },
  { type: 'number', text: 'Take z = 0. Waveguide 1 is at x₁ = 17.25 μm, because its angle is 4π/5 − 3π/10 = 90° and cos 90° = 0. Where is waveguide 2? Its angle is 8π/5 − 3π/10 = 234°.',
    formula: 'x₂ = 2 · 17.25 μm + 1 μm · cos 234°', label: 'x₂ =', unit: 'μm', ref: x2, tol: 0.02, ph: '00.00',
    hint: 'cos 234° = −0.588.', how: 'x₂ = 34.5 − 0.588 = 33.91 μm.',
    wrongs: [{ ref: 2 * D + DELTA * Math.cos(234), tol: 0.02, text: 'Your calculator is set to radians. 234 is in degrees.' },
      { ref: 2 * D + 0.588, tol: 0.02, text: 'Check the sign: cos 234° is negative.' }],
    after: 'Waveguide 2 has moved 0.59 μm toward waveguide 1.', pic: (ok) => ({ kind: 'chain', x: ok ? 2 : 1 }) },
  { type: 'number', text: 'How far apart are waveguides 1 and 2 at z = 0?', formula: 's = x₂ − x₁', label: 's =', unit: 'μm', ref: s12, tol: 0.02, ph: '00.00',
    hint: '33.91 − 17.25.', how: 's = 33.91 − 17.25 = 16.66 μm.',
    after: '16.66 μm: closer than the average distance d = 17.25 μm.', pic: (ok) => ({ kind: 'chain', x: 2, s: ok ? 2 : 1 }) },
  { type: 'number', text: 'The coupling J tells how fast light passes from one waveguide to its neighbour, per millimetre of z. Two waveguides couple more strongly when they are closer. In the experiment the coupling was measured as',
    formula: 'J(s) = 6.672 mm<sup>−1</sup> · e<sup>−0.2348 · s</sup> <small>(s in μm)</small>',
    ask: 'Calculate the coupling J₁ between waveguides 1 and 2.', label: 'J₁ =', unit: 'mm⁻¹', ref: J[0], tol: 0.003, ph: '0.000',
    hint: '0.2348 · 16.66 = 3.912 and e<sup>−3.912</sup> = 0.0200.', how: 'J₁ = 6.672 · 0.0200 = 0.133 mm⁻¹.',
    after: 'The picture shows the next four couplings as well, calculated in the same way. A thick line is a strong coupling.', pic: (ok) => (ok ? { kind: 'chain', J: 3 } : { kind: 'chain', s: 2, J: 1 }) },
  { type: 'choice', text: `The couplings at z = 0, from left to right: ${J.map((v) => v.toFixed(3)).join(', ')}, and then the same five again.`,
    ask: 'After how many waveguides does the lattice repeat for the first time?', options: ['2', '5', '10'], ref: '5',
    hint: 'Add 5 to n in the cosine: 4π(n + 5)/5 = 4πn/5 + 4π. The cosine is the same.',
    after: 'The unit cell has 5 waveguides. Five waveguides per cell give five bands.', pic: (ok) => ({ kind: 'chain', n: 10, J: 2, cells: ok }) },
  { type: 'number', text: 'Now write a short code, in Python or MATLAB. It calculates the five couplings J₁ … J₅ for any z, in the two steps you have just done by hand: the positions x₁ … x₆, then J(s) for each pair of neighbours. At z = 0 it must give the five numbers of the picture.',
    ask: 'Then take a quarter of a period, Ωz = π/2. What is J₃ now?', label: 'J₃ =', unit: 'mm⁻¹', ref: () => couplings(Math.PI / 2)[2], tol: 0.0006, ph: '0.000',
    hint: 'J₃ couples waveguides 3 and 4. In the positions the angle is now π/2 + 4πn/5 − 3π/10.', how: CODE.couplings,
    wrongs: [{ ref: J[2], tol: 0.0006, text: 'This is J₃ at z = 0. Put Ωz = π/2 into the positions.' },
      { ref: () => couplings(Math.PI / 2)[1], tol: 0.0006, text: 'This is J₂. J₃ couples waveguides 3 and 4.' }, { ref: () => couplings(Math.PI / 2)[3], tol: 0.0006, text: 'This is J₄. J₃ couples waveguides 3 and 4.' },],
    after: () => `At Ωz = π/2 the five couplings are ${couplings(Math.PI / 2).map((v) => v.toFixed(3)).join(', ')} mm⁻¹. The strong coupling has moved.`,
    pic: pic({ kind: 'chain', J: 3 }) },
  { type: 'info', title: 'The Hamiltonian of one unit cell',
    html: `<p class="step-text">Light in the lattice is a wave with a wavenumber k: from one unit cell to the next its phase grows by k. k has no unit and runs from 0 to 2π.</p>
      <p class="step-text">For each k the five waveguides of one unit cell give a 5 × 5 matrix H:</p>${MATRIX}
      <p class="step-text">J₁ … J₄ couple neighbours inside the cell. J₅ couples waveguide 5 with waveguide 1 of the next cell. It carries the phase e<sup>±ik</sup> and stands in the two corners.</p>`,
    pic: pic({ kind: 'chain', J: 3, cells: true, names: true }) },
  { type: 'number', text: 'Write this matrix in your code, as a function of k and Ωz. You need it again in part 3.', extra: MATRIX,
    ask: 'Take z = 0 and k = 0 and calculate the five eigenvalues.', label: 'lowest eigenvalue =', unit: 'mm⁻¹', ph: '−0.000',
    ref: () => E00()[0], tol: 0.0015,
    hint: 'For k = 0 both corners are just J₅. The lowest eigenvalue is the most negative one.',
    how: CODE.matrix,
    wrongs: [{ ref: () => eig(0, 0, { corners: false }).values[0], tol: 0.0015, text: 'The two corners of the matrix are missing: J₅ couples waveguide 5 with waveguide 1 of the next cell.' },
      { ref: () => -E00()[4], tol: 0.0015, text: 'This is the lowest eigenvalue of −H. The matrix on this page has +J.' },
      { ref: () => E00()[4], tol: 0.0015, text: 'This is the highest eigenvalue. The field asks for the lowest, the most negative one.' },
      { ref: () => E00()[2], tol: 0.0015, text: 'This is the eigenvalue closest to zero. The field asks for the lowest, the most negative one.' }],
    after: () => `The five eigenvalues at k = 0: ${E00().map((v) => f(v, 3)).join(', ')} mm⁻¹. One for each band. They play the role of the energy.`,
    pic: pic({ kind: 'chain', J: 3, cells: true, names: true }) },
  { type: 'choice', text: 'The picture shows the five bands during one period. Each shaded stripe is one band: at each z it holds the eigenvalues for all k.',
    ask: 'Does band 3, the middle one, touch another band?', look: true, options: ['Yes', 'No'], ref: 'No',
    hint: 'Look above and below band 3: is there a gap at every z?',
    after: 'No. Band 3 has a gap on both sides. If the waveguides change slowly along z, light of band 3 stays in band 3. Bands 1 and 2 almost touch: that is why this part uses band 3.',
    pic: pic({ kind: 'bands', hi: 3 }) },
  { type: 'choice', text: `At z = 0 the light is in a few waveguides in the middle of the chain. It is prepared so that it contains only eigenstates of band 3. The picture shows it during one period, L = ${PUMP.L} mm. The line is the centre of the light: its mean position.`,
    ask: 'About how many unit cells has the centre moved at the end of the period?', look: true, options: ['0', '1', '2', '3'], ref: '2',
    hint: 'Read the line at the bottom (z = 0) and at the top (z = L). One step of the scale is one unit cell = 5 waveguides.',
    after: () => `2 unit cells = 10 waveguides (${pumpRun().shift.toFixed(2)} here, because the period is not infinitely long). The light also spreads. Why 2? The next part gives the answer: the Chern number.`,
    pic: (ok) => ({ kind: 'pump', answer: ok }) },
  { type: 'info', title: 'Part 2 is done', end: true,
    html: '<p class="step-text">In one period the light of band 3 moved by 2 unit cells. Transport by a whole number of unit cells per period is called a Thouless pump.</p><p class="step-text">Next: why exactly 2? You calculate the Chern number of band 3.</p>',
    pic: pic({ kind: 'pump', answer: true }) },
];

// ---------- pictures ----------
function drawGuides(ctx, w, h, c) {
  const A = 4, { X, Y } = axes(ctx, c, w, h, { xlim: [0.35 * D, 10.65 * D], ylim: [0, 1], yticks: PERIOD_TICKS, ylabel: 'z', xlabel: 'position x', pad: { t: 30, l: 50 } });
  for (let n = 1; n <= 10; n++) {
    ctx.strokeStyle = c.psi; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const t = i / 80, x = n * D + A * DELTA * Math.cos(TAU * t + (4 * Math.PI * n) / 5 - 0.3 * Math.PI); if (i) ctx.lineTo(X(x), Y(t)); else ctx.moveTo(X(x), Y(t)); }
    ctx.stroke();
    tag(ctx, String(n), X(n * D + A * DELTA * Math.cos((4 * Math.PI * n) / 5 - 0.3 * Math.PI)), Y(1) - 12, { color: c.fg, px: 12.5 });
  }
  return 'Ten waveguides seen from above, during one period. Light runs upward. The shift to the left and right (δ = 1 μm) is drawn 4 times larger than it is.';
}

// The chain at z = 0 at its true distances. st.n waveguides are shown (6: one unit cell and the first waveguide of the
// next one; 10: two unit cells). st.x, st.s: the position and the distance of question 1 and 2 (1 asked, 2 known);
// st.J: 0 thin lines, 1 "J₁ = ?", 2 the thickness, 3 the thickness and the values; st.names: J₁ … J₅; st.cells: unit cells.
const JLIM = [0.074, 0.182];
function drawChain(ctx, w, h, c, st) {
  const N = st.n || 6, pad = 30, x0 = xPos(1, 0) - 6, x1 = xPos(N, 0) + 6, X = (x) => pad + ((x - x0) / (x1 - x0)) * (w - 2 * pad), y = h * 0.5, r = N > 6 && w < 380 ? 7 : 10;
  const xs = []; for (let n = 1; n <= N; n++) xs.push(xPos(n, 0));
  if (st.cells) for (let m = 0; 5 * m + 4 < N; m++) {
    const a = X(xs[5 * m]) - r - 7, b = X(xs[5 * m + 4]) + r + 7;
    ctx.fillStyle = c['surface-2']; ctx.fillRect(a, y - 100, b - a, 146);
    tag(ctx, 'unit cell', (a + b) / 2, y - 85, { color: c['fg-2'], px: 12.5, wt: 500 });
  }
  for (let n = 1; n < N; n++) {                    // the coupling J_n between waveguide n and n + 1
    const Jn = J[(n - 1) % 5], wd = 1.5 + (7 * (Jn - JLIM[0])) / (JLIM[1] - JLIM[0]), xm = (X(xs[n - 1]) + X(xs[n])) / 2;
    ctx.strokeStyle = c['fg-2']; ctx.lineWidth = st.J >= 2 ? wd : 1.5; ctx.beginPath(); ctx.moveTo(X(xs[n - 1]), y); ctx.lineTo(X(xs[n]), y); ctx.stroke();
    if (st.J === 3) tag(ctx, Jn.toFixed(3), xm, y - 26, { color: c.fg, px: 12.5, wt: 500 });
    else if (st.J === 1 && n === 1) tag(ctx, 'J₁ = ?', xm, y - 50, { color: c.hpsi, px: 13.5 });
    if (st.names && n <= 5) tag(ctx, `J${'₁₂₃₄₅'[n - 1]}`, xm, y - 52, { color: c.psi, px: 14.5 });
  }
  for (let n = 1; n <= N; n++) {
    ctx.fillStyle = c.psi; ctx.beginPath(); ctx.arc(X(xs[n - 1]), y, r, 0, TAU); ctx.fill();
    tag(ctx, String(n), X(xs[n - 1]), y + 27, { color: c.fg, px: 13.5 });
  }
  if (st.x) {
    tag(ctx, 'x₁ = 17.25 μm', X(xs[0]) - r, y + 56, { color: c['fg-2'], px: 13, wt: 500, align: 'left' });
    tag(ctx, st.x === 2 ? `x₂ = ${x2.toFixed(2)} μm` : 'x₂ = ?', X(xs[1]) - r, y + 78, { color: st.x === 2 ? c['fg-2'] : c.hpsi, px: 13, wt: st.x === 2 ? 500 : 600, align: 'left' });
  }
  if (st.s) {                                      // the distance of waveguides 1 and 2
    const a = X(xs[0]), b = X(xs[1]), yy = y - 26;
    ctx.strokeStyle = c.hpsi; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a, yy + 5); ctx.lineTo(a, yy - 5); ctx.moveTo(a, yy); ctx.lineTo(b, yy); ctx.moveTo(b, yy + 5); ctx.lineTo(b, yy - 5); ctx.stroke();
    tag(ctx, st.s === 2 ? `s = ${s12.toFixed(2)} μm` : 's = ?', (a + b) / 2, yy - 16, { color: c.hpsi, px: 13 });
  }
  const what = N > 6 ? 'The first ten waveguides at z = 0' : 'Waveguides 1 to 6 at z = 0', dist = ', at their true distances.';
  return st.J === 3 ? `${what} with the couplings in mm⁻¹. A thick line is a strong coupling.` : st.J === 2 ? `${what}. A thick line is a strong coupling.` : what + dist;
}

export function drawBands(ctx, w, h, c, st) {
  const E = bandEdges(), nz = E.length - 1, { X, Y } = axes(ctx, c, w, h, { xlim: [0, 1], ylim: [-0.275, 0.275], xticks: PERIOD_TICKS, yticks: [-0.2, -0.1, 0, 0.1, 0.2], xlabel: 'z', ylabel: 'eigenvalue (mm⁻¹)', pad: { r: st.chern ? 62 : 58, l: 58 } });
  for (let b = 0; b < 5; b++) {
    const on = st.hi === b + 1 || (st.hiAll && st.chern && st.chern.includes(b + 1));
    ctx.save(); ctx.fillStyle = on ? c.psi : c['fg-2']; ctx.globalAlpha = on ? 0.9 : 0.4; ctx.beginPath();
    for (let i = 0; i <= nz; i++) { const x = X(i / nz), y = Y(E[i].hi[b]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    for (let i = nz; i >= 0; i--) ctx.lineTo(X(i / nz), Y(E[i].lo[b]) + 1);
    ctx.closePath(); ctx.fill(); ctx.restore();
    const ym = Y((E[nz].lo[b] + E[nz].hi[b]) / 2), CH = [2, -3, 2, -3, 2];
    const txt = st.chern && st.chern.includes(b + 1) ? `C = ${minus(CH[b])}` : `band ${b + 1}`;
    tag(ctx, txt, X(1) + 7, ym, { color: on ? c.psi : c['fg-2'], px: 12, wt: on ? 600 : 500, align: 'left' });
  }
  return st.chern ? 'The five bands during one period, with the Chern numbers you have calculated.' : 'The five bands during one period. For every z the shaded stripe holds the eigenvalues for all k.';
}

function drawPump(ctx, w, h, c, st) {
  const { rec, L, shift } = pumpRun(), rows = rec.length - 1, X0 = rec[0].X;
  const u0 = -4.5, u1 = 6.5;                       // window in unit cells, counted from the start of the centre
  const { X, Y } = axes(ctx, c, w, h, { xlim: [u0, u1], ylim: [0, L], xticks: [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], yticks: [0, 25, 50, 75, 100].filter((v) => v <= L), xlabel: 'distance from the start (unit cells)', ylabel: 'z (mm)', pad: { l: 50, t: 14 } });
  const N = rec[0].I.length, pos = (i) => (i + 0.5) / 5 - 0.5 - X0;      // waveguide i (0-based): its place on the scale
  let top = 0; for (const r of rec) for (let i = 0; i < N; i++) top = Math.max(top, r.I[i]);
  const dy = Math.abs(Y(L / rows) - Y(0));
  for (let r = 0; r < rows; r++) for (let i = 0; i < N; i++) {
    const u = pos(i); if (u < u0 - 0.1 || u > u1 + 0.1) continue;
    const xa = Math.max(X(u0), X(u - 0.1)), xb = Math.min(X(u1), X(u + 0.1));
    ctx.fillStyle = rgbToCss(cmapSeq(Math.pow(rec[r].I[i] / top, 0.55))); ctx.fillRect(xa, Y(((r + 1) * L) / rows), xb - xa + 0.6, dy + 0.6);
  }
  ctx.save(); ctx.strokeStyle = c.grid; ctx.globalAlpha = 0.55; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  for (let u = -4; u <= 6; u++) { ctx.beginPath(); ctx.moveTo(Math.round(X(u)) + 0.5, Y(0)); ctx.lineTo(Math.round(X(u)) + 0.5, Y(L)); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
  rec.forEach((r, i) => { const x = X(r.X - X0), y = Y(r.z); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
  for (const r of [rec[0], rec[rows]]) { ctx.fillStyle = c.hpsi; ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(r.X - X0), Y(r.z), 5.5, 0, TAU); ctx.fill(); ctx.stroke(); }
  if (st.answer) tag(ctx, `${shift.toFixed(2)} unit cells`, X(shift) + 9, Y(L) + 13, { color: c.hpsi, bg: c.surface, px: 12.5, align: 'left' });
  return 'The light in the waveguides during one period: a strong colour means much light. Orange line: the centre of the light. One step of the scale is one unit cell, 5 waveguides.';
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'guides') return drawGuides(ctx, w, h, c);
  if (st.kind === 'chain') return drawChain(ctx, w, h, c, st);
  if (st.kind === 'bands') return drawBands(ctx, w, h, c, st);
  return drawPump(ctx, w, h, c, st);
}

export const pump = { id: 'pump', chip: '2 · Thouless pump', next: 'the Chern number', steps, draw };
