// Physics of the workbook "Zak phase and Thouless pump". Every number the page shows or checks is computed here.
// No DOM: the module runs in the browser and in node (tools/test_zak_chern.mjs compares it with tools/zak_chern_numbers.json).
//
// Conventions (the same as on the page, in the code skeletons and on the worksheet):
//   H(k) = [[Δ, h*], [h, −Δ]],  h(k) = J1 + J2·e^{ik},  basis (A, B),  +Δ on A, −Δ on B,  J1 inside the unit cell
//   lower band = smallest eigenvalue
//   k_s = 2π(s − 1)/M, s = 1 … M  (2π is the same point as 0 and is not repeated)
//   Zak phase     γ = −arg( ⟨u_1|u_2⟩⟨u_2|u_3⟩ … ⟨u_M|u_1⟩ )
//   plaquette     F = −arg( ⟨a|b⟩⟨b|c⟩⟨c|d⟩⟨d|a⟩ ),  a = u(k, t), b = u(k, t+dt), c = u(k+dk, t+dt), d = u(k+dk, t)
//   Chern number  C = (sum of all F)/2π
//   position      X = Σ over cells m of m·(I_A,m + I_B,m), the cells counted from the cell where the light starts
//
// Data types: a complex number is { re, im }. A vector is an array of complex numbers.
// A Hermitian matrix is { re: rows, im: rows }, the form that hermEig of linalg.js takes.
// A time is given as s = t/T, the fraction of the pump cycle.
//
// Contents
//   complex numbers and vectors   cx, wrapAngle, toVector, withPhase, times, overlap, loopOverlaps, loopProduct, minOverlap, zak
//   H(k) of the chain             hOf, energy, hMatrix, lowerHand, upperHand, eigvec, kGrid, bandStates, zakOf, zakLimit, winding
//   pump cycle                    HAND, SHEET, pumpParams, notEnclosingParams, cycleState, pumpState, gapMin
//   plaquettes, Chern number      plaquette, gridStates, chernMap, cycleChern, pumpChern, unwrap, gammaCurve
//   open chain                    chain, chainLevels, chainEig, levelsOverCycle, inGapStates
//   propagation                   propagate, chainStep, position, norm2
//   2D lattices                   hofstadter, haldane, haldaneMass, chern2d, hofstadterChern, haldaneChern
//   reference values              steps() = { A, B, C } with the keys of tools/zak_chern_numbers.json
import { hermEig, sshChain } from '../linalg.js';

export const TAU = 2 * Math.PI;
const clamp1 = (x) => Math.max(-1, Math.min(1, x));
const int = (x) => Math.round(x) + 0;                 // nearest integer; + 0 turns −0 into 0

// ---------- complex numbers ----------
export const cx = {
  of: (re, im = 0) => ({ re, im }),
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
  conj: (a) => ({ re: a.re, im: -a.im }),
  abs: (a) => Math.hypot(a.re, a.im),
  arg: (a) => Math.atan2(a.im, a.re),               // angle in (−π, π]
  scale: (a, s) => ({ re: a.re * s, im: a.im * s }),  // s is a real number
  expi: (x) => ({ re: Math.cos(x), im: Math.sin(x) }), // e^{ix}
};

// An angle brought into (−π, π]. −π and π are the same angle: a value within 1e−9 of −π is returned as π.
export function wrapAngle(g) {
  let x = g - TAU * Math.floor((g + Math.PI) / TAU);
  if (x <= -Math.PI + 1e-9 || x > Math.PI) x = Math.PI;
  return x + 0;                                       // + 0 turns −0 into 0
}

// ---------- vectors ----------
// hermEig returns a vector as { re: [...], im: [...] }; this turns it into an array of complex numbers.
export const toVector = (p) => (Array.isArray(p) ? p : Array.from(p.re, (r, i) => ({ re: r, im: p.im[i] })));
// The vector times the phase factor e^{iχ}: the same eigenvector.
export const withPhase = (u, chi) => { const g = cx.expi(chi); return toVector(u).map((c) => cx.mul(c, g)); };
// The vector times any complex number z.
export const times = (u, z) => toVector(u).map((c) => cx.mul(c, z));

// Overlap ⟨u|v⟩ = Σ_i conj(u_i)·v_i, for vectors with two or with n components.
export function overlap(u, v) {
  const a = toVector(u), b = toVector(v);
  let re = 0, im = 0;
  for (let i = 0; i < a.length; i++) {
    re += a[i].re * b[i].re + a[i].im * b[i].im;
    im += a[i].re * b[i].im - a[i].im * b[i].re;
  }
  return { re, im };
}
// The overlaps of a closed loop: ⟨u_1|u_2⟩, ⟨u_2|u_3⟩, …, ⟨u_M|u_1⟩.
export const loopOverlaps = (us) => us.map((u, s) => overlap(u, us[(s + 1) % us.length]));
// Their product.
export function loopProduct(us) {
  let p = { re: 1, im: 0 };
  for (let s = 0; s < us.length; s++) p = cx.mul(p, overlap(us[s], us[(s + 1) % us.length]));
  return p;
}
// The smallest length of an overlap in the closed loop. If it is zero, the product is zero and has no phase.
export const minOverlap = (us) => Math.min(...loopOverlaps(us).map(cx.abs));
// −arg of a product of overlaps, in (−π, π]. A product of length below 1e−12 has no phase: the result is NaN.
const phaseOf = (p) => (cx.abs(p) < 1e-12 ? NaN : wrapAngle(-cx.arg(p)));
// Berry phase of the closed loop, γ = −arg(product of the overlaps), in (−π, π]. NaN if one overlap is zero.
export const zak = (us) => phaseOf(loopProduct(us));

// ---------- the Bloch Hamiltonian of the chain ----------
export const hOf = (k, J1, J2) => ({ re: J1 + J2 * Math.cos(k), im: J2 * Math.sin(k) });
// Bands at −energy and +energy.
export const energy = (k, J1, J2, D = 0) => Math.hypot(D, cx.abs(hOf(k, J1, J2)));
export function hMatrix(k, J1, J2, D = 0) {
  const h = hOf(k, J1, J2);
  return { re: [[D, h.re], [h.re, -D]], im: [[0, -h.im], [h.im, 0]] };
}
// Lower-band eigenvector with real, non-negative B component:
// u = (−sin(θ/2)·e^{−iφ}, cos(θ/2)), φ = angle of h, cos θ = Δ/E. Without on-site term this is (−e^{−iφ}, 1)/√2.
export function lowerHand(k, J1, J2, D = 0) {
  const h = hOf(k, J1, J2), a = cx.abs(h);
  if (a < 1e-13) return D > 0 ? [cx.of(0), cx.of(1)] : [cx.of(-1), cx.of(0)];
  const th = Math.acos(clamp1(D / Math.hypot(D, a))), phi = cx.arg(h), s = Math.sin(th / 2);
  return [{ re: -s * Math.cos(phi), im: s * Math.sin(phi) }, { re: Math.cos(th / 2), im: 0 }];
}
// Upper-band eigenvector with real, non-negative B component: u = (cos(θ/2)·e^{−iφ}, sin(θ/2)).
export function upperHand(k, J1, J2, D = 0) {
  const h = hOf(k, J1, J2), a = cx.abs(h);
  if (a < 1e-13) return D > 0 ? [cx.of(1), cx.of(0)] : [cx.of(0), cx.of(1)];
  const th = Math.acos(clamp1(D / Math.hypot(D, a))), phi = cx.arg(h), c = Math.cos(th / 2);
  return [{ re: c * Math.cos(phi), im: -c * Math.sin(phi) }, { re: Math.sin(th / 2), im: 0 }];
}
// The same eigenvector from a numerical diagonalisation (band 0 = lower, 1 = upper). Its phase is the one hermEig chooses.
export const eigenvector = (H, band = 0) => toVector(hermEig(H.re, H.im).vectors[band]);
export const eigvec = (k, J1, J2, D = 0, band = 0) => eigenvector(hMatrix(k, J1, J2, D), band);

// k_s = 2π(s − 1)/M for s = 1 … M, as an array with index s − 1.
export const kGrid = (M) => Array.from({ length: M }, (_, s) => (TAU * s) / M);
// The eigenvectors of one band on this grid. phases: optional array of M extra phases χ_s, u_s → e^{iχ_s}·u_s.
export function bandStates(J1, J2, D, M, { band = 0, phases = null } = {}) {
  const f = band === 1 ? upperHand : lowerHand;
  return kGrid(M).map((k, s) => (phases ? withPhase(f(k, J1, J2, D), phases[s]) : f(k, J1, J2, D)));
}
// Zak phase with M points. The extra phases do not change it.
export const zakOf = (J1, J2, D, M, opts = {}) => zak(bandStates(J1, J2, D, M, opts));
// The limit M → ∞ from the integral γ = ½∮ dφ/dk·(1 ∓ Δ/E) dk (− for the lower band, + for the upper band).
// Needs h(k) ≠ 0 for all k, that is |J1| ≠ |J2|; otherwise the result is NaN.
export function zakLimit(J1, J2, D = 0, { band = 0, n = 2000 } = {}) {
  if (Math.abs(Math.abs(J1) - Math.abs(J2)) < 1e-9) return NaN;
  const sign = band === 1 ? 1 : -1;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const k = (TAU * (i + 0.5)) / n, h = hOf(k, J1, J2), a2 = h.re * h.re + h.im * h.im;
    const dphi = (J2 * Math.cos(k) * h.re + J2 * Math.sin(k) * h.im) / a2;    // Re(J2·e^{ik}·h*)/|h|²
    sum += dphi * (1 + (sign * D) / Math.hypot(D, Math.sqrt(a2)));
  }
  return wrapAngle((0.5 * sum * TAU) / n);
}
// How often h(k) goes around the origin, counted on M points.
export function winding(J1, J2, M = 4) {
  const phi = kGrid(M).map((k) => cx.arg(hOf(k, J1, J2)));
  let sum = 0;
  for (let s = 0; s < M; s++) sum += wrapAngle(phi[(s + 1) % M] - phi[s]);
  return int(sum / TAU);
}

// ---------- the pump cycle of task 9 ----------
export const HAND = { dJ: 1, D0: 0.5 };      // numbers of the hand steps
export const SHEET = { dJ: 0.5, D0: 0.2 };   // numbers of the task sheet
// J1 = 1 + δJ·cos(2πs), J2 = 1 − δJ·cos(2πs), Δ = Δ0·sin(2πs), s = t/T.
export function pumpParams(s, dJ, D0) {
  const c = Math.cos(TAU * s);
  return { J1: 1 + dJ * c, J2: 1 - dJ * c, D: D0 * Math.sin(TAU * s) };
}
// A cycle that does not go around the point (J1 − J2, Δ) = (0, 0).
export const notEnclosingParams = (s) => ({ J1: 2.5 + 0.5 * Math.cos(TAU * s), J2: 1 - 0.5 * Math.cos(TAU * s), D: 0.2 * Math.sin(TAU * s) });
// u(k, s) of a cycle. paramsOf(s) returns { J1, J2, D }; sign = −1 runs the cycle backwards (Δ → −Δ).
export function cycleState(paramsOf, { band = 0, sign = 1 } = {}) {
  const f = band === 1 ? upperHand : lowerHand;
  return (k, s) => { const p = paramsOf(s); return f(k, p.J1, p.J2, sign * p.D); };
}
export const pumpState = (dJ, D0, opts = {}) => cycleState((s) => pumpParams(s, dJ, D0), opts);
// Smallest gap between the two bands over the whole cycle, with the place where it occurs.
export function gapMin(dJ, D0, ns = 4000) {
  const gaps = [];
  for (let j = 0; j < ns; j++) {
    const p = pumpParams(j / ns, dJ, D0);
    gaps.push(2 * Math.hypot(p.D, Math.abs(p.J1) - Math.abs(p.J2)));
  }
  const gap = Math.min(...gaps), s = [];
  gaps.forEach((g, j) => { if (g <= gap + 1e-9) s.push(j / ns); });
  const p = pumpParams(s[0], dJ, D0);
  return { gap, k: p.J1 * p.J2 >= 0 ? Math.PI : 0, s };
}

// ---------- plaquettes and the Chern number ----------
// Berry phase of one small square, F = −arg(⟨a|b⟩⟨b|c⟩⟨c|d⟩⟨d|a⟩), in (−π, π]. NaN if one overlap is zero.
// Walk: a = u(k, t) → b = u(k, t+dt) → c = u(k+dk, t+dt) → d = u(k+dk, t) → back to a.
export function plaquette(a, b, c, d) {
  return phaseOf(cx.mul(cx.mul(overlap(a, b), overlap(b, c)), cx.mul(overlap(c, d), overlap(d, a))));
}
// The N × N grid of eigenvectors, U[i][j] = ufun(2πi/N, j/N). Each grid point is computed once.
export const gridStates = (ufun, N) => Array.from({ length: N }, (_i, i) => Array.from({ length: N }, (_j, j) => ufun((TAU * i) / N, j / N)));
// All plaquettes: F[i][j] belongs to the k interval [k_i, k_i+1] and the time interval [t_j, t_j+1].
// colSums[j] = Σ_i F[i][j] is the sum of one time column, total = ΣF, chern = total/2π.
export function chernMap(ufun, N) {
  const U = gridStates(ufun, N), colSums = new Array(N).fill(0);
  let total = 0;
  const F = U.map((row, i) => row.map((_, j) => {
    const f = plaquette(U[i][j], U[i][(j + 1) % N], U[(i + 1) % N][(j + 1) % N], U[(i + 1) % N][j]);
    colSums[j] += f; total += f;
    return f;
  }));
  return { F, colSums, total, chern: total / TAU };
}
export const cycleChern = (paramsOf, N, opts = {}) => chernMap(cycleState(paramsOf, opts), N).chern;
export const pumpChern = (dJ, D0, N, opts = {}) => chernMap(pumpState(dJ, D0, opts), N).chern;

// The differences between neighbouring values are brought into [−π, π] (the rule of numpy.unwrap and of MATLAB unwrap).
export function unwrap(raw) {
  const out = [raw[0]];
  for (let j = 1; j < raw.length; j++) {
    const dd = raw[j] - raw[j - 1];
    let d = dd - TAU * Math.floor((dd + Math.PI) / TAU);
    if (d === -Math.PI && dd > 0) d = Math.PI;
    out.push(out[j - 1] + d);
  }
  return out;
}
// Zak phase over the cycle at s = 0, 1/nt, …, 1 with M points in k: raw values in (−π, π] and unwrapped values.
// chern = (γ_end − γ_start)/2π of the unwrapped values.
export function gammaCurve(dJ, D0, M, nt, { band = 0 } = {}) {
  const s = Array.from({ length: nt + 1 }, (_, j) => j / nt);
  const raw = s.map((x) => { const p = pumpParams(x, dJ, D0); return zakOf(p.J1, p.J2, p.D, M, { band }); });
  const unwrapped = unwrap(raw);
  return { s, raw, unwrapped, chern: (unwrapped[nt] - unwrapped[0]) / TAU };
}

// ---------- the open chain in real space ----------
// Nc unit cells = 2·Nc waveguides. Guide 2m is A of cell m (on-site +Δ), guide 2m+1 is B (−Δ);
// J1 couples A and B of one cell, J2 couples B to the A of the next cell. Real symmetric matrix as an array of rows.
export const chain = (Nc, J1, J2, D = 0) => sshChain(2 * Nc, J1, J2, D);

// Eigenvalues, sorted, and on request the eigenvectors of a real symmetric tridiagonal matrix (diagonal d, off-diagonal e).
// Implicit QL iteration. For the chain this is about twenty times faster than symEig, which works on the full matrix.
function triEig(dIn, eIn, wantVectors = false) {
  const n = dIn.length, d = Float64Array.from(dIn), e = new Float64Array(n);
  const z = wantVectors ? Array.from({ length: n }, (_, j) => { const col = new Float64Array(n); col[j] = 1; return col; }) : null;   // z[j] = eigenvector j
  let scale = 0;
  for (let i = 0; i < n; i++) scale = Math.max(scale, Math.abs(d[i]));
  for (let i = 0; i < n - 1; i++) { e[i] = eIn[i]; scale = Math.max(scale, Math.abs(e[i])); }
  const tiny = Number.EPSILON * scale;
  for (let l = 0; l < n; l++) {
    for (let iter = 0; ; iter++) {
      let m = l;
      for (; m < n - 1; m++) if (Math.abs(e[m]) <= Number.EPSILON * (Math.abs(d[m]) + Math.abs(d[m + 1])) + tiny) break;
      if (m === l) break;
      if (iter === 200) throw new Error('triEig: no convergence');
      let g = (d[l + 1] - d[l]) / (2 * e[l]), r = Math.hypot(g, 1);
      g = d[m] - d[l] + e[l] / (g + (g >= 0 ? r : -r));
      let s = 1, c = 1, p = 0, i = m - 1;
      for (; i >= l; i--) {
        const f = s * e[i], b = c * e[i];
        r = Math.hypot(f, g);
        e[i + 1] = r;
        if (r === 0) { d[i + 1] -= p; e[m] = 0; break; }
        s = f / r; c = g / r;
        g = d[i + 1] - p;
        r = (d[i] - g) * s + 2 * c * b;
        p = s * r;
        d[i + 1] = g + p;
        g = c * r - b;
        if (z) { const za = z[i], zb = z[i + 1]; for (let k = 0; k < n; k++) { const t = zb[k]; zb[k] = s * za[k] + c * t; za[k] = c * za[k] - s * t; } }
      }
      if (r === 0 && i >= l) continue;
      d[l] -= p; e[l] = g; e[m] = 0;
    }
  }
  const order = Array.from({ length: n }, (_, j) => j).sort((a, b) => d[a] - d[b]);
  return { values: order.map((j) => d[j]), vectors: z ? order.map((j) => Array.from(z[j])) : null };
}
const chainDiagonal = (Nc, D) => Array.from({ length: 2 * Nc }, (_, j) => (j % 2 === 0 ? D : -D));
const chainBonds = (Nc, J1, J2) => Array.from({ length: 2 * Nc - 1 }, (_, j) => (j % 2 === 0 ? J1 : J2));
// All 2·Nc eigenvalues of the open chain, sorted. Fast: use it for the eigenvalues over t/T.
export const chainLevels = (Nc, J1, J2, D = 0) => triEig(chainDiagonal(Nc, D), chainBonds(Nc, J1, J2)).values;
// Eigenvalues and eigenvectors of the open chain: { values: [E_1 <= E_2 <= …], vectors: [v_1, v_2, …] }, as symEig returns them.
export const chainEig = (Nc, J1, J2, D = 0) => triEig(chainDiagonal(Nc, D), chainBonds(Nc, J1, J2), true);
// Eigenvalues over the cycle: levels[j] at s[j] = j/nt, with the edge of the bulk bands, edge = √(Δ² + (J1 − J2)²).
export function levelsOverCycle(dJ, D0, Nc, nt) {
  const s = Array.from({ length: nt + 1 }, (_, j) => j / nt);
  const pars = s.map((x) => pumpParams(x, dJ, D0));
  return { s, levels: pars.map((p) => chainLevels(Nc, p.J1, p.J2, p.D)), edge: pars.map((p) => Math.hypot(p.D, p.J1 - p.J2)), D: pars.map((p) => p.D) };
}
// Eigenstates of the open chain inside the gap at time s: |E| < √(Δ² + (J1 − J2)²).
// end: the half of the chain that holds more than half of the light. weightA: share of the light on A guides.
// Near Δ = 0 the two states have the same eigenvalue, and any two combinations of them are eigenvectors. If the two
// eigenvalues differ by less than 1e−9, the function returns the combination at the left end and the one at the right end.
export function inGapStates(s, dJ, D0, Nc = 40) {
  const { J1, J2, D } = pumpParams(s, dJ, D0), edge = Math.hypot(D, J1 - J2);
  const eig = chainEig(Nc, J1, J2, D), found = [];
  eig.values.forEach((E, i) => { if (Math.abs(E) < edge - 1e-7) found.push({ E, index: i, vector: eig.vectors[i] }); });
  if (found.length === 2 && Math.abs(found[0].E - found[1].E) < 1e-9) {
    const [p, q] = found, v = p.vector, w = q.vector;
    let a = 0, b = 0, c = 0;                                   // the left half of the chain in the basis (v, w)
    for (let j = 0; j < Nc; j++) { a += v[j] * v[j]; b += v[j] * w[j]; c += w[j] * w[j]; }
    const th = 0.5 * Math.atan2(2 * b, a - c), ct = Math.cos(th), st = Math.sin(th);
    p.vector = v.map((x, j) => ct * x + st * w[j]); q.vector = v.map((x, j) => -st * x + ct * w[j]);   // left, right
    [p.E, q.E] = [ct * ct * p.E + st * st * q.E, st * st * p.E + ct * ct * q.E];
    if (p.E > q.E) { found.reverse(); [found[0].index, found[1].index] = [found[1].index, found[0].index]; }
  }
  const states = found.map(({ E, index, vector }) => {
    let left = 0, onA = 0;
    for (let j = 0; j < vector.length; j++) { const pr = vector[j] * vector[j]; if (j < Nc) left += pr; if (j % 2 === 0) onA += pr; }
    return { E, end: left > 0.5 ? 'left' : 'right', weightA: onA, index, vector };
  });
  return { J1, J2, D, edge, values: eig.values, states };
}

// ---------- propagation, i dψ/dt = H(t)ψ ----------
// y = H·x for the chain, without building the matrix.
function chainApply(x, y, J1, J2, D) {
  const n = x.length;
  for (let j = 0; j < n; j += 2) y[j] = D * x[j] + J1 * x[j + 1] + (j > 0 ? J2 * x[j - 1] : 0);
  for (let j = 1; j < n; j += 2) y[j] = -D * x[j] + J1 * x[j - 1] + (j < n - 1 ? J2 * x[j + 1] : 0);
}
// One Runge–Kutta 4 step of length h. pa, pm, pb = { J1, J2, D } at t, t + h/2 and t + h. psi = { re, im } is overwritten.
// w is the work space of makeWork. dψ/dt = −iHψ means d(re)/dt = H·im and d(im)/dt = −H·re.
function rk4Chain(psi, pa, pm, pb, h, w) {
  const { re, im } = psi, n = re.length;
  const f = (xr, xi, p, kr, ki) => { chainApply(xi, kr, p.J1, p.J2, p.D); chainApply(xr, ki, p.J1, p.J2, p.D); for (let j = 0; j < n; j++) ki[j] = -ki[j]; };
  const shift = (kr, ki, c) => { for (let j = 0; j < n; j++) { w.tr[j] = re[j] + c * kr[j]; w.ti[j] = im[j] + c * ki[j]; } };
  f(re, im, pa, w.k1r, w.k1i);
  shift(w.k1r, w.k1i, h / 2); f(w.tr, w.ti, pm, w.k2r, w.k2i);
  shift(w.k2r, w.k2i, h / 2); f(w.tr, w.ti, pm, w.k3r, w.k3i);
  shift(w.k3r, w.k3i, h); f(w.tr, w.ti, pb, w.k4r, w.k4i);
  for (let j = 0; j < n; j++) {
    re[j] += (h / 6) * (w.k1r[j] + 2 * w.k2r[j] + 2 * w.k3r[j] + w.k4r[j]);
    im[j] += (h / 6) * (w.k1i[j] + 2 * w.k2i[j] + 2 * w.k3i[j] + w.k4i[j]);
  }
}
const makeWork = (n) => Object.fromEntries(['tr', 'ti', 'k1r', 'k1i', 'k2r', 'k2i', 'k3r', 'k3i', 'k4r', 'k4i'].map((key) => [key, new Float64Array(n)]));
// The same step for a caller that keeps its own state: returns the new { re, im }, the input is not changed.
export function chainStep(psi, pa, pm, pb, h) {
  const out = { re: Float64Array.from(psi.re), im: Float64Array.from(psi.im) };
  rk4Chain(out, pa, pm, pb, h, makeWork(out.re.length));
  return out;
}
// Position of the light, X = Σ_m (m − m0)·(I_A,m + I_B,m), and the norm Σ|ψ|².
// m0 is the cell from which the cells are counted: 0 counts from the left end of the chain,
// the cell of the input counts from the cell where the light starts, so that X = 0 at the start.
export function position(re, im, m0 = 0) {
  let x = 0;
  for (let j = 0; j < re.length; j++) x += ((j >> 1) - m0) * (re[j] * re[j] + im[j] * im[j]);
  return x;
}
export function norm2(re, im) {
  let s = 0;
  for (let j = 0; j < re.length; j++) s += re[j] * re[j] + im[j] * im[j];
  return s;
}
// Light through the pump of task 9: Nc cells, period T, Runge–Kutta 4 with H at t, t + dt/2 and t + dt.
// input: 'pair'  = (A − B)/√2 on the cell in the middle (the lower band at t = 0),
//        'guide' = guide A of that cell alone,
//        'upper' = (A + B)/√2 on that cell (the upper band at t = 0).
// The number of steps per cycle is n = round(T/dt); the step used is T/n, so that a cycle closes exactly.
// The position is given in two countings of the cells:
//   Xstart  the cells are counted from the cell m0 where the light starts, so Xstart = 0 at the start. This is the
//           counting of the page, of the worksheet and of the code skeletons.
//   X       the cells are counted from the left end of the chain, and X(0) is subtracted. The Runge–Kutta step loses
//           a little norm, and this loss times m0 enters X (1·10⁻³ for T = 100, 120 cells, dt = 0.05):
//           X = Xstart − m0·(1 − Σ|ψ|²).
// onStep({ step, t, X, Xstart, re, im }) is called before the first step and after every step;
// re and im are the live arrays (copy them if you keep them).
// samples: the positions are recorded every floor(n/samples) steps and at the end of each cycle. cycles: number of cycles.
// Choose Nc so large that the light does not reach the ends (60 cells for T = 50, 120 cells for T = 100).
// Returns { shiftStart, shift, norm, centreShift, t, Xstart, X, shifts, X0, m0, n, dt, re, im }:
// shiftStart = Xstart(T) and shift = X(T) of the first cycle, norm = Σ|ψ|² after it, t the recorded times, Xstart and X
// the recorded positions (starting with 0), shifts the change of X in each cycle, re and im the final state.
// centreShift is the shift of X/Σ|ψ|², which has no error from the loss of norm.
export function propagate(dJ, D0, T, Nc, dt, { input = 'pair', onStep = null, samples = 16, cycles = 1 } = {}) {
  const N = 2 * Nc, n = Math.max(1, Math.round(T / dt)), h = T / n, m0 = Math.floor(Nc / 2);
  const psi = { re: new Float64Array(N), im: new Float64Array(N) }, w = makeWork(N);
  if (input === 'guide') psi.re[2 * m0] = 1;
  else { psi.re[2 * m0] = Math.SQRT1_2; psi.re[2 * m0 + 1] = input === 'upper' ? Math.SQRT1_2 : -Math.SQRT1_2; }
  const X0 = position(psi.re, psi.im), every = Math.max(1, Math.floor(n / samples));
  const ts = [0], Xs = [0], Xst = [0], shifts = [];
  let shift = 0, shiftStart = 0, norm = 1, last = 0;
  if (onStep) onStep({ step: 0, t: 0, X: 0, Xstart: 0, re: psi.re, im: psi.im });
  for (let i = 0; i < n * cycles; i++) {
    const t = i * h;
    rk4Chain(psi, pumpParams(t / T, dJ, D0), pumpParams((t + h / 2) / T, dJ, D0), pumpParams((t + h) / T, dJ, D0), h, w);
    const step = i + 1, record = step % every === 0, endOfCycle = step % n === 0;
    if (record || endOfCycle || onStep) {
      const X = position(psi.re, psi.im) - X0, Xstart = position(psi.re, psi.im, m0);
      if (record || endOfCycle) { ts.push(step * h); Xs.push(X); Xst.push(Xstart); }
      if (endOfCycle) { shifts.push(X - last); last = X; if (step === n) { shift = X; shiftStart = Xstart; norm = norm2(psi.re, psi.im); } }
      if (onStep) onStep({ step, t: step * h, X, Xstart, re: psi.re, im: psi.im });
    }
  }
  return { shiftStart, shift, norm, centreShift: (X0 + shift) / norm - X0, t: ts, Xstart: Xst, X: Xs, shifts, X0, m0, n, dt: h, re: Array.from(psi.re), im: Array.from(psi.im) };
}

// ---------- 2D lattices: the same plaquettes, the second variable in place of t ----------
// Harper–Hofstadter, flux 1/3, cell of three sites: diagonal 2cos(k_y + 2πj/3), couplings 1,
// and the phase e^{∓iκ} on the link that leaves the cell (κ = 3k_x): H[2][0] = e^{iκ}, H[0][2] = e^{−iκ}.
export function hofstadter(kappa, ky) {
  const re = [[0, 1, 0], [1, 0, 1], [0, 1, 0]], im = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let j = 0; j < 3; j++) re[j][j] = 2 * Math.cos(ky + (TAU * j) / 3);
  re[2][0] += Math.cos(kappa); im[2][0] += Math.sin(kappa);
  re[0][2] += Math.cos(kappa); im[0][2] -= Math.sin(kappa);
  return { re, im };
}
// Haldane model in the variables k1 = k·a1, k2 = k·a2: f = t1(1 + e^{−ik1} + e^{−ik2}),
// H = [[m + 2t2(cos φ_H·c + sin φ_H·s), f], [f*, −m + 2t2(cos φ_H·c − sin φ_H·s)]],
// s = sin k1 + sin(k2 − k1) − sin k2, c = cos k1 + cos(k2 − k1) + cos k2.
export function haldane(k1, k2, m, t2 = 0.1, phiH = Math.PI / 2, t1 = 1) {
  const fr = t1 * (1 + Math.cos(k1) + Math.cos(k2)), fi = -t1 * (Math.sin(k1) + Math.sin(k2));
  const s = Math.sin(k1) + Math.sin(k2 - k1) - Math.sin(k2), c = Math.cos(k1) + Math.cos(k2 - k1) + Math.cos(k2);
  const dA = m + 2 * t2 * (Math.cos(phiH) * c + Math.sin(phiH) * s), dB = -m + 2 * t2 * (Math.cos(phiH) * c - Math.sin(phiH) * s);
  return { re: [[dA, fr], [fr, dB]], im: [[0, fi], [-fi, 0]] };
}
// Half the difference of the two diagonal entries: the on-site term that the point (k1, k2) sees.
export const haldaneMass = (k1, k2, m, t2 = 0.1, phiH = Math.PI / 2) => { const H = haldane(k1, k2, m, t2, phiH); return (H.re[0][0] - H.re[1][1]) / 2; };
export const HALDANE_K = [TAU / 3, (2 * TAU) / 3];        // the points where f = 0
export const HALDANE_KPRIME = [(2 * TAU) / 3, TAU / 3];
// Plaquettes of one band of a 2D lattice on an N × N grid: Hfun(x, y) is called at x = 2πi/N, y = 2πj/N.
// Eigenvectors from hermEig. Returns { F, colSums, total, chern } as chernMap.
export const chern2d = (Hfun, N, band = 0) => chernMap((x, s) => eigenvector(Hfun(x, TAU * s), band), N);
export const hofstadterChern = (N = 6) => [0, 1, 2].map((band) => int(chern2d(hofstadter, N, band).chern));
export const haldaneChern = (m, t2 = 0.1, phiH = Math.PI / 2, N = 6) => int(chern2d((a, b) => haldane(a, b, m, t2, phiH), N, 0).chern);

// ---------- reference values of all steps ----------
// The keys are those of tools/zak_chern_numbers.json. Values are not rounded; a complex number is { re, im }.
// Angles: *_over_pi in units of π, *_deg in degrees. Each part (A, C, and each step B1 … B8) is computed when it is
// first read and then kept: steps().B.B5 does not run the propagation of B3.
const deg = (x) => (x * 180) / Math.PI;
const prod = (zs) => zs.reduce((p, z) => cx.mul(p, z), { re: 1, im: 0 });

function sshSet(J1, J2) {
  const ks = kGrid(4), hs = ks.map((k) => hOf(k, J1, J2)), us = ks.map((k) => lowerHand(k, J1, J2, 0));
  const ov = loopOverlaps(us), angles = ov.map((o) => deg(-cx.arg(o))), u2 = times(us[1], { re: 0, im: 1 });
  const ov12 = overlap(us[0], u2), ov23 = overlap(u2, us[2]), p100 = loopProduct(bandStates(J1, J2, 0, 100));
  return {
    J1, J2, k_over_pi: ks.map((k) => k / Math.PI),
    h: hs, phi_deg: hs.map((h) => deg(cx.arg(h))), E: hs.map((h) => -cx.abs(h)),
    uA: us.map((u) => u[0]), uB: us[0][1].re,
    winding: winding(J1, J2, 4),
    ov, ov_len: ov.map(cx.abs), ov_angle_deg: angles,
    prod: prod(ov), prod_len: cx.abs(prod(ov)), angle_sum_deg: angles.reduce((a, b) => a + b, 0),
    gamma_over_pi: zak(us) / Math.PI,
    open_prod: prod(ov.slice(0, 3)),                          // the mistake "loop not closed"
    A4: { ov12, ov23, prod: prod([ov12, ov23, ov[2], ov[3]]) },
    prod_M100: p100, gamma_M100_over_pi: phaseOf(p100) / Math.PI,
  };
}
function onsiteSet(J1, J2, D) {
  const z = (M, band = 0) => zakOf(J1, J2, D, M, { band }) / Math.PI;
  return { D, M4_over_pi: z(4), M100_over_pi: z(100), M400_over_pi: z(400), limit_over_pi: zakLimit(J1, J2, D) / Math.PI, upper_band_M400_over_pi: z(400, 1) };
}
// An object whose entries are computed when they are first read.
function lazy(parts) {
  const out = {};
  for (const [key, make] of Object.entries(parts)) {
    let value, done = false;
    Object.defineProperty(out, key, { enumerable: true, get() { if (!done) { value = make(); done = true; } return value; } });
  }
  return out;
}
let partA = null, partB = null, partC = null, all = null;

export function stepsA() {
  if (partA) return partA;
  const w = lowerHand(0.3, 0, 4, 3).map((c) => c.re * c.re + c.im * c.im);
  partA = {
    set1: sshSet(1, 2), set2: sshSet(2, 1),
    A7: {
      exact: { J1: 0, J2: 4, D: 3, gamma_over_pi: zakLimit(0, 4, 3) / Math.PI, gamma_over_pi_M4: zakOf(0, 4, 3, 4) / Math.PI, gamma_over_pi_M400: zakOf(0, 4, 3, 400) / Math.PI, weight_A: w[0], weight_B: w[1] },
      set1: onsiteSet(1, 2, 0.5), set2: onsiteSet(2, 1, 0.5),
    },
  };
  return partA;
}

export function stepsB() {
  if (partB) return partB;
  const { dJ, D0 } = HAND, par = (s, set = HAND) => pumpParams(s, set.dJ, set.D0);
  partB = lazy({
    hand: () => ({ ...HAND }),
    sheet: () => ({ ...SHEET }),
    B1: () => {
      const E3 = (s) => [0, Math.PI / 2, Math.PI].map((k) => { const p = par(s); return energy(k, p.J1, p.J2, p.D); });
      const gHand = gapMin(dJ, D0), gSheet = gapMin(SHEET.dJ, SHEET.D0);
      return { E: { t0: E3(0), tq: E3(0.25), th: E3(0.5) }, gap_min: gHand.gap, gap_min_sheet: gSheet.gap, gap_min_k_over_pi: gHand.k / Math.PI, gap_min_t_over_T: gHand.s };
    },
    B2: () => {
      const ingap = (s, set = HAND, Nc = 40) => inGapStates(s, set.dJ, set.D0, Nc).states.map((st) => ({ E: st.E, end: st.end, weight_A: st.weightA }));
      const out = { cells: 40 };
      for (const [tag, s] of [['t0125', 0.125], ['t03', 0.3], ['t0375', 0.375], ['t05', 0.5], ['t0625', 0.625]]) out[tag] = { Delta: par(s).D, ingap: ingap(s) };
      out.sheet_t0375 = ingap(0.375, SHEET);
      return out;
    },
    B3: () => {
      const cells = { T20: 40, T50: 60, T100: 120 }, dt = 0.05;
      // shift, X_over_cycle_T100, one_guide_T50, upper_band_T50, sheet_T20_pair: cells counted from the left end, as the stored numbers.
      // shift_centre: with X divided by the norm. start: cells counted from the cell where the light starts (see propagate);
      // these are the numbers that the page asks for and that the code skeletons print.
      const out = { dt, shift: {}, shift_centre: {}, cells, start: { shift: {}, one_guide: {}, upper_band: {} } };
      for (const T of [20, 50, 100]) {
        const r = propagate(dJ, D0, T, cells[`T${T}`], dt);
        out.shift[`T${T}`] = r.shift; out.shift_centre[`T${T}`] = r.centreShift; out[`norm_T${T}`] = r.norm;
        out.start.shift[`T${T}`] = r.shiftStart;
        if (T === 100) { out.X_over_cycle_T100 = r.X; out.start.X_over_cycle_T100 = r.Xstart; }   // 17 values, t/T = 0, 1/16, …, 1
      }
      const guide50 = propagate(dJ, D0, 50, 60, dt, { input: 'guide' }), upper50 = propagate(dJ, D0, 50, 60, dt, { input: 'upper' });
      const sheet20 = propagate(SHEET.dJ, SHEET.D0, 20, 60, dt);
      out.one_guide_T50 = guide50.shift;
      out.upper_band_T50 = upper50.shift;                          // the mistake "input is the upper band"
      out.sheet_T20_pair = sheet20.shift;
      out.start.one_guide.T50 = guide50.shiftStart; out.start.upper_band.T50 = upper50.shiftStart; out.start.sheet_T20_pair = sheet20.shiftStart;
      out.start.one_guide.T20 = propagate(dJ, D0, 20, 40, dt, { input: 'guide' }).shiftStart;      // the mistake "one guide alone as input"
      out.start.upper_band.T20 = propagate(dJ, D0, 20, 40, dt, { input: 'upper' }).shiftStart;
      return out;
    },
    B4: () => {
      const four = (s) => { const p = par(s); return bandStates(p.J1, p.J2, p.D, 4); };
      const us0 = four(0), ush = four(0.5);
      return {
        t0: { ov: overlap(us0[0], us0[1]), prod: loopProduct(us0), gamma_over_pi: zak(us0) / Math.PI },
        thalf: { ov: overlap(ush[0], ush[1]), prod: loopProduct(ush), gamma_over_pi: zak(ush) / Math.PI },
      };
    },
    B5: () => {
      const zt = (s, M, set = HAND) => { const p = par(s, set); return zakOf(p.J1, p.J2, p.D, M) / Math.PI; };
      const curve = gammaCurve(dJ, D0, 400, 16);
      return {
        t_over_T: curve.s, gamma_raw_over_pi: curve.raw.map((g) => g / Math.PI), gamma_unwrapped_over_pi: curve.unwrapped.map((g) => g / Math.PI),
        C: int(curve.chern),
        quarter_M4_over_pi: zt(0.25, 4), quarter_M400_over_pi: zt(0.25, 400), threequarter_M400_over_pi_raw: zt(0.75, 400),
        sheet_quarter_M400_over_pi: zt(0.25, 400, SHEET),
        C_without_unwrap: (curve.raw[16] - curve.raw[0]) / TAU,   // the mistake "no unwrap"
      };
    },
    B6: () => {
      const u = (k, s) => { const p = par(s); return lowerHand(k, p.J1, p.J2, p.D); };
      const a = u(Math.PI / 2, 0), b = u(Math.PI / 2, 0.25), c = u(Math.PI, 0.25), d = u(Math.PI, 0);
      const ovs = [overlap(a, b), overlap(b, c), overlap(c, d), overlap(d, a)], pq = par(0.25);
      return {
        u_kpi2_tq: b, u_kpi2_tq_times_sqrt6: b.map((x) => cx.scale(x, Math.sqrt(6))), E_kpi2_tq: -energy(Math.PI / 2, pq.J1, pq.J2, pq.D),
        u_kpi_tq: c, u_t0: a, ov: ovs, prod: prod(ovs), F_over_pi: plaquette(a, b, c, d) / Math.PI,
      };
    },
    B7: () => {
      const map4 = chernMap(pumpState(dJ, D0), 4);
      return {
        F_over_pi: map4.F.map((row) => row.map((f) => f / Math.PI)), col_sums_over_pi: map4.colSums.map((x) => x / Math.PI), total_over_pi: map4.total / Math.PI,
        C: int(map4.chern), C_24: int(pumpChern(dJ, D0, 24)),
        C_sheet_4: int(pumpChern(SHEET.dJ, SHEET.D0, 4)), C_sheet_3_wrong: int(pumpChern(SHEET.dJ, SHEET.D0, 3)),
      };
    },
    B8: () => ({
      upper_band: int(pumpChern(dJ, D0, 8, { band: 1 })), reversed_cycle: int(pumpChern(dJ, D0, 8, { sign: -1 })),
      not_enclosing: int(cycleChern(notEnclosingParams, 8)), sheet: int(pumpChern(SHEET.dJ, SHEET.D0, 8)),
    }),
  });
  return partB;
}

export function stepsC() {
  if (partC) return partC;
  const ch = hofstadterChern(6), t2 = 0.1, phiH = Math.PI / 2, K = HALDANE_K, Kp = HALDANE_KPRIME;
  partC = {
    C1: { grid: 6, chern_lower_to_upper: ch, abs: ch.map(Math.abs) },
    C2: {
      t1: 1, t2, phiH_over_pi: phiH / Math.PI, boundary: Math.abs(haldaneMass(Kp[0], Kp[1], 0, t2, phiH)),
      onsite_at_K: { m0: haldaneMass(K[0], K[1], 0, t2, phiH), m06: haldaneMass(K[0], K[1], 0.6, t2, phiH) },
      onsite_at_Kprime: { m0: haldaneMass(Kp[0], Kp[1], 0, t2, phiH), m06: haldaneMass(Kp[0], Kp[1], 0.6, t2, phiH) },
      K: [...K], Kprime: [...Kp],
      C_m0: haldaneChern(0, t2, phiH, 6), C_m06: haldaneChern(0.6, t2, phiH, 6), C_m0_phi_negative: haldaneChern(0, t2, -phiH, 6), grid: 6,
    },
  };
  return partC;
}

export function steps() {
  if (!all) all = lazy({ A: stepsA, B: stepsB, C: stepsC });
  return all;
}
