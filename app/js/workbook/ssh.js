// Exercise 2, third part: the SSH chain in real space. Task 1 (20 waveguides, J₁ = 2, J₂ = 1: two bands and a gap,
// how the eigenvectors of the two bands differ) and task 2 (21 waveguides: the state with E = 0 at one end).
import { arrow } from '../lecture1/panels.js';
import { TAU, tag, axes, minus, dash, dot, bars, pairPicture } from './draw.js';
import { sshEig, chainEig, smallestPositive } from './lattice.js';
import { CODE } from './code.js';

const pic = (o) => () => o;
const f = (v, d) => minus(v.toFixed(d));
const low20 = () => smallestPositive(sshEig(20, 2, 1).values);            // 1.0667
const up = (v) => { const m = v.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0); return m < 0 ? v.map((x) => -x) : v; };   // largest component positive
const MATRIX = '<div class="step-eq"><span>H =</span><table class="step-matrix" aria-label="The matrix H of one pair"><tbody><tr><td>0</td><td>2</td></tr><tr><td>2</td><td>0</td></tr></tbody></table></div>';

const steps = [
  { type: 'info', title: 'The SSH chain in nine small questions', button: 'Start',
    html: `<p class="step-text">Now the couplings alternate along the chain: J₁, J₂, J₁, J₂, … Waveguides 1 and 2 are coupled with J₁, waveguides 2 and 3 with J₂, and so on. This is the SSH chain.</p>
      <p class="step-text">Task 1 takes 20 waveguides with J₁ = 2 and J₂ = 1. Task 2 takes 21 waveguides.</p>`,
    pic: pic({ kind: 'bonds', n: 20, J1: 2, J2: 1 }) },
  { type: 'number', text: 'Start with one pair alone: two waveguides with the coupling <span class="nb">J₁ = 2.</span> As for two waveguides in task 0, try <span class="nb">ψ = (1, 1)</span> and <span class="nb">ψ = (1, −1):</span> for each, <span class="nb">Hψ = E·ψ.</span>', extra: MATRIX,
    ask: 'Type the higher of the two eigenvalues E.', label: 'E =', unit: '', ref: 2, tol: 0.006,
    hint: 'For ψ = (1, 1): row 1 of Hψ is 0·1 + 2·1 = 2, and row 2 is 2·1 + 0·1 = 2.', how: 'H(1, 1) = (2, 2) = 2 · (1, 1), so E = 2. H(1, −1) = (−2, 2) = −2 · (1, −1), so E = −2.',
    wrongs: [{ ref: -2, tol: 0.006, text: 'This is the lower one. It belongs to ψ = (1, −1).' }, { ref: 1, tol: 0.006, text: 'With the coupling 2 the matrix has the number 2 next to the diagonal: H(1, 1) = (2, 2).' }],
    after: 'One pair has the eigenvalues +J₁ = 2 for (1, 1) and −J₁ = −2 for (1, −1). In the chain the weaker coupling J₂ = 1 connects the pairs.',
    pic: (ok) => ({ kind: 'pair', solved: ok }) },
  { type: 'number', text: 'Task 1 with your program: 20 waveguides. J₁ = 2 couples 1–2, 3–4, … and J₂ = 1 couples 2–3, 4–5, … Calculate the 20 eigenvalues.',
    ask: 'Type the smallest positive eigenvalue.', label: 'E =', unit: '', ref: low20, tol: 0.0006, ph: '0.0000',
    hint: 'Next to the diagonal the matrix has the 19 numbers 2, 1, 2, 1, …, 2.',
    how: CODE.sshE,
    wrongs: [{ ref: () => smallestPositive(sshEig(20, 1, 2).values), tol: 0.0006, text: 'This is the chain with J₁ = 1 and J₂ = 2. The first coupling, between waveguides 1 and 2, must be 2.' },
      { ref: () => smallestPositive(sshEig(21, 2, 1).values), tol: 0.0006, text: 'This is the chain of 21 waveguides. Task 1 has 20.' },
      { ref: () => smallestPositive(chainEig(20).values), tol: 0.0006, text: 'All couplings are 1 in your matrix. They alternate: 2, 1, 2, 1, …' },
      { ref: () => 2 * smallestPositive(chainEig(20).values), tol: 0.0006, text: 'All couplings are 2 in your matrix. They alternate: 2, 1, 2, 1, …' },
      { ref: () => sshEig(20, 2, 1).values[19], tol: 0.0006, text: 'This is the highest eigenvalue. The field asks for the smallest positive one.' }],
    after: () => `The 20 eigenvalues form two groups: 10 below ${f(-low20(), 3)} and 10 above +${f(low20(), 3)}. Between them is a gap without any eigenvalue.`,
    pic: (ok) => ({ kind: 'levels', N: 20, J1: 2, J2: 1, shown: ok }) },
  { type: 'number', text: 'In a long chain the lower group fills a band from −(J₁ + J₂) to −|J₁ − J₂|, and the upper group a band from |J₁ − J₂| to J₁ + J₂. Between the two bands is the gap.',
    ask: 'How wide is the gap of the long chain for J₁ = 2 and J₂ = 1?', label: 'gap =', unit: '', ref: 2, tol: 0.006,
    hint: 'The gap reaches from −|J₁ − J₂| to +|J₁ − J₂|.', how: 'From −1 to +1: the gap is 2 · |2 − 1| = 2 wide.',
    wrongs: [{ ref: 1, tol: 0.006, text: 'This is |J₁ − J₂|, half of the gap. The gap reaches from −1 to +1.' }, { ref: 6, tol: 0.006, text: 'This is the distance of the two outer band edges, −3 and 3. The gap is the empty range in the middle.' },
      { ref: () => 2 * low20(), tol: 0.006, text: 'This is the gap between your 20 eigenvalues. The question asks for the long chain: there the gap reaches from −|J₁ − J₂| to +|J₁ − J₂|.' }],
    after: () => `The gap is 2 wide, from −1 to 1. Your smallest positive eigenvalue, ${f(low20(), 3)}, lies just above its edge; in a longer chain it comes closer to 1.`,
    pic: (ok) => ({ kind: 'levels', N: 20, J1: 2, J2: 1, shown: true, gap: ok }) },
  { type: 'choice', text: 'Task 1 asks how the eigenvectors of the two bands differ. The picture shows two of the 20 eigenvectors: the one with the lowest and the one with the highest eigenvalue. The grey stripes mark the pairs that are coupled with J₁ = 2.',
    ask: 'In which of the two do the two waveguides of a pair have opposite signs?', look: true, options: ['lowest eigenvalue', 'highest eigenvalue', 'in both'], ref: 'lowest eigenvalue',
    hint: 'Compare the two bars inside one grey stripe: do they point the same way?',
    after: 'This is the difference. In the lower band the two waveguides of a strongly coupled pair have opposite signs, as in (1, −1) with E = −J₁. In the upper band they have the same sign, as in (1, 1) with E = +J₁. Exceptions are a few pairs next to a zero of the eigenvector.',
    pic: pic({ kind: 'two' }) },
  { type: 'number', text: 'Task 2: one waveguide more. Take 21 waveguides with J₁ = 2 and J₂ = 1, calculate the 21 eigenvalues and sort them, the lowest first.',
    ask: 'Type eigenvalue number 11, the one in the middle. (If your program prints a number like 2e-16, that is 0.)', label: 'E =', unit: '', ref: 0, tol: 0.0006, ph: '0.0000',
    hint: 'Use the same lines as for task 1, with 21 in place of 20. Number 11 is E[10] in Python and E(11) in MATLAB.',
    how: CODE.sshOdd,
    wrongs: [{ ref: () => sshEig(21, 2, 1).values[11], tol: 0.0006, text: 'This is eigenvalue number 12. Number 11 is E[10] in Python and E(11) in MATLAB.' },
      { ref: () => sshEig(21, 2, 1).values[9], tol: 0.0006, text: 'This is eigenvalue number 10. Number 11 is E[10] in Python and E(11) in MATLAB.' },
      { ref: low20, tol: 0.0006, text: 'This is the chain of 20 waveguides. Task 2 has 21.' }],
    after: 'E = 0, in the middle of the gap. The other 20 eigenvalues lie in the two bands, 10 in each.',
    pic: (ok) => ({ kind: 'levels', N: 21, J1: 2, J2: 1, shown: ok, gap: true, mark: ok ? [10] : [] }) },
  { type: 'number', text: 'The eigenvector of E = 0 can be found by hand. Hψ = 0 means that every row of Hψ is zero. Row 2 reads',
    formula: 'J<sub>1</sub> · ψ<sub>1</sub> + J<sub>2</sub> · ψ<sub>3</sub> = 0', ask: 'With J₁ = 2 and J₂ = 1: what is ψ₃/ψ₁?', label: 'ψ₃/ψ₁ =', unit: '', ref: -2, tol: 0.006,
    hint: 'Solve the equation for ψ₃: ψ₃ = −(J₁/J₂) · ψ₁.', how: 'ψ₃ = −(2/1) · ψ₁, so ψ₃/ψ₁ = −2.',
    wrongs: [{ ref: 2, tol: 0.006, text: 'Check the sign: J₁ψ₁ + J₂ψ₃ = 0 gives ψ₃ = −(J₁/J₂) · ψ₁.' }, { ref: -0.5, tol: 0.006, text: 'This is −J₂/J₁. Solve the equation for ψ₃.' }],
    after: 'ψ₃ = −2ψ₁. Row 4 gives ψ₅ = −2ψ₃ in the same way, and so on: from each odd waveguide to the next the eigenvector doubles and changes its sign.',
    pic: (ok) => (ok ? { kind: 'vector', J1: 2, J2: 1 } : { kind: 'bonds', n: 21, J1: 2, J2: 1, row: 2 }) },
  { type: 'choice', text: 'The picture shows the eigenvector of E = 0 in the 21 waveguides.',
    ask: 'How much of its light is in the even waveguides 2, 4, 6, …?', look: true, options: ['none', 'half of it', 'all of it'], ref: 'none',
    hint: 'Look for bars at the waveguides 2, 4, 6, …',
    after: 'None. Row 1 of Hψ = 0 reads J₁ · ψ₂ = 0, so ψ₂ = 0; then row 3 gives ψ₄ = 0, and so on. The light of this state is in the odd waveguides only, three quarters of it in waveguide 21. It is called an edge state.',
    pic: pic({ kind: 'vector', J1: 2, J2: 1 }) },
  { type: 'number', text: 'Task 2 asks to vary J₁. Exchange the two couplings: J₁ = 1 and J₂ = 2. Row 2 of Hψ = 0 stays J₁ · ψ₁ + J₂ · ψ₃ = 0.',
    ask: 'What is ψ₃/ψ₁ now?', label: 'ψ₃/ψ₁ =', unit: '', ref: -0.5, tol: 0.006, ph: '0.0',
    hint: 'ψ₃ = −(J₁/J₂) · ψ₁ with J₁ = 1 and J₂ = 2.', how: 'ψ₃/ψ₁ = −1/2 = −0.5.',
    wrongs: [{ ref: -2, tol: 0.006, text: 'This is the value for J₁ = 2, J₂ = 1. Now J₁ = 1 and J₂ = 2.' }, { ref: 0.5, tol: 0.006, text: 'Check the sign: ψ₃ = −(J₁/J₂) · ψ₁.' }],
    after: 'Now the eigenvector halves from each odd waveguide to the next: the edge state sits at the other end, at waveguide 1. It always sits at the end whose outermost coupling is the weak one.',
    pic: (ok) => (ok ? { kind: 'vector', J1: 1, J2: 2 } : { kind: 'bonds', n: 21, J1: 1, J2: 2, row: 2 }) },
  { type: 'number', text: 'Back to 20 waveguides, now with J₁ = 1 and J₂ = 2. This chain ends with the weak coupling at both ends.',
    ask: 'Type the smallest positive eigenvalue.', label: 'E =', unit: '', ref: () => smallestPositive(sshEig(20, 1, 2).values), tol: 0.0002, ph: '0.0000',
    hint: 'The same lines as for task 1, with the two couplings exchanged. Print the eigenvalue with four decimals.',
    how: CODE.sshEdge,
    wrongs: [{ ref: low20, tol: 0.0006, text: 'This is the chain with J₁ = 2 and J₂ = 1. Exchange the two couplings.' }, { ref: 0, tol: 0.0004, text: 'It is small, but it is not zero. Print it with four decimals.' }],
    after: 'Two eigenvalues, +0.0015 and −0.0015, lie in the middle of the gap. They belong to two edge states, one at each end. The two reach each other a little through the chain: so the eigenvalues are not exactly 0, and each of the two eigenvectors is the sum or the difference of the two edge states. With J₁ = 2, J₂ = 1 the chain of 20 waveguides had no state in the gap.',
    pic: (ok) => ({ kind: 'levels', N: 20, J1: 1, J2: 2, shown: ok, gap: true, mark: ok ? [9, 10] : [] }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">With two alternating couplings the eigenvalues split into two bands with a gap between them. In the lower band the two waveguides of a strongly coupled pair have opposite signs, in the upper band the same sign. (The lecture writes −J in the matrix. Then it is the other way round; the eigenvalues are the same.)</p>
      <p class="step-text">A chain that ends with the weak coupling and is long enough has a state in the gap that sits at this end: an edge state.</p>
      <p class="step-text">Next: the same chain described with the wavenumber k. This is called k-space.</p>`,
    pic: pic({ kind: 'levels', N: 20, J1: 1, J2: 2, shown: true, gap: true, mark: [9, 10] }) },
];

// ---------- pictures ----------
// the first waveguides of the chain with their alternating couplings
export function drawBonds(ctx, w, h, c, st) {
  const shown = 8, pad = 30, y = h * 0.4, step = (w - 2 * pad - 34) / (shown - 1), X = (j) => pad + (j - 1) * step, strong = Math.max(st.J1, st.J2);
  ctx.fillStyle = c['surface-2']; for (let j = 1; j < shown; j += 2) ctx.fillRect(X(j) - 15, y - 34, step + 30, 68);
  for (let j = 1; j < shown; j++) {
    const J = j % 2 ? st.J1 : st.J2;
    ctx.strokeStyle = c['fg-2']; ctx.lineWidth = J === strong ? 5 : 1.6; ctx.beginPath(); ctx.moveTo(X(j), y); ctx.lineTo(X(j + 1), y); ctx.stroke();
    tag(ctx, j % 2 ? 'J₁' : 'J₂', (X(j) + X(j + 1)) / 2, y - 19, { color: c.fg, px: 13 });
  }
  for (let j = 1; j <= shown; j++) {
    dot(ctx, X(j), y, 8, st.onsite ? c.v[j % 2 ? 0 : 1] : c.psi); tag(ctx, String(j), X(j), y + 22, { color: c.fg, px: 12.5 });
    if (st.onsite) tag(ctx, j % 2 ? '+Δ' : '−Δ', X(j), y - 48, { color: c.v[j % 2 ? 0 : 1], px: 13 });      // the new diagonal of H
  }
  tag(ctx, '…', X(shown) + 22, y, { color: c['fg-2'], px: 18 });
  if (st.row) {                                                            // row 2 of Hψ: waveguide 2 and its two neighbours
    const x = X(st.row), ya = y - 48;
    ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke();
    arrow(ctx, X(st.row - 1), ya, x - 6, ya, c.hpsi, 2.2, 8); arrow(ctx, X(st.row + 1), ya, x + 6, ya, c.hpsi, 2.2, 8);
    tag(ctx, `row ${st.row}: from ${st.row - 1} and from ${st.row + 1}`, x, ya - 16, { color: c.hpsi, px: 12.5, align: 'left' });
  }
  tag(ctx, `J₁ = ${st.J1}${st.J1 === strong ? ' (thick line)' : ' (thin line)'}     J₂ = ${st.J2}${st.J2 === strong ? ' (thick line)' : ' (thin line)'}`, w / 2, y + 78, { color: c.fg, px: 13, wt: 500 });
  tag(ctx, `${st.n} waveguides in all`, w / 2, y + 104, { color: c['fg-2'], px: 12.5, wt: 500 });
  if (st.onsite) return `The first 8 of the ${st.n} waveguides. Above each one stands its new entry on the diagonal of H: +Δ for the A waveguides 1, 3, 5, … and −Δ for the B waveguides 2, 4, 6, …`;
  return `The first 8 of the ${st.n} waveguides. J₁ couples 1–2, 3–4, … (grey stripes); J₂ couples 2–3, 4–5, …${st.row ? ` Orange: row ${st.row} of Hψ holds the light that comes to waveguide ${st.row} from its two neighbours.` : ''}`;
}

// the eigenvalues as dots, the lowest first
export function drawLevels(ctx, w, h, c, st) {
  const D = st.D || 0, E = sshEig(st.N, st.J1, st.J2, D).values, g = Math.hypot(D, st.J1 - st.J2);
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, st.N + 1], ylim: [-3.5, 3.5], xticks: [1, 5, 10, 15, st.N], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'number of the eigenvalue, lowest first', ylabel: 'eigenvalue E' });
  if (st.gap) {
    ctx.fillStyle = c['surface-2']; ctx.fillRect(X(0) + 1, Y(g), X(st.N + 1) - X(0) - 1, Y(-g) - Y(g));
    dash(ctx, X(0), Y(g), X(st.N + 1), Y(g), c['fg-2'], 1.2); dash(ctx, X(0), Y(-g), X(st.N + 1), Y(-g), c['fg-2'], 1.2);
    tag(ctx, 'gap', X(st.N + 1) - 8, Y(-g) - 12, { color: c['fg-2'], px: 12.5, align: 'right' });
  }
  if (!st.shown) { tag(ctx, `your ${st.N} eigenvalues`, w / 2 + 20, Y(2.6), { color: c['fg-2'], px: 14, wt: 500 }); return `The ${st.N} eigenvalues as dots. They appear with your number.`; }
  E.forEach((v, i) => { const on = (st.mark || []).includes(i); dot(ctx, X(i + 1), Y(v), on ? 5.5 : 4.5, on ? c.hpsi : c.psi); if (on) { ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(i + 1), Y(v), 10, 0, TAU); ctx.stroke(); } });
  return `The ${st.N} eigenvalues for J₁ = ${st.J1}, J₂ = ${st.J2}${D ? `, Δ = ${D}` : ''}, the lowest first.${st.gap ? (D ? ' Grey: the gap of the long chain.' : ` Grey: the gap of the long chain, from ${f(-g, 0)} to ${f(g, 0)}.`) : ''}${(st.mark || []).length ? ' Orange: in the gap.' : ''}`;
}

// the eigenvectors with the lowest and with the highest eigenvalue of task 1
function drawTwo(ctx, w, h, c) {
  const e = sshEig(20, 2, 1), rows = [[up(e.vectors[0]), 'lowest eigenvalue'], [up(e.vectors[19]), 'highest eigenvalue']];
  rows.forEach(([v, name], r) => {
    const top = (r * h) / 2, bottom = h - top - h / 2;
    const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 21], ylim: [-0.42, 0.42], xticks: r ? [1, 5, 10, 15, 20] : [], yticks: [0], xlabel: r ? 'waveguide' : '', pad: { t: top + 28, b: bottom + (r ? 42 : 10), l: 34 } });
    ctx.fillStyle = c['surface-2']; for (let m = 0; m < 10; m++) ctx.fillRect(X(2 * m + 0.62), Y(0.42), X(2.76) - X(1), Y(-0.42) - Y(0.42) - 1);
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(21), Y(0)); ctx.stroke();
    bars(ctx, X, Y, v, c.psi, Math.max(4, (X(2) - X(1)) * 0.55));
    tag(ctx, name, X(0) + 4, top + 14, { color: c.fg, px: 13, align: 'left' });
  });
  return 'Two eigenvectors of the 20 waveguides with J₁ = 2, J₂ = 1: one bar for each waveguide, upward for a positive and downward for a negative number. A grey stripe is one pair coupled with J₁.';
}

// the eigenvector of E = 0 in the chain of 21 waveguides
function drawVector(ctx, w, h, c, st) {
  const v = up(sshEig(21, st.J1, st.J2).vectors[10]), big = st.J1 > st.J2 ? [20, 18, 16] : [0, 2, 4];
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 22], ylim: [-0.62, 1.05], xticks: Array.from({ length: 21 }, (_, i) => [i + 1, i % 4 === 0 ? String(i + 1) : '']), yticks: [-0.5, 0, 0.5, 1], xlabel: 'waveguide', ylabel: 'component of the eigenvector', grid: [0] });
  bars(ctx, X, Y, v, c.psi, Math.max(4, (X(2) - X(1)) * 0.6));
  big.forEach((i) => tag(ctx, f(v[i], 3), X(i + 1) + (i === 0 ? 8 : 0), v[i] > 0 ? Y(v[i]) - 11 : Y(v[i]) + 12, { color: c.fg, px: 12 }));
  return `The eigenvector of E = 0 for 21 waveguides with J₁ = ${st.J1}, J₂ = ${st.J2}: one bar for each waveguide. Every waveguide has a tick; the numbers stand at 1, 5, 9, …`;
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'pair') return pairPicture(ctx, w, h, c, 2, st.solved);
  if (st.kind === 'bonds') return drawBonds(ctx, w, h, c, st);
  if (st.kind === 'levels') return drawLevels(ctx, w, h, c, st);
  if (st.kind === 'two') return drawTwo(ctx, w, h, c);
  return drawVector(ctx, w, h, c, st);
}

export const ssh = { id: 'ssh', title: 'SSH chain (tasks 1, 2)', steps, draw };
