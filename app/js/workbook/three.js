// Exercise 1, first part: three coupled waveguides. The state as three complex numbers, the matrix H, the three
// supermodes, and the light that crosses from waveguide 1 to waveguide 3. All by hand.
import { arrow } from '../lecture1/panels.js';
import { TAU, tag, axes, minus } from './draw.js';
import { R2, MODES3, coupler3, Z_CROSS } from './lattice.js';

const pic = (o) => () => o;
const f3 = (v) => minus(v.toFixed(3));
const MATRIX = `<div class="step-eq"><span>H =</span><table class="step-matrix" aria-label="The matrix H of three waveguides"><tbody>
  <tr><td>0</td><td>1</td><td>0</td></tr><tr><td>1</td><td>0</td><td>1</td></tr><tr><td>0</td><td>1</td><td>0</td></tr></tbody></table></div>`;
const START = [[0.6, 0], [0, 0.8], [0, 0]];                                // ψ = (0.6, 0.8i, 0)
const ONE = [[1, 0], [0, 0], [0, 0]];                                      // all light in waveguide 1
const vec = (v) => `(${v.map((x) => minus(Number(x.toFixed(3)))).join(', ')})`;

const steps = [
  { type: 'info', title: 'Three waveguides in nine small questions', button: 'Start',
    html: `<p class="step-text">Three waveguides lie next to each other. The light in them is described by three complex numbers, one for each waveguide:</p>
      <div class="step-formula">ψ = (ψ<sub>1</sub>, ψ<sub>2</sub>, ψ<sub>3</sub>)</div>
      <p class="step-text">|ψ<sub>n</sub>|² is the part of the light in waveguide n. The angle of ψ<sub>n</sub> is its phase. This list of numbers is the state.</p>
      <p class="step-text">You find out how the light moves from one waveguide to the next.</p>`,
    pic: pic({ kind: 'guides', psi: START, bars: true }) },
  { type: 'number', text: 'The state is ψ = (0.6, 0.8i, 0).', formula: '|ψ<sub>2</sub>|² = |0.8i|²', ask: 'How much of the light is in waveguide 2?', label: '|ψ₂|² =', unit: '', ref: 0.64, tol: 0.006, ph: '0.00',
    hint: 'The length of 0.8i is 0.8.', how: '|ψ₂|² = 0.8² = 0.64.',
    wrongs: [{ ref: 0.8, tol: 0.006, text: 'This is the length |ψ₂|. The part of the light is its square.' }, { ref: -0.64, tol: 0.006, text: 'This is (0.8i)², the square of the number. Take the square of its length: |0.8i| = 0.8.' },
      { ref: 64, tol: 0.6, text: 'Type it as a part of 1, not in per cent.' }],
    after: '0.64 of the light is in waveguide 2 and 0.6² = 0.36 in waveguide 1. Together 1: the state is normalised.',
    pic: (ok) => ({ kind: 'guides', psi: START, bars: true, values: ok }) },
  { type: 'number', text: 'The phase of ψ₂ = 0.8i is the angle of this complex number, counted from the positive real axis.', ask: 'What is the phase of ψ₂?', label: 'phase =', unit: '°', ref: 90, tol: 0.6, ph: '00',
    hint: 'The number i lies on the imaginary axis.', how: '0.8i points straight up in the complex plane: 90°.',
    wrongs: [{ ref: Math.PI / 2, tol: 0.011, text: 'This is the angle in radians. The field asks for degrees.' }, { ref: 0, tol: 0.6, text: '0° is the phase of ψ₁ = 0.6, a positive real number.' }],
    after: 'ψ₁ has the phase 0° and ψ₂ the phase 90°. The phases do not change the intensities now, but they decide where the light goes next.',
    pic: (ok) => ({ kind: 'guides', psi: START, bars: true, values: true, angle: ok }) },
  { type: 'choice', text: 'The light moves according to i dψ/dz = Hψ. z is the distance along the waveguides; it plays the role of time. With the coupling J = 1 between neighbours:', extra: MATRIX,
    ask: 'All the light starts in waveguide 1: ψ = (1, 0, 0). Which component of Hψ is not zero?', options: ['first', 'second', 'third'], ref: 'second',
    hint: 'Multiply each row of H with (1, 0, 0). Row 2 is (1, 0, 1).',
    after: 'Hψ = (0, 1, 0). So only ψ₂ changes at first: the light goes from waveguide 1 to waveguide 2. H couples neighbours only.',
    pic: (ok) => ({ kind: 'guides', psi: ONE, bars: true, flow: ok }) },
  { type: 'number', text: 'Some states keep their intensities for all z. They are the eigenvectors of H and are called supermodes: Hψ = E·ψ with one number E. Try ψ = (0.5, 0.707, 0.5).',
    ask: 'Calculate Hψ and find E.', label: 'E =', unit: '', ref: R2, tol: 0.003, ph: '0.000',
    hint: 'The first component of Hψ is 1 · ψ₂ = 0.707. Divide it by ψ₁ = 0.5.', how: 'Hψ = (0.707, 1, 0.707) = 1.414 · (0.5, 0.707, 0.5). So E = √2 = 1.414.',
    wrongs: [{ ref: 0.707, tol: 0.003, text: 'This is the first component of Hψ. Divide it by ψ₁ = 0.5.' }, { ref: 1, tol: 0.003, text: 'This is the second component of Hψ. Divide it by ψ₂ = 0.707.' }],
    after: 'E = √2. In this supermode all three waveguides have the same sign: they are in phase.',
    pic: (ok) => ({ kind: 'mode', v: MODES3[0].v, E: ok ? '√2 = 1.414' : '?' }) },
  { type: 'number', text: 'Now ψ = (0.707, 0, −0.707).', ask: 'Calculate Hψ. What is E?', label: 'E =', unit: '', ref: 0, tol: 0.001, ph: '0',
    hint: 'The second component of Hψ is 1 · ψ₁ + 1 · ψ₃.', how: 'Hψ = (0, 0.707 − 0.707, 0) = (0, 0, 0) = 0 · ψ. So E = 0.',
    after: 'E = 0. The light of waveguides 1 and 3 arrives in waveguide 2 with opposite signs and cancels.',
    pic: (ok) => ({ kind: 'mode', v: MODES3[1].v, E: ok ? '0' : '?' }) },
  { type: 'number', text: 'The third supermode is ψ = (0.5, −0.707, 0.5).', ask: 'What is E?', label: 'E =', unit: '', ref: -R2, tol: 0.003, ph: '−0.000',
    hint: 'The first component of Hψ is 1 · ψ₂ = −0.707. Divide it by ψ₁ = 0.5.', how: 'Hψ = (−0.707, 1, −0.707) = −1.414 · (0.5, −0.707, 0.5). So E = −√2 = −1.414.',
    wrongs: [{ ref: R2, tol: 0.003, text: 'Check the sign: ψ₂ is negative here.' }],
    after: 'The three supermodes have E = √2, 0 and −√2. Three waveguides, three supermodes.',
    pic: (ok) => ({ kind: 'mode', v: MODES3[2].v, E: ok ? '−√2 = −1.414' : '?' }) },
  { type: 'number', text: 'A supermode only turns its phase along z: ψ(z) = e<sup>−iEz</sup>·ψ(0). Take the first supermode, ψ(0) = (0.5, 0.707, 0.5), with E = √2.',
    ask: 'How much of the light is in waveguide 1 at z = 3?', label: '|ψ₁|² =', unit: '', ref: 0.25, tol: 0.006, ph: '0.00',
    hint: 'The factor e<sup>−iEz</sup> has the length 1.', how: '|ψ₁(3)|² = |e<sup>−iEz</sup>|² · 0.5² = 1 · 0.25 = 0.25.',
    wrongs: [{ ref: 0.5, tol: 0.006, text: 'This is the length |ψ₁|. The part of the light is its square.' }],
    after: '0.25 at every z: in a supermode only the phases turn, the intensities never change.',
    pic: (ok) => ({ kind: 'guides', psi: MODES3[0].v.map((a) => (ok ? [a * Math.cos(-3 * R2), a * Math.sin(-3 * R2)] : [a, 0])), bars: true, values: true, note: ok ? 'z = 3' : 'z = 0' }) },
  { type: 'number', text: 'Every other state is a sum of the three supermodes. How much of a supermode s a state ψ contains is told by the overlap:',
    formula: '<span class="nb">⟨s|ψ⟩ =</span> <span class="nb">s<sub>1</sub>*·ψ<sub>1</sub> + s<sub>2</sub>*·ψ<sub>2</sub> + s<sub>3</sub>*·ψ<sub>3</sub></span>',
    ask: 'Take ψ = (1, 0, 0) and the supermode s = (0.707, 0, −0.707). What is ⟨s|ψ⟩?', label: '⟨s|ψ⟩ =', unit: '', ref: R2 / 2, tol: 0.003, ph: '0.000',
    hint: 'The star means the complex conjugate; here all numbers are real, so it changes nothing. Only the first term is not zero: s₁ · ψ₁.', how: '⟨s|ψ⟩ = 0.707 · 1 + 0 · 0 + (−0.707) · 0 = 0.707.',
    wrongs: [{ ref: 0.5, tol: 0.003, text: 'This is |⟨s|ψ⟩|², the weight of this supermode. The question asks for the overlap itself.' }],
    after: 'The weight of this supermode is 0.707² = 0.5. With the other two overlaps, 0.5 and 0.5: the light in waveguide 1 is made of the three supermodes with the weights 0.25, 0.5 and 0.25.',
    pic: (ok) => ({ kind: 'mix', known: ok }) },
  { type: 'number', text: 'The three supermodes turn their phases at different rates E. That moves the light. For light that starts in waveguide 1, the part in waveguide 3 is',
    formula: '<span class="nb">|ψ<sub>3</sub>(z)|² =</span> <span class="nb">¼ · (1 − cos(√2 · z))²</span>',
    ask: 'At which z is all the light in waveguide 3 for the first time?', label: 'z =', unit: '', ref: Z_CROSS, tol: 0.01, ph: '0.00',
    hint: 'All the light means |ψ₃|² = 1. That needs cos(√2 · z) = −1, so √2 · z = π.', how: 'z = π/√2 = 2.22.',
    wrongs: [{ ref: Math.PI / 2, tol: 0.01, text: 'π/2 belongs to two waveguides. Here the condition is √2 · z = π.' }, { ref: Math.PI, tol: 0.01, text: 'The condition is √2 · z = π: divide π by √2.' },
      { ref: 2 * Z_CROSS, tol: 0.01, text: 'At z = 4.44 the light is back in waveguide 1. The question asks for waveguide 3.' }],
    after: 'At z = 2.22 the light has crossed from waveguide 1 to waveguide 3, and at z = 4.44 it is back. Three numbers and one matrix describe it all.',
    pic: (ok) => ({ kind: 'coupler', mark: ok }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">The state is a list of complex numbers. The matrix H moves the light between neighbours. The supermodes are its eigenvectors: they only turn their phase, and every other state is a sum of them.</p>
      <p class="step-text">Next: the same with twenty waveguides, and with your own program.</p>`,
    pic: pic({ kind: 'coupler', mark: true }) },
];

// ---------- pictures ----------
// three waveguides as circles: a bar for |ψ|², an arrow for the complex number ψ
function drawGuides(ctx, w, h, c, st) {
  const xs = [0.2, 0.5, 0.8].map((t) => t * w), y = h * 0.66, R = Math.min(w * 0.115, 48), top = y - R - 16, full = h * 0.36;
  ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 2;
  for (let n = 0; n < 2; n++) { ctx.beginPath(); ctx.moveTo(xs[n] + R, y); ctx.lineTo(xs[n + 1] - R, y); ctx.stroke(); tag(ctx, 'J', (xs[n] + xs[n + 1]) / 2, y - 12, { color: c['fg-2'], px: 13, wt: 500 }); }
  st.psi.forEach(([re, im], n) => {
    const I = re * re + im * im, col = c.v[n];
    ctx.fillStyle = c.surface; ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(xs[n], y, R, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xs[n] - R, y); ctx.lineTo(xs[n] + R, y); ctx.moveTo(xs[n], y - R); ctx.lineTo(xs[n], y + R); ctx.stroke();
    if (I > 1e-9) arrow(ctx, xs[n], y, xs[n] + 0.92 * R * re, y - 0.92 * R * im, col, 3, 10); else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xs[n], y, 3.5, 0, TAU); ctx.fill(); }
    if (st.bars) {
      ctx.fillStyle = c['surface-2']; ctx.fillRect(xs[n] - 17, top - full, 34, full);
      ctx.fillStyle = col; ctx.fillRect(xs[n] - 17, top - full * I, 34, full * I);
      if (st.values) tag(ctx, I.toFixed(2), xs[n], top - full * I - 10, { color: c.fg, px: 13 });
    }
    tag(ctx, `waveguide ${n + 1}`, xs[n], y + R + 16, { color: c['fg-2'], px: 12.5, wt: 500 });
  });
  if (st.angle) { ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(xs[1], y, R * 0.42, 0, -Math.PI / 2, true); ctx.stroke(); tag(ctx, '90°', xs[1] + R * 0.5, y - R * 0.5, { color: c.hpsi, px: 13, bg: c.surface }); }
  if (st.flow) arrow(ctx, xs[0] + R * 0.4, y - R - 34, xs[1] - R * 0.4, y - R - 34, c.hpsi, 2.6, 11);
  if (st.note) tag(ctx, st.note, w / 2, 20, { color: c.fg, px: 14 });
  return 'Each circle is the complex plane of one waveguide: the arrow is ψ, to the right is the real axis. The bar above it is |ψ|², the part of the light in this waveguide.';
}

// one supermode: the three amplitudes as bars, up for positive and down for negative
function drawMode(ctx, w, h, c, st) {
  const xs = [0.25, 0.5, 0.75].map((t) => t * w), y = h * 0.5, unit = h * 0.36;
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(w * 0.1, y); ctx.lineTo(w * 0.9, y); ctx.stroke();
  st.v.forEach((a, n) => {
    ctx.fillStyle = c.v[n]; ctx.fillRect(xs[n] - 26, a >= 0 ? y - unit * a : y, 52, unit * Math.abs(a));
    if (Math.abs(a) < 1e-9) { ctx.fillRect(xs[n] - 26, y - 1.5, 52, 3); }
    tag(ctx, f3(a), xs[n], a >= 0 ? y - unit * a - 13 : y - unit * a + 14, { color: c.fg, px: 14 });
    tag(ctx, `waveguide ${n + 1}`, xs[n], a >= 0 ? y + 18 : y - 16, { color: c['fg-2'], px: 12.5, wt: 500 });
  });
  tag(ctx, `E = ${st.E}`, w / 2, 26, { color: st.E === '?' ? c.hpsi : c.fg, px: 16 });
  return `The state ψ = ${vec(st.v)}: one bar for each waveguide, upward for a positive and downward for a negative number.`;
}

// ψ = (1, 0, 0) as a sum of the three supermodes with their weights
function drawMix(ctx, w, h, c, st) {
  const rows = [0.2, 0.5, 0.8].map((t) => t * h), unit = h * 0.11, x0 = w * 0.36, weights = ['0.25', st.known ? '0.5' : '?', '0.25'];
  MODES3.forEach((m, r) => {
    const y = rows[r];
    tag(ctx, `weight ${weights[r]}`, w * 0.04, y - 9, { color: weights[r] === '?' ? c.hpsi : c.fg, px: 14, align: 'left' });
    tag(ctx, `E = ${['√2', '0', '−√2'][r]}`, w * 0.04, y + 11, { color: c['fg-2'], px: 12.5, wt: 500, align: 'left' });
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(w * 0.96, y); ctx.stroke();
    m.v.forEach((a, n) => { const x = x0 + (w * 0.6 * (n + 0.5)) / 3; ctx.fillStyle = c.v[n]; ctx.fillRect(x - 20, a >= 0 ? y - unit * a * 2 : y, 40, unit * Math.abs(a) * 2); if (Math.abs(a) < 1e-9) ctx.fillRect(x - 20, y - 1.5, 40, 3); });
  });
  return 'The three supermodes, and how much of each the state ψ = (1, 0, 0) contains.';
}

// light that starts in waveguide 1: the three intensities along z
function drawCoupler(ctx, w, h, c, st) {
  const { X, Y } = axes(ctx, c, w, h, { xlim: [0, 5], ylim: [0, 1.05], xticks: [0, 1, 2, 3, 4, 5], yticks: [0, 0.5, 1], xlabel: 'z', ylabel: 'part of the light', pad: { t: 26 } });
  for (let n = 0; n < 3; n++) {
    ctx.strokeStyle = c.v[n]; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const z = (5 * i) / 200, v = coupler3(z)[n]; if (i) ctx.lineTo(X(z), Y(v)); else ctx.moveTo(X(z), Y(v)); }
    ctx.stroke();
  }
  tag(ctx, 'waveguide 1', X(0.12), Y(1) - 13, { color: c.v[0], px: 12.5, align: 'left' });
  tag(ctx, 'waveguide 2', X(1.11), Y(0.5) - 13, { color: c.v[1], px: 12.5, bg: c.surface });
  tag(ctx, 'waveguide 3', X(Z_CROSS) - 10, Y(1) - 13, { color: c.v[2], px: 12.5, align: 'left' });
  if (st.mark) { ctx.save(); ctx.strokeStyle = c.hpsi; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(Z_CROSS), Y(0)); ctx.lineTo(X(Z_CROSS), Y(1)); ctx.stroke(); ctx.restore(); tag(ctx, `z = ${Z_CROSS.toFixed(2)}`, X(Z_CROSS) + 6, Y(0.08), { color: c.hpsi, px: 12.5, align: 'left', bg: c.surface }); }
  return 'All the light starts in waveguide 1. The three curves show the part of the light in each waveguide along z.';
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'guides') return drawGuides(ctx, w, h, c, st);
  if (st.kind === 'mode') return drawMode(ctx, w, h, c, st);
  if (st.kind === 'mix') return drawMix(ctx, w, h, c, st);
  return drawCoupler(ctx, w, h, c, st);
}

export const three = { id: 'three', title: 'Three waveguides', steps, draw };
