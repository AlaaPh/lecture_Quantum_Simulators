// Exercise 3, third part: the Zak phase with the student's own program (task 8b). The overlap of two eigenvectors of
// the lower band, the product of the overlaps around the closed loop of k, γ = −arg of it for both chains, and why
// the free phases of the eigenvectors drop out.
import { TAU, tag, minus, dot } from './draw.js';
import { uLower, overlap2, zakSSH } from './lattice.js';
import { CODE } from './code.js';

const PI = Math.PI;
const pic = (o) => () => o;
const f = (v, d) => minus(v.toFixed(d));
const abs2 = (c) => Math.hypot(c[0], c[1]);
const ov = (J1, J2) => abs2(overlap2(uLower(0, J1, J2), uLower(PI / 2, J1, J2)));        // |⟨u(0)|u(π/2)⟩|
// one vector of the lower and one of the upper band: the upper one is (h*, E)/norm
const mixed = () => { const u = uLower(0, 1, 2), v = uLower(PI / 2, 1, 2); return abs2(overlap2(u, [[-v[0][0], -v[0][1]], v[1]])); };

const steps = [
  { type: 'info', title: 'The Zak phase with your program in five small questions', button: 'Start',
    html: `<p class="step-text">By hand you read the Zak phase from h(k). A program does not know h: it only gets eigenvectors. So it uses the formula of the lecture:</p>
      <div class="step-formula"><span class="nb">γ = −arg(</span> <span class="nb">⟨u<sub>1</sub>|u<sub>2</sub>⟩ · ⟨u<sub>2</sub>|u<sub>3</sub>⟩ · … · ⟨u<sub>M</sub>|u<sub>1</sub>⟩ )</span></div>
      <p class="step-text">u<sub>1</sub> … u<sub>M</sub> are the eigenvectors of the lower band at M values of k: 0, 2π/M, 2 · 2π/M, … The last overlap, ⟨u<sub>M</sub>|u<sub>1</sub>⟩, closes the loop.</p>
      <p class="step-text">This is task 8b. Take J₁ = 1 and J₂ = 2.</p>`,
    pic: pic({ kind: 'loop', M: 4, links: 0 }) },
  { type: 'number', text: 'Calculate the eigenvector of the lower band, the one with the lower eigenvalue of H(k), at k = 0 and at k = π/2. Call them u₁ and u₂. Their overlap is',
    formula: '<span class="nb">⟨u<sub>1</sub>|u<sub>2</sub>⟩ =</span> <span class="nb">u<sub>1A</sub>* · u<sub>2A</sub> + u<sub>1B</sub>* · u<sub>2B</sub></span>',
    ask: 'Type its absolute value.', label: '|⟨u₁|u₂⟩| =', unit: '', ref: () => ov(1, 2), tol: 0.0006, ph: '0.0000',
    hint: 'The star is the complex conjugate. np.vdot(u1, u2) in Python and u1\'*u2 in MATLAB take it for you.',
    how: CODE.zakOverlap,
    wrongs: [{ ref: () => ov(2, 1), tol: 0.0006, text: 'This is the chain with J₁ = 2 and J₂ = 1. Here J₁ = 1 and J₂ = 2.' },
      { ref: mixed, tol: 0.0006, text: 'One of your two vectors belongs to the upper band. Take the eigenvector of the lower eigenvalue both times.' },
      { ref: 1, tol: 0.0006, text: 'The two vectors are the same. Is the second one calculated at k = π/2, and is the matrix complex?' }],
    after: '0.8507 = cos 31.7°. Between these two k the angle φ of h turns by 63.43°, and the overlap takes half of it. Only the absolute value is fixed: the computer chooses the phase of every eigenvector freely, so the angle of one overlap alone means nothing.',
    pic: (ok) => ({ kind: 'loop', M: 4, links: 1, value: ok ? '0.8507' : '?' }) },
  { type: 'number', text: 'Now four values of k: 0, π/2, π and 3π/2, with the eigenvectors u₁, u₂, u₃, u₄. Multiply the four overlaps around the loop:',
    formula: '<span class="nb">⟨u<sub>1</sub>|u<sub>2</sub>⟩ · ⟨u<sub>2</sub>|u<sub>3</sub>⟩ ·</span> <span class="nb">⟨u<sub>3</sub>|u<sub>4</sub>⟩ · ⟨u<sub>4</sub>|u<sub>1</sub>⟩</span>',
    ask: 'Type the real part of this product.', label: 'Re =', unit: '', ref: () => zakSSH(1, 2, 0, 4).product[0], tol: 0.0006, ph: '−0.0000',
    hint: 'The fourth overlap is ⟨u₄|u₁⟩: it leads back to the first eigenvector.',
    how: CODE.zakFour,
    wrongs: [{ ref: () => zakSSH(2, 1, 0, 4).product[0], tol: 0.0006, text: 'This is the chain with J₁ = 2 and J₂ = 1. Here J₁ = 1 and J₂ = 2.' },
      { ref: 0.2, tol: 0.0006, text: 'Check the sign: the product is a negative number here.' }],
    after: 'The product is −0.2, a negative real number, whatever phases the computer chose. Its angle is π. So γ = −arg(−0.2) = π, as you found by hand (−π is the same angle).',
    pic: (ok) => ({ kind: 'loop', M: 4, links: 4, centre: ok ? 'product = −0.2' : 'product = ?' }) },
  { type: 'number', text: 'Put this into a function that takes M values of k, k = 2π · s/M with s = 0 … M − 1, and returns γ = −arg(product). Call it with M = 50.',
    ask: 'Type γ for J₁ = 1, J₂ = 2.', label: 'γ =', unit: 'π', ref: 1, tol: 0.006, mod: 2, ph: '0.00',
    hint: 'np.angle(p) in Python and angle(p) in MATLAB give arg of the complex number p, in radians. Divide by π.',
    how: CODE.zakLoop,
    wrongs: [{ ref: 0, tol: 0.006, text: 'γ = 0 belongs to J₁ = 2, J₂ = 1. If the couplings are right, check that the matrix is complex and that the last overlap closes the loop.' }],
    after: () => `γ = π. With M = 50 the product is ${f(zakSSH(1, 2, 0, 50).product[0], 3)}: its length depends on M, its angle does not. (M must not be too small: with M = 3 one overlap is exactly 0 here, and 0 has no angle.)`,
    pic: (ok) => ({ kind: 'loop', M: 50, links: 50, centre: ok ? 'γ = π' : 'γ = ?' }) },
  { type: 'number', text: 'Now the other chain, with the same function: J₁ = 2 and J₂ = 1.',
    ask: 'Type γ.', label: 'γ =', unit: 'π', ref: 0, tol: 0.006, mod: 2, ph: '0.00',
    hint: 'Only the two couplings change in the call of your function.',
    how: CODE.zakSwap,
    wrongs: [{ ref: 1, tol: 0.006, text: 'This is the chain with J₁ = 1, J₂ = 2. Exchange the two couplings in the call of your function.' }],
    after: 'γ = 0. The two chains have the same bands and different Zak phases. γ = π for J₂ &gt; J₁: this is the chain of 20 waveguides with an edge state at each end. γ = 0 for J₁ &gt; J₂: the chain without edge states.',
    pic: (ok) => ({ kind: 'loop', M: 50, links: 50, centre: ok ? 'γ = 0' : 'γ = ?' }) },
  { type: 'choice', text: 'An eigenvector multiplied by a phase factor e<sup>iχ</sup> is still an eigenvector, and the computer may return it with any χ. Suppose every u<sub>s</sub> gets its own random χ<sub>s</sub>.',
    ask: 'What happens to γ?', options: ['It stays the same', 'It changes by the sum of all χ', 'It becomes random'], ref: 'It stays the same',
    hint: 'Every u<sub>s</sub> stands twice in the product: once on the right, as |u<sub>s</sub>⟩, and once on the left, as ⟨u<sub>s</sub>|.',
    after: 'It stays the same. On the right u<sub>s</sub> brings the factor e<sup>iχ</sup>, on the left the complex conjugate e<sup>−iχ</sup>: together 1. This works only because the loop is closed, and it is why the formula uses a product around the whole range of k.',
    pic: pic({ kind: 'loop', M: 4, links: 4, phases: true }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">Your function calculates the Zak phase from eigenvectors alone: overlaps of neighbours, multiplied around the closed loop of k, and γ = −arg of the product. The free phases of the eigenvectors drop out.</p>
      <p class="step-text">Next: the on-site term of task 3.</p>`,
    pic: pic({ kind: 'loop', M: 50, links: 50, centre: 'γ = −arg(product)' }) },
];

// ---------- pictures ----------
// the values of k on a closed loop, one eigenvector at each, and the overlaps between neighbours
function drawLoop(ctx, w, h, c, st) {
  const cx = w / 2, cy = h / 2, R = Math.max(40, Math.min(w * 0.3, h / 2 - 54)), M = st.M, at = (s) => -PI / 2 + (TAU * s) / M;
  const P = (s, r = R) => [cx + r * Math.cos(at(s)), cy + r * Math.sin(at(s))];
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = c.hpsi; ctx.lineWidth = M > 10 ? 3 : 4; ctx.lineCap = 'butt';
  for (let s = 0; s < st.links; s++) { ctx.beginPath(); ctx.arc(cx, cy, R, at(s) + (M > 10 ? 0.02 : 0.1), at(s + 1) - (M > 10 ? 0.02 : 0.1)); ctx.stroke(); }
  for (let s = 0; s < M; s++) dot(ctx, ...P(s), M > 10 ? 3.5 : 8, c.psi);
  if (M === 4) {
    const names = ['u₁', 'u₂', 'u₃', 'u₄'], ks = ['k = 0', 'k = π/2', 'k = π', 'k = 3π/2'], ovs = ['⟨u₁|u₂⟩', '⟨u₂|u₃⟩', '⟨u₃|u₄⟩', '⟨u₄|u₁⟩'];
    for (let s = 0; s < 4; s++) {
      const [x, y] = P(s, R + 26), a = s === 1 ? 'left' : s === 3 ? 'right' : 'center';
      tag(ctx, names[s], x + (s === 1 ? -8 : s === 3 ? 8 : 0), y - (s === 0 ? 4 : s === 2 ? -4 : 8), { color: c.psi, px: 14, align: a });
      tag(ctx, ks[s], x + (s === 1 ? -8 : s === 3 ? 8 : 0), y + (s === 0 ? -22 : s === 2 ? 22 : 10), { color: c['fg-2'], px: 12, wt: 500, align: a });
      if (s < st.links && st.links > 1) tag(ctx, ovs[s], cx + R * 0.62 * Math.cos(at(s + 0.5)), cy + R * 0.62 * Math.sin(at(s + 0.5)), { color: c.hpsi, px: 12.5 });
    }
  } else { tag(ctx, 'k = 0', cx, cy - R - 16, { color: c['fg-2'], px: 12, wt: 500 }); tag(ctx, 'k = π', cx, cy + R + 16, { color: c['fg-2'], px: 12, wt: 500 }); tag(ctx, `${M} values of k`, cx, cy + (st.centre ? 22 : 0), { color: c['fg-2'], px: 12.5, wt: 500 }); }
  if (st.centre) tag(ctx, st.centre, cx, cy - (M === 4 ? 0 : 6), { color: c.fg, px: M === 4 ? 14 : 16 });
  if (st.links === 1 && st.value) tag(ctx, `|⟨u₁|u₂⟩| = ${st.value}`, cx, cy, { color: c.hpsi, px: 14 });
  if (st.phases) { tag(ctx, 'every uₛ becomes', cx, cy - 10, { color: c.fg, px: 13, wt: 500 }); tag(ctx, 'e^(iχₛ) · uₛ', cx, cy + 10, { color: c.fg, px: 14 }); }
  return M === 4 ? `The four values of k as points of a closed loop: k = 2π is the same as k = 0. At each point stands one eigenvector of the lower band. Orange: the overlaps that are multiplied.${st.phases ? ' Every eigenvector gets its own phase factor.' : ''}`
    : `${M} values of k on the closed loop, one eigenvector of the lower band at each. Orange: the ${M} overlaps of neighbours.`;
}

function draw(panel, st, c) { return drawLoop(panel.ctx, panel.w, panel.h, c, st); }

export const zakcode = { id: 'zakcode', title: 'Zak phase by program (task 8b)', steps, draw };
