// The lattice of the experiment of Jürgensen, Mukherjee, Jörg and Rechtsman, Nature Physics 19, 420 (2023):
// off-diagonal Aubry–André–Harper model with five waveguides per unit cell and no on-site term. No DOM.
//
//   position of waveguide n      x_n(z) = n·d + δ·cos(Ωz + 4πn/5 − 3π/10),   d = 17.25 μm, δ = 1 μm
//   coupling of n and n + 1      J_n = 6.672 mm⁻¹ · exp(−0.2348 · (x_{n+1} − x_n)/μm)
//   real space, + sign           (Hψ)_n = J_n ψ_{n+1} + J_{n−1} ψ_{n−1},   i dψ/dz = Hψ   (the paper writes −J)
//   unit cell m                  waveguides 5m + 1 … 5m + 5;  H(k): J_1 … J_4 next to the diagonal,
//                                J_5·e^{ik} bottom left, J_5·e^{−ik} top right
// "phase" is Ωz. Bands are numbered 1 … 5 by increasing eigenvalue.
import { hermEig } from '../linalg.js';

export const D = 17.25, DELTA = 1, J0 = 6.672, DECAY = 0.2348;
const TAU = 2 * Math.PI;
export const xPos = (n, phase) => n * D + DELTA * Math.cos(phase + (4 * Math.PI * n) / 5 - 0.3 * Math.PI);
export const coupling = (n, phase) => J0 * Math.exp(-DECAY * (xPos(n + 1, phase) - xPos(n, phase)));
export const couplings = (phase) => [1, 2, 3, 4, 5].map((n) => coupling(n, phase));

// H(k) of one unit cell as { re, im } (arrays of rows). corners: false leaves J_5 out: a mistake the page recognises.
export function hk(k, phase, { corners = true, sign = 1 } = {}) {
  const J = couplings(phase).map((v) => sign * v);
  const re = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]), im = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  for (let i = 0; i < 4; i++) { re[i][i + 1] = J[i]; re[i + 1][i] = J[i]; }
  if (corners) { re[4][0] = J[4] * Math.cos(k); im[4][0] = J[4] * Math.sin(k); re[0][4] = J[4] * Math.cos(k); im[0][4] = -J[4] * Math.sin(k); }
  return { re, im };
}
export const eig = (k, phase, opt) => { const m = hk(k, phase, opt); return hermEig(m.re, m.im); };
export const bandVector = (band, k, phase) => eig(k, phase).vectors[band - 1];

// complex numbers as [re, im]; ⟨u|v⟩ = Σ conj(u_j)·v_j
const ov = (u, v) => { let re = 0, im = 0; for (let j = 0; j < u.re.length; j++) { re += u.re[j] * v.re[j] + u.im[j] * v.im[j]; im += u.re[j] * v.im[j] - u.im[j] * v.re[j]; } return [re, im]; };
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const arg = (a) => Math.atan2(a[1], a[0]);

// Zak phase of one band at fixed phase: γ = −arg ∏ ⟨u_s|u_{s+1}⟩, k_s = 2πs/M, the loop closed.
export function zak(band, phase, M = 50) {
  const us = []; for (let s = 0; s < M; s++) us.push(bandVector(band, (TAU * s) / M, phase));
  let p = [1, 0]; for (let s = 0; s < M; s++) p = mul(p, ov(us[s], us[(s + 1) % M]));
  return -arg(p);
}

// One plaquette of the (k, Ωz) grid, walked a = (k, Ωz) → b = (k, Ωz + step) → c = (k + step, Ωz + step) → d = (k + step, Ωz) → a.
export function plaquette(band, k, phase, step) {
  const a = bandVector(band, k, phase), b = bandVector(band, k, phase + step), c = bandVector(band, k + step, phase + step), d = bandVector(band, k + step, phase);
  return -arg(mul(mul(ov(a, b), ov(b, c)), mul(ov(c, d), ov(d, a))));
}

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

// All N × N plaquettes of one band: F[i][j] for k = 2πi/N, Ωz = 2πj/N; sum = Σ F; C = sum/2π.
export function chernGrid(band, N = 10) {
  return once(`chern:${band}:${N}`, () => {
    const U = []; for (let i = 0; i < N; i++) { U.push([]); for (let j = 0; j < N; j++) U[i].push(bandVector(band, (TAU * i) / N, (TAU * j) / N)); }
    const F = []; let sum = 0;
    for (let i = 0; i < N; i++) {
      F.push([]);
      for (let j = 0; j < N; j++) {
        const a = U[i][j], b = U[i][(j + 1) % N], c = U[(i + 1) % N][(j + 1) % N], d = U[(i + 1) % N][j];
        const f = -arg(mul(mul(ov(a, b), ov(b, c)), mul(ov(c, d), ov(d, a))));
        F[i].push(f); sum += f;
      }
    }
    return { F, sum, C: sum / TAU };
  });
}

// For nz + 1 values of Ωz from 0 to 2π: lowest and highest eigenvalue of each band over nk values of k.
export function bandEdges(nz = 96, nk = 40) {
  return once(`edges:${nz}:${nk}`, () => {
    const out = [];
    for (let iz = 0; iz <= nz; iz++) {
      const lo = [Infinity, Infinity, Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
      for (let ik = 0; ik <= nk; ik++) { const E = eig((TAU * ik) / nk, (TAU * iz) / nz).values; for (let b = 0; b < 5; b++) { lo[b] = Math.min(lo[b], E[b]); hi[b] = Math.max(hi[b], E[b]); } }
      out.push({ lo, hi });
    }
    return out;
  });
}

// γ/2π of one band at nz + 1 values of Ωz from 0 to 2π, followed without jumps (each step is the one smaller than π).
export function gammaCurve(band, nz = 64, M = 50) {
  return once(`gamma:${band}:${nz}:${M}`, () => {
    const out = []; let prev = null;
    for (let i = 0; i <= nz; i++) {
      let g = zak(band, (TAU * i) / nz, M);
      if (prev !== null) g += TAU * Math.round((prev - g) / TAU);
      out.push(g / TAU); prev = g;
    }
    return out;
  });
}

// The narrowest state that fills one band evenly in k (maximally localized Wannier state), on a chain of `cells`
// unit cells, centred near unit cell `cell0`. Smooth eigenvectors along k: every overlap of neighbours is made real
// and positive, and the phase that is left at the end of the loop (the Zak phase) is spread evenly over the loop.
export function wannier(band, cells, cell0, phase = 0, Nk = 120) {
  const us = []; for (let s = 0; s < Nk; s++) { const u = bandVector(band, (TAU * s) / Nk, phase); us.push({ re: Array.from(u.re), im: Array.from(u.im) }); }
  const turn = (u, a) => { const c = Math.cos(a), s = Math.sin(a); for (let j = 0; j < 5; j++) { const r = u.re[j], m = u.im[j]; u.re[j] = c * r - s * m; u.im[j] = s * r + c * m; } };
  for (let s = 1; s < Nk; s++) turn(us[s], -arg(ov(us[s - 1], us[s])));
  const gamma = -arg(ov(us[Nk - 1], us[0]));
  for (let s = 0; s < Nk; s++) turn(us[s], (-gamma * s) / Nk);
  const N = 5 * cells, re = new Float64Array(N), im = new Float64Array(N);
  for (let m = 0; m < cells; m++) for (let s = 0; s < Nk; s++) {
    const a = ((TAU * s) / Nk) * (m - cell0), c = Math.cos(a), sn = Math.sin(a);
    for (let j = 0; j < 5; j++) { re[5 * m + j] += c * us[s].re[j] - sn * us[s].im[j]; im[5 * m + j] += sn * us[s].re[j] + c * us[s].im[j]; }
  }
  let nrm = 0; for (let i = 0; i < N; i++) nrm += re[i] * re[i] + im[i] * im[i];
  nrm = Math.sqrt(nrm); for (let i = 0; i < N; i++) { re[i] /= nrm; im[i] /= nrm; }
  return { re, im, gamma };
}

// Position of the light in unit cells: every waveguide counts with the number of its unit cell.
export function position(re, im) { let x = 0, n = 0; for (let i = 0; i < re.length; i++) { const p = re[i] * re[i] + im[i] * im[i]; x += Math.floor(i / 5) * p; n += p; } return x / n; }

// i dψ/dz = H(z)ψ on an open chain over one period L (mm), classical Runge–Kutta with H at z, z + h/2, z + h.
// Returns `rows` + 1 records { z, I: intensities, X: position }.
export function propagate(psi, L, { dz = 0.25, rows = 100 } = {}) {
  const N = psi.re.length, steps = Math.max(rows, Math.round(L / dz) - (Math.round(L / dz) % rows)), h = L / steps, every = steps / rows;
  let re = Float64Array.from(psi.re), im = Float64Array.from(psi.im);
  const Jat = (z) => { const J = new Float64Array(N - 1), ph = (TAU * z) / L; for (let n = 1; n < N; n++) J[n - 1] = coupling(n, ph); return J; };
  const apply = (J, r, m) => {                    // dψ/dz = −iHψ: d(re) = H·im, d(im) = −H·re
    const dr = new Float64Array(N), di = new Float64Array(N);
    for (let i = 0; i < N - 1; i++) { dr[i] += J[i] * m[i + 1]; dr[i + 1] += J[i] * m[i]; di[i] -= J[i] * r[i + 1]; di[i + 1] -= J[i] * r[i]; }
    return [dr, di];
  };
  const axpy = (a, b, f) => { const o = new Float64Array(N); for (let i = 0; i < N; i++) o[i] = a[i] + f * b[i]; return o; };
  const record = (z) => { const I = new Float64Array(N); for (let i = 0; i < N; i++) I[i] = re[i] * re[i] + im[i] * im[i]; return { z, I, X: position(re, im) }; };
  const out = [record(0)]; let J0z = Jat(0);
  for (let s = 0; s < steps; s++) {
    const z = s * h, Jm = Jat(z + h / 2), J1 = Jat(z + h);
    const [a1, b1] = apply(J0z, re, im);
    const [a2, b2] = apply(Jm, axpy(re, a1, h / 2), axpy(im, b1, h / 2));
    const [a3, b3] = apply(Jm, axpy(re, a2, h / 2), axpy(im, b2, h / 2));
    const [a4, b4] = apply(J1, axpy(re, a3, h), axpy(im, b3, h));
    for (let i = 0; i < N; i++) { re[i] += (h / 6) * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]); im[i] += (h / 6) * (b1[i] + 2 * b2[i] + 2 * b3[i] + b4[i]); }
    J0z = J1;
    if ((s + 1) % every === 0) out.push(record((s + 1) * h));
  }
  return out;
}

// The pump of the page: light fills band 3 evenly, starts next to unit cell `start`, one period L.
export const PUMP = { band: 3, L: 100, cells: 21, start: 9 };
export function pumpRun({ band = PUMP.band, L = PUMP.L, cells = PUMP.cells, start = PUMP.start, dz = 0.25, rows = 100 } = {}) {
  return once(`pump:${band}:${L}:${cells}:${start}:${dz}:${rows}`, () => {
    const rec = propagate(wannier(band, cells, start), L, { dz, rows });
    return { rec, cells, L, shift: rec[rec.length - 1].X - rec[0].X };
  });
}
