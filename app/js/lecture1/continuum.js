// A particle in three wells on a 1D grid (hbar = m = 1): Crank-Nicolson time stepping, imaginary-time
// subspace iteration for the lowest band, Wannier (well) modes, and the 3x3 Hamiltonian projected onto them.
import { symEig, matmul, transpose } from '../linalg.js';

export class Continuum {
  constructor({ N = 600, L = 6, sigma = 0.35, d = 1.3, V0 = 12, nWells = 3 } = {}) {
    this.N = N; this.L = L; this.sigma = sigma; this.d = d; this.nWells = nWells;
    this.x = new Float64Array(N); this.dx = (2 * L) / (N - 1);
    for (let i = 0; i < N; i++) this.x[i] = -L + i * this.dx;
    this.centers = Array.from({ length: nWells }, (_, k) => (k - (nWells - 1) / 2) * d);
    this.kin = 1 / (2 * this.dx * this.dx);
    this.V = new Float64Array(N);
    this.re = new Float64Array(N); this.im = new Float64Array(N);
    this.t = 0;
    this.setDepth(V0);
  }
  setDepth(V0) {
    this.V0 = V0;
    for (let i = 0; i < this.N; i++) { let v = 0; for (const c of this.centers) v -= V0 * Math.exp(-((this.x[i] - c) ** 2) / (2 * this.sigma * this.sigma)); this.V[i] = v; }
    this.diag = Float64Array.from(this.V, (v) => v + 2 * this.kin);
    this._lu = null; this._luDt = null;
    this.computeBand();
  }
  // y = H psi for a real or complex vector (arrays re, im)
  applyH(re, im, outRe, outIm, diag) {
    const N = this.N, k = this.kin, a = diag || this.diag;
    for (let i = 0; i < N; i++) {
      outRe[i] = a[i] * re[i] - k * ((i > 0 ? re[i - 1] : 0) + (i < N - 1 ? re[i + 1] : 0));
      if (im) outIm[i] = a[i] * im[i] - k * ((i > 0 ? im[i - 1] : 0) + (i < N - 1 ? im[i + 1] : 0));
    }
  }
  // Solve (1 + c H) y = r for complex c = cr + i ci, tridiagonal Thomas algorithm (complex arithmetic by hand)
  _solve(cr, ci, rRe, rIm, yRe, yIm, diag) {
    const N = this.N, k = this.kin, a = diag || this.diag;
    const offRe = -k * cr, offIm = -k * ci; // off-diagonal of (1 + cH)
    const cpRe = this._cpRe || (this._cpRe = new Float64Array(N)), cpIm = this._cpIm || (this._cpIm = new Float64Array(N));
    const dRe = this._dRe || (this._dRe = new Float64Array(N)), dIm = this._dIm || (this._dIm = new Float64Array(N));
    for (let i = 0; i < N; i++) {
      let bRe = 1 + cr * a[i], bIm = ci * a[i];           // diagonal of (1 + cH)
      let rr = rRe[i], ri = rIm[i];
      if (i > 0) {                                        // b -= off * cp[i-1]; r -= off * d[i-1]
        const pRe = offRe * cpRe[i - 1] - offIm * cpIm[i - 1], pIm = offRe * cpIm[i - 1] + offIm * cpRe[i - 1];
        bRe -= pRe; bIm -= pIm;
        const qRe = offRe * dRe[i - 1] - offIm * dIm[i - 1], qIm = offRe * dIm[i - 1] + offIm * dRe[i - 1];
        rr -= qRe; ri -= qIm;
      }
      const den = bRe * bRe + bIm * bIm;
      const ibRe = bRe / den, ibIm = -bIm / den;           // 1/b
      cpRe[i] = offRe * ibRe - offIm * ibIm; cpIm[i] = offRe * ibIm + offIm * ibRe;
      dRe[i] = rr * ibRe - ri * ibIm; dIm[i] = rr * ibIm + ri * ibRe;
    }
    yRe[N - 1] = dRe[N - 1]; yIm[N - 1] = dIm[N - 1];
    for (let i = N - 2; i >= 0; i--) {
      yRe[i] = dRe[i] - (cpRe[i] * yRe[i + 1] - cpIm[i] * yIm[i + 1]);
      yIm[i] = dIm[i] - (cpRe[i] * yIm[i + 1] + cpIm[i] * yRe[i + 1]);
    }
  }
  // one Crank-Nicolson step of i dpsi/dt = H psi:  (1 + i dt/2 H) psi' = (1 - i dt/2 H) psi
  step(dt) {
    const N = this.N;
    const hRe = this._hRe || (this._hRe = new Float64Array(N)), hIm = this._hIm || (this._hIm = new Float64Array(N));
    this.applyH(this.re, this.im, hRe, hIm);
    const rRe = this._rRe || (this._rRe = new Float64Array(N)), rIm = this._rIm || (this._rIm = new Float64Array(N));
    for (let i = 0; i < N; i++) { rRe[i] = this.re[i] + (dt / 2) * hIm[i]; rIm[i] = this.im[i] - (dt / 2) * hRe[i]; } // (1 - i dt/2 H) psi
    this._solve(0, dt / 2, rRe, rIm, this.re, this.im);
    this.t += dt;
  }
  // imaginary-time step for a real vector: (1 + tau/2 H) y = (1 - tau/2 H) u, then normalise
  _imagStep(u, tau, diag) {
    const N = this.N, h = this._hRe || (this._hRe = new Float64Array(N));
    this.applyH(u, null, h, null, diag);
    const r = this._rRe || (this._rRe = new Float64Array(N)), zero = this._zero || (this._zero = new Float64Array(N));
    for (let i = 0; i < N; i++) r[i] = u[i] - (tau / 2) * h[i];
    const yIm = this._rIm || (this._rIm = new Float64Array(N));
    this._solve(tau / 2, 0, r, zero, u, yIm, diag);
    const nn = this._norm(u); for (let i = 0; i < N; i++) u[i] /= nn;
  }
  // ground state of well k alone (the mode of a single guide): what an input beam excites
  singleWellMode(k) {
    const c = this.centers[k], diag = new Float64Array(this.N);
    for (let i = 0; i < this.N; i++) diag[i] = 2 * this.kin - this.V0 * Math.exp(-((this.x[i] - c) ** 2) / (2 * this.sigma * this.sigma));
    const u = this.gaussian(c, this.sigma);
    for (let it = 0; it < 300; it++) this._imagStep(u, 0.03, diag);
    return u;
  }
  prepareSingleWell(k) { const u = this.singleWellMode(k); this.re.set(u); this.im.fill(0); this.t = 0; }
  // a focused input beam of fixed width at well k: matches a deep well's mode, spills out of a shallow one
  prepareBeam(k, width = 0.3) { const g = this.gaussian(this.centers[k], width); this.re.set(g); this.im.fill(0); this.t = 0; }
  _norm(u) { let s = 0; for (let i = 0; i < u.length; i++) s += u[i] * u[i]; return Math.sqrt(s * this.dx); }
  _dot(u, v) { let s = 0; for (let i = 0; i < u.length; i++) s += u[i] * v[i]; return s * this.dx; }
  gaussian(center, width) { const g = new Float64Array(this.N); for (let i = 0; i < this.N; i++) g[i] = Math.exp(-((this.x[i] - center) ** 2) / (2 * width * width)); const n = this._norm(g); for (let i = 0; i < this.N; i++) g[i] /= n; return g; }
  // Lowest nWells eigenstates by imaginary-time subspace iteration with Gram-Schmidt, then Wannier modes
  computeBand() {
    const n = this.nWells, vecs = this.centers.map((c) => this.gaussian(c, this.sigma * 0.8));
    const gs = () => { for (let a = 0; a < n; a++) { for (let b = 0; b < a; b++) { const p = this._dot(vecs[a], vecs[b]); for (let i = 0; i < this.N; i++) vecs[a][i] -= p * vecs[b][i]; } const nn = this._norm(vecs[a]); for (let i = 0; i < this.N; i++) vecs[a][i] /= nn; } };
    gs();
    for (let it = 0; it < 500; it++) { for (const u of vecs) this._imagStep(u, 0.03); gs(); }
    // Rayleigh-Ritz in the converged subspace -> eigenstates phi_n and energies
    const Hs = vecs.map((u) => { const h = new Float64Array(this.N); this.applyH(u, null, h, null); return vecs.map((v) => this._dot(v, h)); });
    const eig = symEig(Hs);
    this.bandE = eig.values;
    this.phi = eig.vectors.map((c) => { const f = new Float64Array(this.N); for (let a = 0; a < n; a++) for (let i = 0; i < this.N; i++) f[i] += c[a] * vecs[a][i]; return f; });
    // Wannier modes: project Gaussians onto the band, then symmetric (Loewdin) orthonormalisation
    const G = this.centers.map((c) => this.gaussian(c, this.sigma));
    const P = G.map((g) => { const p = new Float64Array(this.N); for (const f of this.phi) { const o = this._dot(f, g); for (let i = 0; i < this.N; i++) p[i] += o * f[i]; } return p; });
    const S = P.map((p) => P.map((q) => this._dot(p, q)));
    const es = symEig(S);
    const Sih = matmul(transpose(es.vectors), matmul(es.values.map((l, i) => es.values.map((_, j) => (i === j ? 1 / Math.sqrt(l) : 0))), es.vectors)); // S^{-1/2} = V diag(1/sqrt l) V^T with V rows = eigenvectors
    this.w = this.centers.map((_, k) => { const f = new Float64Array(this.N); for (let a = 0; a < n; a++) for (let i = 0; i < this.N; i++) f[i] += Sih[a][k] * P[a][i]; return f; });
    // 3x3 Hamiltonian in the Wannier basis
    this.H3 = this.w.map((wa) => { const h = new Float64Array(this.N); this.applyH(wa, null, h, null); return this.w.map((wb) => this._dot(wb, h)); });
  }
  // complex overlaps c_k = <w_k|psi> and the fraction of the wave inside the band
  overlaps() {
    const c = this.w.map((wk) => { let r = 0, i = 0; for (let j = 0; j < this.N; j++) { r += wk[j] * this.re[j]; i += wk[j] * this.im[j]; } return { re: r * this.dx, im: i * this.dx }; });
    const captured = c.reduce((s, z) => s + z.re * z.re + z.im * z.im, 0);
    return { c, captured };
  }
  norm2() { let s = 0; for (let i = 0; i < this.N; i++) s += this.re[i] ** 2 + this.im[i] ** 2; return s * this.dx; }
  // prepare the wave as a combination of well modes: amps = [{re, im}, ...]
  prepare(amps) {
    this.re.fill(0); this.im.fill(0); this.t = 0;
    amps.forEach((a, k) => { const w = this.w[k]; for (let i = 0; i < this.N; i++) { this.re[i] += a.re * w[i]; this.im[i] += a.im * w[i]; } });
  }
}
