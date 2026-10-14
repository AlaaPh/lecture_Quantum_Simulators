// Small real linear-algebra toolkit for the lab.
// Conventions (same as the coding sessions): hbar = 1, i dpsi/dt = H psi,
// hopping H[n][n+1] = +J, site 1 is an A site, J1 sits inside the unit cell.

export const zeros = (n) => new Array(n).fill(0);
export const identity = (n) => Array.from({ length: n }, (_, i) => zeros(n).map((_, j) => (i === j ? 1 : 0)));

export function matvec(A, x) {
  const n = A.length, y = zeros(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const row = A[i];
    for (let j = 0; j < row.length; j++) s += row[j] * x[j];
    y[i] = s;
  }
  return y;
}
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const norm = (a) => Math.sqrt(dot(a, a));
export const scale = (a, s) => a.map((v) => v * s);
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export function normalize(a) {
  const n = norm(a);
  return n > 1e-12 ? scale(a, 1 / n) : a.slice();
}
export const angleBetween = (a, b) => {
  const d = dot(a, b) / (norm(a) * norm(b) || 1);
  return Math.acos(Math.max(-1, Math.min(1, d)));
};
export const rayleigh = (A, u) => dot(u, matvec(A, u)) / (dot(u, u) || 1);
export const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
export const matmul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));

// Fix the overall sign of an eigenvector so it varies continuously with parameters:
// make its overlap with a fixed, symmetry-free reference vector positive.
function fixSign(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * Math.cos(0.37 * i + 0.11);
  if (Math.abs(s) < 1e-9) {
    let imax = 0;
    for (let i = 1; i < v.length; i++) if (Math.abs(v[i]) > Math.abs(v[imax])) imax = i;
    s = v[imax];
  }
  return s < 0 ? v.map((x) => -x) : v;
}

// Eigen-decomposition of a real symmetric matrix (cyclic Jacobi).
// Returns { values: [E_1 <= E_2 <= ...], vectors: [v_1, v_2, ...] } with unit eigenvectors.
export function symEig(Ain) {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const V = identity(n);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-24) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * apq);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { // A <- A J
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) { // A <- J^T A
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) { // V <- V J
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = A.map((_, i) => i).sort((i, j) => A[i][i] - A[j][j]);
  return {
    values: order.map((i) => A[i][i]),
    vectors: order.map((i) => fixSign(normalize(V.map((row) => row[i])))),
  };
}

// Tight-binding chain: eps[i] on the diagonal, hop[i] between sites i and i+1.
export function tightBinding(eps, hop) {
  const n = eps.length;
  const H = Array.from({ length: n }, () => zeros(n));
  for (let i = 0; i < n; i++) H[i][i] = eps[i];
  for (let i = 0; i < n - 1; i++) { H[i][i + 1] = hop[i]; H[i + 1][i] = hop[i]; }
  return H;
}

// SSH / Rice-Mele chain with N sites. Site 1 (index 0) is an A site.
// Bond (1,2) is J1 (inside the unit cell), bond (2,3) is J2, ... On-site +delta on A, -delta on B.
export function sshChain(N, J1, J2, delta = 0) {
  const eps = Array.from({ length: N }, (_, i) => (i % 2 === 0 ? delta : -delta));
  const hop = Array.from({ length: N - 1 }, (_, i) => (i % 2 === 0 ? J1 : J2));
  return tightBinding(eps, hop);
}

// Bulk bands of the infinite chain: E±(k) = ±sqrt(delta² + J1² + J2² + 2 J1 J2 cos k).
export const sshBand = (J1, J2, delta, k) => Math.sqrt(delta * delta + J1 * J1 + J2 * J2 + 2 * J1 * J2 * Math.cos(k));

// Inverse participation ratio: 1/N for a plane wave, 1 for a single site.
export const ipr = (v) => v.reduce((s, x) => s + x ** 4, 0) / (dot(v, v) ** 2 || 1);

// ----- complex states as { re, im } -----
export const cnorm2 = (p) => dot(p.re, p.re) + dot(p.im, p.im);
export const prob = (p) => p.re.map((r, i) => r * r + p.im[i] * p.im[i]);

// Exact evolution psi(t) = sum_n c_n e^{-i E_n t} v_n from an eigen-decomposition.
export function evolveExact(eig, psi0, t) {
  const n = psi0.re.length;
  const re = zeros(n), im = zeros(n);
  eig.values.forEach((E, k) => {
    const v = eig.vectors[k];
    const cr = dot(v, psi0.re), ci = dot(v, psi0.im);
    const c = Math.cos(E * t), s = Math.sin(E * t);
    const r = cr * c + ci * s, i = ci * c - cr * s; // (cr + i ci) e^{-iEt}
    for (let j = 0; j < n; j++) { re[j] += r * v[j]; im[j] += i * v[j]; }
  });
  return { re, im };
}

// Eigen-components c_n = <v_n|psi> of a complex state.
export const components = (eig, psi) => eig.vectors.map((v) => ({ re: dot(v, psi.re), im: dot(v, psi.im) }));

// One RK4 step of i dpsi/dt = H psi, i.e. d(re)/dt = H im, d(im)/dt = -H re.
export function rk4Step(H, psi, dt) {
  const f = (p) => ({ re: matvec(H, p.im), im: scale(matvec(H, p.re), -1) });
  const ax = (p, k, h) => ({ re: add(p.re, scale(k.re, h)), im: add(p.im, scale(k.im, h)) });
  const k1 = f(psi);
  const k2 = f(ax(psi, k1, dt / 2));
  const k3 = f(ax(psi, k2, dt / 2));
  const k4 = f(ax(psi, k3, dt));
  const re = psi.re.map((v, i) => v + (dt / 6) * (k1.re[i] + 2 * k2.re[i] + 2 * k3.re[i] + k4.re[i]));
  const im = psi.im.map((v, i) => v + (dt / 6) * (k1.im[i] + 2 * k2.im[i] + 2 * k3.im[i] + k4.im[i]));
  return { re, im };
}

// Spherical coordinates on the unit sphere: theta is the polar angle from e3 (the vertical axis), phi the azimuth from e1.
export const fromAngles = (theta, phi) => [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
export const toAngles = (v) => {
  const u = normalize(v);
  return { theta: Math.acos(Math.max(-1, Math.min(1, u[2]))), phi: Math.atan2(u[1], u[0]) };
};

export const fmt = (x, d = 2) => (Math.abs(x) < 0.5 * 10 ** -d ? (0).toFixed(d) : x.toFixed(d));
