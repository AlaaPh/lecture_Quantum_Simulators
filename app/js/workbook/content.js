// The steps of the workbook: every sentence, every field with its reference value and its hints, every formula.
// Reference values come from model.js (steps()), computed when the page loads. No result is typed here.
import { el } from '../ui.js';
import { steps, cx, hOf, bandStates, loopOverlaps, inGapStates, pumpParams, notEnclosingParams, HAND, SHEET } from './model.js';
import { CELLS } from './pump.js';
import { field, choice, fieldNode, choiceNode, stepBlock, para, rowOf, keyCell, gate, dynamic, doneNote, isOk, chosen, get, TEXT } from './fields.js';

const S = steps();
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const K_NAME = ['0', 'π/2', 'π', '3π/2'], K_DEG = [0, 90, 180, 270];
export const num = (x, d = 4) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace('-', '−');
export const cnum = (z, d = 4) => `${num(z.re, d)} ${z.im < -0.5 * 10 ** -d ? '−' : '+'} ${Math.abs(z.im).toFixed(d)}i`;
// a complex number with whole parts, as it is written by hand: −1 + i, 2, −i
const whole = (z) => {
  const re = Math.round(z.re), im = Math.round(z.im), imPart = Math.abs(im) === 1 ? 'i' : `${Math.abs(im)}i`;
  if (im === 0) return String(re).replace('-', '−');
  if (re === 0) return (im < 0 ? '−' : '') + imPart;
  return `${String(re).replace('-', '−')} ${im < 0 ? '−' : '+'} ${imPart}`;
};
const ov = (a, b) => `⟨${a}|${b}⟩`;
const plain = (x) => String(+x.toFixed(6)).replace('-', '−');            // 2, 0.5, −1: a parameter as it is written in the task
const inPi = (x) => (Math.abs(x) < 1e-9 ? '0' : Math.abs(x - 1) < 1e-9 ? 'π' : Math.abs(x + 1) < 1e-9 ? '−π' : `${plain(x)}π`);
const howOften = (n) => (n === 0 ? 'not at all' : n === 1 ? 'once' : `${n} times`);
// A cycle in words, read from the function that the model uses: J₁ = a + b·cos, J₂ = c − d·cos, Δ = e·sin.
function cycleParts(paramsOf, arg = '') {
  const p0 = paramsOf(0), pq = paramsOf(0.25), term = (amp, f) => `${Math.abs(amp - 1) < 1e-9 ? '' : plain(amp) + '·'}${f}${arg}`;
  return [`J₁ = ${plain(pq.J1)} + ${term(p0.J1 - pq.J1, 'cos')}`, `J₂ = ${plain(pq.J2)} − ${term(pq.J2 - p0.J2, 'cos')}`, `Δ = ${term(pq.D, 'sin')}`];
}
const cycleText = (paramsOf, arg = '') => cycleParts(paramsOf, arg).join(', ');
const math = (parts) => parts.map((t) => `<span class="m">${t}</span>`).join(', ');     // each formula may not break, the list may
const handAt = (s) => pumpParams(s, HAND.dJ, HAND.D0);
const SHEET_TEXT = cycleText((s) => pumpParams(s, SHEET.dJ, SHEET.D0)), ASIDE_TEXT = cycleText(notEnclosingParams);
// the parameters of the hand cycle at one time, in words
const atTime = (s) => { const p = handAt(s); return `J₁ = ${plain(p.J1)}, J₂ = ${plain(p.J2)}, Δ = ${plain(p.D)}`; };
const cycleAtDeg = (s) => cycleText(handAt, ` ${plain(360 * s)}°`);     // the same with the angle 2πt/T in degrees
const u = (s) => `u${SUB[s]}`;
const code = (lines) => lines.map((l) => `<code>${l}</code>`).join('');
const neg = (z) => ({ re: -z.re, im: -z.im });
const conjOf = (z) => ({ re: z.re, im: -z.im });

// ---------- the hints of the plan (one short list, the same in all three forms) ----------
const HINT = {
  conj: 'this is the complex conjugate of the overlap. The star belongs to the left vector: ⟨u|v⟩ = u_A*·v_A + u_B*·v_B.',
  open: 'the loop is not closed: the last overlap ⟨u_M|u₁⟩ is missing in the product.',
  upper: 'E > 0: this is the upper band. The lower band has the smallest eigenvalue, E = −|h|. In Python use eigh, not eig.',
  upperVector: 'this is the eigenvector of the upper band, the one with the larger eigenvalue. Take the smaller eigenvalue.',
  phase: 'the product has changed, so a phase factor did not cancel. Check the complex conjugate (the i of the left vector becomes −i) and the overlap that closes the loop.',
  sign: 'right size, wrong sign. One of: +arg in place of −arg; the upper band; e^(−ik) in h; −Δ on guide A.',
  unwrap: 'C = 0: the jumps of 2π are still in γ. Use unwrap before you take γ(T) − γ(0).',
  total: '0: you took arg of the total product, or you added both bands. Take −arg of every single plaquette and add the 16 angles.',
  coarse: '0: a 3 × 3 grid is too coarse for these numbers. Use 4 points or more in k and in t, an even number.',
  swapped: '0 and π are swapped: your unit cell holds the J₂ pair. Here J₁ couples A and B inside the unit cell.',
  norm: 'the norm leaves 1: the step dt is too large, or H is not symmetric. ' + TEXT.wrongCode,
  upperInput: 'the light moves to lower cell numbers: your input is the upper band. The lower band at t = 0 is (A − B)/√2.',
  oneGuide: 'the light hardly moves: this is one guide alone as input. It excites both bands, and they move in opposite directions. Use (A − B)/√2.',
  fourPoints: 'this is the value for four k points. A value that is not 0 or π needs many points: use M = 400.',
  plusArg: 'this is +arg. The angle of an overlap is −arg: the same number with the opposite sign.',
  walk: 'right size, wrong sign: +arg in place of −arg, or the square is walked the other way round. Walk a → b → c → d → a.',
  positive: 'type the positive number: the field stands behind ±.',
};

// ---------- fields ----------
const set1 = S.A.set1, set2 = S.A.set2, A7 = S.A.A7, B = S.B;
const CODE = 2e-4, DEG = 0.06, SHIFT = 5e-4;      // tolerances: code fields, hand angles in degrees, shift per cycle

function defineHand() {
  const tab = 'hand';
  for (let s = 2; s <= 4; s++) {
    const i = s - 1, at = `at k = ${K_NAME[i]}`;
    field({ id: `A1-h${s}`, tab, kind: 'complex', ref: set1.h[i], otherPhase: false, aria: `h ${at}` });
    field({ id: `A1-phi${s}`, tab, kind: 'angle', unit: 'deg', tol: DEG, ref: set1.phi_deg[i], aria: `angle phi of h ${at}, in degrees` });
    field({ id: `A1-E${s}`, tab, ref: set1.E[i], wrong: [{ value: -set1.E[i], hint: HINT.upper }], aria: `eigenvalue E of the lower band ${at}` });
    field({ id: `A1-uA${s}`, tab, kind: 'complex', ref: set1.uA[i], otherPhase: false, aria: `A component of the eigenvector ${at}` });
  }
  field({ id: 'A1-wind', tab, kind: 'integer', ref: set1.winding, aria: 'how often h goes around the origin, J1 = 1, J2 = 2', hint: 'not this number. Follow the solid circle once around and watch the origin.' });
  for (let s = 1; s <= 4; s++) {
    const i = s - 1, name = `overlap of u${s} with u${s % 4 + 1}`, o = set1.ov[i];
    field({ id: `A2-ov${s}`, tab, kind: 'complex', ref: o, wrong: [{ value: conjOf(o), hint: HINT.conj }], aria: name });
    field({ id: `A2-len${s}`, tab, ref: set1.ov_len[i], aria: `length of the ${name}` });
    field({ id: `A2-ang${s}`, tab, kind: 'angle', unit: 'deg', tol: DEG, ref: set1.ov_angle_deg[i], wrong: [{ value: -set1.ov_angle_deg[i], hint: HINT.plusArg }], aria: `angle, minus arg, of the ${name}, in degrees` });
  }
  choice({ id: 'A3-pred', tab, options: [{ value: 0, label: '0' }, { value: 0.5, label: 'π/2' }, { value: 1, label: 'π' }], aria: 'your prediction of the Zak phase' });
  field({ id: 'A3-len', tab, ref: set1.prod_len, aria: 'product of the four lengths' });
  field({ id: 'A3-sum', tab, kind: 'value', unit: 'deg', tol: DEG, ref: set1.angle_sum_deg, aria: 'sum of the four angles, in degrees' });
  field({ id: 'A3-prod', tab, kind: 'complex', ref: set1.prod, otherPhase: false, wrong: [{ value: set1.open_prod, hint: HINT.open }], aria: 'product of the four overlaps' });
  field({ id: 'A3-gamma', tab, kind: 'angle', unit: 'pi', ref: set1.gamma_over_pi, wrong: [{ value: 0, hint: HINT.swapped }], aria: 'Zak phase gamma in units of pi, J1 = 1, J2 = 2' });
  field({ id: 'A4-ov1', tab, kind: 'complex', ref: set1.A4.ov12, aria: 'overlap of u1 with i times u2' });
  field({ id: 'A4-ov2', tab, kind: 'complex', ref: set1.A4.ov23, wrong: [{ value: neg(set1.A4.ov23), hint: HINT.phase }], aria: 'overlap of i times u2 with u3' });
  field({ id: 'A4-prod', tab, kind: 'complex', ref: set1.A4.prod, otherPhase: false, wrong: [{ value: neg(set1.A4.prod), hint: HINT.phase }, { value: set1.open_prod, hint: HINT.open }], aria: 'product of the four overlaps with u2 times i' });
  field({ id: 'A5-wind', tab, kind: 'integer', ref: set2.winding, aria: 'how often h goes around the origin, J1 = 2, J2 = 1', hint: 'not this number. Follow the dashed circle once around and watch the origin.' });
  for (let s = 1; s <= 4; s++) field({ id: `A5-ang${s}`, tab, kind: 'angle', unit: 'deg', tol: DEG, ref: set2.ov_angle_deg[s - 1], wrong: [{ value: -set2.ov_angle_deg[s - 1], hint: HINT.plusArg }], aria: `angle, minus arg, of the overlap of u${s} with u${s % 4 + 1}, J1 = 2, J2 = 1, in degrees` });
  field({ id: 'A5-sum', tab, kind: 'value', unit: 'deg', tol: DEG, ref: set2.angle_sum_deg, aria: 'sum of the four angles, J1 = 2, J2 = 1, in degrees' });
  field({ id: 'A5-gamma', tab, kind: 'angle', unit: 'pi', ref: set2.gamma_over_pi, wrong: [{ value: 1, hint: HINT.swapped }], aria: 'Zak phase gamma in units of pi, J1 = 2, J2 = 1' });
}

function defineCode() {
  const tab = 'code', hint = TEXT.wrongCode, zak = (id, ref, aria, wrong = []) => field({ id, tab, kind: 'angle', unit: 'pi', tol: CODE, ref, hint, aria, wrong: [{ value: -ref, hint: HINT.sign }, ...wrong] });
  field({ id: 'A6-E', tab, tol: CODE, ref: set1.E[0], hint, wrong: [{ value: -set1.E[0], hint: HINT.upper }], aria: 'eigenvalue of your eigenvector at k = 0' });
  field({ id: 'A6-prod4', tab, kind: 'complex', tol: CODE, ref: set1.prod, otherPhase: false, hint, wrong: [{ value: set1.open_prod, hint: HINT.open }], aria: 'product of the four overlaps, eigenvectors from the computer' });
  field({ id: 'A6-prodrand', tab, kind: 'complex', tol: CODE, ref: set1.prod, otherPhase: false, hint: HINT.phase, wrong: [{ value: set1.open_prod, hint: HINT.open }], aria: 'product of the four overlaps with random phase factors' });
  field({ id: 'A6-prod100', tab, kind: 'complex', tol: CODE, ref: set1.prod_M100, otherPhase: false, hint, aria: 'product of the overlaps with 100 k points' });
  field({ id: 'A6-gamma100', tab, kind: 'angle', unit: 'pi', tol: CODE, ref: set1.gamma_M100_over_pi, hint, wrong: [{ value: 0, hint: HINT.swapped }], aria: 'Zak phase with 100 k points, in units of pi' });
  zak('A7-exact', A7.exact.gamma_over_pi_M400, 'Zak phase for J1 = 0, J2 = 4, Delta = 3, in units of pi', [{ value: A7.exact.gamma_over_pi_M4, hint: HINT.fourPoints }]);
  field({ id: 'A7-wA', tab, tol: CODE, ref: A7.exact.weight_A, hint, aria: 'light of the lower band on guide A' });
  zak('A7-s1-M4', A7.set1.M4_over_pi, 'Zak phase for J1 = 1, J2 = 2, Delta = 0.5 with 4 k points, in units of pi');
  zak('A7-s1-M100', A7.set1.M100_over_pi, 'Zak phase for J1 = 1, J2 = 2, Delta = 0.5 with 100 k points, in units of pi', [{ value: A7.set1.M4_over_pi, hint: HINT.fourPoints }]);
  zak('A7-s1-M400', A7.set1.M400_over_pi, 'Zak phase for J1 = 1, J2 = 2, Delta = 0.5 with 400 k points, in units of pi', [{ value: A7.set1.M4_over_pi, hint: HINT.fourPoints }]);
  zak('A7-s2-M400', A7.set2.M400_over_pi, 'Zak phase for J1 = 2, J2 = 1, Delta = 0.5 with 400 k points, in units of pi', [{ value: A7.set2.M4_over_pi, hint: HINT.fourPoints }]);
}

function definePump() {
  const tab = 'pump', hint = TEXT.wrongCode, low = B.B2.t0375.ingap[0], up = B.B2.t0375.ingap[1], st = B.B3.start;
  ['k = 0', 'k = π/2', 'k = π'].forEach((name, i) => field({ id: `B1-E${i}`, tab, ref: B.B1.E.tq[i], wrong: [{ value: -B.B1.E.tq[i], hint: HINT.positive }], aria: `band energy at t = T/4 and ${name}` }));
  field({ id: 'B1-gap', tab, tol: CODE, ref: B.B1.gap_min, hint, aria: 'smallest gap between the two bands' });
  field({ id: 'B1-gapsheet', tab, tol: CODE, ref: B.B1.gap_min_sheet, hint, aria: 'smallest gap with the numbers of the task sheet' });
  field({ id: 'B2-Elow', tab, tol: CODE, ref: low.E, hint, aria: 'the lower of the two eigenvalues in the gap at t = 3T/8' });
  field({ id: 'B2-Eup', tab, tol: CODE, ref: up.E, hint, aria: 'the upper of the two eigenvalues in the gap at t = 3T/8' });
  choice({ id: 'B2-end', tab, options: [{ value: 'left', label: 'left end' }, { value: 'right', label: 'right end' }], right: up.end, hint: 'not this end. Plot |ψ|² of the eigenvector over the guide number.', aria: 'the end of the chain where the state with the upper eigenvalue sits' });
  choice({ id: 'B2-guide', tab, options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }], right: up.weight_A > 0.5 ? 'A' : 'B', hint: 'not these guides. The guides A are the first, third, fifth, … guide of the chain.', aria: 'the guides that carry the state with the upper eigenvalue' });
  field({ id: 'B3-norm', tab, tol: CODE, ref: B.B3.norm_T20, hint: HINT.norm, aria: 'norm after one cycle, T = 20' });
  for (const T of [20, 50]) field({ id: `B3-T${T}`, tab, tol: SHIFT, ref: st.shift[`T${T}`], hint, wrong: [{ value: st.one_guide[`T${T}`], hint: HINT.oneGuide }, { value: st.upper_band[`T${T}`], hint: HINT.upperInput }], aria: `shift per cycle for T = ${T}` });
  field({ id: 'B3-guide', tab, tol: SHIFT, ref: st.one_guide.T50, hint, wrong: [{ value: st.shift.T50, hint: 'this is the shift for the input (A − B)/√2. Put all light on guide A of the middle cell.' }], aria: 'shift per cycle with one guide alone as input, T = 50' });
  field({ id: 'B3-sheet', tab, tol: SHIFT, ref: st.sheet_T20_pair, hint, aria: 'shift per cycle with the numbers of the task sheet, T = 20' });
  const half = pumpParams(0.5, HAND.dJ, HAND.D0), openHalf = loopOverlaps(bandStates(half.J1, half.J2, half.D, 4)).slice(0, 3).reduce((p, z) => cx.mul(p, z), cx.of(1));
  field({ id: 'B4-prod0', tab, kind: 'complex', ref: B.B4.t0.prod, otherPhase: false, aria: 'product of the four overlaps at t = 0' });
  field({ id: 'B4-g0', tab, kind: 'angle', unit: 'pi', ref: B.B4.t0.gamma_over_pi, wrong: [{ value: 1, hint: HINT.swapped }], aria: 'Zak phase at t = 0, in units of pi' });
  field({ id: 'B4-prodh', tab, kind: 'complex', ref: B.B4.thalf.prod, otherPhase: false, wrong: [{ value: openHalf, hint: HINT.open }], aria: 'product of the four overlaps at t = T/2' });
  field({ id: 'B4-gh', tab, kind: 'angle', unit: 'pi', ref: B.B4.thalf.gamma_over_pi, wrong: [{ value: 0, hint: HINT.swapped }], aria: 'Zak phase at t = T/2, in units of pi' });
  choice({ id: 'B5-pred', tab, options: [{ value: 0, label: '0' }, { value: 1, label: 'π' }, { value: 2, label: '2π' }], aria: 'your prediction: change of gamma in one cycle' });
  field({ id: 'B5-quarter', tab, kind: 'angle', unit: 'pi', tol: CODE, ref: B.B5.quarter_M400_over_pi, hint, wrong: [{ value: -B.B5.quarter_M400_over_pi, hint: HINT.sign }, { value: B.B5.quarter_M4_over_pi, hint: HINT.fourPoints }], aria: 'Zak phase at t = T/4 with 400 k points, in units of pi' });
  field({ id: 'B5-C', tab, kind: 'integer', ref: B.B5.C, hint, wrong: [{ value: B.B5.C_without_unwrap, hint: HINT.unwrap }, { value: -B.B5.C, hint: HINT.sign }], aria: 'Chern number C from gamma at the end minus gamma at the start' });
}

const crossing = inGapStates(0.5, HAND.dJ, HAND.D0, B.B2.cells).states.filter((s) => s.end === 'left').length;   // states in the gap at the left end at t = T/2
function defineChern() {
  const tab = 'chern', hint = TEXT.wrongCode, b6 = B.B6, b7 = B.B7, one = cx.of(1), zero = cx.of(0), r = Math.SQRT1_2;
  field({ id: 'B6-E', tab, ref: b6.E_kpi2_tq, wrong: [{ value: -b6.E_kpi2_tq, hint: HINT.upper }], aria: 'eigenvalue of b: H times b is this number times b' });
  field({ id: 'B6-c', tab, kind: 'vector', ref: b6.u_kpi_tq, wrong: [{ value: [one, zero], hint: HINT.upperVector }], partNames: ['A component', 'B component'], aria: 'eigenvector c at k = pi, t = T/4' });
  field({ id: 'B6-a', tab, kind: 'vector', ref: b6.u_t0, wrong: [{ value: [cx.of(r), cx.of(r)], hint: HINT.upperVector }], partNames: ['A component', 'B component'], aria: 'eigenvector a = d at t = 0, times the square root of 2' });
  ['a with b', 'b with c', 'c with d', 'd with a'].forEach((name, i) => {
    const o = b6.ov[i];
    field({ id: `B6-ov${i + 1}`, tab, kind: 'complex', ref: o, wrong: Math.abs(o.im) > 1e-9 ? [{ value: conjOf(o), hint: HINT.conj }] : [], aria: `overlap of ${name}` });
  });
  field({ id: 'B6-prod', tab, kind: 'complex', ref: b6.prod, otherPhase: false, wrong: [{ value: conjOf(b6.prod), hint: HINT.walk }], aria: 'product of the four overlaps around the plaquette' });
  field({ id: 'B6-F', tab, kind: 'value', unit: 'pi', ref: b6.F_over_pi, wrong: [{ value: -b6.F_over_pi, hint: HINT.walk }], aria: 'plaquette phase F in units of pi' });
  ['0 to T/4', 'T/4 to T/2', 'T/2 to 3T/4', '3T/4 to T'].forEach((name, j) => field({ id: `B7-col${j + 1}`, tab, kind: 'value', unit: 'pi', tol: CODE, ref: b7.col_sums_over_pi[j], hint, wrong: [{ value: -b7.col_sums_over_pi[j], hint: HINT.walk }], aria: `sum of the four plaquettes of the column t from ${name}, in units of pi` }));
  field({ id: 'B7-total', tab, kind: 'value', unit: 'pi', tol: CODE, ref: b7.total_over_pi, hint, wrong: [{ value: 0, hint: HINT.total }, { value: -b7.total_over_pi, hint: HINT.walk }], aria: 'sum of all 16 plaquettes, in units of pi' });
  field({ id: 'B7-C', tab, kind: 'integer', ref: b7.C, hint, wrong: [{ value: 0, hint: HINT.total }, { value: -b7.C, hint: HINT.walk }], aria: 'Chern number from the 4 by 4 grid' });
  field({ id: 'B7-C24', tab, kind: 'integer', ref: b7.C_24, hint, wrong: [{ value: 0, hint: HINT.total }], aria: 'Chern number from the 24 by 24 grid' });
  const b8 = [['upper band of the solid cycle', B.B8.upper_band, []], ['solid cycle run backwards, lower band', B.B8.reversed_cycle, []], ['dotted cycle, lower band', B.B8.not_enclosing, []],
    ['dashed cycle with the numbers of the task sheet, lower band', B.B8.sheet, b7.C_sheet_3_wrong !== B.B8.sheet ? [{ value: b7.C_sheet_3_wrong, hint: HINT.coarse }] : []]];
  b8.forEach(([name, ref, wrong], i) => {
    choice({ id: `B8-p${i + 1}`, tab, options: [{ value: -1, key: 'm1', label: '−1' }, { value: 0, label: '0' }, { value: 1, label: '+1' }], aria: `your prediction of the Chern number: ${name}` });
    field({ id: `B8-c${i + 1}`, tab, kind: 'integer', ref, hint, wrong, aria: `calculated Chern number: ${name}` });
  });
  choice({ id: 'B8-cross', tab, options: [0, 1, 2].map((v) => ({ value: v, label: String(v) })), right: crossing, hint: 'not this number. Look at figure c of tab 3: follow one coloured line through the gap.', aria: 'number of states that cross the gap at each end per cycle' });
}
defineHand(); defineCode(); definePump(); defineChern();

// What the student predicted, and how it compares with the calculated result.
const predNote = (predId, resultId, label, right) => () => {
  const v = chosen(predId);
  if (v === null) return null;
  const mine = get(predId).options.find((o) => String(o.value) === v).label;
  if (!isOk(resultId)) return `Your prediction: ${label} ${mine}. Now calculate.`;
  return Math.abs(Number(v) - right) < 1e-9 ? `Your prediction, ${label} ${mine}, was right.` : `You predicted ${label} ${mine}. Your calculation gives another value: find out why.`;
};

// ---------- conventions, printed once at the top ----------
function conventions(open) {
  const items = [
    '<span class="m">H(k) = [[Δ, h*], [h, −Δ]]</span> with <span class="m">h(k) = J₁ + J₂·e<sup>ik</sup></span>, in the basis (A, B). h* is the complex conjugate of h.',
    'A and B are the two waveguides (short: guides) of one unit cell. J₁ couples A and B inside a unit cell. J₂ couples B to the A of the next cell. On-site term: +Δ on A, −Δ on B.',
    'The couplings are written +J, as in the hands-on code. The lecture prints the matrix with −J. The same for both: all overlaps, products, γ, plaquette phases, C. Different: the second component of u changes sign.',
    'Lower band = the smallest eigenvalue.',
    '<span class="m">k<sub>s</sub> = 2π(s − 1)/M</span>, s = 1 … M. The point 2π is the point 0 and is not repeated. The loop closes with ⟨u<sub>M</sub>|u₁⟩.',
    'By hand, for Δ = 0: <span class="m">E = −|h|</span> and <span class="m">u = (u<sub>A</sub>, u<sub>B</sub>) = (−e<sup>−iφ</sup>, 1)/√2</span>, with φ = angle of h. Another phase factor gives other single overlaps and the same product.',
    '<span class="m">γ = −arg(⟨u₁|u₂⟩⟨u₂|u₃⟩ … ⟨u<sub>M</sub>|u₁⟩)</span>. The angles −π and π are the same. 0 and π swap if the unit cell is chosen with the J₂ pair inside: a choice, not a mistake. Here: J₁ inside.',
    'Plaquette (one small square of a grid in k and t): the same −arg, walked (k, t) → (k, t+dt) → (k+dk, t+dt) → (k+dk, t) → back. <span class="m">C = (sum of all plaquette phases)/2π</span>.',
    'Position of the light: <span class="m">X = Σ<sub>m</sub> m·(I<sub>A,m</sub> + I<sub>B,m</sub>)</span>. I<sub>A,m</sub> is the light |ψ|² on guide A of cell m. The cells are counted from the cell where the light starts, so X(0) = 0.',
    'Typing: decimal point or comma, a fraction such as −1/4, a multiple of π such as pi/2. By hand two decimals are enough, from your code type four. A field is checked when you press Enter or leave it. An empty field is not a wrong try.',
  ];
  const d = el('details', { class: 'wb-conv' }, [el('summary', { text: 'Conventions and how to type (open this before you start)' }), el('ul', {}, items.map((html) => el('li', { html })))]);
  d.open = open;
  return d;
}
const downloads = () => el('div', { class: 'wb-downloads' }, [
  el('span', { class: 'lab', text: 'Download:' }),
  ...[['code/zak_chern.py', 'zak_chern.py'], ['code/zak_chern_check.py', 'zak_chern_check.py'], ['code/zak_chern.m', 'zak_chern.m'], ['code/zak_chern_check.m', 'zak_chern_check.m'], ['pdf/zak_chern_worksheet.pdf', 'worksheet (PDF)']]
    .map(([href, text]) => el('a', { class: 'btn', href, download: '', text })),
]);

// ---------- tab 1: Zak phase by hand ----------
function buildHand() {
  const worked = rowOf([keyCell('k₁ = 0'),
    el('span', { class: 'wb-given', html: `h = ${set1.J1} + ${set1.J2}·e<sup>i·0</sup> = ${cnum(set1.h[0])}` }),
    el('span', { class: 'wb-given', html: `φ = ${num(set1.phi_deg[0], 2)}°` }),
    el('span', { class: 'wb-given', html: `E = −|h| = ${num(set1.E[0])}` }),
    el('span', { class: 'wb-given', html: `u<sub>A</sub> = −e<sup>−i·0°</sup>/√2 = ${cnum(set1.uA[0])}` })], 'worked');
  const rows = [2, 3, 4].map((s) => rowOf([keyCell(`k${SUB[s]} = ${K_NAME[s - 1]}`),
    fieldNode(`A1-h${s}`, { label: 'h =' }), fieldNode(`A1-phi${s}`, { label: 'φ =', unitText: '°' }),
    fieldNode(`A1-E${s}`, { label: 'E =' }), fieldNode(`A1-uA${s}`, { label: 'u<sub>A</sub> =' })]));
  const a1 = stepBlock({
    tag: 'A1', title: 'h(k), its angle, the eigenvalue and the eigenvector at four k',
    children: [
      para(`J₁ = ${set1.J1}, J₂ = ${set1.J2}, Δ = 0. Fill in one row per k: <span class="m">h(k) = J₁ + J₂·e<sup>ik</sup></span> as a complex number, its angle φ, the eigenvalue <span class="m">E = −|h|</span> and the A component of the eigenvector, <span class="m">u<sub>A</sub> = −e<sup>−iφ</sup>/√2</span>. H(k) has the two eigenvalues +|h| and −|h|: E = −|h| is the lower band. In every row <span class="m">u<sub>B</sub> = 1/√2 = ${num(set1.uB)}</span>. The first row is worked.`),
      worked, ...rows,
      para('Check each row on paper: multiply H(k) with u and compare with E·u.'),
      rowOf([fieldNode('A1-wind', { label: 'How often does h(k) go around the origin when k goes from 0 to 2π?', unitText: 'times' })]),
    ],
    formula: () => code([
      `h(k) = J₁ + J₂·e^(ik) = ${set1.J1} + ${set1.J2}·(cos k + i·sin k)`,
      ...[2, 3, 4].map((s) => `k${SUB[s]} = ${K_NAME[s - 1]}:  h = ${set1.J1} + ${set1.J2}·(cos ${K_DEG[s - 1]}° + i·sin ${K_DEG[s - 1]}°)`),
      'φ = angle of h = atan2(Im h, Re h), between −180° and 180°',
      'E = −|h| = −√((Re h)² + (Im h)²)',
      `u_A = −e^(−iφ)/√2 = (−cos φ + i·sin φ)·${num(set1.uB)}`,
    ]),
  });

  const uA = (s) => (s === 1 ? `(${cnum(set1.uA[0])})` : isOk(`A1-uA${s}`) ? `(${cnum(set1.uA[s - 1])})` : `(u_A of row k${SUB[s]})`);
  const a2 = stepBlock({
    tag: 'A2', title: 'The four overlaps around the loop',
    children: [
      para('The overlap of two eigenvectors is <span class="m">⟨u|v⟩ = u<sub>A</sub>*·v<sub>A</sub> + u<sub>B</sub>*·v<sub>B</sub></span>: one complex number. The star is the complex conjugate: every i of the left vector becomes −i. Go around the closed loop u₁ → u₂ → u₃ → u₄ → u₁. The last overlap closes the loop.'),
      para(`The first one, written out: <span class="m">${ov('u₁', 'u₂')} = u<sub>1,A</sub>*·u<sub>2,A</sub> + u<sub>1,B</sub>*·u<sub>2,B</sub></span> <span class="m">= (${num(set1.uA[0].re)})*·u<sub>2,A</sub> + ${num(set1.uB)}·${num(set1.uB)}</span>, with your u<sub>A</sub> of the row k₂.`),
      para('For each overlap write its value, its length <span class="m">√(Re² + Im²)</span> and its angle. The angle is −arg: minus the angle of the complex number.'),
      ...[1, 2, 3, 4].map((s) => rowOf([keyCell(ov(u(s), u(s % 4 + 1)) + (s === 4 ? '<small>closes the loop</small>' : '')),
        fieldNode(`A2-ov${s}`, { label: '=' }), fieldNode(`A2-len${s}`, { label: 'length' }), fieldNode(`A2-ang${s}`, { label: '−arg =', unitText: '°' })])),
      para('Compare each angle with the step of φ in A1 (φ₂ − φ₁, φ₃ − φ₂, and so on). Write on the worksheet what you find.'),
    ],
    formula: () => code([
      ...[1, 2, 3, 4].map((s) => `${ov(u(s), u(s % 4 + 1))} = ${uA(s)}*·${uA(s % 4 + 1)} + ${num(set1.uB)}·${num(set1.uB)}`),
      '(a + b·i)* = a − b·i',
      'length = √(Re² + Im²)        angle = −arg = −atan2(Im, Re)',
    ]) + ([2, 3, 4].every((s) => isOk(`A1-uA${s}`)) ? '' : '<span class="note">A missing number appears here when its row of A1 is right.</span>'),
  });

  const lens = () => ([1, 2, 3, 4].every((s) => isOk(`A2-len${s}`)) ? set1.ov_len.map((x) => num(x)).join(' · ') : 'the four lengths of A2, multiplied');
  const angs = () => ([1, 2, 3, 4].every((s) => isOk(`A2-ang${s}`)) ? set1.ov_angle_deg.map((x) => `${num(x, 2)}°`).join(' + ') : 'the four angles of A2, added');
  const a3 = stepBlock({
    tag: 'A3', title: 'The product of the overlaps and the Zak phase γ',
    children: [
      para('The Zak phase is the Berry phase of this loop through all k: <span class="m">γ = −arg(product of the four overlaps)</span>. A product of complex numbers multiplies the lengths and adds the angles. Predict first: use the picture of A1 and your angles of A2.'),
      rowOf([choiceNode('A3-pred', { label: 'I predict γ =' }), dynamic(el('span', { class: 'wb-pred' }), predNote('A3-pred', 'A3-gamma', 'γ =', set1.gamma_over_pi))]),
      gate('A3-pred', [
        rowOf([fieldNode('A3-len', { label: 'Multiply the four lengths:' }), fieldNode('A3-sum', { label: 'Add the four angles:', unitText: '°' })]),
        rowOf([fieldNode('A3-prod', { label: 'product =' })]),
        rowOf([fieldNode('A3-gamma', { label: 'γ = −arg(product) =', unitText: 'π' })]),
        para('The angles −π and π are the same. Both are accepted.', 'wb-small'),
        doneNote(['A3-gamma', 'A1-wind'], `h goes around the origin ${howOften(set1.winding)}, and γ = ${inPi(set1.gamma_over_pi)}: γ is half of the full turn of φ. Compare with Exercise 3, tab 2.`),
      ]),
    ],
    formula: () => code([
      `length of the product = ${lens()}`,
      `sum of the angles = ${angs()}`,
      'product = length·e^(−i·sum) = length·(cos(sum) − i·sin(sum))',
      'γ = −arg(product) = −atan2(Im, Re);  γ in units of π = (this angle in degrees)/180',
    ]),
  });

  const a4 = stepBlock({
    tag: 'A4', title: 'Another phase on one eigenvector',
    children: [
      para('Multiply u₂ by i. The number i is a phase factor: a complex number of length 1. An eigenvector times a phase factor is still the same eigenvector. Redo the two overlaps that contain u₂, then the product of all four.'),
      rowOf([keyCell(ov('u₁', 'i·u₂')), fieldNode('A4-ov1', { label: '=' })]),
      rowOf([keyCell(ov('i·u₂', 'u₃')), fieldNode('A4-ov2', { label: '=' })]),
      rowOf([keyCell('product'), fieldNode('A4-prod', { label: '=' })]),
      doneNote(['A4-ov1', 'A4-ov2', 'A4-prod'], 'Both overlaps have changed. Their lengths and the product of all four have not: the factor i enters once as i and once as −i.'),
    ],
    formula: () => code([
      `${ov('u₁', 'i·u₂')} = i·${ov('u₁', 'u₂')}${isOk('A2-ov1') ? ` = i·(${cnum(set1.ov[0])})` : ''}`,
      `${ov('i·u₂', 'u₃')} = (i)*·${ov('u₂', 'u₃')} = −i·${ov('u₂', 'u₃')}${isOk('A2-ov2') ? ` = −i·(${cnum(set1.ov[1])})` : ''}`,
      `product = ${ov('u₁', 'i·u₂')}·${ov('i·u₂', 'u₃')}·${ov('u₃', 'u₄')}·${ov('u₄', 'u₁')}`,
      'i·(a + b·i) = −b + a·i        −i·(a + b·i) = b − a·i',
    ]),
  });

  const a5 = stepBlock({
    tag: 'A5', title: `The other chain: J₁ = ${set2.J1}, J₂ = ${set2.J2}`,
    children: [
      para(`Now J₁ = ${set2.J1}, J₂ = ${set2.J2}: the dashed circle in the picture. The same four k. Only the angles are needed. Use what you found in A2.`),
      rowOf([fieldNode('A5-wind', { label: 'How often does h(k) go around the origin now?', unitText: 'times' })]),
      ...[1, 2, 3, 4].map((s) => rowOf([keyCell(ov(u(s), u(s % 4 + 1))), fieldNode(`A5-ang${s}`, { label: '−arg =', unitText: '°' })])),
      rowOf([fieldNode('A5-sum', { label: 'Sum of the four angles:', unitText: '°' }), fieldNode('A5-gamma', { label: 'γ =', unitText: 'π' })]),
      doneNote(['A5-gamma', 'A5-wind', 'A3-gamma'], `The origin is outside the dashed circle: the angles go forth and back, and γ = ${inPi(set2.gamma_over_pi)}. With the origin inside the solid circle, γ = ${inPi(set1.gamma_over_pi)}.`),
    ],
    formula: () => code([
      `h(k_s) = ${set2.J1} + ${set2.J2}·(cos k_s + i·sin k_s),  k_s = 0°, 90°, 180°, 270°`,
      `φ_s = atan2(Im h, Re h);  u_A = −e^(−iφ)/√2, u_B = ${num(set2.uB)}`,
      `angle = −arg${ov('u_s', 'u_(s+1)')} = −arg( (u_s,A)*·u_(s+1),A + ${num(set2.uB)}·${num(set2.uB)} )`,
      'γ = sum of the four angles;  in units of π: (sum in degrees)/180',
    ]),
  });
  return [conventions(false), a1, a2, a3, a4, a5];
}

// ---------- tab 2: Zak phase, your code ----------
function buildCode() {
  const a6 = stepBlock({
    tag: 'A6', title: 'Eigenvectors from the computer',
    children: [
      para(`J₁ = ${set1.J1}, J₂ = ${set1.J2}, Δ = 0. M is the number of k points: M = 4 gives the same four k as by hand. Now the eigenvectors of the lower band come from <code>eigh</code> (Python) or <code>eig</code> (MATLAB). The computer gives every eigenvector its own phase factor.`),
      rowOf([keyCell('(a) M = 4'), fieldNode('A6-E', { label: 'eigenvalue of your eigenvector at k = 0:' }), fieldNode('A6-prod4', { label: 'product of the four overlaps =' })]),
      rowOf([keyCell('(b) M = 4'), el('span', { class: 'wb-given', html: 'Multiply every eigenvector by e<sup>iχ</sup>, each with its own random χ. Single overlaps change.' }), fieldNode('A6-prodrand', { label: 'product =' })]),
      rowOf([keyCell('(c) M = 100'), fieldNode('A6-prod100', { label: 'product =' }), fieldNode('A6-gamma100', { label: 'γ =', unitText: 'π' })]),
      doneNote(['A6-prod4', 'A6-prodrand'], 'The same product as by hand, for every choice of the phase factors: only the closed product is fixed.'),
    ],
    formula: () => code([
      'H·u = E·u:  eigh and eig return the eigenvectors as the columns of a matrix V',
      'lower band:  Python eigh: the first column of V.  MATLAB eig: sort the eigenvalues, then take the column of the smallest',
      '⟨u|v⟩ = Σ conj(u_i)·v_i        Python np.vdot(u, v), MATLAB u\'*v',
      'product = ⟨u₁|u₂⟩·⟨u₂|u₃⟩· … ·⟨u_M|u₁⟩,  k_s = 2π(s − 1)/M',
      'γ = −arg(product);  type γ/π',
    ]),
  });
  const a7 = stepBlock({
    tag: 'A7', title: 'With the on-site term Δ',
    children: [
      para('The on-site term Δ changes the propagation constant of the waveguides (short: guides): +Δ on every guide A, −Δ on every guide B. Now γ is no longer 0 or π: γ/2π is the position of the light of this band inside the unit cell. Use M = 400.'),
      rowOf([keyCell('(a) exact test'), el('span', { class: 'wb-given', html: `J₁ = ${A7.exact.J1}, J₂ = ${A7.exact.J2}, Δ = ${A7.exact.D}` }), fieldNode('A7-exact', { label: 'γ =', unitText: 'π' }),
        fieldNode('A7-wA', { label: 'light of the lower band on guide A, |u<sub>A</sub>|² at any k:' })]),
      doneNote(['A7-exact', 'A7-wA'], 'γ/2π = |u<sub>A</sub>|². With J₁ = 0 the light sits on one pair: guide B of cell m and guide A of cell m + 1. The share on A counts for cell m + 1, so X = m + |u<sub>A</sub>|².'),
      rowOf([keyCell(`(b) Δ = ${A7.set1.D}`), el('span', { class: 'wb-given', html: `J₁ = ${set1.J1}, J₂ = ${set1.J2}` }), fieldNode('A7-s1-M4', { label: 'M = 4: γ =', unitText: 'π' }),
        fieldNode('A7-s1-M100', { label: 'M = 100: γ =', unitText: 'π' }), fieldNode('A7-s1-M400', { label: 'M = 400: γ =', unitText: 'π' })]),
      rowOf([keyCell(`(b) Δ = ${A7.set2.D}`), el('span', { class: 'wb-given', html: `J₁ = ${set2.J1}, J₂ = ${set2.J2}` }), fieldNode('A7-s2-M400', { label: 'M = 400: γ =', unitText: 'π' })]),
      para('This step tests the sign and the band. A3 to A6 cannot: there −π and π are the same angle.', 'wb-small'),
      doneNote(['A7-s1-M4', 'A7-s1-M400'], 'Four points are not enough here: a value that is not 0 or π needs many k points.'),
    ],
    formula: () => code([
      'H(k) = [[Δ, conj(h)], [h, −Δ]],  h = J₁ + J₂·e^(ik),  k_s = 2π(s − 1)/M',
      'γ = −arg(⟨u₁|u₂⟩·⟨u₂|u₃⟩· … ·⟨u_M|u₁⟩) with the eigenvectors of the smallest eigenvalue;  type γ/π',
      '|u_A|² = squared length of the first component of the eigenvector u',
    ]),
  });
  return [conventions(false), downloads(),
    para('Your code repeats tab 1 and then goes on. Put the two Python files (or the two MATLAB files) into one folder and run zak_chern.py (or zak_chern.m). It stops at the first open step. Write the line marked TODO there and run again. Every OK line prints numbers: type them here with four decimals.', 'wb-intro'),
    a6, a7];
}

// ---------- tab 3: the Thouless pump ----------
function buildPump() {
  // the two states in the gap, in words, read from the model: which end has +Δ(t), and which way each one crosses the gap
  const g = B.B2.t0375.ingap, later = B.B2.t0625.ingap, upEnd = g[1].end, lowEnd = g[0].end, upLater = later.find((x) => x.end === upEnd).E;
  const b2Note = `The state at the ${upEnd} end has the eigenvalue +Δ(t), the state at the ${lowEnd} end −Δ(t).`
    + (g[1].E > 0 && upLater < 0 ? ` In one cycle the ${upEnd} one crosses the gap from the upper to the lower band, the ${lowEnd} one the other way.` : '');
  const b1 = stepBlock({
    tag: 'B1', title: 'The two bands over k and t (task 9a)',
    children: [
      para('The two bands are <span class="m">E = ±√(Δ² + |h|²)</span>. By hand at k = 0, π/2 and π. The first row is worked.'),
      rowOf([keyCell('t = 0'), el('span', { class: 'wb-given', html: `${atTime(0)}, so h = ${whole(hOf(0, handAt(0).J1, handAt(0).J2))} at every k: E = ±${num(B.B1.E.t0[0])}, ±${num(B.B1.E.t0[1])}, ±${num(B.B1.E.t0[2])}` })], 'worked'),
      rowOf([keyCell('t = T/4'), fieldNode('B1-E0', { label: 'k = 0: E = ±' }), fieldNode('B1-E1', { label: 'k = π/2: E = ±' }), fieldNode('B1-E2', { label: 'k = π: E = ±' })]),
      para('In your code: both bands over k and t/T. The gap is the distance between the two bands.'),
      rowOf([fieldNode('B1-gap', { label: 'smallest gap in the whole cycle:' }), fieldNode('B1-gapsheet', { label: 'with the numbers of the sheet:' })]),
      doneNote(['B1-gap', 'B1-gapsheet'], 'The gap never closes during the cycle: the lower band stays separate from the upper band.'),
    ],
    formula: () => code([
      `t = T/4:  ${cycleAtDeg(0.25)}`,
      'E = √(Δ² + J₁² + J₂² + 2·J₁·J₂·cos k),  k = 0°, 90°, 180°',
      'gap = 2·E at the point (k, t) where E is smallest',
    ]),
  });
  const b2 = stepBlock({
    tag: 'B2', title: 'The open chain: two states in the gap (task 9b)',
    children: [
      para(`An open chain of ${B.B2.cells} unit cells (${2 * B.B2.cells} guides): J₁ inside each cell, J₂ between the cells, +Δ on every A, −Δ on every B. Calculate its eigenvalues over t/T (figure c). At t = 3T/8 two of them lie inside the gap. Their eigenvectors are the two states in the gap.`),
      rowOf([fieldNode('B2-Elow', { label: 'the lower one:' }), fieldNode('B2-Eup', { label: 'the upper one:' })]),
      para('Compare the two numbers with ±Δ at this time. Then plot <span class="m">|ψ|²</span> of the two eigenvectors.'),
      rowOf([choiceNode('B2-end', { label: 'The state with the upper eigenvalue has its light at the' }), choiceNode('B2-guide', { label: 'of the chain, on the guides' })]),
      doneNote(['B2-end', 'B2-guide', 'B2-Eup'], b2Note),
    ],
    formula: () => code([
      `H is a matrix with ${2 * B.B2.cells} rows and columns: one for every guide, in the order A, B, A, B, …`,
      'on the diagonal: +Δ for every guide A, −Δ for every guide B',
      'next to the diagonal: J₁ between A and B of one cell, J₂ between B and the A of the next cell',
      `t = 3T/8:  ${cycleAtDeg(0.375)}`,
      `the two eigenvalues in the middle of the sorted list: number ${B.B2.cells} and ${B.B2.cells + 1} of ${2 * B.B2.cells}`,
    ]),
  });
  const b3 = stepBlock({
    tag: 'B3', title: 'Light through the pump (task 9c)',
    children: [
      para(`Solve <span class="m">i·dψ/dt = H(t)·ψ</span> in Runge–Kutta steps of dt = ${B.B3.dt}. H changes during a step: take H(t) for the first slope, H(t + dt/2) for the second and the third, H(t + dt) for the fourth. Input: amplitude 1/√2 on guide A and −1/√2 on guide B of one cell in the middle, short (A − B)/√2. This is the lower band at t = 0. X is the position of the light in unit cells, counted from the cell where it starts.`),
      rowOf([fieldNode('B3-norm', { label: 'Σ|ψ|² after one cycle, T = 20:', wide: true })]),
      rowOf([keyCell('shift per cycle X(T)'), fieldNode('B3-T20', { label: `T = 20 on ${B.B3.cells.T20} cells:` }), fieldNode('B3-T50', { label: `T = 50 on ${B.B3.cells.T50} cells:` })]),
      rowOf([fieldNode('B3-guide', { label: 'one guide A alone as input, T = 50:' }), fieldNode('B3-sheet', { label: `numbers of the sheet, T = 20, ${CELLS.sheet[20]} cells:` })]),
      doneNote(['B3-T20', 'B3-T50'], 'The light moves toward higher cell numbers. The slower the cycle, the closer the shift comes to one unit cell.'),
    ],
    formula: () => code([
      'k1 = −i·H(t)·ψ',
      'k2 = −i·H(t + dt/2)·(ψ + dt/2·k1)',
      'k3 = −i·H(t + dt/2)·(ψ + dt/2·k2)',
      'k4 = −i·H(t + dt)·(ψ + dt·k3)',
      'ψ ← ψ + dt/6·(k1 + 2·k2 + 2·k3 + k4)',
      'X = Σ_m m·(|ψ_A,m|² + |ψ_B,m|²), m = 0 for the cell where the light starts;  shift = X(T)',
    ]),
  });
  const b4 = stepBlock({
    tag: 'B4', title: 'The Zak phase at t = 0 and at t = T/2, by hand',
    children: [
      para('The two times without on-site term, with four k as on tab 1.'),
      rowOf([keyCell('t = 0'), el('span', { class: 'wb-given', html: `J₁ = ${plain(handAt(0).J1)}, J₂ = ${plain(handAt(0).J2)}: h = ${plain(handAt(0).J1)} at every k` }), fieldNode('B4-prod0', { label: 'product of the four overlaps =' }), fieldNode('B4-g0', { label: 'γ =', unitText: 'π' })]),
      rowOf([keyCell('t = T/2'), el('span', { class: 'wb-given', html: `J₁ = ${plain(handAt(0.5).J1)}, J₂ = ${plain(handAt(0.5).J2)}: h = ${plain(handAt(0.5).J2)}·e<sup>ik</sup>` }), fieldNode('B4-prodh', { label: 'product =' }), fieldNode('B4-gh', { label: 'γ =', unitText: 'π' })]),
      para('γ/2π is the position of the light inside the unit cell. Compare γ(T/2)/2π with X(T/2) in figure e.'),
      doneNote(['B4-g0', 'B4-gh'], 'At t = 0 the light of the lower band sits on the pair (A, B) of a cell. At t = T/2 it sits half a cell further, on the pair (B, next A).'),
    ],
    formula: () => code([
      `t = 0:  h = ${plain(handAt(0).J1)} at every k, so φ = 0° and u_A = −e^(−i·0°)/√2 at every k`,
      `t = T/2:  h = ${plain(handAt(0.5).J2)}·e^(ik), so φ = k and u_A = −e^(−ik)/√2 at k = 0°, 90°, 180°, 270°`,
      `⟨u_s|u_(s+1)⟩ = (u_s,A)*·u_(s+1),A + ${num(set1.uB)}·${num(set1.uB)};  at each of the two times all four overlaps are equal`,
      'product = (one overlap)⁴;  γ = −arg(product)',
    ]),
  });
  const b5 = stepBlock({
    tag: 'B5', title: 'The Zak phase over the whole cycle and the Chern number C',
    children: [
      para('The Chern number C counts how often γ goes around in one cycle. Predict first: γ/2π is the position of the light, and figure e shows how far the light moves in one cycle.'),
      rowOf([choiceNode('B5-pred', { label: 'In one cycle γ changes by' }), dynamic(el('span', { class: 'wb-pred' }), predNote('B5-pred', 'B5-C', 'a change of', 2 * B.B5.C))]),
      gate('B5-pred', [
        para('In your code: γ(t) at the 17 times t/T = 0, 1/16, …, 1, each with M = 400.'),
        rowOf([fieldNode('B5-quarter', { label: 'γ(T/4) =', unitText: 'π' })]),
        para('The function arg only gives angles between −π and π, so the values jump by 2π. Rule to follow γ without jumps: from one time to the next, take the change that is smaller than π (Python <code>np.unwrap</code>, MATLAB <code>unwrap</code>).'),
        rowOf([fieldNode('B5-C', { label: 'after the rule: C = (γ(T) − γ(0))/2π =' })]),
        doneNote(['B5-quarter', 'B5-C'], `Figure e now shows γ(t)/2π on top of X(t): the light follows the Zak phase. C = ${B.B5.C}: γ rises by ${inPi(2 * B.B5.C)}, and the light moves ${B.B5.C === 1 ? 'one unit cell' : `${B.B5.C} unit cells`} per cycle.`),
      ]),
    ],
    formula: () => code([
      'γ(t) = −arg(⟨u₁|u₂⟩· … ·⟨u_M|u₁⟩) with J₁, J₂, Δ at the time t, M = 400',
      'γ without jumps: put the 17 raw values through unwrap (Python np.unwrap, MATLAB unwrap)',
      'C = (γ at the last time − γ at the first time)/2π',
    ]),
  });
  return [conventions(false),
    para(`One cycle has the length T: ${math(cycleParts(handAt, '(2πt/T)'))}. These numbers give simple hand values. The task sheet has ${SHEET_TEXT}: the button “numbers of the sheet” shows them here, and you run them afterwards with the same code. The chain: waveguides (short: guides) A and B in turn. One guide A and the guide B next to it form a unit cell. Press Play and watch the five figures. Then calculate.`, 'wb-intro'),
    b1, b2, b3, b4, b5];
}

// ---------- tab 4: the Chern number from plaquettes ----------
function buildChern() {
  const b6 = B.B6, bVec = b6.u_kpi2_tq_times_sqrt6;
  const aNum = () => (isOk('B6-a') ? `(${whole(cx.scale(b6.u_t0[0], Math.SQRT2))}, ${whole(cx.scale(b6.u_t0[1], Math.SQRT2))})/√2` : 'a (from the field above)');
  const cNum = () => (isOk('B6-c') ? `(${whole(b6.u_kpi_tq[0])}, ${whole(b6.u_kpi_tq[1])})` : 'c (from the field above)');
  const bText = `(${whole(bVec[0])}, ${whole(bVec[1])})/√6`, pq = handAt(0.25), hq = hOf(Math.PI / 2, pq.J1, pq.J2);
  const s6 = stepBlock({
    tag: 'B6', title: 'One plaquette by hand',
    children: [
      para(`A plaquette is one small square of a grid in k and t. Take k from π/2 to π and t from 0 to T/4: the square with the thick frame in the map. Its corners in the order of the walk: ${math(['a = u(π/2, 0)', 'b = u(π/2, T/4)', 'c = u(π, T/4)', 'd = u(π, 0)'])}. Each u is the eigenvector of the lower band at this k and t.`),
      rowOf([keyCell('check 1'), el('span', { class: 'wb-given', html: `Given: b = ${bText}. Write H at k = π/2, t = T/4 and multiply.` }), fieldNode('B6-E', { label: 'H·b =', unitText: '· b' })]),
      rowOf([keyCell('check 2'), el('span', { class: 'wb-given', html: 'Calculate h at k = π, t = T/4. Then H is diagonal. Its eigenvector with the smaller eigenvalue:' }), fieldNode('B6-c', { label: 'c =' })]),
      rowOf([keyCell('from B4'), el('span', { class: 'wb-given', html: 'At t = 0 the eigenvector is the same at every k:' }), fieldNode('B6-a', { label: 'a = d =', unitText: '/√2' })]),
      rowOf([keyCell(ov('a', 'b')), fieldNode('B6-ov1', { label: '=' })]),
      rowOf([keyCell(ov('b', 'c')), fieldNode('B6-ov2', { label: '=' })]),
      rowOf([keyCell(ov('c', 'd')), fieldNode('B6-ov3', { label: '=' })]),
      rowOf([keyCell(ov('d', 'a')), fieldNode('B6-ov4', { label: '=' })]),
      rowOf([keyCell('product'), fieldNode('B6-prod', { label: '=' })]),
      rowOf([fieldNode('B6-F', { label: 'plaquette phase F = −arg(product) =', unitText: 'π' })]),
    ],
    formula: () => code([
      `k = π/2, t = T/4:  ${atTime(0.25)},  h = ${whole(hq)},  H = [[${plain(pq.D)}, ${whole(cx.conj(hq))}], [${whole(hq)}, ${plain(-pq.D)}]]`,
      `⟨a|b⟩ = a_A*·b_A + a_B*·b_B  with a = ${aNum()},  b = ${bText}`,
      `⟨b|c⟩ = b_A*·c_A + b_B*·c_B  with c = ${cNum()}`,
      '⟨c|d⟩ and ⟨d|a⟩ in the same way, d = a',
      `1/(√2·√6) = ${num(1 / Math.sqrt(12))},  1/√6 = ${num(1 / Math.sqrt(6))},  1/√2 = ${num(Math.SQRT1_2)}`,
      'F = −arg(product) = −atan2(Im, Re);  in units of π: (angle in degrees)/180',
    ]),
  });
  const colName = ['0 → T/4', 'T/4 → T/2', 'T/2 → 3T/4', '3T/4 → T'];
  const s7 = stepBlock({
    tag: 'B7', title: 'All 16 plaquettes in your code',
    children: [
      para('Grid: <span class="m">k<sub>i</sub> = 2πi/4</span> and <span class="m">t<sub>j</sub> = jT/4</span> with i, j = 0 … 3. Point 4 is point 0 again, in k and in t. Inner edges are walked once in each direction and drop out. So the four plaquettes between two times add up to the change of γ between these times. Add the four plaquettes of each t column.'),
      ...colName.map((name, j) => rowOf([keyCell(`t: ${name}`), fieldNode(`B7-col${j + 1}`, { label: 'column sum =', unitText: 'π' })])),
      rowOf([fieldNode('B7-total', { label: 'Sum of all 16:', unitText: 'π' }), fieldNode('B7-C', { label: 'C = sum/2π =' }), fieldNode('B7-C24', { label: '24 × 24 grid: C =' })]),
      para('Compare the first column sum with γ(T/4) for four k points, which your code prints in B5.', 'wb-small'),
      doneNote(['B7-total', 'B7-C'], `The sum is ${inPi(B.B7.total_over_pi)} and C = ${B.B7.C}, without the rule of B5.${Math.min(...B.B7.F_over_pi.flat()) < 0 ? ' Single plaquettes can be negative: only the sum counts.' : ''}`),
    ],
    formula: () => code([
      'plaquette(a, b, c, d) = −arg(⟨a|b⟩·⟨b|c⟩·⟨c|d⟩·⟨d|a⟩)',
      'F[i][j] = plaquette(U[i][j], U[i][j+1], U[i+1][j+1], U[i+1][j]),  U[i][j] = eigenvector at k_i, t_j,  index 4 = index 0',
      'column sum j = F[0][j] + F[1][j] + F[2][j] + F[3][j]',
      'C = (sum of all F)/2π;  type the sums divided by π',
    ]),
  });
  const rows8 = [['(a)', 'the solid cycle, <b>upper</b> band'], ['(b)', 'the solid cycle run backwards (Δ → −Δ), lower band'],
    ['(c)', `the dotted cycle, lower band: ${ASIDE_TEXT}`], ['(d)', 'the dashed cycle (numbers of the task sheet), lower band']];
  const right8 = [B.B8.upper_band, B.B8.reversed_cycle, B.B8.not_enclosing, B.B8.sheet];
  const s8 = stepBlock({
    tag: 'B8', title: 'Other bands and other cycles: predict, then calculate',
    children: [
      para('The picture shows the cycles in the plane (J₁ − J₂, Δ). The solid cycle is the pump of tab 3: you have its C for the lower band from B5 and B7. Look at each case: does the cycle go around the point (0, 0), and which way round? Predict C, then calculate it on an 8 × 8 grid.'),
      ...rows8.map(([tag, text], i) => el('div', { class: 'wb-case' }, [
        rowOf([keyCell(tag), el('span', { class: 'wb-given', html: text })]),
        rowOf([choiceNode(`B8-p${i + 1}`, { label: 'I predict C =' }), dynamic(el('span', { class: 'wb-pred' }), predNote(`B8-p${i + 1}`, `B8-c${i + 1}`, 'C =', right8[i]))]),
        gate(`B8-p${i + 1}`, [rowOf([fieldNode(`B8-c${i + 1}`, { label: 'calculated: C =' })])]),
      ])),
      para('Tab 3, figure c again: the eigenvalues of the open chain over one cycle.'),
      rowOf([choiceNode('B8-cross', { label: 'States that cross the gap at each end of the chain in one cycle:' })]),
      doneNote(['B8-cross', 'B8-c1', 'B8-c2', 'B8-c3', 'B8-c4'], `${crossing === 1 ? 'One state crosses' : `${crossing} states cross`} the gap at each end per cycle: this is |C|. The cycle that does not go around the point (0, 0) has C = ${B.B8.not_enclosing}. The direction of the cycle and the band decide the sign.`),
    ],
    formula: () => code([
      'grid of 8 × 8 eigenvectors:  k_i = 2πi/8,  t_j = jT/8;  upper band: the eigenvector of the larger eigenvalue',
      `backwards:  J₁ and J₂ as before,  Δ = −${plain(HAND.D0)}·sin(2πt/T)`,
      'C = (sum of the 64 plaquette phases)/2π',
    ]),
  });
  return [conventions(false),
    para(`Here the same Chern number comes out without following γ through the cycle. The pump is the one of tab 3: ${math(cycleParts(handAt, '(2πt/T)'))}.`, 'wb-intro'),
    s6, s7, s8];
}

export const builders = { hand: buildHand, code: buildCode, pump: buildPump, chern: buildChern };
