// The model behind the Hamiltonian builder: a palette of couplings, the rules of one unit cell, and single-entry defects.
// Conventions as in the exercises: i dψ/dz = Hψ, site 1 is sublattice A of cell 1, and H[i][j] couples site j into site i.
// A rule "a,b,d" is the bond from sublattice a of cell n to sublattice b of cell n + d, for every n. It is stored once per
// pair of sites (d > 0, or d = 0 and a < b). H[(b, n+d)][(a, n)] = t and the mirror entry is t*; with conj the two swap.
// In k-space, with ψ(α, n) = u_α·e^{ikn}, the same rule gives H(k)[b][a] += t·e^{−ikd} and H(k)[a][b] += t*·e^{+ikd}.
import { hermEig } from '../linalg.js';

export const TAU = 2 * Math.PI;
export const SUBL = ['A', 'B', 'C', 'D'];
export const BRUSHES = [
  { id: 'J1', kind: 'hop', name: 'J₁', token: '--k1' },
  { id: 'J2', kind: 'hop', name: 'J₂', token: '--k2' },
  { id: 'J3', kind: 'hop', name: 'J₃', token: '--k3' },
  { id: 'J4', kind: 'hop', name: 'J₄', token: '--k4' },
  { id: 'e1', kind: 'site', name: 'ε₁', token: '--e1' },
  { id: 'e2', kind: 'site', name: 'ε₂', token: '--e2' },
];
export const ERASE = '0';
export const brushOf = (id) => BRUSHES.find((b) => b.id === id) || null;
const DEFAULT_VALS = { J1: 1, J2: 2, J3: 0.5, J4: 0.5, e1: 0.5, e2: -0.5 };
export const N_MAX = 60, R_MAX = 3;

// vals[id] = { r, phi }: the coupling is r·e^{iπ·phi} (phi in units of π). On-site energies are real: phi is ignored.
export function makeModel({ m = 2, N = 20, ring = false, layout = 'line', vals = {}, phis = {}, rules = {}, patches = {} } = {}) {
  const model = { m: +m || 2, N: +N || 20, ring: !!ring, layout: layout === 'zigzag' ? 'zigzag' : 'line', vals: {}, rules: {}, patches: {} };
  const fin = (x, d, lim) => (x !== null && x !== undefined && Number.isFinite(+x) ? Math.max(-lim, Math.min(lim, +x)) : d);
  for (const b of BRUSHES) model.vals[b.id] = { r: fin(vals[b.id], DEFAULT_VALS[b.id], R_MAX), phi: b.kind === 'hop' ? fin(phis[b.id], 0, 1) : 0 };
  // rules and patches may come from storage: keep only well-formed ones
  for (const [k, r0] of Object.entries(rules || {})) {
    const r = typeof r0 === 'string' ? { c: r0 } : r0 || {}, q = /^(\d),(\d),(\d+)$/.exec(k), b = brushOf(r.c);
    if (!q || !b) continue;
    const B = bondKey(+q[1], +q[2], +q[3]);
    if (B.flip || B.key !== k || (b.kind === 'site') !== B.site) continue;
    model.rules[k] = { c: r.c, conj: !B.site && !!r.conj };
  }
  for (const [k, p0] of Object.entries(patches || {})) {
    const p = typeof p0 === 'string' ? { c: p0 } : p0 || {}, q = /^(\d+),(\d+)$/.exec(k), b = brushOf(p.c);
    if (!q || +q[1] < +q[2] || (!b && p.c !== ERASE) || (b && (b.kind === 'site') !== (q[1] === q[2]))) continue;
    model.patches[k] = { c: p.c, conj: q[1] !== q[2] && !!p.conj };
  }
  return normalize(model);
}
export const cloneModel = (model) => JSON.parse(JSON.stringify(model));
// A model from its stored JSON form (the object makeModel returns), checked again.
export function reviveModel(o) {
  const pick = (f) => Object.fromEntries(Object.entries((o && o.vals) || {}).map(([k, v]) => [k, v && v[f]]));
  return makeModel({ m: o.m, N: o.N, ring: o.ring, layout: o.layout, vals: pick('r'), phis: pick('phi'), rules: o.rules, patches: o.patches });
}
// Keep the model consistent after any change of m, N or the boundary: a ring holds whole unit cells only.
export function normalize(model) {
  model.m = Math.max(1, Math.min(SUBL.length, Math.round(model.m)));
  model.N = Math.max(2, Math.min(N_MAX, Math.round(model.N)));
  if (model.ring) model.N = Math.max(2 * model.m, Math.min(Math.floor(N_MAX / model.m) * model.m, Math.round(model.N / model.m) * model.m));
  for (const k of Object.keys(model.rules)) { const [a, b] = k.split(',').map(Number); if (a >= model.m || b >= model.m) delete model.rules[k]; }
  for (const k of Object.keys(model.patches)) { const [i] = k.split(',').map(Number); if (i >= model.N) delete model.patches[k]; }
  return model;
}
const snap = (x) => (Math.abs(x) < 1e-15 ? 0 : x);
export function value(model, id) {
  const b = brushOf(id), v = model.vals[id];
  if (!b || !v) return { re: 0, im: 0 };
  if (b.kind === 'site') return { re: v.r, im: 0 };
  return { re: snap(v.r * Math.cos(Math.PI * v.phi)), im: snap(v.r * Math.sin(Math.PI * v.phi)) };
}
export const isComplex = (model, id) => Math.abs(value(model, id).im) > 1e-12;

// The stored form of the bond a → b, d cells further. flip: the bond asked for is the mirror image of the stored one.
export function bondKey(a, b, d) {
  let flip = false;
  if (d < 0 || (d === 0 && a > b)) { [a, b] = [b, a]; d = -d; flip = true; }
  return { key: `${a},${b},${d}`, a, b, d, flip, site: d === 0 && a === b };
}
// The bond behind matrix entry (row i, column j). On a ring the shorter way round counts.
export function bondOf(model, i, j) {
  const { m, N, ring } = model, nc = Math.round(N / m);
  let d = Math.floor(i / m) - Math.floor(j / m);
  if (ring) { d = ((d % nc) + nc) % nc; if (d > nc / 2) d -= nc; }
  return bondKey(j % m, i % m, d);
}

// The N × N matrix. grid[i][j] says what sits in an entry ({ c, conj, patch, wrap } or null), re and im are its numbers.
export function assemble(model) {
  const { m, N, ring } = model, nc = Math.ceil(N / m);
  const grid = Array.from({ length: N }, () => new Array(N).fill(null));
  const re = Array.from({ length: N }, () => new Array(N).fill(0)), im = Array.from({ length: N }, () => new Array(N).fill(0));
  for (const [key, r] of Object.entries(model.rules)) {
    const [a, b, d] = key.split(',').map(Number), v = value(model, r.c);
    const t = { re: v.re, im: r.conj ? -v.im : v.im };
    for (let n = 0; n < nc; n++) {
      const col = n * m + a; let row = (n + d) * m + b, wrap = false;
      if (ring && row >= N) { row %= N; wrap = true; }
      if (row >= N || col >= N) continue;
      if (row === col) { re[row][row] += d === 0 ? v.re : 2 * t.re; if (d === 0) grid[row][row] = { c: r.c, conj: false, patch: false, wrap: false }; continue; }
      re[row][col] += t.re; im[row][col] += t.im; re[col][row] += t.re; im[col][row] -= t.im;
      grid[row][col] = { c: r.c, conj: r.conj, patch: false, wrap }; grid[col][row] = { c: r.c, conj: !r.conj, patch: false, wrap };
    }
  }
  for (const [key, p] of Object.entries(model.patches)) {
    const [i, j] = key.split(',').map(Number);
    if (i >= N || j >= N) continue;
    const v = p.c === ERASE ? { re: 0, im: 0 } : value(model, p.c), t = { re: v.re, im: p.conj ? -v.im : v.im };
    re[i][j] = t.re; im[i][j] = i === j ? 0 : t.im; grid[i][j] = { c: p.c, conj: p.conj, patch: true, wrap: false };
    if (i !== j) { re[j][i] = t.re; im[j][i] = -t.im; grid[j][i] = { c: p.c, conj: !p.conj, patch: true, wrap: false }; }
  }
  return { grid, re, im, real: im.every((row) => row.every((x) => x === 0)) };
}

// Plug brush c into entry (row i, column j): mode 'cell' as a rule for every unit cell, mode 'one' as a defect in this
// entry only. A second click with the same brush takes it out again. An entry set by hand lies on top of the rules: a
// click on it removes that layer first. Returns what happened: 'set' | 'removed' | 'unpatched' (the entry follows the
// unit cell again) | 'same' | 'diag' (a coupling belongs off the diagonal) | 'offdiag' (an on-site energy belongs on it).
export function paint(model, i, j, c, mode) {
  const kind = c === ERASE ? null : brushOf(c).kind;
  if (kind === 'hop' && i === j) return 'diag';
  if (kind === 'site' && i !== j) return 'offdiag';
  const real = c === ERASE || !isComplex(model, c);
  const I = Math.max(i, j), J = Math.min(i, j), conj = i < j, pk = `${I},${J}`, old = model.patches[pk];
  delete model.patches[pk];
  if (mode === 'cell') {
    const B = bondOf(model, i, j), rule = model.rules[B.key];
    if (old && (c === ERASE || (rule && rule.c === c && (real || rule.conj === B.flip)))) return 'unpatched';
    return paintRule(model, B, c);
  }
  const base = assemble(model).grid[I][J];                              // what the rules alone put here
  const same = (e) => e && e.c === c && (real || e.conj === conj);
  if (c === ERASE) { if (old) return 'unpatched'; if (!base) return 'same'; model.patches[pk] = { c: ERASE, conj: false }; return 'set'; }
  if (same(old)) return 'unpatched';
  if (same(base)) return old ? 'unpatched' : 'same';
  model.patches[pk] = { c, conj };
  return 'set';
}
export function paintRule(model, B, c) {
  const old = model.rules[B.key];
  if (c === ERASE) { if (!old) return 'same'; delete model.rules[B.key]; return 'removed'; }
  const kind = brushOf(c).kind;
  if (kind === 'hop' && B.site) return 'diag';
  if (kind === 'site' && !B.site) return 'offdiag';
  if (old && old.c === c && (old.conj === B.flip || !isComplex(model, c))) { delete model.rules[B.key]; return 'removed'; }
  model.rules[B.key] = { c, conj: B.site ? false : B.flip };
  return 'set';
}

// ---------- k-space ----------
// The terms of H(k), entry by entry: { c, s, conj, key } stands for t·e^{isk} (t* with conj).
export function blochTerms(model) {
  const { m } = model, T = Array.from({ length: m }, () => Array.from({ length: m }, () => []));
  for (const [key, r] of Object.entries(model.rules)) {
    const [a, b, d] = key.split(',').map(Number);
    if (a >= m || b >= m) continue;
    if (d === 0 && a === b) { T[a][a].push({ c: r.c, s: 0, conj: false, key }); continue; }
    T[b][a].push({ c: r.c, s: -d, conj: r.conj, key });
    T[a][b].push({ c: r.c, s: d, conj: !r.conj, key });
  }
  return T;
}
export function bloch(model, k, terms = blochTerms(model)) {
  const { m } = model, re = Array.from({ length: m }, () => new Array(m).fill(0)), im = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) for (const t of terms[i][j]) {
    const v = value(model, t.c), vi = t.conj ? -v.im : v.im, c = Math.cos(t.s * k), s = Math.sin(t.s * k);
    re[i][j] += v.re * c - vi * s; im[i][j] += v.re * s + vi * c;
  }
  for (let i = 0; i < m; i++) im[i][i] = 0;
  return { re, im };
}
const cmul = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
// Bands E_n(k) on nk + 1 points from 0 to 2π, their ranges, and the Zak phase of every band that touches no other:
// γ = −arg ∏⟨u(k_s)|u(k_s+1)⟩ around the Brillouin zone (the phase of each eigenvector cancels).
export function bandData(model, nk = 240) {
  const { m } = model, terms = blochTerms(model);
  const ks = Array.from({ length: nk + 1 }, (_, i) => (TAU * i) / nk);
  const E = Array.from({ length: m }, () => new Array(nk + 1).fill(0)), U = Array.from({ length: m }, () => new Array(nk));
  for (let i = 0; i < nk; i++) {
    const h = bloch(model, ks[i], terms), e = hermEig(h.re, h.im);
    for (let n = 0; n < m; n++) { E[n][i] = e.values[n]; U[n][i] = e.vectors[n]; }
  }
  for (let n = 0; n < m; n++) E[n][nk] = E[n][0];
  const ranges = E.map((b) => [Math.min(...b), Math.max(...b)]);
  const scale = Math.max(1e-9, ...ranges.flat().map(Math.abs)), tol = 1e-6 * Math.max(1, scale);
  const zak = E.map((b, n) => {
    for (let i = 0; i < nk; i++) if ((n > 0 && b[i] - E[n - 1][i] < tol) || (n < m - 1 && E[n + 1][i] - b[i] < tol)) return null;
    let prod = { re: 1, im: 0 };
    for (let i = 0; i < nk; i++) {
      const u = U[n][i], v = U[n][(i + 1) % nk]; let pr = 0, pi = 0;
      for (let j = 0; j < m; j++) { pr += u.re[j] * v.re[j] + u.im[j] * v.im[j]; pi += u.re[j] * v.im[j] - u.im[j] * v.re[j]; }
      prod = cmul(prod, { re: pr, im: pi });
      const a = Math.hypot(prod.re, prod.im) || 1; prod = { re: prod.re / a, im: prod.im / a };
    }
    let g = -Math.atan2(prod.im, prod.re); g = ((g % TAU) + TAU) % TAU;
    return g > TAU - 1e-6 ? 0 : g;
  });
  return { ks, E, ranges, zak, scale };
}

// Chiral (sublattice) symmetry: the sublattices split into two groups and every term of H couples one group to the
// other. Then H(k) = [[0, h†], [h, 0]] and det h(k) winds around the origin a whole number of times.
export function chiralInfo(model, nk = 720) {
  const { m } = model, terms = blochTerms(model), live = (t) => { const v = value(model, t.c); return Math.hypot(v.re, v.im) > 1e-12; };
  let chiral = true, why = '';                              // why not: 'diag' (a term on the diagonal of H(k)) or 'loop' (an odd loop)
  const adj = Array.from({ length: m }, () => new Set());
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) for (const t of terms[i][j]) { if (!live(t)) continue; if (i === j) { chiral = false; why = 'diag'; } else { adj[i].add(j); adj[j].add(i); } }
  const group = new Array(m).fill(-1);
  for (let s = 0; s < m && chiral; s++) {
    if (group[s] >= 0) continue;
    group[s] = 0; const queue = [s];
    while (queue.length && chiral) { const a = queue.shift(); for (const b of adj[a]) { if (group[b] < 0) { group[b] = 1 - group[a]; queue.push(b); } else if (group[b] === group[a]) { chiral = false; why = 'loop'; } } }
  }
  const g0 = [], g1 = [];
  if (chiral) group.forEach((g, s) => (g === 0 ? g0 : g1).push(s));
  const out = { chiral, why, g0, g1, curve: null, nu: null, minAbs: 0, what: '' };
  let rows, cols;
  if (chiral && g0.length === g1.length && g0.length <= 2) { rows = g1; cols = g0; } else if (m === 2) { rows = [1]; cols = [0]; } else return out;
  out.what = rows.length === 1 ? `H(k)[${SUBL[rows[0]]}][${SUBL[cols[0]]}]` : 'det h(k)';
  out.curve = Array.from({ length: nk + 1 }, (_, i) => {
    const h = bloch(model, (TAU * i) / nk, terms), z = (r, c) => ({ re: h.re[rows[r]][cols[c]], im: h.im[rows[r]][cols[c]] });
    if (rows.length === 1) return z(0, 0);
    const p = cmul(z(0, 0), z(1, 1)), q = cmul(z(0, 1), z(1, 0));
    return { re: p.re - q.re, im: p.im - q.im };
  });
  const abs = out.curve.map((z) => Math.hypot(z.re, z.im)), big = Math.max(...abs);
  out.minAbs = Math.min(...abs);
  if (chiral && big > 1e-12 && out.minAbs > 1e-6 * big) {
    let turn = 0;
    for (let i = 0; i < nk; i++) { const p = out.curve[i], q = out.curve[i + 1]; turn += Math.atan2(p.re * q.im - p.im * q.re, p.re * q.re + p.im * q.im); }
    out.nu = Math.round(turn / TAU);
  }
  return out;
}

// Everything the plots need, from one model.
export function solve(model) {
  const asm = assemble(model), eig = hermEig(asm.re, asm.im), bands = bandData(model), chiral = chiralInfo(model);
  const tol = 1e-4 * Math.max(1, bands.scale);
  const inGap = eig.values.map((E) => !bands.ranges.some(([lo, hi]) => E > lo - tol && E < hi + tol));
  return { asm, eig, bands, chiral, inGap, real: asm.real };
}
// Where an eigenstate sits: its weight in the outer quarters of the chain, its mean site, its weight per sublattice.
export function describeState(model, v) {
  const { N, m } = model, p = v.re.map((x, j) => x * x + v.im[j] * v.im[j]), q = Math.max(1, Math.round(N / 4));
  let left = 0, right = 0, mean = 0; const sub = new Array(m).fill(0);
  p.forEach((w, j) => { if (j < q) left += w; if (j >= N - q) right += w; mean += w * (j + 1); sub[j % m] += w; });
  const where = model.ring ? `around site ${Math.round(mean)}` : left > 0.8 ? 'at the left end' : right > 0.8 ? 'at the right end' : left + right > 0.8 ? 'at both ends' : `around site ${Math.round(mean)}`;
  return { where, sub, left, right, mean };
}

// ---------- starting points ----------
export const PRESETS = [
  { id: 'chain', label: 'uniform chain', note: 'One guide per cell, J₁ to the next one. The band is E(k) = 2J₁·cos k.',
    make: () => makeModel({ m: 1, N: 20, vals: { J1: 1 }, rules: { '0,0,1': 'J1' } }) },
  { id: 'ssh', label: 'SSH', note: 'Two guides per cell: J₁ inside the cell, J₂ to the next cell. J₂ > J₁ gives one edge state at each end.',
    make: () => makeModel({ m: 2, N: 20, vals: { J1: 1, J2: 2 }, rules: { '0,1,0': 'J1', '1,0,1': 'J2' } }) },
  { id: 'ssh3', label: 'SSH + long range', note: 'SSH with a third-neighbour coupling J₃ from guide B to guide A two cells further: h(k) = J₁ + J₂e^(ik) + J₃e^(2ik) can wind twice, and then each end holds two edge states.',
    make: () => makeModel({ m: 2, N: 24, vals: { J1: 0.5, J2: 1, J3: 2 }, rules: { '0,1,0': 'J1', '1,0,1': 'J2', '1,0,2': 'J3' } }) },
  { id: 'zigzag', label: 'zigzag (1–3 strong)', note: 'Every guide couples weakly to its neighbour (J₁, J₂) and strongly to the next but one (J₃ among the A guides, J₄ among the B guides).',
    make: () => makeModel({ m: 2, N: 20, layout: 'zigzag', vals: { J1: 0.3, J2: 0.6, J3: 1, J4: 1 }, rules: { '0,1,0': 'J1', '1,0,1': 'J2', '0,0,1': 'J3', '1,1,1': 'J4' } }) },
  { id: 'rm', label: 'Rice–Mele', note: 'SSH with on-site energies ε₁ on A and ε₂ on B (Task 3): the edge state of 21 guides moves away from E = 0.',
    make: () => makeModel({ m: 2, N: 21, vals: { J1: 1, J2: 2, e1: 0.5, e2: -0.5 }, rules: { '0,1,0': 'J1', '1,0,1': 'J2', '0,0,0': 'e1', '1,1,0': 'e2' } }) },
  { id: 'trimer', label: 'trimer', note: 'Three guides per cell: J₁, J₁ inside the cell, J₂ to the next cell. Three bands, two gaps.',
    make: () => makeModel({ m: 3, N: 21, vals: { J1: 1, J2: 2 }, rules: { '0,1,0': 'J1', '1,2,0': 'J1', '2,0,1': 'J2' } }) },
  { id: 'creutz', label: 'Creutz ladder (complex)', note: 'Two legs A and B. Along leg A the coupling is J₁ = i, along leg B it is J₁* = −i; J₂ couples the legs diagonally. Two flat bands at ±2J₂ and one edge state at each end.',
    make: () => makeModel({ m: 2, N: 20, layout: 'zigzag', vals: { J1: 1, J2: 1, J3: 0 }, phis: { J1: 0.5 }, rules: { '0,0,1': { c: 'J1', conj: false }, '1,1,1': { c: 'J1', conj: true }, '0,1,1': 'J2', '1,0,1': 'J2', '0,1,0': 'J3' } }) },
  { id: 'wall', label: 'SSH with a defect', note: 'Task 4: two neighbouring weak couplings in the middle of an SSH chain (a long-long defect). The right half is plugged in entry by entry.',
    make: () => makeModel({ m: 2, N: 21, vals: { J1: 2, J2: 1 }, rules: { '0,1,0': 'J1', '1,0,1': 'J2' }, patches: Object.fromEntries(Array.from({ length: 10 }, (_, q) => { const k = 11 + q; return [`${k},${k - 1}`, k % 2 ? 'J2' : 'J1']; })) }) },
];
export const preset = (id) => (PRESETS.find((p) => p.id === id) || PRESETS[1]).make();

// ---------- export ----------
const py = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(+x.toFixed(6)));
// The same model as a short numpy script: the rules of the unit cell in a loop over the cells, then the defects.
export function toPython(model) {
  const { m, N, ring } = model, used = new Set([...Object.values(model.rules), ...Object.values(model.patches)].map((r) => r.c).filter((c) => c !== ERASE));
  const cplx = [...used].some((c) => isComplex(model, c)), term = (r) => (r.c === ERASE ? '0' : r.conj && isComplex(model, r.c) ? `np.conj(${r.c})` : r.c);
  const L = ['import numpy as np', '', `N, m = ${N}, ${m}    # number of sites, sites per unit cell`];
  for (const b of BRUSHES) if (used.has(b.id)) { const v = value(model, b.id); L.push(`${b.id} = ${Math.abs(v.im) > 1e-12 ? `${py(v.re)} ${v.im < 0 ? '-' : '+'} ${py(Math.abs(v.im))}j` : py(v.re)}`); }
  L.push('', `H = np.zeros((N, N)${cplx ? ', dtype=complex' : ''})`, '');
  L.push('# the unit cell: (a, b, d, t) couples site a of cell n to site b of cell n + d', '# a, b = 0 (A), 1 (B), ...; H[row, column] = t and the mirror entry is conj(t)');
  L.push(`rules = [${Object.entries(model.rules).map(([k, r]) => `(${k.split(',').join(', ')}, ${term(r)})`).join(', ')}]`);
  L.push(`for n in range(${ring ? 'N // m' : '(N + m - 1) // m'}):${ring ? '' : '    # the last cell may be incomplete'}`, '    for a, b, d, t in rules:');
  if (ring) L.push('        j, i = m * n + a, (m * (n + d) + b) % N    # column, row; the ring closes', '        if i == j:', '            H[i, i] += np.real(t) if d == 0 else 2 * np.real(t)');
  else L.push('        j, i = m * n + a, m * (n + d) + b      # column, row', '        if i >= N or j >= N:', '            continue', '        if i == j:', '            H[i, i] += np.real(t)              # on-site energy');
  L.push('        else:', '            H[i, j] += t', '            H[j, i] += np.conj(t)              # H is Hermitian');
  const P = Object.entries(model.patches);
  if (P.length) {
    L.push('', '# single entries set by hand (row i, column j, counted from 0)');
    for (const [k, p] of P) { const [i, j] = k.split(',').map(Number), t = term(p); L.push(i === j ? `H[${i}, ${i}] = ${t}` : `H[${i}, ${j}] = ${t}; H[${j}, ${i}] = np.conj(${t})`); }
  }
  L.push('', 'E, V = np.linalg.eigh(H)    # E[n] ascending, V[:, n] the eigenvector of E[n]');
  return L.join('\n') + '\n';
}
