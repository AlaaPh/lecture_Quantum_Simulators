// Part 1: the Zak phase of the SSH chain from h(k) = J₁ + J₂e^{ik} at four values of k.
import { arrow } from '../lecture1/panels.js';
import { TAU, font } from './draw.js';

const KS = [0, Math.PI / 2, Math.PI, 1.5 * Math.PI];
const SETS = { A: { J1: 1, J2: 2 }, B: { J1: 2, J2: 1 } };
const points = (set) => KS.map((k) => ({ re: SETS[set].J1 + SETS[set].J2 * Math.cos(k), im: SETS[set].J2 * Math.sin(k) }));
const phi2 = (Math.atan2(2, 1) * 180) / Math.PI;                    // angle of 1 + 2i in degrees
const pic = (o) => () => o;

const steps = [
  { type: 'info', title: 'The Zak phase in ten small questions', button: 'Start',
    html: `<p class="step-text">The SSH chain has two waveguides in every unit cell, A and B. The coupling J₁ = 1 acts inside the cell, the coupling J₂ = 2 between one cell and the next.</p>
      <p class="step-text">For every wavenumber k, one complex number describes the chain:</p>
      <div class="step-formula">h(k) = J₁ + J₂·e<sup>ik</sup> = 1 + 2·e<sup>ik</sup></div>
      <p class="step-text">You calculate h at four values of k. From these four numbers you read the Zak phase γ.</p>`,
    pic: pic({ set: 'A', n: 0 }) },
  { type: 'complex', text: 'Start with k = 0.', formula: 'h = 1 + 2·e<sup>i·0</sup>', ref: { re: 3, im: 0 },
    hint: 'e<sup>i·0</sup> = 1.', how: 'h = 1 + 2·1 = 3. The real part is 3, the imaginary part is 0.',
    after: 'h = 3 is the first point in the picture.', pic: (ok) => ({ set: 'A', n: ok ? 1 : 0 }) },
  { type: 'complex', text: 'Now k = π/2.', formula: 'h = 1 + 2·e<sup>iπ/2</sup>', ref: { re: 1, im: 2 },
    hint: 'e<sup>iπ/2</sup> = i.', how: 'h = 1 + 2·i. The real part is 1, the imaginary part is 2.',
    after: 'The second point.', pic: (ok) => ({ set: 'A', n: ok ? 2 : 1 }) },
  { type: 'complex', text: 'Now k = π.', formula: 'h = 1 + 2·e<sup>iπ</sup>', ref: { re: -1, im: 0 },
    hint: 'e<sup>iπ</sup> = −1.', how: 'h = 1 + 2·(−1) = −1. The real part is −1, the imaginary part is 0.',
    after: 'The third point lies left of the origin.', pic: (ok) => ({ set: 'A', n: ok ? 3 : 2 }) },
  { type: 'complex', text: 'Now k = 3π/2.', formula: 'h = 1 + 2·e<sup>i·3π/2</sup>', ref: { re: 1, im: -2 },
    hint: 'e<sup>i·3π/2</sup> = −i.', how: 'h = 1 + 2·(−i) = 1 − 2i. The real part is 1, the imaginary part is −2.',
    after: 'Four points. At k = 2π, h is back at 3. All values of h lie on a circle with centre J₁ = 1 and radius J₂ = 2.',
    pic: (ok) => ({ set: 'A', n: ok ? 4 : 3, circle: ok }) },
  { type: 'choice', text: 'k runs once from 0 to 2π. Follow h in the picture: 1 → 2 → 3 → 4 → 1.',
    ask: 'How many times does h go around the origin (the ring)?', options: ['0', '1', '2'], ref: '1',
    hint: 'The ring marks the origin. Does the path of h enclose it?',
    after: 'Once. This number is called the winding number of h.', pic: pic({ set: 'A', n: 4, circle: true }) },
  { type: 'number', text: 'Every complex number has an angle φ, counted from the positive real axis. Take the second point, h = 1 + 2i.',
    formula: 'tan φ = Im h / Re h = 2 / 1', label: 'φ =', unit: '°', ref: phi2, tol: 0.06,
    hint: 'φ = arctan 2. Set your calculator to degrees.', how: 'φ = arctan 2 = 63.43°.',
    wrongs: [{ ref: (phi2 * Math.PI) / 180, tol: 0.011, text: 'This is the angle in radians. The field asks for degrees.' }],
    after: 'The four angles are 0°, 63.43°, 180° and 296.57°.',
    pic: (ok) => ({ set: 'A', n: 4, circle: true, rays: ok ? [0, 1, 2, 3] : [1], arc: true }) },
  { type: 'number', text: 'From each point to the next the angle φ grows by a step: 63.43°, then 116.57°, then 116.57°, then 63.43°. The last step leads back to the first point.',
    label: 'sum of the four steps =', unit: '°', ref: 360, tol: 0.06,
    hint: '63.43 + 116.57 + 116.57 + 63.43.', how: '63.43° + 116.57° + 116.57° + 63.43° = 360°.',
    wrongs: [{ ref: 2 * Math.PI, tol: 0.011, text: 'This is the angle in radians. The field asks for degrees.' }],
    after: '360°: one full turn, because h goes around the origin once.',
    pic: pic({ set: 'A', n: 4, circle: true, rays: [0, 1, 2, 3], steps: true }) },
  { type: 'number', text: 'The Zak phase is half of this turn. The reason: the formula of the lecture, γ = −arg(⟨u₁|u₂⟩⟨u₂|u₃⟩⟨u₃|u₄⟩⟨u₄|u₁⟩), takes from every pair of neighbours half of its step of φ.',
    formula: 'γ = ½ · 360°', label: 'γ =', unit: '°', ref: 180, tol: 0.06,
    hint: 'Half of 360°.', how: 'γ = 360°/2 = 180°.',
    wrongs: [{ ref: Math.PI, tol: 0.011, text: 'This is the angle in radians. The field asks for degrees.' }],
    after: 'γ = 180° = π. The chain with J₂ &gt; J₁ has the Zak phase π.',
    pic: pic({ set: 'A', n: 4, circle: true, rays: [0, 1, 2, 3], steps: true }) },
  { type: 'choice', text: 'Now exchange the two couplings: J₁ = 2, J₂ = 1. The picture shows the four new points. The circle has its centre at 2 and the radius 1.',
    ask: 'How many times does h go around the origin now?', options: ['0', '1', '2'], ref: '0',
    hint: 'Is the ring inside the new circle?',
    after: 'Not at all. The four steps of φ now add up to 0°.', pic: pic({ set: 'B', n: 4, circle: true }) },
  { type: 'choice', text: 'The Zak phase is half of the total turn of φ.', ask: 'So the Zak phase of this chain is', options: ['0', 'π'], ref: '0',
    hint: 'The total turn of φ is 0°.',
    after: 'γ = 0. The rule: if h goes around the origin once, γ = π (J₂ &gt; J₁). If it does not, γ = 0 (J₁ &gt; J₂).',
    pic: pic({ set: 'B', n: 4, circle: true, rays: [0, 1, 2, 3] }) },
  { type: 'info', title: 'Part 1 is done', end: true,
    html: `<p class="step-text">You have calculated both Zak phases of the SSH chain: π for J₁ = 1, J₂ = 2 and 0 for J₁ = 2, J₂ = 1.</p>
      <p class="step-text">Next: a lattice in which the light moves, a Thouless pump.</p>`,
    pic: pic({ set: 'A', n: 4, circle: true, both: true }) },
];

function draw(panel, st, c) {
  const ctx = panel.ctx, w = panel.w, h = panel.h;
  const x0 = -1.9, x1 = 3.9, yr = 2.7, s = Math.min((w - 20) / (x1 - x0), (h - 20) / (2 * yr));
  const ox = (w - s * (x1 - x0)) / 2 - s * x0, oy = h / 2, X = (re) => ox + s * re, Y = (im) => oy - s * im;
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(x0), oy); ctx.lineTo(X(x1), oy); ctx.moveTo(ox, Y(-yr)); ctx.lineTo(ox, Y(yr)); ctx.stroke();
  ctx.fillStyle = c['fg-2']; ctx.font = font(12, 400); ctx.textBaseline = 'top';
  const cen = SETS[st.both ? 'A' : st.set];       // a tick label where the circle crosses the axis stands outside the circle
  for (const v of [-1, 1, 2, 3]) {
    const cross = !st.both && Math.abs(Math.abs(v - cen.J1) - cen.J2) < 1e-9, side = cross ? Math.sign(v - cen.J1) : 0;
    ctx.beginPath(); ctx.moveTo(X(v), oy - 3); ctx.lineTo(X(v), oy + 3); ctx.stroke();
    ctx.textAlign = side < 0 ? 'right' : side > 0 ? 'left' : 'center'; ctx.fillText(String(v).replace('-', '−'), X(v) + 5 * side, oy + 9);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const v of [-2, -1, 1, 2]) { ctx.beginPath(); ctx.moveTo(ox - 3, Y(v)); ctx.lineTo(ox + 3, Y(v)); ctx.stroke(); ctx.fillText(String(v).replace('-', '−'), ox - 7, Y(v)); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('Re h', X(x1), oy - 6); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Im h', ox + 8, Y(yr) + 2);
  const drawSet = (set, { n, circle, rays, arc, steps: stepLabels, faint }) => {
    const { J1, J2 } = SETS[set], P = points(set), col = set === 'A' ? c.psi : c.v2;
    if (circle) {
      ctx.save(); ctx.globalAlpha = faint ? 0.55 : 1; ctx.strokeStyle = col; ctx.lineWidth = 2.2; if (faint) ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(X(J1), oy, s * J2, 0, TAU); ctx.stroke(); ctx.restore();
      const a = Math.PI / 4, b = a + 0.16;         // a small arrow head: k grows counter-clockwise
      arrow(ctx, X(J1 + J2 * Math.cos(a)), Y(J2 * Math.sin(a)), X(J1 + J2 * Math.cos(b)), Y(J2 * Math.sin(b)), col, 2.2, 9);
    }
    if (rays) for (const m of rays) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.hpsi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(X(P[m].re), Y(P[m].im)); ctx.stroke(); ctx.restore(); }
    if (arc) { const a = Math.atan2(P[1].im, P[1].re); ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 30, 0, -a, true); ctx.stroke(); ctx.fillStyle = c.hpsi; ctx.font = font(15, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('φ', ox + 36 * Math.cos(a / 2), oy - 36 * Math.sin(a / 2)); }
    if (stepLabels) {                              // the four steps of φ, written between neighbouring rays
      const txt = ['63.43°', '116.57°', '116.57°', '63.43°'], mid = [0.553, 2.124, -2.124, -0.553], rad = [0.95, 0.62, 0.62, 0.95];
      ctx.font = font(s < 60 ? 11.5 : 12.5, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      txt.forEach((t, m) => {
        const x = ox + rad[m] * s * Math.cos(mid[m]), y = oy - rad[m] * s * Math.sin(mid[m]), tw = ctx.measureText(t).width;
        ctx.fillStyle = c.surface; ctx.fillRect(x - tw / 2 - 2, y - 8, tw + 4, 16); ctx.fillStyle = c.hpsi; ctx.fillText(t, x, y);
      });
    }
    for (let m = 0; m < n; m++) {
      const p = P[m], dx = p.re - J1, dy = p.im, L = Math.hypot(dx, dy) || 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p.re), Y(p.im), 6, 0, TAU); ctx.fill();
      if (!faint) { ctx.fillStyle = c.fg; ctx.font = font(14, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(m + 1), X(p.re) + (18 * dx) / L, Y(p.im) - (18 * dy) / L); }
    }
  };
  if (st.both) { drawSet('B', { n: 4, circle: true, faint: true }); drawSet('A', { n: 4, circle: true }); } else drawSet(st.set, st);
  ctx.fillStyle = c.surface; ctx.strokeStyle = c.fg; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(ox, oy, 7, 0, TAU); ctx.fill(); ctx.stroke();   // the origin: a ring
  return st.both ? 'Solid: J₁ = 1, J₂ = 2, around the origin once, γ = π. Dashed: J₁ = 2, J₂ = 1, not around the origin, γ = 0.'
    : `h(k) in the complex plane for J₁ = ${SETS[st.set].J1}, J₂ = ${SETS[st.set].J2}. The ring is the origin.${st.n ? ' The numbers count the points in the order of k.' : ''}`;
}

export const zak = { id: 'zak', chip: '1 · Zak phase', next: 'the Thouless pump', steps, draw };
