// The small models of the parts that belong to Exercises 1 to 3. No DOM.
//   three coupled waveguides, the chain of N waveguides, one Runge–Kutta step, a beam with a wavenumber,
//   the SSH chain in real space and in k-space.
// Conventions as in the hands-on code: i dψ/dz = Hψ, +J next to the diagonal, waveguides numbered from 1,
// waveguide 1 is an A waveguide, J₁ couples 1–2, 3–4, … (inside the unit cell), J₂ couples 2–3, 4–5, …
import { symEig, tightBinding, sshChain, evolveExact, rk4Step } from '../linalg.js';

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const zeros = (n) => new Array(n).fill(0);
export const intens = (p) => p.re.map((r, i) => r * r + p.im[i] * p.im[i]);
export const total = (I) => I.reduce((a, b) => a + b, 0);
// mean waveguide number of the light, waveguides counted from 1
export const centre = (I) => I.reduce((a, v, i) => a + (i + 1) * v, 0) / total(I);
const delta = (N, start) => { const p = { re: zeros(N), im: zeros(N) }; p.re[start - 1] = 1; return p; };

// ---------- three waveguides ----------
export const R2 = Math.SQRT2;
// the three supermodes of H = [[0, J, 0], [J, 0, J], [0, J, 0]] with J = 1
export const MODES3 = [{ E: R2, v: [0.5, R2 / 2, 0.5] }, { E: 0, v: [R2 / 2, 0, -R2 / 2] }, { E: -R2, v: [0.5, -R2 / 2, 0.5] }];
export const apply3 = (v) => [v[1], v[0] + v[2], v[1]];                    // H·v for a real v
// all light starts in waveguide 1: the three intensities at z
export const coupler3 = (z) => { const c = Math.cos(R2 * z), s = Math.sin(R2 * z); return [0.25 * (1 + c) ** 2, 0.5 * s * s, 0.25 * (1 - c) ** 2]; };
export const Z_CROSS = Math.PI / R2;                                        // all light in waveguide 3 for the first time

// ---------- the chain of N waveguides ----------
export const chainH = (N, J = 1, eps = null) => tightBinding(eps || zeros(N), new Array(N - 1).fill(J));
export const chainEig = (N) => once(`chain:${N}`, () => symEig(chainH(N)));
export const chainExact = (n, N, J = 1) => 2 * J * Math.cos((n * Math.PI) / (N + 1));
export const ringLowest = (N) => { const H = chainH(N); H[0][N - 1] = 1; H[N - 1][0] = 1; return symEig(H).values[0]; };
// intensities at z when all light starts in waveguide `start`
export const spread = (eig, start, z) => intens(evolveExact(eig, delta(eig.values.length, start), z));
// rows + 1 lists of intensities for z = 0 … zmax
export const spreadMap = (N, start, zmax, rows = 80) => once(`spread:${N}:${start}:${zmax}:${rows}`, () => { const e = chainEig(N), out = []; for (let r = 0; r <= rows; r++) out.push(spread(e, start, (zmax * r) / rows)); return out; });

// ---------- one Runge–Kutta step for i dψ/dz = Eψ; complex numbers as [re, im] ----------
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cadd = (a, b, f = 1) => [a[0] + f * b[0], a[1] + f * b[1]];
export function rkStep(E = 1, dz = 1, psi0 = [1, 0]) {
  const f = (p) => cmul([0, -E], p);                                        // f(ψ) = −iEψ
  const k1 = f(psi0), P2 = cadd(psi0, k1, dz / 2), k2 = f(P2), P3 = cadd(psi0, k2, dz / 2), k3 = f(P3), P4 = cadd(psi0, k3, dz), k4 = f(P4);
  const sum = cadd(cadd(cadd(k1, k2, 2), k3, 2), k4), psi1 = cadd(psi0, sum, dz / 6), euler = cadd(psi0, k1, dz);
  return { psi0, k1, k2, k3, k4, P2, P3, P4, sum, psi1, euler, exact: [Math.cos(E * dz), -Math.sin(E * dz)] };
}
export const RK_LIMIT = 2 * R2;                                             // Runge–Kutta 4 is stable for E·dz below this
// the chain of 41 waveguides, all light in waveguide 21, steps of dz: Runge–Kutta 4, Euler and the exact result
export function rkChain(steps = 20, dz = 0.1, N = 41, start = 21) {
  return once(`rk:${steps}:${dz}:${N}:${start}`, () => {
    const H = chainH(N); let p = delta(N, start), e = delta(N, start);
    for (let s = 0; s < steps; s++) {
      p = rk4Step(H, p, dz);
      const dre = zeros(N), dim = zeros(N);                                 // Euler: ψ + dz·(−iHψ)
      for (let i = 0; i < N; i++) for (const j of [i - 1, i + 1]) if (j >= 0 && j < N) { dre[i] += e.im[j]; dim[i] -= e.re[j]; }
      e = { re: e.re.map((v, i) => v + dz * dre[i]), im: e.im.map((v, i) => v + dz * dim[i]) };
    }
    const exact = spread(chainEig(N), start, steps * dz);
    return { I: intens(p), norm: total(intens(p)), euler: intens(e), eulerNorm: total(intens(e)), exact };
  });
}

// ---------- a beam with the wavenumber k ----------
export const band = (k, J = 1) => 2 * J * Math.cos(k);
export const velocity = (k, J = 1) => -2 * J * Math.sin(k);
// ψ_j ∝ exp(−(j − j0)²/(2σ²))·e^{ikj}, j = 1 … N, normalised
export function gaussBeam(N, j0, sigma, k) {
  const re = zeros(N), im = zeros(N); let n = 0;
  for (let j = 1; j <= N; j++) { const a = Math.exp(-((j - j0) ** 2) / (2 * sigma * sigma)); re[j - 1] = a * Math.cos(k * j); im[j - 1] = a * Math.sin(k * j); n += a * a; }
  n = Math.sqrt(n); return { re: re.map((v) => v / n), im: im.map((v) => v / n) };
}
// the beam in a chain of N waveguides with the gradient F of the propagation constants: rows of intensities and centres
export function beamRun({ N = 41, j0 = 26, sigma = 3, k = Math.PI / 2, F = 0, zmax = 5, rows = 100 } = {}) {
  return once(`beam:${N}:${j0}:${sigma}:${k}:${F}:${zmax}:${rows}`, () => {
    const eig = F ? symEig(chainH(N, 1, Array.from({ length: N }, (_, i) => F * (i + 1)))) : chainEig(N), psi0 = gaussBeam(N, j0, sigma, k), out = [];
    for (let r = 0; r <= rows; r++) { const z = (zmax * r) / rows, I = intens(evolveExact(eig, psi0, z)); out.push({ z, I, x: centre(I) }); }
    return out;
  });
}
export const BEAM = { N: 41, j0: 26, sigma: 3, k: Math.PI / 2, zmax: 5 };
export const BLOCH = { N: 41, j0: 16, sigma: 3, k: 0, F: 0.5, zmax: 25 };

// ---------- the SSH chain in real space ----------
export const sshEig = (N, J1, J2, d = 0) => once(`ssh:${N}:${J1}:${J2}:${d}`, () => symEig(sshChain(N, J1, J2, d)));
export const smallestPositive = (values) => Math.min(...values.filter((v) => v > 1e-12));
export const dotAbs = (a, b) => Math.abs(a.reduce((s, v, i) => s + v * b[i], 0));

// ---------- the SSH chain in k-space: H(k) = [[Δ, h*], [h, −Δ]], h = J₁ + J₂e^{ik} ----------
export const hSSH = (k, J1, J2) => [J1 + J2 * Math.cos(k), J2 * Math.sin(k)];
export const bandSSH = (k, J1, J2, d = 0) => Math.hypot(d, ...hSSH(k, J1, J2));
// the eigenvector of the lower band, (−h*, Δ + E₀) normalised, as two complex numbers
export function uLower(k, J1, J2, d = 0) {
  const [hr, hi] = hSSH(k, J1, J2), E0 = Math.hypot(d, hr, hi), n = Math.hypot(hr, hi, d + E0);
  return [[-hr / n, hi / n], [(d + E0) / n, 0]];
}
export const overlap2 = (u, v) => cadd(cmul([u[0][0], -u[0][1]], v[0]), cmul([u[1][0], -u[1][1]], v[1]));
// the product ⟨u₁|u₂⟩⟨u₂|u₃⟩ … ⟨u_M|u₁⟩ over M values k = 2π(s − 1)/M, and γ = −arg of it
export function zakSSH(J1, J2, d = 0, M = 50) {
  const us = []; for (let s = 0; s < M; s++) us.push(uLower((2 * Math.PI * s) / M, J1, J2, d));
  let p = [1, 0]; for (let s = 0; s < M; s++) p = cmul(p, overlap2(us[s], us[(s + 1) % M]));
  return { product: p, gamma: -Math.atan2(p[1], p[0]) };
}
