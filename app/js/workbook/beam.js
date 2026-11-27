// Exercise 2, second part: a beam with the wavenumber k. The band E(k) = 2J·cos k, the group velocity, a beam that
// moves in the chain of 41 waveguides, and the Bloch oscillation in a chain with a gradient F.
import { arrow } from '../lecture1/panels.js';
import { cmapSeq, rgbToCss } from '../theme.js';
import { TAU, tag, axes, minus, curve, dash, dot, bars, heat } from './draw.js';
import { band, velocity, gaussBeam, intens, beamRun, BEAM, BLOCH } from './lattice.js';
import { CODE } from './code.js';

const PI = Math.PI;
const last = (a) => a[a.length - 1];
const moved = () => last(beamRun(BEAM)).x;                                 // centre of the beam at z = 5
const sum2 = () => { let s = 0; for (let j = 1; j <= BEAM.N; j++) s += Math.exp(-((j - BEAM.j0) ** 2) / BEAM.sigma ** 2); return s; };   // Σ|ψ|² without normalising
const pic = (o) => () => o;
const f = (v, d) => minus(v.toFixed(d));

const steps = [
  { type: 'info', title: 'A beam and its wavenumber in eight small questions', button: 'Start',
    html: `<p class="step-text">Light in one waveguide spreads to both sides. A wide beam can move to one side instead. What decides it is the phase.</p>
      <p class="step-text">In the beam of the picture the phase grows by the same angle k from each waveguide to the next:</p>
      <div class="step-formula">ψ<sub>j</sub> = (envelope) · e<sup>ikj</sup></div>
      <p class="step-text">k is called the wavenumber. In the picture k = π/2: each arrow is turned by 90° against the one before.</p>`,
    pic: pic({ kind: 'beam' }) },
  { type: 'number', text: 'Take a wave ψ<sub>j</sub> = e<sup>ikj</sup> in a long chain. Row j of Hψ is J·ψ<sub>j−1</sub> + J·ψ<sub>j+1</sub> = J·(e<sup>−ik</sup> + e<sup>ik</sup>)·ψ<sub>j</sub>. So the wave is an eigenvector of H, with the eigenvalue',
    formula: 'E(k) = 2J · cos k', ask: 'Calculate E for k = π/3 and J = 1.', label: 'E =', unit: '', ref: 1, tol: 0.006, ph: '0.0',
    hint: 'cos(π/3) = cos 60° = 0.5.', how: 'E = 2 · 1 · cos 60° = 2 · 0.5 = 1.',
    wrongs: [{ ref: 0.5, tol: 0.006, text: 'This is cos k. Multiply it by 2J = 2.' }, { ref: 2 * Math.cos((PI / 3) * (PI / 180)), tol: 0.004, text: 'Your calculator is set to degrees: π/3 is an angle in radians, or 60°.' }],
    after: 'E = 1. Every wavenumber has its eigenvalue: the curve E(k) is the band, from −2J to 2J. The eigenvalues of task 0 lie on this curve.',
    pic: (ok) => ({ kind: 'band', at: ok ? PI / 3 : null }) },
  { type: 'number', text: 'A beam is made of waves with wavenumbers close to one k. Its centre moves with the group velocity, the slope of the band:',
    formula: 'v = dE/dk = −2J · sin k', ask: 'Calculate v for k = π/2 and J = 1.', label: 'v =', unit: '', ref: -2, tol: 0.006, ph: '−0.0',
    hint: 'sin(π/2) = sin 90° = 1.', how: 'v = −2 · 1 · sin 90° = −2.',
    wrongs: [{ ref: 2, tol: 0.006, text: 'Check the sign: v = −2J · sin k.' }, { ref: 0, tol: 0.006, text: 'This is −2J · cos k. The slope of cos k is −sin k, and sin(π/2) = 1.' },
      { ref: -2 * Math.sin((PI / 2) * (PI / 180)), tol: 0.004, text: 'Your calculator is set to degrees: π/2 is an angle in radians, or 90°.' }],
    after: 'v = −2: the beam moves 2 waveguides per unit of z, toward lower waveguide numbers. No beam is faster, because |sin k| is 1 at most. This is the limit 2J that you saw in task 0.',
    pic: (ok) => ({ kind: 'band', at: PI / 2, tangent: ok }) },
  { type: 'choice', text: 'The group velocity depends on the wavenumber: v = −2J · sin k.',
    ask: 'At which wavenumber does a beam stay where it is?', options: ['k = 0', 'k = π/2', 'k = −π/2'], ref: 'k = 0',
    hint: 'The beam stays where the band is flat: sin k = 0.',
    after: 'At k = 0 all waveguides are in phase and the band is flat: v = 0. The same holds at k = π, where neighbours are in antiphase. With k = −π/2 the beam moves the other way, toward higher waveguide numbers.',
    pic: (ok) => ({ kind: 'band', flat: ok }) },
  { type: 'choice', text: 'The picture shows a beam with k = π/2 in a chain of 41 waveguides, from z = 0 to z = 5. It starts at waveguide 26.',
    ask: 'Where is its centre at z = 5?', look: true, options: ['waveguide 16', 'waveguide 26', 'waveguide 36'], ref: 'waveguide 16',
    hint: 'Follow the bright line to the top of the picture.',
    after: 'It moved 10 waveguides toward lower numbers: v · z = −2 · 5 = −10.',
    pic: (ok) => ({ kind: 'run', which: 'beam', line: ok }) },
  { type: 'number', text: 'Now with your program: 41 waveguides, J = 1. At z = 0 the beam has its centre at j₀ = 26, the width σ = 3 and the wavenumber k = π/2:',
    formula: '<span class="nb">ψ<sub>j</sub> = e<sup>−(j − j₀)²/(2σ²)</sup> · e<sup>ikj</sup>,</span> <span class="nb">j = 1 … 41</span>',
    extra: '<p class="step-text">Normalise it, so that Σ|ψ<sub>j</sub>|² = 1, and move it to z = 5: with the eigenvectors as in task 0, or with Runge–Kutta steps.</p>',
    ask: 'Where is the centre of the light, Σ j · |ψ<sub>j</sub>|², at z = 5?', label: 'centre =', unit: '', ref: moved, tol: 0.06, ph: '00.0',
    hint: 'Build ψ(0) for j = 1 … 41 and divide it by its length. Then move it with the eigenvectors, as in task 0: ψ(z) = Σ c<sub>n</sub> · e<sup>−iE<sub>n</sub>z</sup> · v<sub>n</sub>.',
    how: CODE.beam,
    wrongs: [{ ref: () => last(beamRun({ ...BEAM, k: -PI / 2 })).x, tol: 0.06, text: 'The beam moved the other way. Check the sign in e<sup>ikj</sup> and in e<sup>−iEz</sup>, and that your matrix has +1 next to the diagonal: with −1 the band is turned upside down and the beam moves the other way.' },
      { ref: BEAM.j0, tol: 0.06, text: 'The beam did not move. Is the factor e<sup>ikj</sup> in your start? Without it k = 0, and such a beam stays.' },
      { ref: () => moved() * sum2(), tol: 0.4, text: 'The beam is not normalised: divide ψ(0) by √(Σ|ψ<sub>j</sub>|²) before you move it.' }],
    after: () => `The centre moved from 26 to ${f(moved(), 2)}: by ${f(BEAM.j0 - moved(), 2)} waveguides. This is a little less than 10, because the beam also contains wavenumbers next to π/2, and they are slower.`,
    pic: (ok) => ({ kind: 'run', which: 'beam', line: ok }) },
  { type: 'number', text: 'Now give every waveguide its own propagation constant, growing in equal steps F from one waveguide to the next: the diagonal of H becomes F · j. Then the wavenumber of the beam changes at a constant rate:',
    formula: 'k(z) = k<sub>0</sub> − F · z', ask: 'After which distance z has k changed by 2π, for F = 0.5?', label: 'z =', unit: '', ref: 2 * PI / BLOCH.F, tol: 0.01, ph: '00.00',
    hint: 'F · z = 2π.', how: 'z = 2π/F = 6.283/0.5 = 12.57.',
    wrongs: [{ ref: PI / BLOCH.F, tol: 0.01, text: 'This is π/F: there k has changed by π only.' }, { ref: 2 * PI * BLOCH.F, tol: 0.01, text: 'Divide 2π by F, do not multiply.' }],
    after: 'z = 2π/F = 12.57. A change of k by 2π changes nothing: e<sup>i(k + 2π)j</sup> = e<sup>ikj</sup>. So after this distance the beam is the same as at the start. The motion repeats: this is a Bloch oscillation, and 2π/F is its period.',
    pic: (ok) => ({ kind: 'band', sweep: true, flat: ok }) },
  { type: 'number', text: 'While k runs once through the band, the beam moves to one side, stops and comes back. The distance between its two turning points is the width of the band, 4J, divided by F:',
    formula: 'distance = 4J / F', ask: 'Calculate it for J = 1 and F = 0.5, in waveguides.', label: 'distance =', unit: '', ref: 4 / BLOCH.F, tol: 0.06, ph: '0',
    hint: '4 · 1 / 0.5.', how: '4J/F = 4/0.5 = 8 waveguides.',
    wrongs: [{ ref: 4 * BLOCH.F, tol: 0.06, text: 'This is 4J · F. Divide by F.' }, { ref: 2 / BLOCH.F, tol: 0.06, text: 'This is 2J/F, half of the way. The distance between the two turning points is 4J/F.' }],
    after: '8 waveguides. The reason: E(k) + F · j stays the same along the way, and E(k) can change by 4J at most. A stronger gradient F makes the oscillation shorter and narrower.',
    pic: (ok) => ({ kind: 'run', which: 'bloch', span: ok }) },
  { type: 'choice', text: 'The picture shows a beam with k₀ = 0 in a chain with F = 0.5, from z = 0 to z = 25. It starts at waveguide 16.',
    ask: 'How many times does it come back to waveguide 16?', look: true, options: ['1', '2', '4'], ref: '2',
    hint: 'One period is z = 2π/F = 12.57.',
    after: 'Twice: 25 is two periods of 12.57. The centre goes from waveguide 16 to about 24 and back, 8 waveguides, as you calculated. A constant gradient does not push the light away; it makes it oscillate.',
    pic: (ok) => ({ kind: 'run', which: 'bloch', line: ok, span: true }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">The wavenumber k is the phase step between neighbouring waveguides. The band E(k) = 2J·cos k gives the eigenvalue of each wave, and its slope is the group velocity of a beam. With a gradient F the wavenumber runs through the band and the beam oscillates.</p>
      <p class="step-text">Next: the chain with two different couplings.</p>`,
    pic: pic({ kind: 'run', which: 'bloch', line: true, span: true }) },
];

// ---------- pictures ----------
// the beam at z = 0: |ψ_j|² as bars, and the complex numbers ψ_j of nine waveguides as arrows
function drawBeam(ctx, w, h, c) {
  const psi = gaussBeam(BEAM.N, BEAM.j0, BEAM.sigma, BEAM.k), I = intens(psi), top = Math.max(...I), hb = h * 0.56;
  const { X, Y } = axes(ctx, c, w, hb, { xlim: [0, 42], ylim: [0, top * 1.15], xticks: [1, 11, 21, 31, 41], yticks: [0], xlabel: 'waveguide j', ylabel: '|ψ|²', pad: { b: 40, t: 12 } });
  bars(ctx, X, Y, I, c.psi, Math.max(3, (X(2) - X(1)) * 0.7));
  const from = 22, n = 9, R = Math.min(18, (w - 40) / (n * 2.5)), y = hb + (h - hb) * 0.42, gap = (w - 40 - 2 * R) / (n - 1), amp = Math.sqrt(top);
  for (let m = 0; m < n; m++) {
    const j = from + m, x = 20 + R + m * gap, re = psi.re[j - 1] / amp, im = psi.im[j - 1] / amp;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.2; ctx.fillStyle = c.surface; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.stroke();
    arrow(ctx, x, y, x + R * re, y - R * im, c.psi, 2.4, 7);
    tag(ctx, String(j), x, y + R + 12, { color: c['fg-2'], px: 12, wt: 500 });
  }
  tag(ctx, 'the complex numbers ψ of waveguides 22 to 30', w / 2, y - R - 14, { color: c['fg-2'], px: 12.5, wt: 500 });
  return 'A beam at z = 0. Bars: the light |ψ|² in each of the 41 waveguides. Arrows: the complex number ψ in nine of them; from one waveguide to the next the arrow turns by k = π/2.';
}

// the band E(k) = 2J·cos k
function drawBand(ctx, w, h, c, st) {
  const { X, Y } = axes(ctx, c, w, h, { xlim: [-PI, PI], ylim: [-2.5, 2.5], xticks: [[-PI, '−π'], [-PI / 2, '−π/2'], [0, '0'], [PI / 2, 'π/2'], [PI, 'π']], yticks: [-2, 0, 2], xlabel: 'wavenumber k', ylabel: 'E', grid: [0] });
  curve(ctx, X, Y, (k) => band(k), -PI, PI, c.psi, 2.8);
  const slope = (k, half, color) => { const v = velocity(k); ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X(k - half), Y(band(k) - v * half)); ctx.lineTo(X(k + half), Y(band(k) + v * half)); ctx.stroke(); };
  if (st.flat) for (const k of [-PI, 0, PI]) { slope(k, k === 0 ? 0.55 : 0.4, c.hpsi); dot(ctx, X(k), Y(band(k)), 5, c.hpsi); }
  if (st.flat) tag(ctx, 'flat: v = 0', X(0), Y(2) - 14, { color: c.hpsi, px: 12.5 });
  if (st.sweep) { arrow(ctx, X(-0.25), Y(band(0.25)) + 20, X(-1.25), Y(band(1.25)) + 20, c.fg, 2.2, 9); tag(ctx, 'k(z) = k₀ − F·z', X(0), Y(-1.2), { color: c.fg, px: 12.5 }); }
  if (st.at != null) {
    if (st.tangent) slope(st.at, 0.6, c.hpsi);
    dot(ctx, X(st.at), Y(band(st.at)), 6, c.hpsi);
    tag(ctx, st.tangent ? 'slope v = −2' : `E = ${f(band(st.at), 0)}`, X(st.at) + 12, Y(band(st.at)) - 12, { color: c.hpsi, px: 12.5, align: 'left' });
  }
  return st.sweep ? 'The band. With a gradient F the wavenumber of the beam moves along the band at a constant rate and re-enters on the other side: k = −π and k = π are the same wave.'
    : 'The band E(k) = 2J·cos k for J = 1. The slope of this curve is the group velocity of a beam.';
}

// the light in the chain of 41 waveguides along z: the beam, or the beam in a chain with a gradient
function drawRun(ctx, w, h, c, st) {
  const P = st.which === 'beam' ? BEAM : BLOCH, R = beamRun(P), rows = R.slice(0, R.length - 1).map((r) => r.I), top = Math.max(...R[0].I);
  const yt = st.which === 'beam' ? [0, 1, 2, 3, 4, 5] : [0, 5, 10, 15, 20, 25];
  const { X, Y } = heat(ctx, c, w, h, rows, (v) => rgbToCss(cmapSeq(Math.min(1, Math.sqrt(v / top)))), { xlim: [0.5, 41.5], ylim: [0, P.zmax], xticks: [1, 6, 11, 16, 21, 26, 31, 36, 41], yticks: yt, xlabel: 'waveguide', ylabel: 'z' });
  if (st.line) { ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); R.forEach((r, i) => { if (i) ctx.lineTo(X(r.x), Y(r.z)); else ctx.moveTo(X(r.x), Y(r.z)); }); ctx.stroke(); ctx.setLineDash([]); }
  if (st.span) { const y = Y(PI / P.F); arrow(ctx, X(16.4), y, X(23.6), y, c.fg, 2, 8); arrow(ctx, X(23.6), y, X(16.4), y, c.fg, 2, 8); tag(ctx, '8 waveguides', X(20), y - 12, { color: c.fg, px: 12.5, bg: c.surface }); }
  return st.which === 'beam' ? `A beam with k = π/2 in 41 waveguides: a strong colour means much light.${st.line ? ' Dashed line: the centre of the light.' : ''}`
    : `A beam with k₀ = 0 in a chain whose propagation constants grow by F = 0.5 from one waveguide to the next.${st.line ? ' Dashed line: the centre of the light.' : ''}`;
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'beam') return drawBeam(ctx, w, h, c);
  if (st.kind === 'band') return drawBand(ctx, w, h, c, st);
  return drawRun(ctx, w, h, c, st);
}

export const beam = { id: 'beam', title: 'Beam and wavenumber', steps, draw };
