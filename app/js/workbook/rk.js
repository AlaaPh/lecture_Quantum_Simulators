// Exercise 2, first part: one step of the Runge–Kutta method of fourth order by hand, for one waveguide
// (i dψ/dz = E·ψ with E = 1, dz = 1, ψ(0) = 1), then 20 steps for the chain of 41 waveguides with the student's program.
import { arrow } from '../lecture1/panels.js';
import { cmapSeq, rgbToCss } from '../theme.js';
import { TAU, tag, axes, minus, curve, dash, dot, heat } from './draw.js';
import { rkStep, rkChain, rkChainPlainMean, RK_LIMIT, R2, spreadMap, chainEig, spread } from './lattice.js';
import { CODE } from './code.js';

const S = rkStep();                                                       // k1 … k4, P2 … P4, psi1, euler, exact as [re, im]
const len = (a) => Math.hypot(a[0], a[1]);
const pic = (o) => () => o;
const f = (v, d) => minus(v.toFixed(d));

const steps = [
  { type: 'info', title: 'One Runge–Kutta step in nine small questions', button: 'Start',
    html: `<p class="step-text">A computer moves the light in small steps dz. The method of the hands-on is the Runge–Kutta method of fourth order. Here you make one step by hand.</p>
      <p class="step-text">Take the simplest case, one complex number ψ with <span class="nb">i dψ/dz = E·ψ.</span> (A supermode with the eigenvalue E obeys exactly this equation.) The slope of ψ is</p>
      <div class="step-formula">dψ/dz = f(ψ) = −i · E · ψ</div>
      <p class="step-text">Use E = 1, the start ψ(0) = 1 and one big step dz = 1. The exact result is known: ψ(z) = e<sup>−iz</sup> runs on the circle of the picture.</p>`,
    pic: pic({ kind: 'plane', n: 0 }) },
  { type: 'complex', text: 'The slope at the start is k₁ = f(ψ(0)).', formula: 'k<sub>1</sub> = −i · ψ(0) = −i · 1', ask: 'Type the real and the imaginary part of k₁.', label: 'k₁ =', ref: { re: 0, im: -1 },
    hint: 'The number −i has the real part 0 and the imaginary part −1.', how: 'k₁ = −i = 0 + (−1)·i. The real part is 0, the imaginary part is −1.',
    after: 'k₁ = −i points straight down. At ψ(0) = 1 this is the direction of the circle.',
    pic: (ok) => ({ kind: 'plane', n: ok ? 1 : 0 }) },
  { type: 'number', text: 'The simplest method, the Euler step, follows this one slope for the whole step:', formula: 'ψ(0) + dz · k<sub>1</sub> = 1 − i',
    ask: 'What is the absolute value of this result, |1 − i|?', label: '|1 − i| =', unit: '', ref: R2, tol: 0.006, ph: '0.00',
    hint: 'The absolute value of a + b·i is √(a² + b²).', how: '|1 − i| = √(1² + 1²) = √2 = 1.414.',
    wrongs: [{ ref: 2, tol: 0.006, text: 'This is |1 − i|² = 1² + 1². The absolute value is its square root.' }, { ref: 1, tol: 0.006, text: '1 is the absolute value of the exact result. The result of this step is 1 − i: both parts count.' }],
    after: 'The absolute value should stay 1, because the exact result stays on the circle. The Euler step gives 1.414: the light |ψ|² would double in one step. Runge–Kutta corrects this with three more slopes.',
    pic: (ok) => ({ kind: 'plane', n: 1, euler: true, eulerLen: ok }) },
  { type: 'complex', text: 'Runge–Kutta first goes only half a step along k₁. This leads to the point',
    formula: 'P₂ = ψ(0) + (dz/2)·k₁ = 1 − 0.5i', ask: 'The slope there is <span class="nb">k₂ = −i · (1 − 0.5i).</span> Type its real and its imaginary part.', label: 'k₂ =', ref: { re: -0.5, im: -1 },
    hint: 'Multiply out: −i · 1 = −i and −i · (−0.5i) = 0.5 · i². Remember i² = −1.', how: 'k₂ = −i + 0.5·i² = −0.5 − i. The real part is −0.5, the imaginary part is −1.',
    after: 'k₂ = −0.5 − i: this slope already turns to the left, as the circle does.',
    pic: (ok) => ({ kind: 'plane', n: ok ? 2 : 1, trial: 2 }) },
  { type: 'complex', text: 'Start again at ψ(0) and go half a step along k₂:',
    formula: 'P₃ = ψ(0) + (dz/2)·k₂ = 0.75 − 0.5i', ask: 'The slope there is <span class="nb">k₃ = −i · (0.75 − 0.5i).</span> Type its real and its imaginary part.', label: 'k₃ =', ref: { re: -0.5, im: -0.75 },
    hint: '−i · 0.75 = −0.75i and −i · (−0.5i) = 0.5 · i² = −0.5.', how: 'k₃ = −0.75i − 0.5 = −0.5 − 0.75i.',
    after: 'k₃ = −0.5 − 0.75i.',
    pic: (ok) => ({ kind: 'plane', n: ok ? 3 : 2, trial: 3 }) },
  { type: 'complex', text: 'Start once more at ψ(0) and go the whole step along k₃:',
    formula: 'P₄ = ψ(0) + dz·k₃ = 0.5 − 0.75i', ask: 'The slope there is <span class="nb">k₄ = −i · (0.5 − 0.75i).</span> Type its real and its imaginary part.', label: 'k₄ =', ref: { re: -0.75, im: -0.5 },
    hint: '−i · 0.5 = −0.5i and −i · (−0.75i) = 0.75 · i² = −0.75.', how: 'k₄ = −0.5i − 0.75 = −0.75 − 0.5i.',
    after: 'Four slopes: one at the start, two in the middle of the step and one at its end.',
    pic: (ok) => ({ kind: 'plane', n: ok ? 4 : 3, trial: 4 }) },
  { type: 'complex', text: 'The step uses the mean of the four slopes. The two from the middle of the step count twice:',
    formula: '<span class="nb">ψ(dz) = ψ(0) + (dz/6) ·</span> <span class="nb">(k<sub>1</sub> + 2k<sub>2</sub> + 2k<sub>3</sub> + k<sub>4</sub>)</span>',
    ask: 'The sum in the bracket is −2.75 − 5i. Calculate ψ(dz).', label: 'ψ(dz) =', ref: { re: 13 / 24, im: -5 / 6 }, tol: 0.006,
    hint: 'Divide −2.75 − 5i by 6 and add ψ(0) = 1.', how: 'ψ(dz) = 1 + (−2.75 − 5i)/6 = 1 − 0.4583 − 0.8333i = 0.5417 − 0.8333i.',
    after: 'ψ(dz) = 0.542 − 0.833i. The exact result is e<sup>−i</sup> = 0.540 − 0.841i: in the picture the two points lie on top of each other.',
    pic: (ok) => ({ kind: 'plane', n: 4, trial: 4, final: ok }) },
  { type: 'number', text: 'The exact result has the absolute value 1. Check your result <span class="nb">ψ(dz) = 0.5417 − 0.8333i.</span>',
    ask: 'What is its absolute value?', label: '|ψ(dz)| =', unit: '', ref: () => len(S.psi1), tol: 0.002, ph: '0.000',
    hint: '√(0.5417² + 0.8333²).', how: '|ψ(dz)| = √(0.2934 + 0.6944) = √0.9878 = 0.994.',
    wrongs: [{ ref: () => len(S.psi1) ** 2, tol: 0.002, text: 'This is |ψ(dz)|². The absolute value is its square root.' }],
    after: '0.994 instead of 1: this big step loses 1.2 % of the light (|ψ(dz)|² = 0.988), where the Euler step doubled it. With a ten times smaller step, dz = 0.1, the absolute value is 0.99999999.',
    pic: pic({ kind: 'plane', n: 4, trial: 4, final: true, euler: true }) },
  { type: 'info', title: 'How big may a step be?',
    html: `<p class="step-text">If the step is too big, |ψ| grows with every step, without limit. For Runge–Kutta of fourth order this happens when |E| · dz is larger than 2√2 = 2.83: the picture.</p>
      <p class="step-text">In a chain every supermode is stepped like the one number ψ here, each with its own eigenvalue E. So the largest |E| of the chain decides.</p>`,
    pic: pic({ kind: 'growth', mark: true }) },
  { type: 'number', text: 'The limit is <span class="nb">|E| · dz = 2√2 = 2.828.</span> In a chain with J = 1 every |E| is smaller than 2, however long the chain is.',
    ask: 'Up to which step dz does the light not grow, in a chain of any length?', label: 'dz =', unit: '', ref: RK_LIMIT / 2, tol: 0.006, ph: '0.00',
    hint: '|E| · dz = 2.828 with |E| = 2.', how: 'dz = 2.828/2 = 1.414.',
    wrongs: [{ ref: RK_LIMIT, tol: 0.006, text: '2.83 is the limit for |E| · dz. Divide it by |E| = 2.' }, { ref: RK_LIMIT * 2, tol: 0.012, text: 'Divide 2.83 by |E| = 2, do not multiply.' }],
    after: 'dz = 1.41. Up to this step nothing grows; for an exact result the step must be much smaller. The next question uses dz = 0.1.',
    pic: pic({ kind: 'growth', mark: true }) },
  { type: 'number', text: 'Now the chain, with your own program: 41 waveguides, J = 1, all the light in waveguide 21 at z = 0. The state ψ is a list of 41 numbers and its slope is <span class="nb">f(ψ) = −i·H·ψ.</span> Make 20 steps of dz = 0.1. One step is:',
    formula: '<span class="nb">k₁ = f(ψ)</span><br><span class="nb">k₂ = f(ψ + (dz/2)·k₁)</span><br><span class="nb">k₃ = f(ψ + (dz/2)·k₂)</span><br><span class="nb">k₄ = f(ψ + dz·k₃)</span><br><span class="nb">ψ → ψ + (dz/6) ·</span> <span class="nb">(k₁ + 2k₂ + 2k₃ + k₄)</span>',
    ask: 'How much of the light is in waveguide 21 at z = 2?', label: '|ψ₂₁|² =', unit: '', ref: () => rkChain().I[20], tol: 0.0002, ph: '0.0000',
    hint: 'One step is the same four slopes as by hand, with H·ψ in place of E·ψ. Waveguide 21 is the index 20 in Python and the index 21 in MATLAB.',
    how: CODE.rkChain,
    wrongs: [{ ref: () => rkChainPlainMean()[20], tol: 0.0001, text: 'Close, but this is the plain mean of the four slopes. They have the weights 1, 2, 2, 1, and the sum is divided by 6.' },
      { ref: () => rkChain().euler[20], tol: 0.002, text: 'This is the result of Euler steps, ψ + dz·k₁. Use all four slopes.' },
      { ref: () => spread(chainEig(41), 21, 1)[20], tol: 0.0006, text: 'This is the value at z = 1, after 10 steps. Make 20 steps.' },
      { ref: () => Math.sqrt(rkChain().I[20]), tol: 0.002, text: 'This is the absolute value |ψ₂₁|. The part of the light is its square.' },
      { ref: () => rkChain().I[21], tol: 0.0006, text: 'This is waveguide 20 or 22. Waveguide 21 is the index 20 in Python and the index 21 in MATLAB.' }],
    after: () => `${f(rkChain().I[20], 4)}, and the exact value is ${f(rkChain().exact[20], 4)}. The sum of the light over all 41 waveguides is ${rkChain().norm.toFixed(5)}: Runge–Kutta keeps it at 1. Euler steps of the same size give ${rkChain().eulerNorm.toFixed(2)}.`,
    pic: (ok) => ({ kind: 'chain', mark: ok }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">One Runge–Kutta step takes four slopes and uses their mean. It keeps the sum of the light at 1 far better than the Euler step, and your program can now move the light through any chain.</p>
      <p class="step-text">Next: a beam that moves to one side.</p>`,
    pic: pic({ kind: 'chain', mark: true }) },
];

// ---------- pictures ----------
// the complex plane: the exact path (circle), the start, the trial points P and the slopes k taken there
function drawPlane(ctx, w, h, c, st) {
  const side = Math.min(w - 70, h - 58), l = 54 + (w - 70 - side) / 2, t = 16 + (h - 58 - side) / 2;      // a square plot
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 1.4], ylim: [-1.2, 0.2], xticks: [0, 0.5, 1], yticks: [-1, -0.5, 0], xlabel: 'real part', ylabel: 'imaginary part', pad: { l, r: w - l - side, t, b: h - t - side } });
  const u = X(1) - X(0);
  ctx.save(); ctx.beginPath(); ctx.rect(X(0), Y(0.2), side, side); ctx.clip();
  ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(X(0), Y(0), u, 0, TAU); ctx.stroke();
  ctx.restore();
  dash(ctx, X(0.05), Y(0.1), X(0.05) + 26, Y(0.1), c['fg-2']); tag(ctx, 'exact result', X(0.05) + 32, Y(0.1), { color: c['fg-2'], px: 12, wt: 500, align: 'left' });
  arrow(ctx, X(0.05), Y(-0.03), X(0.05) + 26, Y(-0.03), c.hpsi, 2.2, 7); tag(ctx, 'slope', X(0.05) + 32, Y(-0.03), { color: c['fg-2'], px: 12, wt: 500, align: 'left' });
  const P = [S.psi0, S.P2, S.P3, S.P4], K = [S.k1, S.k2, S.k3, S.k4], scale = 0.36;
  const names = ['k₁', 'k₂', 'k₃', 'k₄'], side2 = [[10, -2, 'left'], [10, 6, 'left'], [-9, 10, 'right'], [-10, 0, 'right']];
  if (st.euler) {
    dash(ctx, X(1), Y(0), X(S.euler[0]), Y(S.euler[1]), c['fg-2']);
    ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 2; ctx.fillStyle = c.surface; ctx.beginPath(); ctx.arc(X(S.euler[0]), Y(S.euler[1]), 5.5, 0, TAU); ctx.fill(); ctx.stroke();
    tag(ctx, st.eulerLen ? 'Euler step: |1 − i| = 1.414' : 'Euler step: 1 − i', X(S.euler[0]) + 10, Y(S.euler[1]) + 16, { color: c['fg-2'], px: 12.5, align: 'right' });
  }
  for (let m = 1; m < (st.trial || 1); m++) {                              // the trial points P₂ … and the way to them
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(1), Y(0)); ctx.lineTo(X(P[m][0]), Y(P[m][1])); ctx.stroke();
    dot(ctx, X(P[m][0]), Y(P[m][1]), 4, c['fg-2']);
    if (!st.final) tag(ctx, `P${'₂₃₄'[m - 1]}`, X(P[m][0]) + (m === 1 ? 10 : -9), Y(P[m][1]) - 9, { color: c['fg-2'], px: 12.5, align: m === 1 ? 'left' : 'right' });
  }
  for (let m = 0; m < st.n; m++) {                                         // the slopes found so far, the newest in full colour
    const a = P[m], b = [a[0] + scale * K[m][0], a[1] + scale * K[m][1]], now = m === st.n - 1 && !st.final;
    ctx.save(); ctx.globalAlpha = now ? 1 : 0.45; arrow(ctx, X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), c.hpsi, now ? 3 : 2.2, 9); ctx.restore();
    if (!st.final) tag(ctx, names[m], X(b[0]) + side2[m][0], Y(b[1]) + side2[m][1], { color: c.hpsi, px: 13, align: side2[m][2] });
  }
  dot(ctx, X(1), Y(0), 6, c.psi); tag(ctx, 'ψ(0)', X(1) + 10, Y(0) - 12, { color: c.psi, px: 13, align: 'left' });
  if (st.final) {
    ctx.strokeStyle = c.fg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X(S.exact[0]), Y(S.exact[1]), 9, 0, TAU); ctx.stroke();
    dot(ctx, X(S.psi1[0]), Y(S.psi1[1]), 5.5, c.psi);
    tag(ctx, 'ψ(dz)', X(S.psi1[0]) + 4, Y(S.psi1[1]) + 24, { color: c.psi, px: 14, bg: c.surface });
  }
  return st.final ? 'The complex plane. Dashed circle: the exact result. Orange arrows: the four slopes at the points where they were taken. Blue dot: the result ψ(dz) of the step. Ring: the exact result e⁻ⁱ.'
    : 'The complex plane. Dashed circle: the path of the exact result. An orange arrow shows a slope at the point where it is taken; it is drawn shorter than the step.';
}

// the length of ψ after one step that starts with the length 1
function drawGrowth(ctx, w, h, c, st) {
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 3.4], ylim: [0, 2.2], xticks: [0, 1, 2, 3], yticks: [0, 1, 2], xlabel: '|E| · dz', ylabel: '|ψ| after one step' });
  dash(ctx, X(0), Y(1), X(3.4), Y(1), c['fg-2'], 1.6);
  curve(ctx, X, Y, (x) => Math.hypot(1, x), 0, 1.96, c['fg-2'], 2);
  curve(ctx, X, Y, (x) => len(rkStep(1, x).psi1), 0, 3.14, c.psi, 2.8);
  tag(ctx, 'Euler step', X(1.2), Y(1.72), { color: c['fg-2'], px: 12.5, align: 'right' });
  tag(ctx, 'Runge–Kutta', X(1.55), Y(0.72), { color: c.psi, px: 12.5, align: 'right' });
  if (st.mark) { dash(ctx, X(RK_LIMIT), Y(0), X(RK_LIMIT), Y(2.2), c.hpsi); tag(ctx, '2.83', X(RK_LIMIT) - 6, Y(2.05), { color: c.hpsi, px: 12.5, align: 'right' }); }
  return 'One step that starts with |ψ| = 1. Above the grey dashed line at 1 the light grows with every step. Runge–Kutta stays below the line up to |E|·dz = 2.83 (orange); the Euler step is above it for every step.';
}

// the chain of 41 waveguides, all the light in waveguide 21
function drawChain(ctx, w, h, c, st) {
  const M = spreadMap(41, 21, 2, 60).slice(0, 60);
  const { X, Y } = heat(ctx, c, w, h, M, (v) => rgbToCss(cmapSeq(Math.sqrt(v))), { xlim: [0.5, 41.5], ylim: [0, 2], xticks: [1, 11, 21, 31, 41], yticks: [0, 0.5, 1, 1.5, 2], xlabel: 'waveguide', ylabel: 'z', pad: { t: 30 } });
  if (st.mark) { arrow(ctx, X(21), Y(2) - 20, X(21), Y(2) - 3, c.hpsi, 2.4, 8); tag(ctx, `${f(rkChain().I[20], 3)} of the light`, X(21) + 10, Y(2) - 15, { color: c.hpsi, px: 12.5, align: 'left' }); }
  return 'The light in the 41 waveguides from z = 0 to z = 2: a strong colour means much light. All of it starts in waveguide 21.';
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'plane') return drawPlane(ctx, w, h, c, st);
  if (st.kind === 'growth') return drawGrowth(ctx, w, h, c, st);
  return drawChain(ctx, w, h, c, st);
}

export const rk = { id: 'rk', title: 'Runge–Kutta step', steps, draw };
