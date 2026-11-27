// Exercise 3, fourth part: the on-site term of task 3. The A waveguides get +Δ and the B waveguides −Δ on the diagonal
// of H (Δ = 0.5): the edge state moves to E = ±Δ, the gap gets wider, and the Zak phase is no longer 0 or π.
import { tag, minus } from './draw.js';
import { sshEig, smallestPositive, bandSSH, zakSSH } from './lattice.js';
import { drawBonds, drawLevels } from './ssh.js';
import { drawBands } from './kspace.js';
import { CODE } from './code.js';

const PI = Math.PI, D = 0.5;
const pic = (o) => () => o;
const f = (v, d) => minus(v.toFixed(d));
const g12 = () => zakSSH(1, 2, D, 400).gamma / PI, g21 = () => zakSSH(2, 1, D, 400).gamma / PI;       // 0.708 and 0.037
const edge20 = () => smallestPositive(sshEig(20, 1, 2, D).values);                                   // 0.5000
const HK = '<div class="step-eq"><span>H(k) =</span><table class="step-matrix" aria-label="The matrix H(k) with the on-site term"><tbody><tr><td>Δ</td><td>h*</td></tr><tr><td>h</td><td>−Δ</td></tr></tbody></table></div>';
const SIGN = 'The sign is reversed. Check five things: the eigenvector of the lower eigenvalue; the minus in γ = −arg(…); the order in every overlap, ⟨u<sub>s</sub>|u<sub>s+1</sub>⟩ with the complex conjugate on the left vector; h = J₁ + J₂·e<sup>+ik</sup>; and +Δ in the upper left corner.';

const steps = [
  { type: 'info', title: 'Task 3 in six small questions', button: 'Start',
    html: `<p class="step-text">In the SSH chain so far all waveguides had the same propagation constant: the diagonal of H was zero. Task 3 changes this. The A waveguides (1, 3, 5, …) get +Δ on the diagonal, the B waveguides (2, 4, 6, …) get −Δ. This addition to the diagonal is called the on-site term.</p>
      <p class="step-text">Take Δ = 0.5. What happens to the edge state, to the gap and to the Zak phase?</p>`,
    pic: pic({ kind: 'bonds', n: 21, J1: 2, J2: 1, onsite: true }) },
  { type: 'number', text: 'Take the 21 waveguides with J₁ = 2, J₂ = 1. Their edge state ψ had Hψ = 0, and all its light was in the odd waveguides: these are A waveguides. With the new diagonal, Hψ gets one more term: +Δ · ψ in every A waveguide.',
    ask: 'What is the eigenvalue of the edge state now, for Δ = 0.5?', label: 'E =', unit: '', ref: D, tol: 0.006, ph: '0.0',
    hint: 'Before: Hψ = 0. Now: Hψ = 0 + Δ · ψ.', how: 'The couplings still give 0. The diagonal gives Δ · ψ in every waveguide that carries light. So Hψ = 0.5 · ψ: E = 0.5.',
    wrongs: [{ ref: -D, tol: 0.006, text: 'The odd waveguides are A waveguides: they get +Δ, not −Δ.' }, { ref: 0, tol: 0.006, text: 'The diagonal is not zero any more: it adds Δ · ψ in every A waveguide.' }],
    after: 'E = Δ = 0.5. The edge state keeps its shape and moves up together with the A waveguides, away from E = 0.',
    pic: (ok) => ({ kind: 'levels', N: 21, J1: 2, J2: 1, D: ok ? D : 0, shown: true, gap: true, mark: [10] }) },
  { type: 'number', text: 'Check it with your program: 21 waveguides, J₁ = 2, J₂ = 1, and on the diagonal +0.5 for the waveguides 1, 3, 5, … and −0.5 for 2, 4, 6, …',
    ask: 'Type eigenvalue number 11.', label: 'E =', unit: '', ref: () => sshEig(21, 2, 1, D).values[10], tol: 0.0006, ph: '0.0000',
    hint: 'Add the diagonal to the matrix of task 2. Number 11 is E[10] in Python and E(11) in MATLAB.',
    how: CODE.onsiteE,
    wrongs: [{ ref: -D, tol: 0.0006, text: 'The signs on the diagonal are exchanged: waveguide 1 gets +Δ.' }, { ref: 0, tol: 0.0006, text: 'This is the value without the diagonal. Add +Δ and −Δ in turn.' },
      { ref: () => sshEig(21, 2, 1, D).values[11], tol: 0.0006, text: 'This is eigenvalue number 12. Number 11 is E[10] in Python and E(11) in MATLAB.' }],
    after: 'E = 0.5, as you found by hand. All other eigenvalues moved a little away from zero.',
    pic: (ok) => ({ kind: 'levels', N: 21, J1: 2, J2: 1, D, shown: ok, gap: true, mark: ok ? [10] : [] }) },
  { type: 'number', text: 'In k-space the on-site term stands on the diagonal of H(k):', extra: `${HK}<p class="step-text">Hψ = E·ψ now reads <span class="nb">(E − Δ)·ψ<sub>A</sub> = h*·ψ<sub>B</sub></span> and <span class="nb">(E + Δ)·ψ<sub>B</sub> = h·ψ<sub>A</sub>.</span> Together: <span class="nb">E² − Δ² = |h|²,</span> so <span class="nb">E = ±√(Δ² + |h|²).</span></p>`,
    ask: 'At k = π the bands are closest: |h| = 1 for J₁ = 2, J₂ = 1. What is the upper eigenvalue there, for Δ = 0.5?', label: 'E =', unit: '', ref: () => bandSSH(PI, 2, 1, D), tol: 0.002, ph: '0.000',
    hint: '√(0.5² + 1²).', how: 'E = √(0.25 + 1) = √1.25 = 1.118.',
    wrongs: [{ ref: 1.5, tol: 0.002, text: 'Add the squares, not the numbers: √(0.5² + 1²).' }, { ref: 1.25, tol: 0.002, text: 'This is E². Take the square root.' }, { ref: 1, tol: 0.002, text: 'This is the value without the on-site term. Now E = √(Δ² + |h|²).' }],
    after: 'The gap now reaches from −1.118 to 1.118: the on-site term makes it wider. The edge state at E = 0.5 is inside the gap, but no longer in its middle.',
    pic: (ok) => ({ kind: 'bands', J1: 2, J2: 1, D, curves: true, at: ok ? [PI] : [], level: ok ? D : null }) },
  { type: 'choice', text: 'The chain of 20 waveguides with J₁ = 1, J₂ = 2 had two edge states near E = 0, one at each end. At the left end the light is in the waveguides 1, 3, 5, …: A waveguides. At the right end it is in the waveguides 20, 18, 16, …: B waveguides.',
    ask: 'Where do the two edge states go with Δ = 0.5?', options: ['both to +0.5', 'to +0.5 and −0.5', 'they stay near 0'], ref: 'to +0.5 and −0.5',
    hint: 'A waveguides get +Δ on the diagonal, B waveguides get −Δ.',
    after: () => `The left one, on A waveguides, moves to +0.5. The right one, on B waveguides, moves to −0.5. Check it with your program: the two eigenvalues closest to zero are ±${edge20().toFixed(4)}.`,
    pic: (ok) => ({ kind: 'levels', N: 20, J1: 1, J2: 2, D: ok ? D : 0, shown: true, gap: true, mark: [9, 10] }) },
  { type: 'number', text: 'Now the Zak phase. Use your function of task 8b with the new H(k), for J₁ = 1, J₂ = 2 and Δ = 0.5. Take M = 400 values of k.', extra: HK,
    ask: 'Type γ of the lower band, in units of π.', label: 'γ =', unit: 'π', ref: g12, tol: 0.003, mod: 2, ph: '0.000',
    hint: 'Only the matrix changes: +Δ in the upper left corner of H(k) and −Δ in the lower right corner.',
    how: CODE.onsiteZak,
    wrongs: [{ ref: () => -g12(), tol: 0.003, text: SIGN }, { ref: 1, tol: 0.003, mod: 2, text: 'This is γ without the on-site term. Put +Δ and −Δ on the diagonal of H(k).' },
      { ref: g21, tol: 0.003, text: 'This is the chain with J₁ = 2 and J₂ = 1. Here J₁ = 1 and J₂ = 2.' }],
    after: () => `γ = ${f(g12(), 3)}π: no longer π. Without the on-site term the long chain looks the same when it is turned around, with A and B exchanged; this symmetry allows only γ = 0 or π. With Δ on the diagonal A and B differ, the symmetry is gone, and γ can take any value.`,
    pic: (ok) => ({ kind: 'gamma', known: ok ? 1 : 0 }) },
  { type: 'number', text: 'And the other chain, J₁ = 2 and J₂ = 1, with the same Δ = 0.5 and M = 400.',
    ask: 'Type γ of the lower band, in units of π.', label: 'γ =', unit: 'π', ref: g21, tol: 0.003, mod: 2, ph: '0.000',
    hint: 'Only the two couplings change in the call of your function.',
    how: CODE.onsiteZak2,
    wrongs: [{ ref: () => -g21(), tol: 0.002, text: SIGN }, { ref: 0, tol: 0.002, text: 'This is γ without the on-site term. Put +Δ and −Δ on the diagonal of H(k).' },
      { ref: g12, tol: 0.003, text: 'This is the chain with J₁ = 1 and J₂ = 2. Exchange the two couplings.' }],
    after: () => `γ = ${f(g21(), 3)}π: no longer 0. With the on-site term the two chains have ${f(g12(), 3)}π and ${f(g21(), 3)}π in place of π and 0. A slow change of J₁, J₂ and Δ can now move γ continuously: this is used in the Thouless pump.`,
    pic: (ok) => ({ kind: 'gamma', known: ok ? 2 : 1 }) },
  { type: 'info', title: 'This part is done', end: true,
    html: `<p class="step-text">The on-site term moves an edge state to E = +Δ if it sits on A waveguides and to E = −Δ if it sits on B waveguides. It makes the gap wider, and it frees the Zak phase from the two values 0 and π.</p>
      <p class="step-text">Next: a lattice that changes slowly along z, the Thouless pump.</p>`,
    pic: pic({ kind: 'gamma', known: 2 }) },
];

// ---------- pictures ----------
// the Zak phase as an angle: the two chains without and with the on-site term
function drawGamma(ctx, w, h, c, st) {
  const R = Math.min(w * 0.16, h * 0.28), y = h * 0.44, cols = [{ x: w * 0.26, name: 'J₁ = 1, J₂ = 2', g0: 1, g: g12() }, { x: w * 0.74, name: 'J₁ = 2, J₂ = 1', g0: 0, g: g21() }];
  cols.forEach((o, n) => {
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(o.x, y, R, 0, 2 * PI); ctx.stroke();
    tag(ctx, '0', o.x + R + 10, y, { color: c['fg-2'], px: 12, wt: 500 }); tag(ctx, 'π', o.x - R - 10, y, { color: c['fg-2'], px: 12, wt: 500 }); tag(ctx, 'π/2', o.x, y - R - 11, { color: c['fg-2'], px: 12, wt: 500 });
    const hand = (g, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(o.x, y); ctx.lineTo(o.x + R * Math.cos(g * PI), y - R * Math.sin(g * PI)); ctx.stroke(); };
    hand(o.g0, c['fg-2'], 2);
    if (st.known > n) hand(o.g, c.hpsi, 3.4);
    tag(ctx, o.name, o.x, y + R + 22, { color: c.fg, px: 13 });
    tag(ctx, `Δ = 0: γ = ${o.g0 ? 'π' : '0'}`, o.x, y + R + 42, { color: c['fg-2'], px: 12.5, wt: 500 });
    tag(ctx, st.known > n ? `Δ = 0.5: γ = ${f(o.g, 3)}π` : 'Δ = 0.5: γ = ?', o.x, y + R + 60, { color: c.hpsi, px: 12.5 });
  });
  return 'The Zak phase of the lower band as an angle, for the two chains. Grey: without the on-site term. Orange: with Δ = 0.5.';
}

function draw(panel, st, c) {
  const { ctx, w, h } = panel;
  if (st.kind === 'bonds') return drawBonds(ctx, w, h, c, st);
  if (st.kind === 'levels') return drawLevels(ctx, w, h, c, st);
  if (st.kind === 'bands') return drawBands(ctx, w, h, c, st);
  return drawGamma(ctx, w, h, c, st);
}

export const onsite = { id: 'onsite', title: 'On-site term (task 3)', steps, draw };
