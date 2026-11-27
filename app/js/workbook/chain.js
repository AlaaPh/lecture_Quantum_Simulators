// Exercise 1, second part: task 0. Twenty waveguides with the coupling J = 1: the eigenvalues and eigenvectors of the
// 20 × 20 matrix with the student's own program, and the light that spreads from one waveguide.
import { cmapSeq, cmapDiv, rgbToCss } from '../theme.js';
import { TAU, tag, axes, minus, pairPicture } from './draw.js';
import { chainEig, chainExact, spread, spreadMap, ringLowest } from './lattice.js';
import { CODE } from './code.js';

const N = 20, START = 10;
const eig = () => chainEig(N), top = () => eig().vectors[N - 1];
const pic = (o) => () => o;
const f = (v, d) => minus(v.toFixed(d));

const steps = [
  { type: 'info', title: 'Task 0 in eight small questions', button: 'Start',
    html: `<p class="step-text">Now twenty waveguides in a row, with the coupling J = 1 between neighbours. The matrix H is 20 × 20: J in the two lines next to the diagonal, 0 everywhere else.</p>
      <p class="step-text">Task 0: calculate the eigenvalues and the eigenvectors of H and plot them. You do it with your own program. The questions check your numbers.</p>`,
    pic: pic({ kind: 'row', n: 20 }) },
  { type: 'number', text: 'Start small, by hand, with two waveguides. Try the two states <span class="nb">ψ = (1, 1)</span> and <span class="nb">ψ = (1, −1):</span> for each of them <span class="nb">Hψ = E·ψ</span> with a number E.', extra: '<div class="step-eq"><span>H =</span><table class="step-matrix" aria-label="The matrix H of two waveguides"><tbody><tr><td>0</td><td>1</td></tr><tr><td>1</td><td>0</td></tr></tbody></table></div>',
    ask: 'These two numbers E are the eigenvalues of H. Type the higher one.', label: 'E =', unit: '', ref: 1, tol: 0.001,
    hint: 'For ψ = (1, 1): row 1 of Hψ is 0·1 + 1·1 = 1, and row 2 is 1·1 + 0·1 = 1.', how: 'H(1, 1) = (1, 1) = 1 · (1, 1), so E = 1. H(1, −1) = (−1, 1) = −1 · (1, −1), so E = −1.',
    wrongs: [{ ref: -1, tol: 0.001, text: 'This is the lower one. It belongs to ψ = (1, −1).' }],
    after: 'E = +1 for (1, 1), both waveguides in phase, and E = −1 for (1, −1), in antiphase.',
    pic: (ok) => ({ kind: 'row', n: 2, pair: ok }) },
  { type: 'number', text: 'Now write a short program, in Python or MATLAB. Build the 20 × 20 matrix H and calculate its 20 eigenvalues: with <code>np.linalg.eigh(H)</code> in Python, with <code>eig(H)</code> in MATLAB.',
    ask: 'Type the lowest eigenvalue.', label: 'lowest =', unit: '', ref: () => eig().values[0], tol: 0.0006, ph: '0.0000',
    hint: 'H has the number 1 in the 19 places above the diagonal and in the 19 places below it.',
    how: CODE.chainE,
    wrongs: [{ ref: () => chainEig(19).values[0], tol: 0.0006, text: 'This is the value for 19 waveguides. The matrix must be 20 × 20.' }, { ref: () => chainEig(21).values[0], tol: 0.0006, text: 'This is the value for 21 waveguides. The matrix must be 20 × 20.' },
      { ref: () => ringLowest(N), tol: 0.0006, text: '−2 belongs to a ring: your matrix also couples waveguide 20 with waveguide 1. Remove the two corners.' },
      { ref: () => eig().values[N - 1], tol: 0.0006, text: 'This is the highest eigenvalue. The field asks for the lowest.' }],
    after: () => `The 20 eigenvalues run from ${f(eig().values[0], 3)} to ${f(eig().values[N - 1], 3)}. Plotted as dots they are fig. 1 of task 0.`,
    pic: (ok) => ({ kind: 'levels', shown: ok }) },
  { type: 'number', text: 'The exact result for a chain of N waveguides is this formula. It counts from the top: n = 1 is the highest eigenvalue.', formula: '<span class="nb">E<sub>n</sub> = 2J · cos(nπ/(N + 1)),</span> <span class="nb">n = 1 … N</span>',
    ask: 'Calculate E₁ for N = 20 and J = 1.', label: 'E₁ =', unit: '', ref: () => chainExact(1, N), tol: 0.001, ph: '0.000',
    hint: 'π/21 is 8.571°.', how: 'E₁ = 2 · cos(8.571°) = 2 · 0.98883 = 1.978.',
    wrongs: [{ ref: 2 * Math.cos(1 / 21), tol: 0.001, text: 'The π is missing in the cosine: nπ/(N + 1) = π/21.' }, { ref: 2 * Math.cos(Math.PI / 20), tol: 0.001, text: 'Divide by N + 1 = 21, not by 20.' },
      { ref: 2 * Math.cos((Math.PI / 21) * (Math.PI / 180)), tol: 0.0004, text: 'Your calculator is set to degrees: π/21 is an angle in radians, or 8.571°.' }],
    after: 'The same number as the highest eigenvalue of your program. The formula gives all 20: the curve in the picture.',
    pic: (ok) => ({ kind: 'levels', shown: true, formula: ok, mark: 'top' }) },
  { type: 'choice', text: 'Look at the formula again: E<sub>n</sub> = 2J · cos(nπ/(N + 1)). Make the chain longer and longer.',
    ask: 'In which range do all eigenvalues stay?', options: ['−J to J', '−2J to 2J', '−NJ to NJ'], ref: '−2J to 2J',
    hint: 'A cosine lies between −1 and 1.',
    after: 'From −2J to 2J, however long the chain is. This range is called a band; its width is 4J.',
    pic: (ok) => ({ kind: 'levels', shown: true, formula: true, limits: ok }) },
  { type: 'number', text: 'Now the eigenvectors. Take the one with the highest eigenvalue: the last column of V in Python (<code>E, V = np.linalg.eigh(H)</code>) and in MATLAB (after sorting).',
    ask: 'Type the absolute value of its component on waveguide 4, |ψ₄|.', label: '|ψ₄| =', unit: '', ref: () => Math.abs(top()[3]), tol: 0.002, ph: '0.000',
    hint: 'Waveguide 4 is the index 3 in Python and the index 4 in MATLAB. The eigenvalues must be sorted, the lowest first: np.linalg.eigh does it; after np.linalg.eig or MATLAB eig, sort them and the columns of V with them.',
    how: CODE.chainV,
    wrongs: [{ ref: () => Math.abs(top()[4]), tol: 0.002, text: 'This is waveguide 5. In Python waveguide 4 is the index 3.' }, { ref: () => Math.abs(top()[2]), tol: 0.002, text: 'This is waveguide 3. In MATLAB waveguide 4 is the index 4.' },
      { ref: () => Math.abs(top()[0]), tol: 0.002, text: 'This is the component on waveguide 1 (or 20). Take waveguide 4.' }],

    after: 'This eigenvector is half a sine wave: its component on waveguide j is proportional to sin(jπ/21). All 20 components have the same sign, and it is largest in the middle of the chain.',
    pic: (ok) => ({ kind: 'vector', shown: ok }) },
  { type: 'choice', text: 'The picture shows all 20 eigenvectors as a colour plot: one row for each eigenvector, the lowest eigenvalue at the bottom, and one column for each waveguide. This is fig. 2 of task 0.',
    ask: 'In the bottom row, the eigenvector with the lowest eigenvalue, neighbouring waveguides have …', look: true, options: ['the same sign', 'opposite signs'], ref: 'opposite signs',
    hint: 'One colour is positive, the other negative. Do the colours alternate along the bottom row?',
    after: 'Lowest eigenvalue: neighbours in antiphase. Highest eigenvalue (top row): all in phase. The same as for two waveguides.',
    pic: pic({ kind: 'vectors' }) },
  { type: 'number', text: 'Now let the light move, again with your program. All the light starts in waveguide 10. With the eigenvalues E<sub>n</sub> and the eigenvectors v<sub>n</sub>, the state at z is', formula: '<span class="nb">ψ(z) = Σ c<sub>n</sub> · e<sup>−iE<sub>n</sub>z</sup> · v<sub>n</sub>,</span> <span class="nb">c<sub>n</sub> = ⟨v<sub>n</sub>|ψ(0)⟩</span>',
    ask: 'How much of the light is still in waveguide 10 at z = 1?', label: '|ψ₁₀|² =', unit: '', ref: () => spread(eig(), START, 1)[START - 1], tol: 0.001, ph: '0.000',
    hint: 'First the 20 overlaps c<sub>n</sub> of the eigenvectors with ψ(0). Then multiply each eigenvector by its c<sub>n</sub> and by its factor e<sup>−iE<sub>n</sub>z</sup>, and add the 20 results.',
    how: CODE.chainProp,
    wrongs: [{ ref: () => Math.sqrt(spread(eig(), START, 1)[START - 1]), tol: 0.002, text: 'This is the absolute value |ψ₁₀|. The part of the light is its square.' },
      { ref: () => spread(eig(), START, 1)[START], tol: 0.002, text: 'This is a neighbouring waveguide. Waveguide 10 is the index 9 in Python and the index 10 in MATLAB.' }, { ref: 1, tol: 0.001, text: '1 is the value at z = 0. Check that z = 1 stands in the factor e<sup>−iEz</sup>.' },
      { ref: () => { const e = eig(); let a = 0; for (let n = 0; n < N; n++) a += e.vectors[n][START - 1] ** 2 * Math.exp(-e.values[n]); return a * a; }, tol: 0.01, text: 'A part of the light cannot be larger than 1. The i is missing in the factor e<sup>−iEz</sup>: np.exp(-1j*E*z) in Python, exp(-1i*E*z) in MATLAB.' }],
    after: 'Only 0.05 is left: the light has spread to the neighbours. In a chain of straight waveguides this is called discrete diffraction.',
    pic: (ok) => ({ kind: 'spread', zmax: 2, mark: ok ? 1 : null }) },
  { type: 'choice', text: 'The picture shows the light from z = 0 to z = 4. Much of it runs outward in two lines of strong colour, one to each side.',
    ask: 'At z = 4, how far from waveguide 10 are these two outer lines?', look: true, options: ['2 to 3 waveguides', '4 to 5 waveguides', '6 to 7 waveguides'], ref: '6 to 7 waveguides',
    hint: 'Read at the top of the picture where the two outer lines of strong colour are, and count from waveguide 10.',
    after: '6 to 7 waveguides at z = 4. The two lines are just behind a limit: 2J = 2 waveguides per unit of z, here 8 waveguides. Only about 4 % of the light is ahead of it. The part “Beam and wavenumber” of Exercise 2 shows where the 2J comes from.',
    pic: pic({ kind: 'spread', zmax: 4 }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">You have done task 0: the 20 eigenvalues lie in a band from −2J to 2J, the eigenvectors are sine waves, and light that starts in one waveguide spreads.</p>
      <p class="step-text">Next: how a computer moves the light in small steps.</p>`,
    pic: pic({ kind: 'spread', zmax: 4 }) },
];

// ---------- pictures ----------
function drawRow(ctx, w, h, c, st) {
  if (st.n === 2) return pairPicture(ctx, w, h, c, 1, st.pair);
  const n = st.n, pad = 26, y = h * 0.5, X = (j) => pad + ((w - 2 * pad) * (j - 1)) / (n - 1), r = Math.max(4.5, Math.min(8, w / 60));
  ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(1), y); ctx.lineTo(X(n), y); ctx.stroke();
  for (let j = 1; j <= n; j++) { ctx.fillStyle = c.psi; ctx.beginPath(); ctx.arc(X(j), y, r, 0, TAU); ctx.fill(); if (j === 1 || j % 5 === 0) tag(ctx, String(j), X(j), y + r + 14, { color: c.fg, px: 12.5 }); }
  return 'Twenty waveguides in a row. Each one is coupled to its two neighbours with J = 1.';
}

function drawLevels(ctx, w, h, c, st) {
  const E = eig().values, { X, Y } = axes(ctx, c, w, h, { xlim: [0, N + 1], ylim: [-2.4, 2.4], xticks: [1, 5, 10, 15, 20], yticks: [-2, -1, 0, 1, 2], xlabel: 'number of the eigenvalue, lowest first', ylabel: 'eigenvalue E', grid: st.limits ? [-2, 2] : [] });
  if (st.formula) { ctx.strokeStyle = c.hpsi; ctx.lineWidth = 1.8; ctx.beginPath(); for (let i = 0; i <= 100; i++) { const x = 1 + (19 * i) / 100, y = -2 * Math.cos((x * Math.PI) / (N + 1)); if (i) ctx.lineTo(X(x), Y(y)); else ctx.moveTo(X(x), Y(y)); } ctx.stroke(); }
  if (st.shown) E.forEach((v, i) => { ctx.fillStyle = c.psi; ctx.beginPath(); ctx.arc(X(i + 1), Y(v), 4.5, 0, TAU); ctx.fill(); });
  else tag(ctx, 'your 20 eigenvalues', w / 2 + 20, h / 2 - 10, { color: c['fg-2'], px: 14, wt: 500 });
  if (st.mark === 'top' && st.shown) { ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(X(N), Y(E[N - 1]), 9, 0, TAU); ctx.stroke(); tag(ctx, 'E₁ of the formula', X(N) - 12, Y(2.26), { color: c.hpsi, px: 12.5, align: 'right' }); }
  if (st.limits) { tag(ctx, '2J', X(0.4), Y(2) - 10, { color: c['fg-2'], px: 12.5, align: 'left' }); tag(ctx, '−2J', X(0.4), Y(-2) + 12, { color: c['fg-2'], px: 12.5, align: 'left' }); }
  return st.formula ? 'Dots: the 20 eigenvalues of the matrix. Line: the formula 2J·cos(nπ/(N + 1)), drawn from the highest value (n = 1, on the right) to the lowest.' : st.shown ? 'The 20 eigenvalues as dots, the lowest first: fig. 1 of task 0.' : 'Fig. 1 of task 0: the eigenvalues as dots. They appear with your first number.';
}

function drawVector(ctx, w, h, c, st) {
  const v = top(), s = v[9] < 0 ? -1 : 1, { X, Y } = axes(ctx, c, w, h, { xlim: [0, N + 1], ylim: [-0.05, 0.36], xticks: [1, 5, 10, 15, 20], yticks: [0, 0.1, 0.2, 0.3], xlabel: 'waveguide', ylabel: 'component of the eigenvector' });
  if (!st.shown) { tag(ctx, 'the eigenvector with the highest eigenvalue', w / 2 + 20, h / 2 - 10, { color: c['fg-2'], px: 13.5, wt: 500 }); return 'The 20 components of one eigenvector, one bar for each waveguide. They appear with your number.'; }
  v.forEach((a, i) => { ctx.fillStyle = i === 3 ? c.hpsi : c.psi; ctx.fillRect(X(i + 1) - 6, Y(s * a), 12, Y(0) - Y(s * a)); });
  tag(ctx, f(Math.abs(v[3]), 3), X(4) + 6, Y(Math.abs(v[3])) - 12, { color: c.hpsi, px: 13, align: 'right' });
  return 'The eigenvector with the highest eigenvalue: half a sine wave. The orange bar is waveguide 4.';
}

function drawVectors(ctx, w, h, c) {
  const V = eig().vectors, { X, Y } = axes(ctx, c, w, h, { xlim: [0.5, N + 0.5], ylim: [0.5, N + 0.5], xticks: [1, 5, 10, 15, 20], yticks: [1, 5, 10, 15, 20], xlabel: 'waveguide', ylabel: 'eigenvector, lowest eigenvalue first' });
  let m = 0; for (const v of V) for (const a of v) m = Math.max(m, Math.abs(a));
  const dx = X(2) - X(1), dy = Y(1) - Y(2);
  V.forEach((v, n) => v.forEach((a, j) => { ctx.fillStyle = rgbToCss(cmapDiv(a / m)); ctx.fillRect(X(j + 0.5), Y(n + 1.5), dx + 0.6, dy + 0.6); }));
  return 'All 20 eigenvectors: one row for each, the lowest eigenvalue at the bottom. One colour is positive, the other negative; a weak colour is close to zero.';
}

function drawSpread(ctx, w, h, c, st) {
  const rows = 80, M = spreadMap(N, START, st.zmax, rows), { X, Y } = axes(ctx, c, w, h, { xlim: [0.5, N + 0.5], ylim: [0, st.zmax], xticks: Array.from({ length: N }, (_, i) => [i + 1, i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '']), yticks: st.zmax > 2 ? [0, 1, 2, 3, 4] : [0, 0.5, 1, 1.5, 2], xlabel: 'waveguide', ylabel: 'z' });
  const dx = X(2) - X(1), dy = Y(0) - Y(st.zmax / rows);
  for (let r = 0; r < rows; r++) for (let j = 0; j < N; j++) { ctx.fillStyle = rgbToCss(cmapSeq(Math.pow(M[r][j], 0.5))); ctx.fillRect(X(j + 0.5), Y(((r + 1) * st.zmax) / rows), dx + 0.6, dy + 0.6); }
  if (st.mark) { ctx.save(); ctx.strokeStyle = c.hpsi; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(0.5), Y(st.mark)); ctx.lineTo(X(N + 0.5), Y(st.mark)); ctx.stroke(); ctx.restore(); tag(ctx, `z = ${st.mark}`, X(N + 0.5) - 4, Y(st.mark) - 10, { color: c.hpsi, px: 12.5, align: 'right', bg: c.surface }); }
  return 'The light in the 20 waveguides along z: a strong colour means much light. All of it starts in waveguide 10.';
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'row') return drawRow(ctx, w, h, c, st);
  if (st.kind === 'levels') return drawLevels(ctx, w, h, c, st);
  if (st.kind === 'vector') return drawVector(ctx, w, h, c, st);
  if (st.kind === 'vectors') return drawVectors(ctx, w, h, c);
  return drawSpread(ctx, w, h, c, st);
}

export const chain = { id: 'chain', title: 'The chain (task 0)', steps, draw };
