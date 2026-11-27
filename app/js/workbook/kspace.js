// Exercise 3, first part: the SSH chain in k-space (task 8a). The unit cell, the 2 × 2 matrix H(k) with
// h(k) = J₁ + J₂e^{ik}, its eigenvalues ±|h(k)| as two bands, and what the bands do not contain: the edge states.
import { arrow } from '../lecture1/panels.js';
import { TAU, tag, axes, minus, curve, dash, dot } from './draw.js';
import { bandSSH, sshEig } from './lattice.js';
import { CODE } from './code.js';

const PI = Math.PI;
const pic = (o) => () => o;
const f = (v, d) => minus(v.toFixed(d));
const HK = `<div class="step-eq"><span>H(k) =</span><table class="step-matrix" aria-label="The matrix H(k)"><tbody><tr><td>0</td><td>h*</td></tr><tr><td>h</td><td>0</td></tr></tbody></table></div>`;

const steps = [
  { type: 'info', title: 'The SSH chain in k-space in seven small questions', button: 'Start',
    html: `<p class="step-text">A long SSH chain repeats after two waveguides. These two are the unit cell: waveguide A and waveguide B. J₁ couples A and B of one unit cell, J₂ couples B to the A of the next unit cell.</p>
      <p class="step-text">Every unit cell is the same. So a wave with the wavenumber k needs only two numbers, ψ<sub>A</sub> and ψ<sub>B</sub> of one unit cell: in the next unit cell both are multiplied by e<sup>ik</sup>.</p>
      <p class="step-text">The large matrix H then shrinks to a 2 × 2 matrix H(k). Task 8a asks for its eigenvalues.</p>`,
    pic: pic({ kind: 'cells' }) },
  { type: 'choice', text: 'Look at waveguide A of unit cell m in the picture. Inside its unit cell it is coupled to B with J₁.',
    ask: 'To which waveguide is it coupled with J₂?', look: true, options: ['B of unit cell m − 1', 'B of unit cell m + 1', 'A of unit cell m + 1'], ref: 'B of unit cell m − 1',
    hint: 'Follow the thin line that leaves A of unit cell m to the left.',
    after: 'To B of the unit cell before. In a wave this B carries the factor e<sup>−ik</sup>. So the light that comes to A is (J₁ + J₂·e<sup>−ik</sup>) · ψ<sub>B</sub>.',
    pic: (ok) => ({ kind: 'cells', mark: true, link: ok }) },
  { type: 'number', text: 'In the same way the light that comes to B is (J₁ + J₂·e<sup>ik</sup>) · ψ<sub>A</sub>. With h(k) = J₁ + J₂·e<sup>ik</sup> this is the matrix of the wave:', extra: `${HK}<p class="step-text">h* is the complex conjugate of h. The two eigenvalues of this matrix are E = +|h| and E = −|h|.</p>`,
    ask: 'Take J₁ = 2 and J₂ = 1. What is |h| at k = 0?', label: '|h| =', unit: '', ref: 3, tol: 0.006, ph: '0',
    hint: 'e<sup>i·0</sup> = 1.', how: 'h = 2 + 1 · 1 = 3, so |h| = 3.',
    wrongs: [{ ref: 1, tol: 0.006, text: 'This is |h| at k = π. At k = 0 the factor e<sup>ik</sup> is +1.' }],
    after: 'At k = 0 the eigenvalues are +3 and −3. These are the outer edges of the two bands, ±(J₁ + J₂).',
    pic: (ok) => ({ kind: 'bands', J1: 2, J2: 1, at: ok ? [0] : [] }) },
  { type: 'number', text: 'Now the other end of the range of k.', ask: 'What is |h| at k = π, for J₁ = 2 and J₂ = 1?', label: '|h| =', unit: '', ref: 1, tol: 0.006, ph: '0',
    hint: 'e<sup>iπ</sup> = −1.', how: 'h = 2 + 1 · (−1) = 1, so |h| = 1.',
    wrongs: [{ ref: 3, tol: 0.006, text: 'This is |h| at k = 0. At k = π the factor e<sup>ik</sup> is −1.' }],
    after: 'At k = π the eigenvalues are +1 and −1. These are the edges of the gap, ±|J₁ − J₂|.',
    pic: (ok) => ({ kind: 'bands', J1: 2, J2: 1, at: ok ? [0, PI] : [0] }) },
  { type: 'number', text: 'And between the two, at k = π/2: there e<sup>ik</sup> = i, so h = 2 + i.', ask: 'What is |h| at k = π/2?', label: '|h| =', unit: '', ref: Math.sqrt(5), tol: 0.003, ph: '0.000',
    hint: 'The length of a + b·i is √(a² + b²).', how: '|h| = √(2² + 1²) = √5 = 2.236.',
    wrongs: [{ ref: 3, tol: 0.003, text: 'This is 2 + 1. The length of 2 + i is √(2² + 1²).' }, { ref: 5, tol: 0.003, text: 'This is |h|². Take the square root.' }],
    after: 'E = ±2.236. For every k the two eigenvalues are ±|h(k)| = ±√(J₁² + J₂² + 2J₁J₂·cos k): the two curves of the picture.',
    pic: (ok) => ({ kind: 'bands', J1: 2, J2: 1, at: ok ? [0, PI / 2, PI] : [0, PI], curves: ok }) },
  { type: 'number', text: 'Now with your program: build the 2 × 2 matrix H(k) for J₁ = 2, J₂ = 1 and calculate its two eigenvalues.',
    ask: 'Type the lower eigenvalue at k = 2π/3.', label: 'E =', unit: '', ref: () => -bandSSH((2 * PI) / 3, 2, 1), tol: 0.0006, ph: '−0.0000',
    hint: 'The matrix is complex: 0 on the diagonal, h in the lower left corner and its complex conjugate in the upper right corner.',
    how: CODE.kspaceE,
    wrongs: [{ ref: () => bandSSH((2 * PI) / 3, 2, 1), tol: 0.0006, text: 'This is the upper eigenvalue. The field asks for the lower one.' },
      { ref: () => -bandSSH(PI / 3, 2, 1), tol: 0.0006, text: 'This is the value at k = π/3. Take k = 2π/3.' },
      { ref: () => -(2 + Math.exp((2 * PI) / 3)), tol: 0.002, text: 'The i is missing in the exponential: e<sup>ik</sup> is exp(1j*k) in Python and exp(1i*k) in MATLAB.' }],
    after: 'E = −√3 = −1.732. Do this for many k between 0 and 2π and plot both eigenvalues: this is the figure of task 8a.',
    pic: (ok) => ({ kind: 'bands', J1: 2, J2: 1, curves: true, at: ok ? [(2 * PI) / 3] : [], lower: true }) },
  { type: 'choice', text: 'The picture shows the two bands for J₁ = 2, J₂ = 1. The short lines at the right are the 20 eigenvalues of the chain of task 1.',
    ask: 'Do all 20 eigenvalues of the chain lie inside the two bands?', look: true, options: ['Yes', 'No'], ref: 'Yes',
    hint: 'A band reaches from the lowest to the highest point of its curve. Is every short line inside one of these two ranges?',
    after: 'Yes. A chain of 20 waveguides is a piece of the long chain, and its eigenvalues are 20 points of the two bands.',
    pic: pic({ kind: 'bands', J1: 2, J2: 1, curves: true, levels: true }) },
  { type: 'choice', text: 'Now exchange the couplings: J₁ = 1, J₂ = 2. The two bands stay exactly the same, because |h(k)| does not change. The short lines are the 20 eigenvalues of this chain.',
    ask: 'How many of them lie in the gap, outside the bands?', look: true, options: ['0', '2', '10'], ref: '2',
    hint: 'Look for short lines between E = −1 and E = 1. Two that are almost equal are drawn side by side.',
    after: 'Two: the edge states with E = ±0.0015. The bands describe the inside of a long chain and know nothing about its ends. Still the two chains differ inside. The Zak phase shows it.',
    pic: pic({ kind: 'bands', J1: 1, J2: 2, curves: true, levels: true }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">In k-space the SSH chain is one complex number for every wavenumber: h(k) = J₁ + J₂·e<sup>ik</sup>. Its length gives the two bands, E = ±|h(k)|.</p>
      <p class="step-text">The bands are the same for J₁ = 2, J₂ = 1 and for J₁ = 1, J₂ = 2, but only one of the two chains has edge states.</p>
      <p class="step-text">Next: the Zak phase, first by hand from h(k).</p>`,
    pic: pic({ kind: 'bands', J1: 1, J2: 2, curves: true, levels: true }) },
];

// ---------- pictures ----------
// three unit cells of the long chain
function drawCells(ctx, w, h, c, st) {
  const y = h * 0.42, cellW = (w - 36) / 3, x0 = 18, xa = (m) => x0 + cellW * (m + 0.26), xb = (m) => x0 + cellW * (m + 0.74), names = ['m − 1', 'm', 'm + 1'];
  for (let m = 0; m < 3; m++) {
    ctx.fillStyle = c['surface-2']; ctx.fillRect(x0 + cellW * m + 5, y - 46, cellW - 10, 92);
    tag(ctx, `unit cell ${names[m]}`, x0 + cellW * (m + 0.5), y + 62, { color: c['fg-2'], px: 12.5, wt: 500 });
  }
  ctx.strokeStyle = c['fg-2'];
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xa(0), y); ctx.moveTo(xb(2), y); ctx.lineTo(w - 18, y); ctx.stroke();
  for (let m = 0; m < 3; m++) {
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(xa(m), y); ctx.lineTo(xb(m), y); ctx.stroke(); tag(ctx, 'J₁', (xa(m) + xb(m)) / 2, y - 16, { color: c.fg, px: 13 });
    if (m < 2) { const on = st.link && m === 0; ctx.strokeStyle = on ? c.hpsi : c['fg-2']; ctx.lineWidth = on ? 3 : 1.6; ctx.beginPath(); ctx.moveTo(xb(m), y); ctx.lineTo(xa(m + 1), y); ctx.stroke(); ctx.strokeStyle = c['fg-2']; tag(ctx, 'J₂', (xb(m) + xa(m + 1)) / 2, y - 16, { color: on ? c.hpsi : c.fg, px: 13 }); }
  }
  for (let m = 0; m < 3; m++) {
    dot(ctx, xa(m), y, 10, c.v[0]); tag(ctx, 'A', xa(m), y + 26, { color: c.fg, px: 13 });
    dot(ctx, xb(m), y, 10, c.v[1]); tag(ctx, 'B', xb(m), y + 26, { color: c.fg, px: 13 });
  }
  if (st.mark) { ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(xa(1), y, 16, 0, TAU); ctx.stroke(); }
  if (st.link) { ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(xb(0), y, 16, 0, TAU); ctx.stroke(); arrow(ctx, xb(0) + 4, y - 62, xa(1) - 4, y - 62, c.hpsi, 2.2, 8); tag(ctx, 'J₂ · e^(−ik)', (xb(0) + xa(1)) / 2, y - 78, { color: c.hpsi, px: 13 }); }
  return `Three unit cells of the long chain, each with a waveguide A and a waveguide B. Thick line: J₁ inside a unit cell. Thin line: J₂ between two unit cells.${st.mark ? ' The ring marks A of unit cell m.' : ''}`;
}

// the two bands E = ±√(Δ² + |h(k)|²) for k from 0 to 2π, and at the right the eigenvalues of a chain as short lines
export function drawBands(ctx, w, h, c, st) {
  const D = st.D || 0, E = (k) => bandSSH(k, st.J1, st.J2, D), top = st.J1 + st.J2 + 0.6, wide = st.levels ? 1.1 : 0.15;
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, TAU + wide], ylim: [-top, top], xticks: [[0, '0'], [PI / 2, 'π/2'], [PI, 'π'], [1.5 * PI, '3π/2'], [TAU, '2π']], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'wavenumber k', ylabel: 'E', grid: [0] });
  if (st.curves) { curve(ctx, X, Y, (k) => E(k), 0, TAU, c.psi, 2.6); curve(ctx, X, Y, (k) => -E(k), 0, TAU, c.psi, 2.6); }
  for (const k of st.at || []) {
    for (const s of st.lower ? [-1] : [1, -1]) { dot(ctx, X(k), Y(s * E(k)), 5.5, c.hpsi); tag(ctx, f(s * E(k), Number.isInteger(E(k)) ? 0 : 3), X(k) + (k > 4 ? -9 : 9), Y(s * E(k)) + (s > 0 ? -11 : 12), { color: c.hpsi, px: 12.5, align: k > 4 ? 'right' : 'left', bg: c.surface }); }
  }
  if (st.levels) {
    const lv = sshEig(st.N || 20, st.J1, st.J2, D).values, lo = E(PI), x1 = X(TAU) + 14, x2 = X(TAU + wide) - 4;
    dash(ctx, X(TAU) + 5, Y(top), X(TAU) + 5, Y(-top), c.line, 1);
    const inGap = lv.filter((v) => Math.abs(v) < lo - 1e-6), twin = inGap.length === 2 && Math.abs(Y(inGap[0]) - Y(inGap[1])) < 4, mid = (x1 + x2) / 2;
    for (const v of lv) {
      const gap = inGap.includes(v); ctx.strokeStyle = gap ? c.hpsi : c.fg; ctx.lineWidth = gap ? 2.6 : 1.6; ctx.beginPath();
      // two eigenvalues that would lie on top of each other are drawn side by side
      if (gap && twin) { const left = v === inGap[0]; ctx.moveTo(left ? x1 : mid + 3, Y(v)); ctx.lineTo(left ? mid - 3 : x2, Y(v)); } else { ctx.moveTo(x1, Y(v)); ctx.lineTo(x2, Y(v)); }
      ctx.stroke();
    }
    tag(ctx, 'chain', (x1 + x2) / 2, Y(top) + 9, { color: c['fg-2'], px: 12, wt: 500 });
  }
  if (st.level != null) { dash(ctx, X(0), Y(st.level), X(TAU), Y(st.level), c.hpsi, 2); tag(ctx, `edge state: E = ${f(st.level, 1)}`, X(PI), Y(st.level) - 11, { color: c.hpsi, px: 12.5, bg: c.surface }); }
  return `${st.curves ? `The two bands for J₁ = ${st.J1}, J₂ = ${st.J2}${D ? `, Δ = ${D}` : ''}: the eigenvalues of H(k) for every wavenumber k.` : 'The eigenvalues of H(k), E = +|h| and E = −|h|, at the values of k that you have calculated.'}${st.levels ? ` At the right: the ${st.N || 20} eigenvalues of the chain as short lines.${st.J2 > st.J1 ? ' Orange: in the gap; two that are almost equal are drawn side by side.' : ''}` : ''}`;
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'cells') return drawCells(ctx, w, h, c, st);
  return drawBands(ctx, w, h, c, st);
}

export const kspace = { id: 'kspace', title: 'k-space (task 8a)', steps, draw };
