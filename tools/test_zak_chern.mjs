// Tests of the workbook logic (app/js/workbook/model.js, answers.js, pump.js and the fields of content.js).
// Run from the repository root:  node tools/test_zak_chern.mjs      Exit code 1 if any check fails.
//   1. every number of tools/zak_chern_numbers.json is computed again by model.js and compared
//   2. random phases on all eigenvectors change neither a Zak phase nor a Chern number
//   3. a table of typed strings for the reader and the checker of answers.js
//   4. time of one propagation (T = 50, 60 cells)
//   5. the functions of model.js against a second, independent way
//   6. the position counted from the cell where the light starts (the counting of the page and of the code skeletons)
//   7. the data of the pump figures (app/js/workbook/pump.js)
//   8. the fields of the page (app/js/workbook/content.js and fields.js, which run without a browser): the unit rule,
//      every reference and every known wrong value, the hints, students who go on with rounded numbers
import { readFileSync } from 'node:fs';
import * as M from '../app/js/workbook/model.js';
import { parse, check } from '../app/js/workbook/answers.js';
import * as P from '../app/js/workbook/pump.js';
import * as F from '../app/js/workbook/fields.js';
import '../app/js/workbook/content.js';               // defines every field of the page
import { symEig, hermEig, matvec, rk4Step } from '../app/js/linalg.js';

const J = JSON.parse(readFileSync(new URL('./zak_chern_numbers.json', import.meta.url), 'utf8'));
const PI = Math.PI, TAU = 2 * PI, { cx } = M;
let passed = 0, failed = 0;
const failures = [];
function report(ok, label, detail = '') {
  if (ok) passed++; else { failed++; failures.push(label); }
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? '   ' + detail : ''}`);
}
const f6 = (x) => { const s = x.toFixed(6).replace(/\.?0+$/, ''); return s === '-0' ? '0' : s; };
const sci = (x) => (x === 0 ? '0' : x.toExponential(1));
// reproducible random numbers in [0, 1)
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const angleDist = (a, b) => Math.hypot(Math.cos(a) - Math.cos(b), Math.sin(a) - Math.sin(b));   // |e^{ia} - e^{ib}|

// =====================================================================================================
console.log('1. tools/zak_chern_numbers.json against model.js');
console.log('   (rule: num = number within 1e-6; angle = compared as exp(i·angle), 1e-6 in the stored unit; int = exactly equal;');
console.log('    shift = within 2e-3, the stored value is from the exact exponential and model.js uses Runge-Kutta 4)');
const S = M.steps();
const ANGLE_PI = new Set(['gamma_over_pi', 'gamma_M100_over_pi', 'gamma_over_pi_M4', 'M4_over_pi', 'M100_over_pi', 'M400_over_pi', 'limit_over_pi',
  'upper_band_M400_over_pi', 'quarter_M4_over_pi', 'quarter_M400_over_pi', 'threequarter_M400_over_pi_raw', 'sheet_quarter_M400_over_pi', 'gamma_raw_over_pi']);
const ANGLE_DEG = new Set(['phi_deg', 'ov_angle_deg']);
const INTEGER = new Set(['winding', 'C', 'C_24', 'C_sheet_4', 'C_sheet_3_wrong', 'upper_band', 'reversed_cycle', 'not_enclosing', 'chern_lower_to_upper', 'abs',
  'C_m0', 'C_m06', 'C_m0_phi_negative', 'grid']);
function ruleOf(path) {
  const key = path[path.length - 1], parent = path[path.length - 2], full = path.join('.');
  if (parent === 'shift' || full === 'B.B3.one_guide_T50' || full === 'B.B3.sheet_T20_pair') return 'shift';
  if (INTEGER.has(key) || parent === 'cells' || full === 'B.B2.cells' || full === 'B.B8.sheet') return 'int';
  if (ANGLE_PI.has(key)) return 'angle';
  if (ANGLE_DEG.has(key)) return 'angle°';
  return 'num';
}
const TOL = { num: 1e-6, angle: 1e-6, 'angle°': 1e-6, shift: 2e-3, int: 0 };
const isDict = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isComplex = (x) => isDict(x) && typeof x.re === 'number' && typeof x.im === 'number';
// largest deviation between a stored value j and a model value m; numbers are collected for the printed line
function deviation(j, m, rule, acc) {
  if (typeof j === 'number') {
    if (typeof m !== 'number' || !Number.isFinite(m)) { acc.err = `model value is ${JSON.stringify(m)}`; return; }
    let d;
    if (rule === 'angle') d = angleDist(PI * j, PI * m) / PI;
    else if (rule === 'angle°') d = (angleDist((PI * j) / 180, (PI * m) / 180) * 180) / PI;
    else if (rule === 'int') d = Number.isInteger(m) && m === j ? 0 : Infinity;
    else d = Math.abs(j - m);
    acc.dev = Math.max(acc.dev, d); acc.n++; acc.shown.push(f6(m));
  } else if (typeof j === 'string') {
    if (j !== m) acc.err = `"${m}" instead of "${j}"`; else { acc.n++; acc.shown.push(m); }
  } else if (Array.isArray(j)) {
    if (isComplex(m) && j.length === 2 && typeof j[0] === 'number') { deviation(j[0], m.re, rule, acc); deviation(j[1], m.im, rule, acc); acc.shown.splice(-2, 2, `(${f6(m.re)}, ${f6(m.im)})`); }
    else if (Array.isArray(m) && m.length === j.length) j.forEach((x, i) => deviation(x, m[i], rule, acc));
    else acc.err = `stored array of ${j.length}, model has ${Array.isArray(m) ? 'an array of ' + m.length : typeof m}`;
  } else if (isDict(j)) {
    if (!isDict(m)) { acc.err = 'model has no object here'; return; }
    for (const k of Object.keys(j)) deviation(j[k], m[k], rule, acc);
  }
}
let nKeys = 0, nNumbers = 0;
function walk(j, m, path) {
  if (isDict(j)) { for (const k of Object.keys(j)) walk(j[k], m === undefined ? undefined : m[k], [...path, k]); return; }
  const label = path.join('.');
  if (typeof j === 'string') { console.log(`  text  ${label}   (description, not a number)`); return; }
  if (m === undefined) { report(false, label, 'not computed by model.js'); return; }
  const rule = ruleOf(path), acc = { dev: 0, n: 0, shown: [], err: null };
  deviation(j, m, rule, acc);
  nKeys++; nNumbers += acc.n;
  const ok = !acc.err && acc.dev <= TOL[rule];
  report(ok, label, `[${rule}] ${acc.err ? acc.err : `max dev ${sci(acc.dev)}`}   model: ${acc.n ? acc.shown.join(' ') : '(empty list, as stored)'}`);
}
walk(J, S, []);
console.log(`   ${nKeys} keys with ${nNumbers} values compared`);
console.log('   for information, shift per cycle: Runge-Kutta 4 with dt = 0.05 (model.js) minus exact exponential (stored)');
for (const T of ['T20', 'T50', 'T100']) console.log(`     ${T}: ${f6(S.B.B3.shift[T])} - ${f6(J.B.B3.shift[T])} = ${sci(S.B.B3.shift[T] - J.B.B3.shift[T])}`);

// =====================================================================================================
console.log('\n2. random phases on all eigenvectors');
{
  const rnd = rng(2026);
  const sets = [[1, 2, 0], [2, 1, 0], [1, 2, 0.5], [2, 1, 0.5], [0, 4, 3], [1.5, 0.5, -0.3]];
  let worst = 0, worstEig = 0, count = 0;
  for (const [J1, J2, D] of sets) for (const band of [0, 1]) for (const Mk of [4, 100, 400]) {
    const g0 = M.zakOf(J1, J2, D, Mk, { band });
    for (let rep = 0; rep < 2; rep++) {
      const phases = Array.from({ length: Mk }, () => TAU * rnd());
      worst = Math.max(worst, angleDist(g0, M.zakOf(J1, J2, D, Mk, { band, phases })));
      // second way: eigenvectors from the numerical diagonalisation, again with random phases
      const us = M.kGrid(Mk).map((k) => M.withPhase(M.eigvec(k, J1, J2, D, band), TAU * rnd()));
      worstEig = Math.max(worstEig, angleDist(g0, M.zak(us)));
      count += 2;
    }
  }
  report(worst < 1e-9, 'Zak phase: zakOf with extra random phases = zakOf without', `${count / 2} cases (6 parameter sets, both bands, M = 4, 100, 400, two draws), max |e^{ig} - e^{ig'}| = ${sci(worst)}`);
  report(worstEig < 1e-9, 'Zak phase: eigenvectors from hermEig with random phases = closed form', `${count / 2} cases, max |e^{ig} - e^{ig'}| = ${sci(worstEig)}`);
  const ov0 = M.loopOverlaps(M.bandStates(1, 2, 0, 4)), ov1 = M.loopOverlaps(M.bandStates(1, 2, 0, 4, { phases: [0.3, 1.1, 2.5, 4.0] }));
  const dOv = Math.max(...ov0.map((o, s) => cx.abs(cx.sub(o, ov1[s]))));
  report(dOv > 0.1, 'the single overlaps do change with the phases', `largest change of one overlap ${f6(dOv)}`);

  const cases = [
    ['pump, hand numbers, 4 x 4', M.pumpState(1, 0.5), 4, 1], ['pump, hand numbers, 24 x 24', M.pumpState(1, 0.5), 24, 1],
    ['pump, sheet numbers, 4 x 4', M.pumpState(0.5, 0.2), 4, 1], ['pump, sheet numbers, 8 x 8', M.pumpState(0.5, 0.2), 8, 1],
    ['pump, upper band, 8 x 8', M.pumpState(1, 0.5, { band: 1 }), 8, -1], ['pump, reversed cycle, 8 x 8', M.pumpState(1, 0.5, { sign: -1 }), 8, -1],
    ['cycle not around (0, 0), 8 x 8', M.cycleState(M.notEnclosingParams), 8, 0],
    ...[0, 1, 2].map((b) => [`Hofstadter band ${b}, 6 x 6`, (x, s) => M.eigenvector(M.hofstadter(x, TAU * s), b), 6, J.C.C1.chern_lower_to_upper[b]]),
    ['Haldane m = 0, 6 x 6', (x, s) => M.eigenvector(M.haldane(x, TAU * s, 0), 0), 6, J.C.C2.C_m0],
    ['Haldane m = 0.6, 6 x 6', (x, s) => M.eigenvector(M.haldane(x, TAU * s, 0.6), 0), 6, J.C.C2.C_m06],
    ['Haldane m = 0, phi_H = -pi/2, 6 x 6', (x, s) => M.eigenvector(M.haldane(x, TAU * s, 0, 0.1, -PI / 2), 0), 6, J.C.C2.C_m0_phi_negative],
  ];
  for (const [name, ufun, N, expected] of cases) {
    const plain = M.chernMap(ufun, N);
    let dF = 0, dC = 0;
    for (let rep = 0; rep < 2; rep++) {
      const twisted = M.chernMap((k, s) => M.withPhase(ufun(k, s), TAU * rnd()), N);
      plain.F.forEach((row, i) => row.forEach((f, j) => { dF = Math.max(dF, Math.abs(f - twisted.F[i][j])); }));
      dC = Math.max(dC, Math.abs(plain.chern - twisted.chern));
    }
    report(dF < 1e-9 && dC < 1e-9 && Math.abs(plain.chern - expected) < 1e-9, `Chern number: ${name}`, `C = ${f6(plain.chern)} (expected ${expected}), with random phases: max change of a plaquette ${sci(dF)}, of C ${sci(dC)}`);
  }
  // the pump with eigenvectors from hermEig instead of the closed form
  const viaEig = M.chernMap((k, s) => { const p = M.pumpParams(s, 1, 0.5); return M.withPhase(M.eigvec(k, p.J1, p.J2, p.D, 0), TAU * rnd()); }, 4);
  const hand = M.chernMap(M.pumpState(1, 0.5), 4);
  let dF = 0;
  hand.F.forEach((row, i) => row.forEach((f, j) => { dF = Math.max(dF, Math.abs(f - viaEig.F[i][j])); }));
  report(dF < 1e-9, 'pump 4 x 4: plaquettes from hermEig eigenvectors with random phases = closed form', `max difference ${sci(dF)}`);
}

// =====================================================================================================
console.log('\n3. answers.js: typed strings');
{
  const A7 = J.A.A7.set1.M400_over_pi, A7up = J.A.A7.set1.upper_band_M400_over_pi, phi = J.A.set1.phi_deg[1], len = J.A.set1.ov_len[0];
  const real = { kind: 'real' }, fine = { kind: 'real', tol: 1e-6 };
  const gPi = { kind: 'angle', unit: 'pi', tol: 2e-4, wrong: [{ value: A7up, hintId: 6 }] };
  const aPi = { kind: 'angle', unit: 'pi' }, aDeg = { kind: 'angle', unit: 'deg' }, vPi = { kind: 'value', unit: 'pi' };
  const int = { kind: 'integer', wrong: [{ value: 0, hintId: 7 }] };
  const sum180 = { kind: 'value', unit: 'deg' }, gUn = J.B.B5.gamma_unwrapped_over_pi[12];        // γ(3T/4)/π followed without jumps: 1.7185
  const rows = [
    // text, field, reference, expected state, expected hint, expected reason
    ['-0,2', real, J.A.set1.prod[0], 'ok'],
    ['\u22120.2', real, J.A.set1.prod[0], 'ok'],
    ['\u20130.2', real, J.A.set1.prod[0], 'ok'],
    ['- 0.2', real, J.A.set1.prod[0], 'ok'],
    ['0.2', real, J.A.set1.prod[0], 'wrong'],
    ['-0.21', real, J.A.set1.prod[0], 'wrong'],
    ['0.7079', gPi, A7, 'ok'],
    ['0.7079 pi', gPi, A7, 'ok'],
    ['0.7079π', gPi, A7, 'ok'],
    ['0,7079*Pi', gPi, A7, 'ok'],
    ['2.7079', gPi, A7, 'wrong', null, 'range'],          // outside −2 … 2: never accepted as "the same angle"
    ['-1.2921', gPi, A7, 'ok'],                           // the same angle, inside the range
    ['-0.7079', gPi, A7, 'wrong', 6],
    ['1.2921', gPi, A7, 'wrong', 6],
    ['0.61', gPi, A7, 'wrong'],
    ['pi/2', aPi, 0.5, 'ok'],
    ['π/2', aPi, 0.5, 'ok'],
    ['pi/2', aDeg, 90, 'ok'],
    ['pi/2', fine, PI / 2, 'ok'],
    ['3π/4', aPi, 0.75, 'ok'],
    ['3 pi / 4', aPi, 0.75, 'ok'],
    ['pi', aPi, J.A.set1.gamma_over_pi, 'ok'],
    ['-1', aPi, J.A.set1.gamma_over_pi, 'ok'],
    ['-pi', aPi, J.A.set1.gamma_over_pi, 'ok'],
    ['0', aPi, J.A.set1.gamma_over_pi, 'wrong'],
    // one rule for a field in units of π: a number from −2 to 2; an angle is compared up to a full turn inside this range
    ['1', aPi, J.A.set1.gamma_over_pi, 'ok'],
    ['1.0', aPi, J.A.set1.gamma_over_pi, 'ok'],
    ['3', aPi, J.A.set1.gamma_over_pi, 'wrong', null, 'range'],
    ['180', aPi, J.A.set1.gamma_over_pi, 'wrong', null, 'range'],
    ['3.14', aPi, J.A.set1.gamma_over_pi, 'wrong', null, 'range'],
    ['45', aPi, J.A.set1.gamma_over_pi, 'wrong', null, 'range'],
    ['179', aPi, J.A.set1.gamma_over_pi, 'wrong', null, 'range'],
    ['0', aPi, J.A.set2.gamma_over_pi, 'ok'],
    ['2', aPi, J.A.set2.gamma_over_pi, 'ok'],
    ['-2', aPi, J.A.set2.gamma_over_pi, 'ok'],
    ['2pi', aPi, J.A.set2.gamma_over_pi, 'ok'],
    ['180', aPi, J.A.set2.gamma_over_pi, 'wrong', null, 'range'],
    ['90', aPi, J.A.set2.gamma_over_pi, 'wrong', null, 'range'],
    ['26', aPi, J.A.set2.gamma_over_pi, 'wrong', null, 'range'],
    ['360', aPi, J.A.set2.gamma_over_pi, 'wrong', null, 'range'],
    ['3/4', aPi, 0.75, 'ok'],
    ['1.7185', vPi, gUn, 'ok'],                           // a value followed without jumps is compared as the number itself
    ['-0.2815', vPi, gUn, 'wrong'],
    ['6.2832', vPi, J.B.B7.total_over_pi, 'wrong', null, 'range'],
    ['360', vPi, J.B.B7.total_over_pi, 'wrong', null, 'range'],
    ['423.43', aDeg, phi, 'wrong', null, 'range'],
    ['180', sum180, J.A.set1.angle_sum_deg, 'ok'],
    ['-180', sum180, J.A.set1.angle_sum_deg, 'wrong'],
    ['1/4', real, 0.25, 'ok'],
    ['-1/4', real, J.B.B4.thalf.prod[0], 'ok'],
    [' 1 / 4 ', real, 0.25, 'ok'],
    ['.5', real, 0.5, 'ok'],
    ['5.0', real, 5, 'ok'],
    ['5.', real, 5, 'unreadable'],
    ['0,', real, 0, 'unreadable'],
    ['+0.5', real, 0.5, 'ok'],
    [' 63.43 ', aDeg, phi, 'ok'],
    ['63,43', aDeg, phi, 'ok'],
    ['63.43°', aDeg, phi, 'ok'],
    ['63.43 deg', aDeg, phi, 'ok'],
    ['-296.57', aDeg, phi, 'ok'],
    ['296.57', aDeg, J.A.set1.phi_deg[3], 'ok'],
    ['296.57', aDeg, phi, 'wrong'],
    ['-63.43', aDeg, phi, 'wrong'],
    ['-180', aDeg, J.A.set1.angle_sum_deg, 'ok'],
    ['63.43°', real, phi, 'unreadable'],
    ['63.43 degrees', aDeg, phi, 'unreadable'],
    ['pi/2 deg', aDeg, 90, 'unreadable'],
    ['1e-3', fine, 0.001, 'ok'],
    ['1E-3', fine, 0.001, 'ok'],
    ['1e\u22123', fine, 0.001, 'ok'],
    ['0.8507', real, len, 'ok'],
    ['0.85', real, len, 'ok'],
    ['0.84', real, len, 'wrong'],
    ['2', vPi, J.B.B7.total_over_pi, 'ok'],
    ['0', vPi, J.B.B7.total_over_pi, 'wrong'],
    ['2pi', vPi, J.B.B7.total_over_pi, 'ok'],
    ['-1', vPi, 1, 'wrong'],
    ['1', int, J.B.B5.C, 'ok'],
    ['+1', int, J.B.B5.C, 'ok'],
    ['1.0', int, J.B.B5.C, 'ok'],
    ['\u22121', int, J.B.B8.upper_band, 'ok'],
    ['-1', int, J.B.B5.C, 'wrong'],
    ['0.9999', int, J.B.B5.C, 'wrong'],
    ['1.0000000000000002', int, J.B.B5.C, 'ok'],          // the rounding noise of a computer
    ['-2.3191544552338144e-17', int, J.B.B8.not_enclosing, 'ok'],
    ['0', int, J.B.B5.C, 'wrong', 7],
    ['', real, 0.5, 'empty'],
    [' ', real, 0.5, 'empty'],
    ['\t\n', real, 0.5, 'empty'],
    ['abc', real, 0.5, 'unreadable'],
    ['0.72+0.44i', real, 0.72, 'unreadable'],
    ['1..2', real, 1.2, 'unreadable'],
    ['1/0', real, 1, 'unreadable'],
    ['--1', real, 1, 'unreadable'],
    ['0x10', real, 16, 'unreadable'],
    ['Infinity', real, 1, 'unreadable'],
    ['NaN', real, 1, 'unreadable'],
    ['1e', real, 1, 'unreadable'],
    ['e3', real, 1000, 'unreadable'],
    ['1e999', real, 1, 'unreadable'],
    ['1,2,3', real, 1.2, 'unreadable'],
    ['1 2', real, 12, 'unreadable'],
    ['1.234,5', real, 1234.5, 'unreadable'],
    ['1/2/3', real, 0.5, 'unreadable'],
    ['1/-4', real, -0.25, 'unreadable'],
    ['1/4pi', aPi, 0.25, 'unreadable'],
    ['2pi3', aPi, 2, 'unreadable'],
    ['pi pi', aPi, 1, 'unreadable'],
    ['pi/0', aPi, 1, 'unreadable'],
    ['-', real, 0, 'unreadable'],
    ['(1)', real, 1, 'unreadable'],
    ['1 cell', real, 1, 'unreadable'],
    ['\u22120.2\u2212', real, -0.2, 'unreadable'],
  ];
  for (const [text, spec, ref, state, hint = null, reason = null] of rows) {
    const p = parse(text, spec), r = check(p, ref, spec);
    const noNaN = p.state !== 'ok' || (Number.isFinite(p.value) && Number.isFinite(p.number));
    const field = `${spec.kind}${spec.unit ? ' in ' + spec.unit : ''}`;
    const shown = JSON.stringify(text) + [...text].filter((ch) => ch.codePointAt(0) > 127 || ch === '\t' || ch === '\n').map((ch) => ` U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join('');
    const good = r.state === state && r.hintId === hint && r.reason === reason;
    report(good && noNaN, `${shown.padEnd(22)} ${field.padEnd(13)} ref ${f6(ref).padEnd(10)}`,
      `-> ${r.state}${r.hintId !== null ? ', hint ' + r.hintId : ''}${r.reason ? ', ' + r.reason : ''}${p.state === 'ok' ? ', read as ' + f6(r.value) : ''}${good ? '' : `   (expected ${state}${hint !== null ? ', hint ' + hint : ''}${reason ? ', ' + reason : ''})`}`);
  }
  console.log(`   ${rows.length} strings`);

  console.log('   complex numbers (two fields, Re and Im) and vectors');
  const ov = J.A.set1.ov[0], prod = J.A.set1.prod, open = J.A.set1.open_prod, strict = { kind: 'complex', otherPhase: false, wrong: [{ value: open, hintId: 2 }] };
  const c2 = (re, im) => ({ re: parse(re), im: parse(im) });
  const crow = [
    ['overlap, typed as stored', c2('0.72', '-0.45'), ov, { kind: 'complex' }, 'ok', null],
    ['overlap, decimal commas and the minus sign', c2('0,7236', '\u22120,4472'), ov, { kind: 'complex' }, 'ok', null],
    ['overlap of A4 (u2 times i) typed for the first overlap', c2(String(J.A.set1.A4.ov12[0]), String(J.A.set1.A4.ov12[1])), ov, { kind: 'complex' }, 'other-phase', null],
    ['overlap with wrong length', c2('0.72', '0.1'), ov, { kind: 'complex' }, 'wrong', null],
    ['overlap, Im empty', c2('0.72', ''), ov, { kind: 'complex' }, 'empty', null],
    ['overlap, Im unreadable', c2('0.72', '0.44i'), ov, { kind: 'complex' }, 'unreadable', null],
    ['overlap, Re empty and Im unreadable', c2('', 'x'), ov, { kind: 'complex' }, 'unreadable', null],
    ['product, right', c2('-0.2', '0'), prod, strict, 'ok', null],
    ['product, loop not closed', c2('-0.2', '-0.12'), prod, strict, 'wrong', 2],
    ['product with the wrong sign, otherPhase off', c2('0.2', '0'), prod, strict, 'wrong', null],
    ['product with the wrong sign, otherPhase on (default)', c2('0.2', '0'), prod, { kind: 'complex' }, 'other-phase', null],
    ['product of B4, typed as a fraction', c2('-1/4', '0'), J.B.B4.thalf.prod, strict, 'ok', null],
  ];
  for (const [name, parsed, ref, spec, state, hint] of crow) {
    const r = check(parsed, ref, spec);
    report(r.state === state && r.hintId === hint, `complex: ${name}`, `-> ${r.state}${r.hintId !== null ? ', hint ' + r.hintId : ''}`);
  }
  const uRef = J.B.B6.u_kpi2_tq, vec = (...parts) => parts.map(([re, im]) => c2(re, im)), vspec = { kind: 'vector' };
  const vrow = [
    ['u(k = pi/2, t = T/4), two decimals', vec(['-0.41', '0.41'], ['0.82', '0']), uRef, 'ok'],
    ['the same, not normalised: (-1 + i, 2)', vec(['-1', '1'], ['2', '0']), uRef, 'ok'],
    ['the same times i: (-1 - i, 2i)', vec(['-1', '-1'], ['0', '2']), uRef, 'ok'],
    ['B component with the wrong sign: (-1 + i, -2)', vec(['-1', '1'], ['-2', '0']), uRef, 'wrong'],
    ['the upper-band vector at this point', M.upperHand(PI / 2, 1, 1, 0.5).map((c) => ({ re: c.re, im: c.im })), uRef, 'wrong'],
    ['zero vector', vec(['0', '0'], ['0', '0']), uRef, 'wrong'],
    ['one part empty', vec(['-1', '1'], ['2', '']), uRef, 'empty'],
    ['one part unreadable', vec(['-1', '1+i'], ['2', '0']), uRef, 'unreadable'],
    ['u(k = pi, t = T/4) = (0, 1), components as real numbers', [parse('0'), parse('1')], J.B.B6.u_kpi_tq, 'ok'],
    ['(0, 1) where the length 1 is asked', [parse('0'), parse('1')], J.B.B6.u_kpi_tq, 'ok', null, { kind: 'vector', length: 1 }],
    ['(0, 5) where the length 1 is asked', [parse('0'), parse('5')], J.B.B6.u_kpi_tq, 'wrong', 'length', { kind: 'vector', length: 1 }],
    ['(0, -1): the same eigenvector times -1', [parse('0'), parse('-1')], J.B.B6.u_kpi_tq, 'ok', null, { kind: 'vector', length: 1 }],
  ];
  for (const [name, parsed, ref, state, reason = null, spec = vspec] of vrow) {
    const r = check(parsed, ref, spec);
    report(r.state === state && r.reason === reason, `vector: ${name}`, `-> ${r.state}${r.reason ? ', ' + r.reason : ''}`);
  }
  // a value just outside the tolerance is a rounding error (reason "near"), never "other-phase"; a known wrong value keeps its hint
  const nearSpec = { kind: 'complex', tol: 0.012, near: 0.048, wrong: [{ value: [ov[0], -ov[1]], hintId: 'conj' }] };
  const nrow = [['0.74 - 0.45i', c2('0.74', '-0.45'), 'wrong', null, 'near'], ['0.73 - 0.45i', c2('0.73', '-0.45'), 'ok', null, null], ['0.72 + 0.45i', c2('0.72', '0.45'), 'wrong', 'conj', null],
    ['0.45 + 0.72i (right length, another angle)', c2('0.45', '0.72'), 'other-phase', null, null]];
  for (const [name, parsed, state, hint, reason] of nrow) {
    const r = check(parsed, ov, nearSpec);
    report(r.state === state && r.hintId === hint && r.reason === reason, `complex with a near zone: ${name}`, `-> ${r.state}${r.hintId ? ', hint ' + r.hintId : ''}${r.reason ? ', ' + r.reason : ''}`);
  }
  // a missing reference is a mistake of the page, not a wrong answer
  const thrown = [[undefined, real], [NaN, real], [{ re: 1 }, { kind: 'complex' }], [[], vspec], [1, { kind: 'number' }]].map(([ref, spec]) => { try { check(parse('1'), ref, spec); return false; } catch (err) { return err instanceof TypeError; } });
  report(thrown.every(Boolean), 'check throws a TypeError for a missing or not finite reference and for an unknown kind', `5 cases: ${thrown.join(', ')}`);
  // random strings: parse never throws, never returns NaN, and never reads only a part of a text
  const rnd = rng(11), alphabet = ['0', '1', '2', '5', '7', '9', '.', ',', '-', '\u2212', '+', '/', 'e', 'E', 'p', 'i', '\u03c0', ' ', '*', '\u00b0', 'd', 'g', 'x', 'I', 'N', 'a'];
  let nOk = 0, nBad = 0, trouble = null;
  for (let n = 0; n < 200000 && !trouble; n++) {
    const text = Array.from({ length: 1 + Math.floor(7 * rnd()) }, () => alphabet[Math.floor(alphabet.length * rnd())]).join('');
    const spec = n % 2 ? aDeg : real;
    let p;
    try { p = parse(text, spec); } catch { trouble = `${JSON.stringify(text)} throws`; break; }
    if (p.state === 'ok') {
      nOk++;
      if (!Number.isFinite(p.value) || !Number.isFinite(p.number)) trouble = `${JSON.stringify(text)} gives ${p.value}`;
      // a plain decimal number must be the number that JavaScript reads from the whole text
      const plain = text.trim().replace('\u2212', '-').replace(',', '.');
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(plain) && p.value !== Number(plain) + 0) trouble = `${JSON.stringify(text)} read as ${p.value}`;
      // nothing but the characters of the grammar may be in a text that was read
      if (/[xNa]/.test(text) || /(^|[^pP])I/.test(text) || (/[dg]/.test(text) && p.suffix !== 'deg')) trouble = `${JSON.stringify(text)} was read`;
    } else if (p.state === 'unreadable') nBad++;
    else if (text.trim() !== '') trouble = `${JSON.stringify(text)} is called empty`;
  }
  report(trouble === null && nOk > 1000 && nBad > 1000, 'parse on 200000 random strings: no error, no NaN, no text read in part', trouble ?? `${nOk} read, ${nBad} unreadable`);
}

// =====================================================================================================
console.log('\n4. time of propagate (hand numbers, T = 50, 60 cells, dt = 0.05: 1000 Runge-Kutta steps)');
{
  const times = [];
  let r;
  for (let i = 0; i < 7; i++) { const t0 = performance.now(); r = M.propagate(1, 0.5, 50, 60, 0.05); times.push(performance.now() - t0); }
  times.sort((a, b) => a - b);
  report(times[times.length - 1] < 1000, 'propagate T = 50, 60 cells runs in well under one second', `7 runs: fastest ${times[0].toFixed(1)} ms, median ${times[3].toFixed(1)} ms, slowest ${times[6].toFixed(1)} ms; shift ${f6(r.shift)}, norm ${f6(r.norm)}`);
}

// =====================================================================================================
console.log('\n5. model.js against a second way');
{
  const rnd = rng(7);
  // eigenvectors of the closed form
  let res = 0, bneg = 0, ortho = 0;
  for (let i = 0; i < 200; i++) {
    const k = TAU * rnd(), J1 = 3 * rnd(), J2 = 3 * rnd(), D = 2 * rnd() - 1, E = M.energy(k, J1, J2, D), h = M.hOf(k, J1, J2);
    const H = (u) => [cx.add(cx.scale(u[0], D), cx.mul(cx.conj(h), u[1])), cx.add(cx.mul(h, u[0]), cx.scale(u[1], -D))];
    const lo = M.lowerHand(k, J1, J2, D), up = M.upperHand(k, J1, J2, D), Hlo = H(lo), Hup = H(up);
    for (const c of [0, 1]) res = Math.max(res, cx.abs(cx.add(Hlo[c], cx.scale(lo[c], E))), cx.abs(cx.sub(Hup[c], cx.scale(up[c], E))));
    bneg = Math.max(bneg, -lo[1].re, -up[1].re, Math.abs(lo[1].im), Math.abs(up[1].im), Math.abs(cx.abs(M.overlap(lo, lo)) - 1), Math.abs(cx.abs(M.overlap(up, up)) - 1));
    ortho = Math.max(ortho, cx.abs(M.overlap(lo, up)));
  }
  report(res < 1e-12 && bneg < 1e-12 && ortho < 1e-12, 'lowerHand, upperHand: H u = -E u and H u = +E u, B component real and >= 0, length 1, orthogonal', `200 random (k, J1, J2, D): max residual ${sci(res)}, max overlap of the two bands ${sci(ortho)}`);

  // wrapAngle and unwrap
  const w = [M.wrapAngle(-PI), M.wrapAngle(PI), M.wrapAngle(3 * PI), M.wrapAngle(0.3 + TAU), M.wrapAngle(-0.3 - 2 * TAU), M.wrapAngle(-0)];
  report(w[0] === PI && w[1] === PI && w[2] === PI && Math.abs(w[3] - 0.3) < 1e-12 && Math.abs(w[4] + 0.3) < 1e-12 && Object.is(w[5], 0), 'wrapAngle: values in (-pi, pi], -pi becomes pi', `wrapAngle(-pi, pi, 3pi, 0.3 + 2pi, -0.3 - 4pi) = ${w.slice(0, 5).map(f6).join(', ')}`);
  const un = M.unwrap(J.B.B5.gamma_raw_over_pi.map((x) => x * PI)).map((x) => x / PI);
  const dUn = Math.max(...un.map((x, i) => Math.abs(x - J.B.B5.gamma_unwrapped_over_pi[i])));
  report(dUn < 2e-6, 'unwrap of the stored raw values = stored unwrapped values', `max difference ${sci(dUn)} (units of pi)`);

  // limit of the Zak phase: the integral against the overlap formula with 20000 points
  let dLim = 0;
  for (const [J1, J2, D] of [[1, 2, 0.5], [2, 1, 0.5], [0, 4, 3], [1, 2, -0.5]]) for (const band of [0, 1]) dLim = Math.max(dLim, angleDist(M.zakLimit(J1, J2, D, { band }), M.zakOf(J1, J2, D, 20000, { band })));
  // three k points for J1 = 1, J2 = 2: one overlap is zero, the product has no phase
  const z3 = M.zakOf(1, 2, 0, 3), m3 = M.minOverlap(M.bandStates(1, 2, 0, 3));
  report(Number.isNaN(z3) && m3 < 1e-12 && Math.abs(M.zakOf(2, 1, 0, 3)) < 1e-12 && M.minOverlap(M.bandStates(1, 2, 0, 4)) > 0.5, 'three k points for J1 = 1, J2 = 2: one overlap is zero, zak returns NaN (four points are fine)', `smallest overlap with M = 3: ${sci(m3)}, with M = 4: ${f6(M.minOverlap(M.bandStates(1, 2, 0, 4)))}`);
  report(dLim < 1e-7, 'zakLimit (integral) = zakOf with M = 20000', `4 parameter sets, both bands, max |e^{ig} - e^{ig'}| = ${sci(dLim)}`);
  report(Math.abs(S.A.A7.exact.gamma_over_pi / 2 - S.A.A7.exact.weight_A) < 1e-9, 'A7: gamma/2pi = share of the light on guide A (J1 = 0, J2 = 4, D = 3)', `gamma/2pi = ${f6(S.A.A7.exact.gamma_over_pi / 2)}, weight on A = ${f6(S.A.A7.exact.weight_A)}`);

  // B7: the sum of a time column is the step of gamma with four k points
  const g4 = M.gammaCurve(1, 0.5, 4, 4).raw, cols = M.chernMap(M.pumpState(1, 0.5), 4).colSums;
  const dCol = Math.max(...cols.map((c, j) => angleDist(c, g4[j + 1] - g4[j])));
  report(dCol < 1e-9, 'B7: column sums = steps of gamma(t) with four k points (as angles)', `gamma_4(t)/pi = ${g4.map((g) => f6(g / PI)).join(' ')}, max difference ${sci(dCol)}`);
  // B5 and B3: X(t) follows gamma(t)/2pi
  const dX = Math.max(...S.B.B3.X_over_cycle_T100.map((x, j) => Math.abs(x - S.B.B5.gamma_unwrapped_over_pi[j] / 2)));
  report(dX < 0.01, 'X(t) of the propagation (T = 100) follows gamma(t)/2pi (M = 400)', `17 times, max difference ${f6(dX)} cell`);

  // propagation: tridiagonal product against dense matrices built with chain() and matvec of linalg.js
  function dense(dJ, D0, T, Nc, dt, input) {
    const n = Math.round(T / dt), N = 2 * Nc, m0 = Math.floor(Nc / 2);
    let re = new Array(N).fill(0), im = new Array(N).fill(0);
    if (input === 'guide') re[2 * m0] = 1; else { re[2 * m0] = Math.SQRT1_2; re[2 * m0 + 1] = -Math.SQRT1_2; }
    const Hat = (t) => { const p = M.pumpParams(t / T, dJ, D0); return M.chain(Nc, p.J1, p.J2, p.D); };
    const f = (H, r, i) => [matvec(H, i), matvec(H, r).map((x) => -x)];
    const ax = (a, b, c) => a.map((x, j) => x + c * b[j]);
    const X = () => re.reduce((s, x, j) => s + Math.floor(j / 2) * (x * x + im[j] * im[j]), 0);
    const x0 = X();
    for (let i = 0; i < n; i++) {
      const t = i * dt, H1 = Hat(t), H2 = Hat(t + dt / 2), H3 = Hat(t + dt);
      const k1 = f(H1, re, im), k2 = f(H2, ax(re, k1[0], dt / 2), ax(im, k1[1], dt / 2)), k3 = f(H2, ax(re, k2[0], dt / 2), ax(im, k2[1], dt / 2)), k4 = f(H3, ax(re, k3[0], dt), ax(im, k3[1], dt));
      re = re.map((x, j) => x + (dt / 6) * (k1[0][j] + 2 * k2[0][j] + 2 * k3[0][j] + k4[0][j]));
      im = im.map((x, j) => x + (dt / 6) * (k1[1][j] + 2 * k2[1][j] + 2 * k3[1][j] + k4[1][j]));
    }
    return { shift: X() - x0, norm: re.reduce((s, x, j) => s + x * x + im[j] * im[j], 0) };
  }
  for (const [name, dJ, D0, T, Nc, input] of [['hand numbers, T = 20, 40 cells, pair', 1, 0.5, 20, 40, 'pair'], ['sheet numbers, T = 20, 60 cells, pair', 0.5, 0.2, 20, 60, 'pair'], ['hand numbers, T = 20, 40 cells, one guide', 1, 0.5, 20, 40, 'guide']]) {
    const a = M.propagate(dJ, D0, T, Nc, 0.05, { input }), b = dense(dJ, D0, T, Nc, 0.05, input);
    report(Math.abs(a.shift - b.shift) < 1e-10 && Math.abs(a.norm - b.norm) < 1e-12, `propagate = Runge-Kutta 4 with dense matrices: ${name}`, `shift ${f6(a.shift)} and ${f6(b.shift)} (difference ${sci(Math.abs(a.shift - b.shift))}), norm ${f6(a.norm)} and ${f6(b.norm)}`);
  }
  // one step with a constant H against rk4Step of linalg.js
  const p = { J1: 0.7, J2: 1.3, D: 0.4 }, psi = { re: Array.from({ length: 24 }, () => rnd() - 0.5), im: Array.from({ length: 24 }, () => rnd() - 0.5) };
  const s1 = M.chainStep(psi, p, p, p, 0.05), s2 = rk4Step(M.chain(12, p.J1, p.J2, p.D), psi, 0.05);
  const dStep = Math.max(...s2.re.map((x, j) => Math.max(Math.abs(x - s1.re[j]), Math.abs(s2.im[j] - s1.im[j]))));
  report(dStep < 1e-14, 'chainStep with constant H = rk4Step of linalg.js with the dense chain matrix', `12 cells, random state, max difference ${sci(dStep)}`);

  // the stored shifts are from the exact exponential, which keeps the norm: compare them with the shift of X/norm
  const centre = [['T = 20', M.propagate(1, 0.5, 20, 40, 0.05), J.B.B3.shift.T20], ['T = 50', M.propagate(1, 0.5, 50, 60, 0.05), J.B.B3.shift.T50], ['T = 100', M.propagate(1, 0.5, 100, 120, 0.05), J.B.B3.shift.T100],
    ['one guide, T = 50', M.propagate(1, 0.5, 50, 60, 0.05, { input: 'guide' }), J.B.B3.one_guide_T50], ['sheet numbers, T = 20', M.propagate(0.5, 0.2, 20, 60, 0.05), J.B.B3.sheet_T20_pair]];
  report(centre.every(([, r, ref]) => Math.abs(r.centreShift - ref) < 1e-4), 'centreShift (X divided by the norm) = stored shift of the exact exponential within 1e-4', centre.map(([name, r, ref]) => `${name}: ${f6(r.centreShift)} (stored ${f6(ref)}, shift ${f6(r.shift)})`).join('; '));
  // smaller steps: the shift itself goes to the same limit
  const fineStep = [[20, 40], [50, 60], [100, 120]].map(([T, Nc]) => [T, M.propagate(1, 0.5, T, Nc, 0.0125).shift, M.propagate(1, 0.5, T, Nc, 0.05).centreShift]);
  report(fineStep.every(([, a, b]) => Math.abs(a - b) < 1e-5), 'shift with dt = 0.0125 = centreShift with dt = 0.05 within 1e-5', fineStep.map(([T, a, b]) => `T = ${T}: ${a.toFixed(7)} and ${b.toFixed(7)}`).join('; '));
  // the upper-band input: mirror image of the lower-band input (exact for this Runge-Kutta scheme up to the norm)
  const lo = M.propagate(1, 0.5, 50, 60, 0.05), up = M.propagate(1, 0.5, 50, 60, 0.05, { input: 'upper' });
  const mirror = -lo.shift + 60 * (lo.norm - 1);
  report(Math.abs(up.shift - mirror) < 1e-9 && up.shift < 0, "input 'upper' moves the other way: shift = -(shift of 'pair') + 60 (norm - 1)", `upper ${f6(up.shift)}, pair ${f6(lo.shift)}, norm - 1 = ${sci(lo.norm - 1)}, difference ${sci(Math.abs(up.shift - mirror))}`);
  // options of propagate
  let calls = 0, lastX = null;
  const two = M.propagate(1, 0.5, 20, 40, 0.05, { cycles: 2, samples: 8, onStep: (o) => { calls++; lastX = o.X; } }), one = M.propagate(1, 0.5, 20, 40, 0.05);
  report(two.shift === one.shift && two.shifts.length === 2 && calls === 801 && two.X.length === 17 && Math.abs(two.shifts[0] + two.shifts[1] - lastX) < 1e-12 && one.X.length === 17 && one.X[16] === one.shift && one.t[16] === 20,
    'propagate: cycles, samples, onStep', `two cycles: shifts ${two.shifts.map(f6).join(', ')}; onStep called ${calls} times; ${two.X.length} recorded values`);
  const r50 = M.propagate(1, 0.5, 50, 60, 0.05);          // 1000 steps: recorded every 62 steps and at the end of the cycle
  report(r50.X.length === 18 && r50.t[17] === 50 && r50.X[17] === r50.shift && Math.abs(r50.t[16] - 49.6) < 1e-9, 'propagate: the end of the cycle is recorded also when the number of steps is not a multiple of samples', `T = 50: ${r50.X.length} values, last times ${f6(r50.t[16])} and ${f6(r50.t[17])}`);

  // open chain: fast eigenvalues against the Jacobi routine of linalg.js; edge states at +D (left, A) and -D (right, B)
  let dLev = 0, dEdge = 0, nStates = 0;
  for (const [dJ, D0] of [[1, 0.5], [0.5, 0.2]]) for (const s of [0, 0.125, 0.25, 0.3, 0.375, 0.5, 0.625, 0.9]) {
    const q = M.pumpParams(s, dJ, D0), fast = M.chainLevels(40, q.J1, q.J2, q.D), slow = symEig(M.chain(40, q.J1, q.J2, q.D)).values;
    dLev = Math.max(dLev, ...fast.map((x, i) => Math.abs(x - slow[i])));
    for (const st of M.inGapStates(s, dJ, D0, 40).states) { nStates++; dEdge = Math.max(dEdge, Math.abs(st.E - (st.end === 'left' ? q.D : -q.D)), Math.abs(st.weightA - (st.end === 'left' ? 1 : 0))); }
  }
  report(dLev < 1e-9, 'chainLevels (tridiagonal QL) = eigenvalues from symEig of linalg.js', `40 cells, 2 parameter sets, 8 times each, max difference ${sci(dLev)}`);
  report(dEdge < 1e-6 && nStates > 0, 'in-gap states: left end at +Delta(t) on A guides, right end at -Delta(t) on B guides', `${nStates} states, max deviation ${sci(dEdge)}`);
  // eigenvectors of the tridiagonal routine: H v = E v, orthonormal, and the same light per guide as symEig gives
  let resid = 0, orth = 0, dProf = 0;
  for (const [dJ, D0, s] of [[1, 0.5, 0.3], [0.5, 0.2, 0.375], [0.5, 0.2, 0.1], [1, 0.5, 0.5]]) {
    const q = M.pumpParams(s, dJ, D0), H = M.chain(40, q.J1, q.J2, q.D), fast = M.chainEig(40, q.J1, q.J2, q.D), slow = symEig(H);
    fast.vectors.forEach((v, i) => {
      const Hv = matvec(H, v);
      resid = Math.max(resid, ...Hv.map((x, j) => Math.abs(x - fast.values[i] * v[j])));
      fast.vectors.forEach((v2, k) => { if (k <= i) orth = Math.max(orth, Math.abs(v.reduce((acc, x, j) => acc + x * v2[j], 0) - (k === i ? 1 : 0))); });
      const lone = (i === 0 || fast.values[i] - fast.values[i - 1] > 1e-6) && (i === 79 || fast.values[i + 1] - fast.values[i] > 1e-6);
      if (lone) dProf = Math.max(dProf, ...v.map((x, j) => Math.abs(x * x - slow.vectors[i][j] ** 2)));
    });
  }
  report(resid < 1e-12 && orth < 1e-12 && dProf < 1e-9, 'chainEig: H v = E v, orthonormal vectors, light per guide as from symEig', `4 cases with 80 guides: max residual ${sci(resid)}, max deviation from orthonormal ${sci(orth)}, max difference of |v_j|^2 ${sci(dProf)}`);
  // two in-gap states with the same eigenvalue (Delta = 0, t = T/2): returned as the left one on A and the right one on B
  const pairs = [[1, 0.5], [0.5, 0.2], [0.3, 0.2]].map(([dJ, D0]) => M.inGapStates(0.5, dJ, D0, 40).states);
  report(pairs.every((st) => st.length === 2 && st.some((x) => x.end === 'left' && x.weightA > 1 - 1e-9) && st.some((x) => x.end === 'right' && x.weightA < 1e-9) && Math.abs(st[0].E) < 1e-9 && Math.abs(st[1].E) < 1e-9),
    'in-gap states at t = T/2 (same eigenvalue): one at the left end on A, one at the right end on B', pairs.map((st) => st.map((x) => `${x.end} ${f6(x.weightA)}`).join(', ')).join(' | '));
  const tGap = []; for (let i = 0; i < 5; i++) { const t0 = performance.now(); M.inGapStates(0.375, 1, 0.5, 40); tGap.push(performance.now() - t0); }
  console.log(`  note  inGapStates (40 cells): ${Math.min(...tGap).toFixed(1)} ms per call; symEig on the same matrix: ${(() => { const q = M.pumpParams(0.375, 1, 0.5), H = M.chain(40, q.J1, q.J2, q.D), t0 = performance.now(); symEig(H); return (performance.now() - t0).toFixed(1); })()} ms`);
  const lev = M.levelsOverCycle(1, 0.5, 40, 64);
  const inGap = lev.levels.map((l, j) => l.filter((E) => Math.abs(E) < lev.edge[j] - 1e-7).length);
  report(inGap[8] === 0 && inGap[24] === 2 && inGap[32] === 2 && inGap[40] === 2 && inGap[56] === 0, 'levelsOverCycle: two eigenvalues in the gap between T/4 and 3T/4, none outside', `number in the gap at t/T = 1/8, 3/8, 1/2, 5/8, 7/8: ${[8, 24, 32, 40, 56].map((j) => inGap[j]).join(', ')}`);

  // gap, 2D matrices
  const g = M.gapMin(1, 0.5);
  report(Math.abs(g.gap - 1) < 1e-12 && g.k === PI && g.s.length === 2 && g.s[0] === 0.25 && g.s[1] === 0.75, 'gapMin: place of the smallest gap', `gap ${f6(g.gap)} at k = ${f6(g.k / PI)} pi, t/T = ${g.s.join(' and ')}`);
  let dGap = 0;
  for (let j = 0; j <= 400; j++) for (let i = 0; i <= 240; i++) { const q = M.pumpParams(j / 400, 1, 0.5); dGap = Math.min(dGap, 2 * M.energy((TAU * i) / 240, q.J1, q.J2, q.D) - g.gap); }
  report(dGap > -1e-12, 'gapMin: no smaller gap on a 241 x 401 grid in (k, t)', `smallest (gap on the grid - gapMin) = ${sci(dGap)}`);
  const herm = (H) => Math.max(...H.re.flatMap((row, i) => row.map((x, j) => Math.max(Math.abs(x - H.re[j][i]), Math.abs(H.im[i][j] + H.im[j][i])))));
  const H0 = M.hofstadter(0, 0.7), H1 = M.hofstadter(TAU, 0.7);
  const dPer = Math.max(...H0.re.flatMap((row, i) => row.map((x, j) => Math.max(Math.abs(x - H1.re[i][j]), Math.abs(H0.im[i][j] - H1.im[i][j])))));
  report(dPer < 1e-12 && herm(M.hofstadter(1.1, 0.7)) === 0 && herm(M.haldane(1.1, 0.7, 0.3)) === 0, 'hofstadter: H at kappa = 2pi equals H at kappa = 0; both 2D matrices are Hermitian', `max difference ${sci(dPer)}`);
  const fK = M.haldane(...M.HALDANE_K, 0), fKp = M.haldane(...M.HALDANE_KPRIME, 0);
  const offK = Math.max(Math.hypot(fK.re[0][1], fK.im[0][1]), Math.hypot(fKp.re[0][1], fKp.im[0][1]));
  report(offK < 1e-12, 'haldane: the off-diagonal entry is zero at K and at K\'', `max |f| = ${sci(offK)}`);
  const c12 = M.hofstadterChern(12);
  report(c12.join() === J.C.C1.chern_lower_to_upper.join() && c12.reduce((a, b) => a + b, 0) === 0, 'hofstadter: the 12 x 12 grid gives the same Chern numbers, sum 0', `C = ${c12.join(', ')}`);
  const hal = [4, 6, 12, 30].map((N) => [M.haldaneChern(0, 0.1, PI / 2, N), M.haldaneChern(0.6, 0.1, PI / 2, N)]);
  report(hal.every(([a, b]) => a === J.C.C2.C_m0 && b === J.C.C2.C_m06), 'haldane: grids 4, 6, 12, 30 give the same Chern numbers for m = 0 and m = 0.6', hal.map(([a, b]) => `${a}, ${b}`).join(' | '));
  // the 3 x 3 grid is not usable for m = 0: one plaquette product is real and negative, its phase is pi or -pi
  const U3 = M.gridStates((x, s) => M.eigenvector(M.haldane(x, TAU * s, 0), 0), 3);
  const p3 = [[U3[1][1], U3[1][2]], [U3[1][2], U3[2][2]], [U3[2][2], U3[2][1]], [U3[2][1], U3[1][1]]].reduce((acc, [a, b]) => cx.mul(acc, M.overlap(a, b)), { re: 1, im: 0 });
  report(Math.abs(p3.re + 0.25) < 1e-12 && Math.abs(p3.im) < 1e-12, 'haldane m = 0 on a 3 x 3 grid: one plaquette product is -1/4, real and negative (phase pi or -pi: this grid decides nothing)', `product (${f6(p3.re)}, ${sci(p3.im)})`);
  // hermEig: eigenvalues of the 2 x 2 matrix = -E and +E
  let dE = 0;
  for (let i = 0; i < 50; i++) { const k = TAU * rnd(), J1 = 3 * rnd(), J2 = 3 * rnd(), D = 2 * rnd() - 1, Hk = M.hMatrix(k, J1, J2, D), ev = hermEig(Hk.re, Hk.im).values, E = M.energy(k, J1, J2, D); dE = Math.max(dE, Math.abs(ev[0] + E), Math.abs(ev[1] - E)); }
  report(dE < 1e-12, 'hMatrix: eigenvalues from hermEig = -energy and +energy', `50 random (k, J1, J2, D), max difference ${sci(dE)}`);
}

// =====================================================================================================
console.log('\n6. position counted from the cell where the light starts');
{
  // Runge-Kutta 4 in numpy with dense matrices and the cells counted from the start cell, as app/code/zak_chern.py does
  // (run once outside this file; the numbers are its output at full precision)
  const NUMPY = {
    'hand numbers, T = 20, 40 cells, pair': [1, 0.5, 20, 40, 'pair', 0.8890859361636683, [0.0864090908, 0.4528968639, 0.7931916579, 0.8890859362], J.B.B3.shift.T20],
    'hand numbers, T = 50, 60 cells, pair': [1, 0.5, 50, 60, 'pair', 0.9673320698841453, [0.1262994563, 0.5119365685, 0.7969720703, 0.9673320699], J.B.B3.shift.T50],
    'hand numbers, T = 100, 120 cells, pair': [1, 0.5, 100, 120, 'pair', 0.9989289087544435, [0.1389427637, 0.4976829113, 0.8537027095, 0.9989289088], J.B.B3.shift.T100],
    'hand numbers, T = 50, 60 cells, one guide': [1, 0.5, 50, 60, 'guide', 0.08035617124187186, [0.1459456328, 0.0544279313, 0.1291813308, 0.0803561712], J.B.B3.one_guide_T50],
    'hand numbers, T = 20, 40 cells, one guide': [1, 0.5, 20, 40, 'guide', 0.1635493933647842, [0.0917553746, 0.1280836194, 0.1656922142, 0.1635493934], null],
    'hand numbers, T = 50, 60 cells, upper band': [1, 0.5, 50, 60, 'upper', -0.967332069884588, [-0.1262994563, -0.5119365685, -0.7969720703, -0.9673320699], null],
    'hand numbers, T = 20, 40 cells, upper band': [1, 0.5, 20, 40, 'upper', -0.8890859361636643, [-0.0864090908, -0.4528968639, -0.7931916579, -0.8890859362], null],
    'sheet numbers, T = 20, 60 cells, pair': [0.5, 0.2, 20, 60, 'pair', 0.5525897511887776, [0.0626610508, 0.2602739066, 0.4332656116, 0.5525897512], J.B.B3.sheet_T20_pair],
  };
  for (const [name, [dJ, D0, T, Nc, input, shift, quarters, stored]] of Object.entries(NUMPY)) {
    const r = M.propagate(dJ, D0, T, Nc, 0.05, { input, samples: 4 });
    const dShift = Math.abs(r.shiftStart - shift), dQ = Math.max(...quarters.map((x, i) => Math.abs(x - r.Xstart[i + 1])));
    const identity = Math.abs(r.shiftStart - (r.shift + r.m0 * (1 - r.norm)));
    const ok = r.Xstart[0] === 0 && r.m0 === Nc / 2 && dShift < 1e-11 && dQ < 1e-9 && identity < 1e-11 && (stored === null || Math.abs(r.shiftStart - stored) < 1e-4);
    report(ok, `shiftStart = numpy: ${name}`, `${r.shiftStart.toFixed(4)} (difference ${sci(dShift)}), X at t/T = 1/4, 1/2, 3/4, 1: ${r.Xstart.slice(1).map((x) => x.toFixed(4)).join(' ')}; shiftStart - shift - m0 (1 - norm) = ${sci(identity)}${stored === null ? '' : `; stored (exact exponential) ${f6(stored)}`}`);
  }
  // steps().B.B3.start holds these numbers for the page
  const st = S.B.B3.start;
  const table = [[st.shift.T20, 0.8890859361636683], [st.shift.T50, 0.9673320698841453], [st.shift.T100, 0.9989289087544435], [st.one_guide.T50, 0.08035617124187186], [st.one_guide.T20, 0.1635493933647842],
    [st.upper_band.T50, -0.967332069884588], [st.upper_band.T20, -0.8890859361636643], [st.sheet_T20_pair, 0.5525897511887776]];
  const dTable = Math.max(...table.map(([a, b]) => Math.abs(a - b)));
  report(dTable < 1e-11 && st.X_over_cycle_T100.length === 17 && st.X_over_cycle_T100[0] === 0 && st.X_over_cycle_T100[16] === st.shift.T100, 'steps().B.B3.start: the shifts of the page', `T = 20, 50, 100: ${st.shift.T20.toFixed(4)} ${st.shift.T50.toFixed(4)} ${st.shift.T100.toFixed(4)}; one guide, T = 50: ${st.one_guide.T50.toFixed(4)}; sheet numbers, T = 20: ${st.sheet_T20_pair.toFixed(4)}; max difference to numpy ${sci(dTable)}`);
  // the shift field of the page (tolerance 5e-4): four decimals of either counting are right, the other inputs are not
  const shiftField = (text, ref, wrong = []) => check(parse(text), ref, { kind: 'real', tol: 5e-4, wrong });
  const wrong50 = [{ value: st.one_guide.T50, hintId: 'one guide' }, { value: st.upper_band.T50, hintId: 'upper band' }];
  const typed = [['0.8891', st.shift.T20, [], 'ok', null], ['0.8890', st.shift.T20, [], 'ok', null], ['0.9673', st.shift.T50, wrong50, 'ok', null], ['0.9671', st.shift.T50, wrong50, 'ok', null],
    ['0.0804', st.shift.T50, wrong50, 'wrong', 'one guide'], ['-0.9673', st.shift.T50, wrong50, 'wrong', 'upper band'], ['0.97', st.shift.T50, wrong50, 'wrong', null], ['0.0804', st.one_guide.T50, [], 'ok', null], ['0.5526', st.sheet_T20_pair, [], 'ok', null]];
  const res = typed.map(([text, ref, wrong]) => shiftField(text, ref, wrong));
  report(res.every((r, i) => r.state === typed[i][3] && r.hintId === typed[i][4]), 'the shift per cycle as it is typed: four decimals of the page counting and of the left-end counting are right',
    typed.map(([text, , , want], i) => `"${text}" ${res[i].state}${res[i].hintId ? ` (${res[i].hintId})` : ''}${res[i].state === want ? '' : ' !'}`).join(', '));
}

// =====================================================================================================
console.log('\n7. data of the pump figures (pump.js)');
{
  let worstEnd = 0, worstOut = 0;
  const lines = [];
  for (const sheet of [false, true]) for (const T of P.T_VALUES) for (const input of ['pair', 'guide']) {
    const sim = P.simulation(sheet, T, input), set = P.setOf(sheet), ref = M.propagate(set.dJ, set.D0, T, sim.Nc, P.DT, { input });
    let out = 0;
    for (const I of sim.frames) { let inside = 0, total = 0; for (let j = 0; j < I.length; j++) { total += I[j]; if (Math.abs((j >> 1) - sim.m0) <= sim.W) inside += I[j]; } out = Math.max(out, 1 - inside / total); }
    const ok = sim.X[0] === 0 && sim.s[0] === 0 && sim.s[sim.s.length - 1] === 1 && Math.abs(sim.X[sim.X.length - 1] - ref.shiftStart) < 1e-12 && sim.frames.length === sim.X.length && sim.frames.length <= 502
      && sim.ends < 1e-6 && out <= 0.0101 && sim.W < sim.m0 && P.simulation(sheet, T, input) === sim;
    worstEnd = Math.max(worstEnd, sim.ends); worstOut = Math.max(worstOut, out);
    lines.push(`${sheet ? 'sheet' : 'hand'} ${T} ${input}: ${sim.Nc} cells, window ±${sim.W}, shift ${sim.shift.toFixed(4)}${ok ? '' : ' !'}`);
    if (!ok) report(false, `pump.js simulation ${sheet ? 'sheet' : 'hand'}, T = ${T}, ${input}`, `ends ${sci(sim.ends)}, outside the window ${out.toFixed(4)}, frames ${sim.frames.length}`);
  }
  report(lines.every((l) => !l.endsWith('!')), 'pump.js: 12 propagations (two sets of numbers, T = 20, 50, 100, two inputs): X(0) = 0, X(T) = shiftStart, no light at the ends of the chain, 99 % of the light in the window that is drawn',
    `largest |psi|^2 in the two outermost cells ${sci(worstEnd)}, largest share outside the window ${worstOut.toFixed(4)}; ${lines.join('; ')}`);
  // the frames are equally spaced, so the frame of a time is found by its index: X of the frame at t/T = 1/4, 1/2, 3/4, 1
  // is X at that time (numpy values of section 6), for every T
  const QUARTERS = { 20: [0.0864090908, 0.4528968639, 0.7931916579, 0.8890859362], 50: [0.1262994563, 0.5119365685, 0.7969720703, 0.9673320699], 100: [0.1389427637, 0.4976829113, 0.8537027095, 0.9989289088] };
  let worstSpacing = 0, worstQuarter = 0;
  const frameLines = [];
  for (const sheet of [false, true]) for (const T of P.T_VALUES) {
    const sim = P.simulation(sheet, T, 'pair'), n = sim.frames.length - 1;
    worstSpacing = Math.max(worstSpacing, ...sim.s.map((x, i) => Math.abs(x - i / n)));
    if (!sheet) { const X = [0.25, 0.5, 0.75, 1].map((q) => sim.X[P.frameAt(sim, q)]); worstQuarter = Math.max(worstQuarter, ...X.map((x, i) => Math.abs(x - QUARTERS[T][i]))); frameLines.push(`T = ${T}: ${sim.frames.length} frames, X = ${X.map((x) => x.toFixed(4)).join(' ')}`); }
  }
  report(worstSpacing < 1e-12 && worstQuarter < 1e-9, 'pump.js: the frames are equally spaced in time; the frame at t/T = 1/4, 1/2, 3/4, 1 holds X of that time', `largest |s_i - i/n| = ${sci(worstSpacing)}, largest difference to numpy ${sci(worstQuarter)}; ${frameLines.join('; ')}`);
  const sp = P.spectrum(false), j38 = sp.s.indexOf(0.375), inGap = sp.states[j38], stored = J.B.B2.t0375.ingap;
  const counts = sp.states.map((x) => x.length), open = sp.s.filter((x, j) => counts[j] === 2);
  report(sp.levels.every((l) => l.length === 2 * P.CHAIN_CELLS) && inGap.length === 2 && inGap.every((x, i) => Math.abs(x.E - stored[i].E) < 1e-6 && x.end === stored[i].end) && counts.every((n) => n === 0 || n === 2) && open[0] > 0.25 && open[open.length - 1] < 0.75,
    'pump.js: eigenvalues of the open chain over the cycle, two states in the gap between T/4 and 3T/4', `${sp.s.length} times, at t = 3T/8: ${inGap.map((x) => `${f6(x.E)} ${x.end}`).join(', ')}; in the gap from t/T = ${f6(open[0])} to ${f6(open[open.length - 1])}`);
  const g = P.gammaOverCycle(false), gs = P.gammaOverCycle(true), n = g.s.length - 1;
  report(g.cells[0] === 0 && Math.abs(g.cells[n] - J.B.B5.C) < 1e-9 && Math.abs(g.overPi[n / 4] - J.B.B5.quarter_M400_over_pi) < 1e-6 && Math.abs(g.cells[n / 2] - 0.5) < 1e-9 && Math.abs(gs.overPi[n / 4] - J.B.B5.sheet_quarter_M400_over_pi) < 1e-6 && Math.abs(gs.cells[n] - 1) < 1e-9,
    'pump.js: gamma(t)/2pi over the cycle rises from 0 to C', `gamma(T/4)/pi = ${f6(g.overPi[n / 4])} (sheet numbers ${f6(gs.overPi[n / 4])}), gamma(T)/2pi = ${f6(g.cells[n])}`);
  const b = P.bandsAt(false, 0.25);
  report(Math.abs(2 * b.min - J.B.B1.gap_min) < 1e-9 && Math.abs(b.E[0] - J.B.B1.E.tq[0]) < 1e-6 && Math.abs(b.E[30] - J.B.B1.E.tq[1]) < 1e-6 && Math.abs(b.E[60] - J.B.B1.E.tq[2]) < 1e-6, 'pump.js: the bands at t = T/4', `E at k = 0, pi/2, pi: ${f6(b.E[0])} ${f6(b.E[30])} ${f6(b.E[60])}, gap ${f6(2 * b.min)}`);
}

// =====================================================================================================
console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILED:'); for (const f of failures) console.log('  ' + f); process.exit(1); }
