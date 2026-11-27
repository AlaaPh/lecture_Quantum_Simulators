// Tests of the workbook without a browser. Run from the repository root:  node tools/test_workbook.mjs
// Exit code 1 if any check fails.
//   1. the models of the page (app/js/workbook/aah.js and lattice.js) against tools/workbook_numbers.json. These
//      numbers were computed with numpy (the lattice of Exercise 4 in two independent ways, see the note in the file;
//      Exercises 1 to 3 by tools/workbook_reference.py) and are not produced by the page.
//   2. every question of every part: the right answer in the spellings a student uses, a rounded value, every
//      known wrong value with its own hint, an empty and an unreadable field
//   3. the numbers that the texts of the page state
//   4. the reader of typed numbers (app/js/workbook/answers.js): a table of strings and 200000 random strings
import { readFileSync } from 'node:fs';
import * as A from '../app/js/workbook/aah.js';
import * as L from '../app/js/workbook/lattice.js';
import { parse } from '../app/js/workbook/answers.js';
import { judge, val } from '../app/js/workbook/judge.js';
import { zak } from '../app/js/workbook/zak.js';
import { pump } from '../app/js/workbook/pump.js';
import { chern } from '../app/js/workbook/chern.js';
import { CODE } from '../app/js/workbook/code.js';
import { PARTS as ALL_PARTS, GROUPS, questions, WORDS } from '../app/js/workbook/parts.js';

const R = JSON.parse(readFileSync(new URL('./workbook_numbers.json', import.meta.url), 'utf8'));
const PI = Math.PI, TAU = 2 * PI;
let passed = 0, failed = 0;
function report(ok, label, detail = '') { if (ok) passed++; else failed++; console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? '   ' + detail : ''}`); }
const close = (a, b, tol) => Math.abs(a - b) <= tol;
const num = (label, mine, ref, tol) => report(close(mine, ref, tol), label, `${mine.toPrecision(8)}  (reference ${Number(ref).toPrecision(8)}, tolerance ${tol})`);
const list = (label, mine, ref, tol) => report(mine.length === ref.length && mine.every((v, i) => close(v, ref[i], tol)), label, `${mine.map((v) => v.toFixed(5)).join(' ')}  (reference ${ref.map((v) => Number(v).toFixed(5)).join(' ')})`);

console.log('1. the model against the independent numbers');
list('positions x_1 … x_6 at z = 0 (μm)', [1, 2, 3, 4, 5, 6].map((n) => A.xPos(n, 0)), R.x_um_z0, 1e-9);
num('distance of waveguides 1 and 2 (μm)', A.xPos(2, 0) - A.xPos(1, 0), R.s12_um_z0, 1e-9);
list('couplings J_1 … J_5 at z = 0 (1/mm)', A.couplings(0), R.J_z0, 1e-9);
list('couplings J_1 … J_5 at a quarter period (1/mm)', A.couplings(PI / 2), R.J_quarter, 1e-9);
list('eigenvalues of H(k = 0) at z = 0', A.eig(0, 0).values, R.eig_k0_z0, 1e-9);
num('smallest eigenvalue without the corners J_5', A.eig(0, 0, { corners: false }).values[0], R.eig_k0_z0_no_corners_min, 1e-9);
{
  const E = A.bandEdges(200, 200), gaps = [0, 1, 2, 3].map((b) => Math.min(...E.map((e) => e.lo[b + 1] - e.hi[b])));
  list('smallest gaps between neighbouring bands (1/mm)', gaps, R.min_gaps, 2e-5);
}
list('|⟨u(0)|u(2π/50)⟩| at z = 0, bands 1 … 5', [1, 2, 3, 4, 5].map((b) => A.overlapAbs(b, 0, TAU / 50, 0)), R.abs_overlap_k0_k2pi50_phi0_bands, 1e-9);
num('γ/π of band 3, M = 50, z = 0', A.zak(3, 0, 50) / PI, R.zak3_M50_phi0_over_pi, 1e-8);
num('γ/π of band 3, M = 50, Ωz = π/2', A.zak(3, PI / 2, 50) / PI, R.zak3_M50_phiquarter_over_pi, 1e-8);
list('γ/2π gained in one period, bands 1 … 5', [1, 2, 3, 4, 5].map((b) => { const g = A.gammaCurve(b, 96, 100); return g[g.length - 1] - g[0]; }), R.zak_winding_per_period, 1e-6);
num('F/π of the first plaquette, band 3, 10 × 10', A.plaquette(3, 0, 0, TAU / 10) / PI, R.F3_first_plaquette_N10_over_pi, 1e-8);
num('sum of F over π, band 3, 10 × 10', A.chernGrid(3, 10).sum / PI, R.sumF3_N10_over_pi, 1e-8);
for (const N of [6, 10, 40]) list(`Chern numbers on a ${N} × ${N} grid`, [1, 2, 3, 4, 5].map((b) => A.chernGrid(b, N).C), R[`chern_N${N}`], 1e-8);
report([1, 2, 3, 4, 5].every((b) => close(A.chernGrid(b, 10).C, [2, -3, 2, -3, 2][b - 1], 1e-9)), 'the Chern numbers are 2, −3, 2, −3, 2, as printed in the paper');
{
  const w = A.wannier(3, 21, 9), X0 = A.position(w.re, w.im);
  num('centre of the Wannier state of band 3 at z = 0, relative to a cell', X0 - 9, R.wannier3_X0_minus_cell, 2e-4);
  num('the same from γ/2π (M = 400)', A.zak(3, 0, 400) / TAU, R.wannier3_X0_minus_cell, 2e-4);
  num('shift in one period, L = 100 mm, 21 cells', A.pumpRun().shift, R.pump3_shift_L100_21cells, 2e-3);
  num('shift in one period, L = 100 mm, long chain', A.pumpRun({ cells: 101, start: 49 }).shift, R.pump3_shift_L100_long, 2e-3);
  num('shift in one period, L = 400 mm, long chain', A.pumpRun({ L: 400, cells: 121, start: 59 }).shift, R.pump3_shift_L400_long, 2e-3);
  const rec = A.pumpRun().rec, nrm = rec[rec.length - 1].I.reduce((a, b) => a + b, 0);
  report(close(nrm, 1, 1e-6), 'the norm after the period is 1', nrm.toFixed(9));
  const edge = Math.max(...rec.map((r) => r.I[0] + r.I[1] + r.I[r.I.length - 1] + r.I[r.I.length - 2]));
  report(edge < 1e-6, 'no light reaches the ends of the chain of 21 cells', edge.toExponential(1));
}

console.log('1b. the models of Exercises 1 to 3 (app/js/workbook/lattice.js) against the independent numbers');
{
  const X = R.exercises, abs = (c) => Math.hypot(c[0], c[1]);
  // three waveguides
  list('three waveguides: E of the three supermodes', L.MODES3.map((m) => m.E), X.three_E, 1e-12);
  report(L.MODES3.every((m) => L.apply3(m.v).every((v, i) => close(v, m.E * m.v[i], 1e-12))), 'three waveguides: H·v = E·v for the three supermodes');
  list('three waveguides: weights of the supermodes in ψ = (1, 0, 0)', L.MODES3.map((m) => m.v[0] ** 2), X.three_weights_guide1, 1e-12);
  num('three waveguides: z at which all light is in waveguide 3', L.Z_CROSS, X.three_z_cross, 1e-12);
  list('three waveguides: the light at z = 1', L.coupler3(1), X.three_I_z1, 1e-12);
  list('three waveguides: the light at the crossing', L.coupler3(L.Z_CROSS), X.three_I_at_z_cross, 1e-12);
  // the chain
  const e20 = L.chainEig(20);
  num('chain of 20: lowest eigenvalue', e20.values[0], X.chain20_lowest, 1e-10);
  num('chain of 20: highest eigenvalue', e20.values[19], X.chain20_highest, 1e-10);
  num('chain of 19: lowest eigenvalue', L.chainEig(19).values[0], X.chain19_lowest, 1e-10);
  num('chain of 21: lowest eigenvalue', L.chainEig(21).values[0], X.chain21_lowest, 1e-10);
  num('ring of 20: lowest eigenvalue', L.ringLowest(20), X.ring20_lowest, 1e-10);
  list('chain of 20: the formula 2J·cos(nπ/21)', Array.from({ length: 20 }, (_, i) => L.chainExact(i + 1, 20)), X.chain20_formula, 1e-12);
  list('chain of 20: the eigenvalues are the formula', [...e20.values].reverse(), X.chain20_formula, 1e-10);
  list('chain of 20: |components| of the highest eigenvector', e20.vectors[19].map(Math.abs), X.chain20_top_abs, 1e-9);
  report(e20.vectors[19].every((v) => v * e20.vectors[19][0] > 0) && e20.vectors[0].every((v, i, a) => i === 0 || v * a[i - 1] < 0), 'chain of 20: highest eigenvector one sign, lowest eigenvector alternating signs');
  num('chain of 20: light in waveguide 10 at z = 1', L.spread(e20, 10, 1)[9], X.chain20_I10_z1, 1e-10);
  list('chain of 20: the light at z = 4', L.spread(e20, 10, 4), X.chain20_I_z4, 1e-9);
  num('two waveguides: the higher eigenvalue', L.chainEig(2).values[1], X.chain2_E[1], 1e-12);
  // one Runge–Kutta step
  const rk = L.rkStep();
  for (const k of ['k1', 'k2', 'k3', 'k4', 'sum', 'psi1', 'euler', 'exact']) list(`Runge–Kutta step: ${k}`, rk[k], X[`rk_${k}`], 1e-12);
  num('Runge–Kutta step: |ψ₁|', abs(rk.psi1), X.rk_abs_psi1, 1e-12);
  num('Runge–Kutta step: |ψ| after one Euler step', abs(rk.euler), X.rk_abs_euler, 1e-12);
  num('Runge–Kutta step with E·dz = 0.1: |ψ₁|', abs(L.rkStep(1, 0.1).psi1), X.rk_abs_step_x01, 1e-12);
  report(abs(L.rkStep(1, L.RK_LIMIT - 1e-3).psi1) < 1 && abs(L.rkStep(1, L.RK_LIMIT + 1e-3).psi1) > 1 && close(L.RK_LIMIT, X.rk_stability_limit, 1e-4), 'Runge–Kutta step: |ψ₁| ≤ 1 up to E·dz = 2√2', String(X.rk_stability_limit));
  const run = L.rkChain();
  num('41 waveguides, 20 steps of 0.1: light in waveguide 21', run.I[20], X.rk41_I21, 1e-9);
  num('41 waveguides, 20 steps of 0.1: sum of the light', run.norm, X.rk41_norm, 1e-9);
  num('the same with Euler steps: light in waveguide 21', run.euler[20], X.euler41_I21, 1e-9);
  num('the same with Euler steps: sum of the light', run.eulerNorm, X.euler41_norm, 1e-9);
  num('the exact value at z = 2', run.exact[20], X.exact41_I21_z2, 1e-9);
  num('the exact value at z = 1', L.spread(L.chainEig(41), 21, 1)[20], X.exact41_I21_z1, 1e-9);
  // a beam
  num('band: E(π/3)', L.band(Math.PI / 3), X.band_k_pi3, 1e-12);
  num('velocity at k = π/2', L.velocity(Math.PI / 2), X.velocity_k_pi2, 1e-12);
  const beam = L.beamRun(L.BEAM);
  num('beam: centre at z = 0', beam[0].x, X.beam_centre_z0, 1e-8);
  num('beam: centre at z = 5', beam[beam.length - 1].x, X.beam_centre_z5, 1e-7);
  const period = (2 * Math.PI) / L.BLOCH.F;
  num('Bloch oscillation: period 2π/F', period, X.bloch_period, 1e-12);
  num('Bloch oscillation: centre after half a period', L.beamRun({ ...L.BLOCH, zmax: period / 2, rows: 1 })[1].x, X.bloch_centre_half, 1e-7);
  num('Bloch oscillation: centre after one period', L.beamRun({ ...L.BLOCH, zmax: period, rows: 1 })[1].x, X.bloch_centre_full, 1e-7);
  { const b = L.beamRun(L.BLOCH); num('Bloch oscillation: centre at z = 25', b[b.length - 1].x, X.bloch_centre_z25, 1e-7); }
  // the SSH chain
  list('SSH chain, 20 waveguides, J₁ = 2, J₂ = 1: eigenvalues', L.sshEig(20, 2, 1).values, X.ssh20_21_E, 1e-9);
  num('the smallest positive one', L.smallestPositive(L.sshEig(20, 2, 1).values), X.ssh20_21_smallest_positive, 1e-9);
  list('SSH chain, 21 waveguides, J₁ = 2, J₂ = 1: eigenvalues', L.sshEig(21, 2, 1).values, X.ssh21_21_E, 1e-9);
  { const v = L.sshEig(21, 2, 1).vectors[10]; num('its eigenvector number 11: ψ₃/ψ₁', v[2] / v[0], X.ssh21_21_ratio_3_1, 1e-8); list('its absolute values', v.map(Math.abs), X.ssh21_21_zero_vector_abs, 1e-9); num('its part on waveguide 21', v[20] ** 2, X.ssh21_21_weight_guide21, 1e-9); }
  { const v = L.sshEig(21, 1, 2).vectors[10]; num('21 waveguides, J₁ = 1, J₂ = 2: ψ₃/ψ₁ of eigenvector 11', v[2] / v[0], X.ssh21_12_ratio_3_1, 1e-8); num('its part on waveguide 1', v[0] ** 2, X.ssh21_12_weight_guide1, 1e-9); }
  list('SSH chain, 20 waveguides, J₁ = 1, J₂ = 2: eigenvalues', L.sshEig(20, 1, 2).values, X.ssh20_12_E, 1e-9);
  num('the smallest positive one', L.smallestPositive(L.sshEig(20, 1, 2).values), X.ssh20_12_smallest_positive, 1e-9);
  // k-space
  list('|h(k)| at k = 0, π/2, π for J₁ = 2, J₂ = 1', [0, Math.PI / 2, Math.PI].map((k) => Math.hypot(...L.hSSH(k, 2, 1))), X.kspace_abs_h_21, 1e-12);
  num('lower eigenvalue of H(k) at k = 2π/3', -L.bandSSH((2 * Math.PI) / 3, 2, 1), X.kspace_lower_2pi3, 1e-12);
  list('edges of the upper band', [L.bandSSH(Math.PI, 2, 1), L.bandSSH(0, 2, 1)], X.kspace_band_21, 1e-12);
  // the Zak phase
  num('|⟨u(0)|u(π/2)⟩| for J₁ = 1, J₂ = 2', abs(L.overlap2(L.uLower(0, 1, 2), L.uLower(Math.PI / 2, 1, 2))), X.zak_overlap_abs_0_pi2, 1e-12);
  list('product of the four overlaps', L.zakSSH(1, 2, 0, 4).product, X.zak_product_M4, 1e-12);
  num('|γ|/π for J₁ = 1, J₂ = 2, M = 50', Math.abs(L.zakSSH(1, 2, 0, 50).gamma) / Math.PI, X.zak_gamma_over_pi_M50_12, 1e-9);
  num('γ/π for J₁ = 2, J₂ = 1, M = 50', L.zakSSH(2, 1, 0, 50).gamma / Math.PI, X.zak_gamma_over_pi_M50_21, 1e-9);
  num('three points: the product is 0', abs(L.zakSSH(1, 2, 0, 3).product), X.zak_product_M3_abs, 1e-12);
  // the on-site term
  list('21 waveguides, J₁ = 2, J₂ = 1, Δ = 0.5: eigenvalues', L.sshEig(21, 2, 1, 0.5).values, X.onsite21_E, 1e-9);
  num('its eigenvalue number 11', L.sshEig(21, 2, 1, 0.5).values[10], X.onsite21_mid, 1e-9);
  num('overlap of this eigenvector with the one at Δ = 0', L.dotAbs(L.sshEig(21, 2, 1, 0.5).vectors[10], L.sshEig(21, 2, 1).vectors[10]), X.onsite21_overlap_with_zero_state, 1e-9);
  num('upper band at k = π with Δ = 0.5', L.bandSSH(Math.PI, 2, 1, 0.5), X.onsite_band_pi, 1e-12);
  num('20 waveguides, J₁ = 1, J₂ = 2, Δ = 0.5: positive eigenvalue closest to 0', L.smallestPositive(L.sshEig(20, 1, 2, 0.5).values), X.onsite20_12_closest[1], 1e-9);
  num('γ/π with Δ = 0.5, J₁ = 1, J₂ = 2, M = 400', L.zakSSH(1, 2, 0.5, 400).gamma / Math.PI, X.onsite_gamma_over_pi_M400, 1e-9);
  num('the same with M = 50', L.zakSSH(1, 2, 0.5, 50).gamma / Math.PI, X.onsite_gamma_over_pi_M50, 1e-9);
  num('γ/π with Δ = 0.5, J₁ = 2, J₂ = 1, M = 400', L.zakSSH(2, 1, 0.5, 400).gamma / Math.PI, X.onsite_gamma_over_pi_M400_21, 1e-9);
}

console.log('2. every question');
const PARTS = ALL_PARTS;
const spell = (v, d) => { const s = v.toFixed(d); return [s, s.replace('-', '−'), s.replace('.', ','), ` ${s} `]; };
for (const p of PARTS) {
  let q = 0;
  for (const s of p.steps) {
    if (s.type === 'info') { report(typeof s.title === 'string' && typeof s.html === 'string' && typeof s.pic === 'function', `${p.id}: card "${s.title}"`); continue; }
    q++;
    const name = `${p.id} ${q}`;
    report(typeof s.hint === 'string' && s.hint.length > 0 && val(s.after).length > 0 && typeof s.pic === 'function' && typeof s.pic(false) === 'object' && typeof s.pic(true) === 'object', `${name}: has a hint, a line for the right answer and a picture`);
    if (s.type === 'choice') {
      report(s.options.includes(s.ref) && judge(s, [s.ref]).state === 'right' && s.options.filter((o) => o !== s.ref).every((o) => judge(s, [o]).state === 'wrong'), `${name}: only the button "${s.ref}" is right`);
    } else if (s.type === 'complex') {
      const { re, im } = s.ref;
      report(judge(s, [String(re), String(im)]).state === 'right' && judge(s, [String(re).replace('-', '−'), String(im).replace('-', '−')]).state === 'right', `${name}: ${re} + ${im}·i is right`);
      report(judge(s, [String(re + 1), String(im)]).state === 'wrong' && judge(s, ['', '']).state === 'empty' && judge(s, ['x', '1']).state === 'unreadable', `${name}: another number is wrong, an empty field and letters are told`);
      if (re !== im) report(/exchanged/.test(judge(s, [String(im), String(re)]).text || ''), `${name}: exchanged parts get their own hint`);
    } else {
      const ref = val(s.ref), d = Math.max(0, Math.ceil(-Math.log10(s.tol)) + 1);
      report(Number.isFinite(ref) && s.tol > 0, `${name}: the reference is a number`, String(ref));
      report(spell(ref, d).every((t) => judge(s, [t]).state === 'right'), `${name}: ${ref.toFixed(d)} is right, also with − (U+2212), a decimal comma, spaces`);
      const digits = Math.max(0, Math.ceil(-Math.log10(s.tol)));              // as many decimals as the tolerance asks for
      report(judge(s, [ref.toFixed(digits)]).state === 'right', `${name}: rounded to ${digits} decimals it is still right`, ref.toFixed(digits));
      if (s.ph) { const shown = (s.ph.split('.')[1] || '').length; report(judge(s, [ref.toFixed(shown)]).state === 'right', `${name}: with the ${shown} decimals that the empty field shows (${s.ph}) the answer is right`, ref.toFixed(shown)); }
      report(judge(s, [(ref + 6 * s.tol).toFixed(d + 1)]).state === 'wrong' && judge(s, [(ref - 6 * s.tol).toFixed(d + 1)]).state === 'wrong', `${name}: six tolerances away is wrong`);
      report(judge(s, ['']).state === 'empty' && judge(s, ['abc']).state === 'unreadable' && judge(s, ['1..2']).state === 'unreadable', `${name}: an empty field and letters are told`);
      if (s.unit === 'π') report(judge(s, [`${ref.toFixed(d)}pi`]).state === 'right' && judge(s, [`${ref.toFixed(d)} π`]).state === 'right', `${name}: "${ref.toFixed(d)}pi" in a field with the unit π is read as ${ref.toFixed(d)}`);
      if (s.unit === '°') report(judge(s, [`${ref.toFixed(d)}°`]).state === 'right', `${name}: "${ref.toFixed(d)}°" is read`);
      if (s.mod) {
        const other = ref > 0 ? ref - s.mod : ref + s.mod;
        report(judge(s, [other.toFixed(d)]).state === 'right', `${name}: the same phase one full turn away (${other.toFixed(d)}) is right`);
        report(/between/.test(judge(s, [(ref * 180).toFixed(1)]).text || ''), `${name}: the phase in degrees is told`);
      }
      for (const k of s.wrongs || []) {
        const w = val(k.ref), r = judge(s, [w.toFixed(d + 1)]);
        if (s.mod && Math.abs(w) > s.mod) { report(r.state === 'wrong', `${name}: ${w.toFixed(d)} is wrong (outside one turn)`); continue; }
        report(r.state === 'wrong' && r.text === k.text, `${name}: ${w.toFixed(d)} → "${k.text.slice(0, 60)}…"`);
        { let dist = w - ref; if (s.mod) dist -= s.mod * Math.round(dist / s.mod); report(Math.abs(dist) > s.tol + (k.tol ?? s.tol), `${name}: the wrong value ${w.toFixed(d)} is not inside the tolerance of the right one`, Math.abs(dist).toFixed(4)); }
      }
    }
  }
  report(q === questions(p) && q >= 4 && q <= 10, `${p.id}: ${q} questions`);
  report(p.steps[0].title.includes(`${WORDS[q]} small questions`), `${p.id}: the first card names the number of questions (${WORDS[q]})`, p.steps[0].title);
  report(typeof p.title === 'string' && p.title.length > 2 && typeof p.draw === 'function' && /^[a-z0-9]+$/.test(p.id), `${p.id}: has a title, an address and pictures`);
  report(p.steps[0].type === 'info' && p.steps[p.steps.length - 1].type === 'info' && p.steps[p.steps.length - 1].end === true, `${p.id}: starts and ends with a card`);
}
// what the usual mistakes of the code give, and that the page tells them apart
{
  const q = (p, n) => p.steps.filter((s) => s.type !== 'info')[n - 1];
  const E = A.eig(0, 0).values;
  report(/corners/.test(judge(q(pump, 6), [A.eig(0, 0, { corners: false }).values[0].toFixed(4)]).text), 'pump 6: matrix without the corners → hint about the corners');
  report(/−J/.test(judge(q(pump, 6), [(-E[4]).toFixed(4)]).text) && close(A.eig(Math.PI, 0).values[0], -E[4], 1e-12), 'pump 6: matrix with −J, or k = π → hint about the sign and about k');
  report(/highest/.test(judge(q(pump, 6), [E[4].toFixed(4)]).text) && /closest to zero/.test(judge(q(pump, 6), [E[2].toFixed(4)]).text), 'pump 6: the highest eigenvalue and the one closest to zero → their hints');
  const Jq = A.couplings(PI / 2), J0 = A.couplings(0), hint5 = (v) => judge(q(pump, 5), [v.toFixed(3)]).text || '';
  report(judge(q(pump, 5), [Jq[1].toFixed(3)]).state === 'right' && judge(q(pump, 5), [Jq[1].toFixed(4)]).state === 'right', 'pump 5: J₂ at a quarter period with three or four decimals is right', Jq.map((v) => v.toFixed(4)).join(' '));
  report(/z = 0/.test(hint5(J0[1])) && /J₄/.test(hint5(Jq[3])) && /−Ωz/.test(hint5(Jq[3])) && /J₃/.test(hint5(Jq[2])) && /without the cosine/.test(hint5(Jq[2])) && /J₁/.test(hint5(Jq[0])) && judge(q(pump, 5), [Jq[4].toFixed(3)]).state === 'wrong', 'pump 5: J₂ at z = 0, J₄ (= J₂ with −Ωz), J₃ (= no cosine) and J₁ get their hints; J₅ is wrong');
  {                                                 // what the two mistakes named in the hints really give
    const Jmis = (sign, amp) => { const x = [2, 3].map((n) => n * 17.25 + amp * Math.cos(sign * PI / 2 + 4 * PI * n / 5 - 0.3 * PI)); return 6.672 * Math.exp(-0.2348 * (x[1] - x[0])); };
    report(close(Jmis(-1, 1), Jq[3], 1e-12) && close(Jmis(1, 0), Jq[2], 1e-12) && close(Jmis(1, 1), Jq[1], 1e-12), 'pump 5: −Ωz in the cosine gives the value of J₄, no cosine gives the value of J₃', `${Jmis(-1, 1).toFixed(4)}, ${Jmis(1, 0).toFixed(4)}`);
  }
  const Jr = A.couplings(0).map((v) => Number(v.toFixed(3)));                // a student who types the five rounded couplings of the picture
  const re = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]), im = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  for (let i = 0; i < 4; i++) { re[i][i + 1] = Jr[i]; re[i + 1][i] = Jr[i]; } re[4][0] = Jr[4]; re[0][4] = Jr[4];
  const { hermEig } = await import('../app/js/linalg.js');
  const Er = hermEig(re, im).values[0];
  report(judge(q(pump, 6), [Er.toFixed(4)]).state === 'right' && judge(q(pump, 6), [Er.toFixed(3)]).state === 'right', 'pump 6: with the couplings rounded to three decimals the answer is still right', Er.toFixed(5));
  report(judge(q(pump, 3), ['0.13']).state === 'wrong' && judge(q(pump, 3), ['0.133']).state === 'right' && judge(q(pump, 3), ['0.1334']).state === 'right' && judge(q(pump, 3), ['0.1335']).state === 'right', 'pump 3: 0.133, 0.1334 and 0.1335 (from the rounded distance) are right, 0.13 is not');
  report(judge(q(pump, 1), ['33.9']).state === 'right' && judge(q(pump, 1), ['33.912']).state === 'right' && judge(q(pump, 1), ['34.5']).state === 'wrong', 'pump 1: 33.9 and 33.912 are right, 34.5 is not');
  report(judge(q(pump, 2), ['16.66']).state === 'right' && judge(q(pump, 2), ['16.7']).state === 'wrong', 'pump 2: 16.66 is right, 16.7 is not');
  const o3 = A.overlapAbs(3, 0, TAU / 50, 0);
  report(judge(q(chern, 1), [o3.toFixed(4)]).state === 'right' && judge(q(chern, 1), [o3.toFixed(5)]).state === 'right' && /four decimals/.test(judge(q(chern, 1), [o3.toFixed(3)]).text), 'chern 1: the overlap with four or five decimals is right, with three it asks for four', o3.toFixed(6));
  report(/band 4/.test(judge(q(chern, 1), [A.overlapAbs(4, 0, TAU / 50, 0).toFixed(4)]).text) && /band 2/.test(judge(q(chern, 1), [A.overlapAbs(2, 0, TAU / 50, 0).toFixed(4)]).text) && judge(q(chern, 1), [A.overlapAbs(1, 0, TAU / 50, 0).toFixed(4)]).state === 'wrong' && judge(q(chern, 1), [A.overlapAbs(5, 0, TAU / 50, 0).toFixed(4)]).state === 'wrong', 'chern 1: the overlap of band 4 and of band 2 get their hints, bands 1 and 5 are wrong');
  report(/imaginary/.test(judge(q(chern, 1), ['0.99999']).text) && /same/.test(judge(q(chern, 1), ['1']).text) && /imaginary/.test(judge(q(chern, 1), ['1.0000']).text) && /same/.test(judge(q(chern, 1), ['1.0000']).text), 'chern 1: 0.99999, 1.0000 and 1 name both causes: equal vectors, or a matrix without imaginary part');
  for (const [M, ok] of [[20, true], [100, true], [400, true], [10, true]]) report((judge(q(chern, 2), [(A.zak(3, 0, M) / PI).toFixed(4)]).state === 'right') === ok, `chern 2: γ with M = ${M} is accepted`, (A.zak(3, 0, M) / PI).toFixed(4));
  report([1, 2, 4, 5].every((b) => judge(q(chern, 2), [(A.zak(b, 0, 50) / PI).toFixed(4)]).state === 'wrong'), 'chern 2: γ of another band is wrong', [1, 2, 4, 5].map((b) => (A.zak(b, 0, 50) / PI).toFixed(3)).join(' '));
  report(/complex numbers are missing/.test(judge(q(chern, 2), ['0']).text) && /complex numbers are missing/.test(judge(q(chern, 3), ['0.0000']).text), 'chern 2 and 3: γ = 0 → hint about the missing complex numbers');
  report(judge(q(chern, 2), ['-0.98']).state === 'right' && judge(q(chern, 2), ['1.02']).state === 'right' && judge(q(chern, 3), ['0.18']).state === 'right' && judge(q(chern, 2), ['0.98']).state === 'wrong' && judge(q(chern, 2), ['-0.97']).state === 'wrong' && judge(q(chern, 3), ['0.17']).state === 'wrong', 'chern 2 and 3: the two decimals that the field shows are enough (−0.98, 1.02, 0.18); 0.98, −0.97 and 0.17 are wrong');
  report(/radians/.test(judge(q(chern, 6), ['12.566']).text) && /radians/.test(judge(q(chern, 6), ['12.6']).text) && /radians/.test(judge(q(chern, 5), ['0.2379']).text), 'chern 5 and 6: F and the sum in radians get their hint');
  report(/−Ωz|Ωz = π\/2/.test(judge(q(pump, 6), ['-0.211']).text) && judge(q(pump, 6), ['-0.212']).state === 'right' && judge(q(pump, 6), ['-0.213']).state === 'right' && judge(q(pump, 6), ['-0.2107']).state === 'wrong', 'pump 6: −0.212 and −0.213 are right; −0.211 is the value at Ωz = π/2 and gets its hint', A.eig(0, PI / 2).values[0].toFixed(4));
  report(/neighbouring column/.test(judge(q(chern, 2), [(A.zak(4, 0, 50) / PI).toFixed(4)]).text) && /neighbouring column/.test(judge(q(chern, 3), [(A.zak(2, PI / 2, 50) / PI).toFixed(4)]).text), 'chern 2 and 3: γ of band 2 or 4 → hint about the column');
  report(/reversed/.test(judge(q(chern, 2), [(-A.zak(3, 0, 50) / PI).toFixed(4)]).text) && /reversed/.test(judge(q(chern, 3), [(-A.zak(3, PI / 2, 50) / PI).toFixed(4)]).text), 'chern 2 and 3: −γ → hint about the sign');
  report(judge(q(chern, 5), [(A.plaquette(3, 0, 0, TAU / 20) / PI).toFixed(4)]).state === 'wrong' && judge(q(chern, 5), [(A.plaquette(1, 0, 0, TAU / 10) / PI).toFixed(4)]).state === 'wrong', 'chern 5: F on a 20 × 20 grid or of band 1 is wrong');
  report(judge(q(chern, 6), ['4']).state === 'right' && judge(q(chern, 6), ['4.0000000000000036']).state === 'right' && judge(q(chern, 6), ['3.9999999999999996']).state === 'right' && judge(q(chern, 6), ['4pi']).state === 'right', 'chern 6: 4, 4.0000000000000036 and 4pi are right');
  report(judge(q(chern, 7), ['-3']).state === 'right' && judge(q(chern, 7), ['-3.0000000000000004']).state === 'right' && judge(q(chern, 7), ['−3']).state === 'right', 'chern 7: −3 is right, also as the computer prints it');
  report(judge(q(chern, 8), ['0']).state === 'right' && judge(q(chern, 8), ['1']).state === 'wrong', 'chern 8: 0 is right');
}

report(new Set(ALL_PARTS.map((p) => p.id)).size === ALL_PARTS.length && GROUPS.every((g) => g.parts.length > 0 && g.title && g.about), 'every part has its own address and every exercise has parts');

console.log('3. the numbers in the texts');
{
  const text = (p) => p.steps.map((s) => [s.title, s.html, val(s.text), s.formula, s.extra, s.ask, s.hint, typeof s.how === 'string' ? s.how : '', s.type === 'info' ? '' : val(s.after), ...(s.wrongs || []).map((k) => k.text)].filter(Boolean).join(' ')).join(' ');
  const T = text(pump) + ' ' + text(chern), J = A.couplings(0), E = A.eig(0, 0).values, has = (s) => T.includes(s);
  const m = (v, d) => v.toFixed(d).replace('-', '−');
  report(has('d = 17.25 μm') && has('δ = 1 μm') && has('4πn/5 − 3π/10') && has('6.672 mm') && has('0.2348'), 'the numbers of the paper: d, δ, the phase 4πn/5 − 3π/10, the measured coupling');
  report(close(Math.cos((234 * PI) / 180), -0.588, 5e-4) && close((4 * PI * 2) / 5 - 0.3 * PI, (234 * PI) / 180, 1e-12) && close(4 * PI / 5 - 0.3 * PI, PI / 2, 1e-12), 'cos 234° = −0.588, the angle of waveguide 2 is 234°, of waveguide 1 is 90°');
  report(has(m(A.xPos(2, 0), 2)) && has(m(A.xPos(2, 0) - A.xPos(1, 0), 2)) && close(34.5 - A.xPos(2, 0), 0.59, 0.005), 'x₂ = 33.91 μm, s = 16.66 μm, shifted by 0.59 μm');
  { const Jq2 = A.couplings(PI / 2), big = (a) => a.indexOf(Math.max(...a)) + 1; report(big(Jq2) === 5 && big(A.couplings(0)) === 3 && has('The strongest coupling is now J₅; at z = 0 it was J₃'), 'the strongest coupling is J₃ at z = 0 and J₅ at a quarter period'); }
  { const w = A.wannier(3, 21, 9), I = Array.from(w.re, (r, i) => r * r + w.im[i] * w.im[i]), cell = (c) => I.slice(5 * c, 5 * c + 5).reduce((x, y) => x + y, 0); report(close(cell(8), 0.5, 0.01) && close(cell(9), 0.5, 0.01) && has('about half of this light is in one unit cell, half in the next'), 'at z = 0 half of the light of band 3 is in one unit cell and half in the next', `${cell(8).toFixed(3)}, ${cell(9).toFixed(3)}`); }
  report(close(0.2348 * 16.66, 3.912, 5e-4) && close(Math.exp(-3.912), 0.02, 5e-5) && close(6.672 * 0.02, 0.133, 1e-3), 'the hint of the coupling: 0.2348 · 16.66 = 3.912, e^−3.912 = 0.0200, J₁ = 0.133');
  report(has(J.map((v) => v.toFixed(3)).join(', ')) && has(A.couplings(PI / 2).map((v) => v.toFixed(3)).join(', ')), 'the five couplings at z = 0 and at a quarter period in the text', J.map((v) => v.toFixed(3)).join(', '));
  report(has(E.map((v) => m(v, 3)).join(', ')), 'the five eigenvalues in the text', E.map((v) => m(v, 3)).join(', '));
  report(has(`(${A.pumpRun().shift.toFixed(2)} here`) && Math.round(A.pumpRun().shift) === 2, 'the shift of the pump in the text', A.pumpRun().shift.toFixed(3));
  const g0 = A.zak(3, 0) / PI, g1 = A.zak(3, PI / 2) / PI;
  report(!/wiggl|coarse/.test(T), 'no word that a reader named as unknown (wiggle, coarse)');
  report(has(`γ = ${m(g0, 2)}π`) && has(`γ/2π = ${m(g0 / 2, 2)}`) && has(`to ${m(g1, 2)}π`) && has(`= ${((g1 - g0) / 2).toFixed(2)} unit cells`), 'γ at z = 0 and at a quarter period, and the distance between them', `${g0.toFixed(4)}π, ${g1.toFixed(4)}π`);
  report(has('2, −3, 2, −3, 2') && has('(2 − 3)/2 = −1/2'), 'the Chern numbers and the fraction of the paper');
  const E2 = A.bandEdges(), gap = (b) => Math.min(...E2.map((e) => e.lo[b + 1] - e.hi[b]));
  report(gap(1) > 10 * gap(0) && gap(2) > 10 * gap(3) && gap(0) > 0, 'band 3 keeps gaps more than ten times wider than the gap between bands 1 and 2', `${gap(0).toFixed(4)}, ${gap(1).toFixed(4)}, ${gap(2).toFixed(4)}, ${gap(3).toFixed(4)} per mm`);
  const g = A.gammaCurve(3);
  report(g.every((v, i) => i === 0 || v > g[i - 1]) && close(g[g.length - 1] - g[0], 2, 1e-9), 'γ of band 3 grows all the time and gains 2 · 2π in one period');
  report(Object.values(CODE).every((b) => typeof b.py === 'string' && b.py.length > 0 && typeof b.m === 'string' && b.m.length > 0), 'every code hint exists in Python and in MATLAB');
}

console.log('4. the reader of typed numbers');
{
  const rows = [['0.5', 0.5], ['.5', 0.5], ['0,5', 0.5], ['-0.2', -0.2], ['−0.2', -0.2], ['–0.2', -0.2], ['+3', 3], ['1e-3', 0.001], ['1/4', 0.25], ['0.5/2', 0.25], ['pi', PI], ['π', PI], ['0.5pi', PI / 2], ['0.5 π', PI / 2], ['2*pi', TAU], ['pi/2', PI / 2], ['3π/4', 0.75 * PI], [' 7 ', 7], ['-0', 0],
    ['', 'empty'], [' ', 'empty'], ['\t\n', 'empty'], ['abc', 'unreadable'], ['0.72+0.44i', 'unreadable'], ['1..2', 'unreadable'], ['1/0', 'unreadable'], ['--1', 'unreadable'], ['0x10', 'unreadable'], ['Infinity', 'unreadable'], ['NaN', 'unreadable'], ['1e', 'unreadable'], ['e3', 'unreadable'], ['1e999', 'unreadable'], ['1,2,3', 'unreadable'], ['1 2', 'unreadable'], ['1/2/3', 'unreadable'], ['1/-4', 'unreadable'], ['1/4pi', 'unreadable'], ['2pi3', 'unreadable'], ['pi pi', 'unreadable'], ['-', 'unreadable'], ['(1)', 'unreadable'], ['1 cell', 'unreadable'], ['5.', 5], ['-3.', -3], ['4.e0', 4], ['5,', 'unreadable'], ['63.43°', 'unreadable']];
  let bad = 0;
  for (const [text, want] of rows) { const p = parse(text); const ok = typeof want === 'string' ? p.state === want : p.state === 'ok' && close(p.value, want, 1e-12) && Object.is(p.value, p.value + 0); if (!ok) { bad++; console.log('       ', JSON.stringify(text), '→', JSON.stringify(p), ' expected', want); } }
  report(bad === 0, `${rows.length} strings are read as expected`);
  report(parse('63.43°', { unit: 'deg' }).value === 63.43 && parse('63.43 deg', { unit: 'deg' }).value === 63.43 && parse('pi/2°', { unit: 'deg' }).state === 'unreadable', 'the unit behind a number only in a field in degrees');
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const alphabet = ['0', '1', '2', '5', '7', '9', '.', ',', '-', '−', '+', '/', 'e', 'E', 'p', 'i', 'π', ' ', '*', '°', 'd', 'g', 'x', 'I', 'N', 'a'];
  let nOk = 0, nBad = 0, trouble = null;
  for (let n = 0; n < 200000 && !trouble; n++) {
    const text = Array.from({ length: 1 + Math.floor(7 * rnd()) }, () => alphabet[Math.floor(alphabet.length * rnd())]).join('');
    let p;
    try { p = parse(text, n % 2 ? { unit: 'deg' } : 'real'); } catch { trouble = `${JSON.stringify(text)} throws`; break; }
    if (p.state === 'ok') {
      nOk++;
      if (!Number.isFinite(p.value) || !Number.isFinite(p.number)) trouble = `${JSON.stringify(text)} gives ${p.value}`;
      const plain = text.trim().replace('−', '-').replace(',', '.');
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(plain) && p.value !== Number(plain) + 0) trouble = `${JSON.stringify(text)} read as ${p.value}`;
      if (/[xNa]/.test(text) || /(^|[^pP])I/.test(text) || (/[dg]/.test(text) && p.suffix !== 'deg')) trouble = `${JSON.stringify(text)} was read`;
    } else if (p.state === 'unreadable') nBad++;
    else if (text.trim() !== '') trouble = `${JSON.stringify(text)} is called empty`;
  }
  report(trouble === null && nOk > 1000 && nBad > 1000, '200000 random strings: no error, no NaN, no text read in part', trouble ?? `${nOk} read, ${nBad} unreadable`);
}

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
