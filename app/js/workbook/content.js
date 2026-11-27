// The steps of the workbook: every sentence, every field with its reference value and its hints, every formula.
// Reference values come from model.js (steps()), computed when the page loads. No result of a field is typed here.
// One number of a note is typed, because its propagation is too long for the start of the page: SLOW_SHEET.
import { el } from '../ui.js';
import { steps, cx, hOf, bandStates, loopOverlaps, inGapStates, pumpParams, notEnclosingParams, HAND as HAND_SET, SHEET } from './model.js';
import { CELLS } from './pump.js';
import { field, choice, fieldNode, choiceNode, stepBlock, para, rowOf, keyCell, gate, dynamic, doneNote, isOk, allOk, chosen, get } from './fields.js';

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
const handAt = (s) => pumpParams(s, HAND_SET.dJ, HAND_SET.D0);
const SHEET_TEXT = cycleText((s) => pumpParams(s, SHEET.dJ, SHEET.D0), '(2πt/T)'), ASIDE_TEXT = cycleText(notEnclosingParams, '(2πt/T)');
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
  upperHand: 'E > 0: this is the upper band. The lower band is E = −|h|.',
  upperCode: 'E > 0: this is the upper band. Take the eigenvector with the smallest eigenvalue. In Python use eigh, not eig.',
  eigenvalue: 'right size, wrong sign. Multiply H with b again, row by row: the first row is Δ·b_A + h*·b_B. Each row gives the same number times b.',
  upperVector: 'this is the eigenvector of the upper band, the one with the larger eigenvalue. Take the smaller eigenvalue.',
  notNormal: 'the eigenvector must have length 1: divide by √2.',
  phase: 'the product has changed, so a phase factor did not cancel. Check the complex conjugate (the i of the left vector becomes −i) and the overlap that closes the loop.',
  noConj: 'the sign is wrong. Check the complex conjugate of the left vector: without it the product has this sign.',
  noConjCode: 'the sign is wrong. Check the complex conjugate of the left vector in the overlap: np.vdot(u, v) in Python, u\'*v in MATLAB.',
  sign: 'right size, wrong sign. One of: +arg in place of −arg; the upper band; e^(−ik) in h; −Δ on guide A.',
  unwrap: 'C = 0: the jumps of 2π are still in γ. Use unwrap before you take γ(T) − γ(0).',
  total: '0: you took arg of the total product, or you added both bands. Take −arg of every single plaquette and add them all.',
  coarse: 'The numbers of the task sheet on a 3 × 3 grid give C = 0; three k points give a zero overlap for J₁ = 1, J₂ = 2 → use 4 points or more, an even number. Here: the 8 × 8 grid. If you used it: you took arg of the total product, or you added both bands.',
  swapped: '0 and π are swapped. One of: the complex conjugate is missing (then the product has the wrong sign); your unit cell holds the J₂ pair. Here J₁ couples A and B inside the unit cell.',
  cell: '0 and π are swapped: your unit cell holds the J₂ pair. Here J₁ couples A and B inside the unit cell.',
  norm: 'the sum of |ψ|² leaves 1: the step dt is too large, or H is not symmetric.',
  upperInput: 'the light moves to lower cell numbers. One of: the input is the upper band (the lower band at t = 0 is (A − B)/√2; with −J in your matrix it is (A + B)/√2); −Δ on guide A; the cycle runs backwards.',
  oneGuide: 'the light hardly moves: this is one guide alone as input. It excites both bands, and they move in opposite directions. Use (A − B)/√2.',
  fourPoints: 'this is the value for four k points. A value that is not 0 or π needs many points: use M = 400.',
  plusArg: 'this is +arg. The field asks for −arg: the same number with the opposite sign.',
  walk: 'right size, wrong sign: +arg in place of −arg, or the square is walked the other way round. Walk a → b → c → d → a.',
  walkProduct: 'this is the complex conjugate of the product. One of: the square is walked the other way round; the star stands on the right vector. Walk a → b → c → d → a.',
  walkCode: 'right size, wrong sign. One of: +arg in place of −arg; the square walked the other way round; the upper band; e^(−ik) in h; −Δ on guide A.',
  alongT: 'you added along t. Add the four plaquettes that lie between the same two times.',
  positive: 'type the positive number: the field stands behind ±.',
  halfGap: 'this is E. The gap is the distance between the two bands: 2E.',
  overTwoPi: 'this is γ/2π. Type γ/π.',
  gammaHand: 'not this value. Divide the sum of the four −arg, in degrees, by 180.',
  gammaProduct: 'not this value. γ = −arg(product): minus the angle of the product, divided by π.',
  fProduct: 'not this value. F = −arg(product): minus the angle of the product, divided by π.',
  asTyped: 'right size, wrong sign: take a and c exactly as you typed them above.',
  lengthA: 'right direction, wrong length. The factor 1/√2 is printed behind the field: type the two numbers in front of it.',
};

// ---------- fields ----------
const set1 = S.A.set1, set2 = S.A.set2, A7 = S.A.A7, B = S.B;
// Tolerances. Code fields: four typed decimals. Hand fields without an entry here: 0.006, a number rounded to two decimals.
// Hand fields that follow from numbers typed before are wider, so that a student who goes on with every number rounded
// to two decimals (also 1/√2 = 0.71) is still right: tools/test_zak_chern.mjs runs such students through all hand fields.
const CODE = 2e-4, SHIFT = 5e-4;                  // code fields; the shift per cycle
const DEG = 0.06;                                 // φ in degrees, from the exact h
const HAND = 0.012, PROD6 = 0.015, PROD0 = 0.045;  // u_A, overlaps, lengths, products; the product of B6; the product of B4 at t = 0
                                                  // (four overlaps of 2·0.71² = 1.0082 give 1.03 or 1.04 for the exact 1)
const ANG = 0.8, SUM = 1.5, ANG5 = 0.4, SUM5 = 0.75, GAMMA = 0.012;    // −arg of an overlap in degrees and their sum, A2/A3 and A5; γ of A3 in units of π
// The shift per cycle with the numbers of the task sheet in a slow cycle, for the note of B3: propagate(δJ, Δ₀, T, cells, dt)
// of model.js with dt = 0.05 gives 0.952125. tools/test_zak_chern.mjs computes it again and compares.
export const SLOW_SHEET = { T: 400, cells: 800, shift: 0.9521 };

function defineHand() {
  const tab = 'hand';
  for (let s = 2; s <= 4; s++) {
    const i = s - 1, at = `at k = ${K_NAME[i]}`;
    field({ id: `A1-h${s}`, tab, kind: 'complex', ref: set1.h[i], otherPhase: false, aria: `h ${at}` });
    field({ id: `A1-phi${s}`, tab, kind: 'angle', unit: 'deg', tol: DEG, ref: set1.phi_deg[i], aria: `angle phi of h ${at}, in degrees` });
    field({ id: `A1-E${s}`, tab, ref: set1.E[i], wrong: [{ value: -set1.E[i], hint: HINT.upperHand }], aria: `eigenvalue E of the lower band ${at}` });
    field({ id: `A1-uA${s}`, tab, kind: 'complex', tol: HAND, ref: set1.uA[i], otherPhase: false, wrong: [{ value: cx.scale(set1.uA[i], Math.SQRT2), hint: HINT.notNormal }], aria: `A component of the eigenvector ${at}` });
  }
  field({ id: 'A1-wind', tab, kind: 'integer', ref: set1.winding, aria: 'how often h goes around the origin, J1 = 1, J2 = 2', hint: 'not this number. Follow the solid circle once around and watch the origin.' });
  for (let s = 1; s <= 4; s++) {
    const i = s - 1, name = `overlap of u${s} with u${s % 4 + 1}`, o = set1.ov[i];
    field({ id: `A2-ov${s}`, tab, kind: 'complex', tol: HAND, ref: o, wrong: [{ value: conjOf(o), hint: HINT.conj }], aria: name });
    field({ id: `A2-len${s}`, tab, tol: HAND, ref: set1.ov_len[i], aria: `length of the ${name}` });
    field({ id: `A2-ang${s}`, tab, kind: 'angle', unit: 'deg', tol: ANG, ref: set1.ov_angle_deg[i], wrong: [{ value: -set1.ov_angle_deg[i], hint: HINT.plusArg }], aria: `minus arg of the ${name}, in degrees` });
  }
  choice({ id: 'A3-pred', tab, options: [{ value: 0, label: '0' }, { value: 0.5, label: 'π/2' }, { value: 1, label: 'π' }], lock: 'A3-gamma', aria: 'your prediction of the Zak phase' });
  field({ id: 'A3-len', tab, tol: HAND, ref: set1.prod_len, aria: 'product of the four lengths' });
  field({ id: 'A3-sum', tab, kind: 'value', unit: 'deg', tol: SUM, ref: set1.angle_sum_deg, aria: 'sum of the four values of minus arg, in degrees' });
  field({ id: 'A3-prod', tab, kind: 'complex', tol: HAND, ref: set1.prod, otherPhase: false, wrong: [{ value: set1.open_prod, hint: HINT.open }, { value: neg(set1.prod), hint: `${HINT.noConj} It changes ⟨u₂|u₃⟩ and ⟨u₄|u₁⟩.` }], aria: 'product of the four overlaps' });
  field({ id: 'A3-gamma', tab, kind: 'angle', unit: 'pi', tol: GAMMA, ref: set1.gamma_over_pi, hint: HINT.gammaHand, wrong: [{ value: 0, hint: HINT.swapped }], aria: 'Zak phase gamma in units of pi, J1 = 1, J2 = 2' });
  // A4: the phase factor is prescribed (i·u₂), so a wrong overlap with the right length is a mistake, not another phase
  field({ id: 'A4-ov1', tab, kind: 'complex', tol: HAND, ref: set1.A4.ov12, otherPhase: false, wrong: [
    { value: set1.ov[0], hint: 'this is ⟨u₁|u₂⟩ of A2: the factor i is missing. Multiply it by i.' },
    { value: neg(set1.A4.ov12), hint: 'this is −i·⟨u₁|u₂⟩. Here i stands in the right vector and stays i. Only the left vector gets the star.' }], aria: 'overlap of u1 with i times u2' });
  field({ id: 'A4-ov2', tab, kind: 'complex', tol: HAND, ref: set1.A4.ov23, otherPhase: false, wrong: [
    { value: neg(set1.A4.ov23), hint: 'this is +i·⟨u₂|u₃⟩. Here i stands in the left vector: the star turns it into −i.' },
    { value: set1.ov[1], hint: 'this is ⟨u₂|u₃⟩ of A2: the factor is missing. The i of the left vector becomes −i: multiply by −i.' }], aria: 'overlap of i times u2 with u3' });
  field({ id: 'A4-prod', tab, kind: 'complex', tol: HAND, ref: set1.A4.prod, otherPhase: false, wrong: [{ value: neg(set1.A4.prod), hint: HINT.phase }, { value: set1.open_prod, hint: HINT.open }], aria: 'product of the four overlaps with u2 times i' });
  field({ id: 'A5-wind', tab, kind: 'integer', ref: set2.winding, aria: 'how often h goes around the origin, J1 = 2, J2 = 1', hint: 'not this number. Follow the dashed circle once around and watch the origin.' });
  for (let s = 1; s <= 4; s++) field({ id: `A5-ang${s}`, tab, kind: 'angle', unit: 'deg', tol: ANG5, ref: set2.ov_angle_deg[s - 1], wrong: [{ value: -set2.ov_angle_deg[s - 1], hint: HINT.plusArg }], aria: `minus arg of the overlap of u${s} with u${s % 4 + 1}, J1 = 2, J2 = 1, in degrees` });
  field({ id: 'A5-sum', tab, kind: 'value', unit: 'deg', tol: SUM5, ref: set2.angle_sum_deg, aria: 'sum of the four values of minus arg, J1 = 2, J2 = 1, in degrees' });
  field({ id: 'A5-gamma', tab, kind: 'angle', unit: 'pi', ref: set2.gamma_over_pi, hint: HINT.gammaHand, wrong: [{ value: 1, hint: HINT.cell }], aria: 'Zak phase gamma in units of pi, J1 = 2, J2 = 1' });
}

function defineCode() {
  const tab = 'code', code = true, zak = (id, ref, aria, wrong = []) => field({ id, tab, kind: 'angle', unit: 'pi', tol: CODE, ref, code, aria, wrong: [{ value: -ref, hint: HINT.sign }, ...wrong] });
  field({ id: 'A6-E', tab, tol: CODE, ref: set1.E[0], code, wrong: [{ value: -set1.E[0], hint: HINT.upperCode }], aria: 'eigenvalue of your eigenvector at k = 0' });
  field({ id: 'A6-prod4', tab, kind: 'complex', tol: CODE, ref: set1.prod, otherPhase: false, code, wrong: [{ value: set1.open_prod, hint: HINT.open }, { value: neg(set1.prod), hint: HINT.noConjCode }], aria: 'product of the four overlaps, eigenvectors from the computer' });
  field({ id: 'A6-prodrand', tab, kind: 'complex', tol: CODE, ref: set1.prod, otherPhase: false, code, hint: HINT.phase, wrong: [{ value: set1.open_prod, hint: HINT.open }], aria: 'product of the four overlaps with random phase factors' });
  field({ id: 'A6-prod100', tab, kind: 'complex', tol: CODE, ref: set1.prod_M100, otherPhase: false, code, aria: 'product of the overlaps with 100 k points' });
  field({ id: 'A6-gamma100', tab, kind: 'angle', unit: 'pi', tol: CODE, ref: set1.gamma_M100_over_pi, code, wrong: [{ value: 0, hint: HINT.cell }], aria: 'Zak phase with 100 k points, in units of pi' });
  zak('A7-exact', A7.exact.gamma_over_pi_M400, 'Zak phase for J1 = 0, J2 = 4, Delta = 3, in units of pi', [{ value: A7.exact.gamma_over_pi_M4, hint: HINT.fourPoints }]);
  field({ id: 'A7-wA', tab, tol: CODE, ref: A7.exact.weight_A, code, aria: 'light of the lower band on guide A' });
  zak('A7-s1-M4', A7.set1.M4_over_pi, 'Zak phase for J1 = 1, J2 = 2, Delta = 0.5 with 4 k points, in units of pi');
  zak('A7-s1-M100', A7.set1.M100_over_pi, 'Zak phase for J1 = 1, J2 = 2, Delta = 0.5 with 100 k points, in units of pi', [{ value: A7.set1.M4_over_pi, hint: HINT.fourPoints }]);
  zak('A7-s1-M400', A7.set1.M400_over_pi, 'Zak phase for J1 = 1, J2 = 2, Delta = 0.5 with 400 k points, in units of pi', [{ value: A7.set1.M4_over_pi, hint: HINT.fourPoints }]);
  zak('A7-s2-M400', A7.set2.M400_over_pi, 'Zak phase for J1 = 2, J2 = 1, Delta = 0.5 with 400 k points, in units of pi', [{ value: A7.set2.M4_over_pi, hint: HINT.fourPoints }]);
}

function definePump() {
  const tab = 'pump', code = true, low = B.B2.t0375.ingap[0], up = B.B2.t0375.ingap[1], st = B.B3.start;
  ['k = 0', 'k = π/2', 'k = π'].forEach((name, i) => field({ id: `B1-E${i}`, tab, ref: B.B1.E.tq[i], wrong: [{ value: -B.B1.E.tq[i], hint: HINT.positive }], aria: `band energy at t = T/4 and ${name}` }));
  field({ id: 'B1-gap', tab, tol: CODE, ref: B.B1.gap_min, code, wrong: [{ value: B.B1.gap_min / 2, hint: HINT.halfGap }], aria: 'smallest gap between the two bands' });
  field({ id: 'B1-gapsheet', tab, tol: CODE, ref: B.B1.gap_min_sheet, code, wrong: [{ value: B.B1.gap_min_sheet / 2, hint: HINT.halfGap }], aria: 'smallest gap with the numbers of the task sheet' });
  field({ id: 'B2-Elow', tab, tol: CODE, ref: low.E, code, aria: 'the lower of the two eigenvalues in the gap at t = 3T/8' });
  field({ id: 'B2-Eup', tab, tol: CODE, ref: up.E, code, aria: 'the upper of the two eigenvalues in the gap at t = 3T/8' });
  choice({ id: 'B2-end', tab, options: [{ value: 'left', label: 'left end' }, { value: 'right', label: 'right end' }], right: up.end, hint: 'not this end. Plot |ψ|² of the eigenvector over the guide number.', aria: 'the end of the chain where the state with the upper eigenvalue sits' });
  choice({ id: 'B2-guide', tab, options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }], right: up.weight_A > 0.5 ? 'A' : 'B', hint: 'not these guides. The guides A are the first, third, fifth, … guide of the chain.', aria: 'the guides that carry the state with the upper eigenvalue' });
  field({ id: 'B3-norm', tab, tol: CODE, ref: B.B3.norm_T20, code, hint: HINT.norm, aria: 'sum of |psi|^2 after one cycle, T = 20' });
  for (const T of [20, 50, 100]) field({ id: `B3-T${T}`, tab, tol: SHIFT, ref: st.shift[`T${T}`], code, wrong: [{ value: st.one_guide[`T${T}`], hint: HINT.oneGuide }, { value: st.upper_band[`T${T}`], hint: HINT.upperInput }], aria: `shift per cycle for T = ${T}` });
  field({ id: 'B3-guide', tab, tol: SHIFT, ref: st.one_guide.T50, code, aria: 'shift per cycle with one guide alone as input, T = 50' });
  field({ id: 'B3-sheet', tab, tol: SHIFT, ref: st.sheet_T20_pair, code, aria: 'shift per cycle with the numbers of the task sheet, T = 20' });
  const half = pumpParams(0.5, HAND_SET.dJ, HAND_SET.D0), openHalf = loopOverlaps(bandStates(half.J1, half.J2, half.D, 4)).slice(0, 3).reduce((p, z) => cx.mul(p, z), cx.of(1));
  field({ id: 'B4-prod0', tab, kind: 'complex', tol: PROD0, ref: B.B4.t0.prod, otherPhase: false, aria: 'product of the four overlaps at t = 0' });
  field({ id: 'B4-g0', tab, kind: 'angle', unit: 'pi', ref: B.B4.t0.gamma_over_pi, hint: HINT.gammaProduct, wrong: [{ value: 1, hint: HINT.cell }], aria: 'Zak phase at t = 0, in units of pi' });
  field({ id: 'B4-prodh', tab, kind: 'complex', tol: HAND, ref: B.B4.thalf.prod, otherPhase: false, wrong: [{ value: openHalf, hint: HINT.open }, { value: neg(B.B4.thalf.prod), hint: HINT.noConj }], aria: 'product of the four overlaps at t = T/2' });
  field({ id: 'B4-gh', tab, kind: 'angle', unit: 'pi', ref: B.B4.thalf.gamma_over_pi, hint: HINT.gammaProduct, wrong: [{ value: 0, hint: HINT.swapped }], aria: 'Zak phase at t = T/2, in units of pi' });
  choice({ id: 'B5-pred', tab, options: [{ value: 0, label: '0' }, { value: 1, label: 'π' }, { value: 2, label: '2π' }], lock: 'B5-C', aria: 'your prediction: change of gamma in one cycle' });
  field({ id: 'B5-quarter', tab, kind: 'angle', unit: 'pi', tol: CODE, ref: B.B5.quarter_M400_over_pi, code, wrong: [{ value: -B.B5.quarter_M400_over_pi, hint: HINT.sign }, { value: B.B5.quarter_M4_over_pi, hint: HINT.fourPoints }, { value: B.B5.quarter_M400_over_pi / 2, hint: HINT.overTwoPi }], aria: 'Zak phase at t = T/4 with 400 k points, in units of pi' });
  field({ id: 'B5-C', tab, kind: 'integer', ref: B.B5.C, code, wrong: [{ value: B.B5.C_without_unwrap, hint: HINT.unwrap }, { value: -B.B5.C, hint: HINT.sign }], aria: 'Chern number C from gamma at the end minus gamma at the start' });
}

const crossing = inGapStates(0.5, HAND_SET.dJ, HAND_SET.D0, B.B2.cells).states.filter((s) => s.end === 'left').length;   // states in the gap at the left end at t = T/2
// B6: the student types a and c. An eigenvector times −1 is the same eigenvector, so both signs are right, and the four
// overlaps are checked for the vectors as they were typed: +1 or −1, read from the two fields (+1 while a field is not right).
const signOf = (id, ref) => { const f = get(id); return f.state === 'ok' && f.typed.reduce((sum, z, i) => sum + z.re * ref[i].re + z.im * ref[i].im, 0) < 0 ? -1 : 1; };
function defineChern() {
  const tab = 'chern', code = true, b6 = B.B6, b7 = B.B7, one = cx.of(1), zero = cx.of(0), r = Math.SQRT1_2;
  field({ id: 'B6-E', tab, ref: b6.E_kpi2_tq, wrong: [{ value: -b6.E_kpi2_tq, hint: HINT.eigenvalue }], aria: 'eigenvalue of b: H times b is this number times b' });
  field({ id: 'B6-c', tab, kind: 'vector', ref: b6.u_kpi_tq, length: 1, wrong: [{ value: [one, zero], hint: HINT.upperVector }], partNames: ['A component', 'B component'], aria: 'eigenvector c at k = pi, t = T/4' });
  field({ id: 'B6-a', tab, kind: 'vector', ref: b6.u_t0, length: Math.SQRT2, lengthHint: HINT.lengthA, wrong: [{ value: [cx.of(r), cx.of(r)], hint: HINT.upperVector }], partNames: ['A component', 'B component'], aria: 'eigenvector a = d at t = 0, times the square root of 2' });
  const sa = () => signOf('B6-a', b6.u_t0), sc = () => signOf('B6-c', b6.u_kpi_tq), signs = [sa, sc, () => sa() * sc(), () => 1];      // ⟨a|b⟩, ⟨b|c⟩, ⟨c|d⟩ with d = a, ⟨d|a⟩
  ['a with b', 'b with c', 'c with d', 'd with a'].forEach((name, i) => {
    const o = () => cx.scale(b6.ov[i], signs[i]());
    field({ id: `B6-ov${i + 1}`, tab, kind: 'complex', tol: HAND, ref: o, otherPhase: false, after: ['B6-c', 'B6-a'],
      wrong: () => [...(Math.abs(b6.ov[i].im) > 1e-9 ? [{ value: conjOf(o()), hint: HINT.conj }] : []), ...(i < 3 ? [{ value: neg(o()), hint: HINT.asTyped }] : [])], aria: `overlap of ${name}` });
  });
  field({ id: 'B6-prod', tab, kind: 'complex', tol: PROD6, ref: b6.prod, otherPhase: false, wrong: [{ value: conjOf(b6.prod), hint: HINT.walkProduct }], aria: 'product of the four overlaps around the plaquette' });
  field({ id: 'B6-F', tab, kind: 'value', unit: 'pi', ref: b6.F_over_pi, hint: HINT.fProduct, wrong: [{ value: -b6.F_over_pi, hint: HINT.walk }], aria: 'plaquette phase F in units of pi' });
  const rowSums = b7.F_over_pi.map((row) => row.reduce((x, y) => x + y, 0));        // the mistake "added along t": one sum per k
  ['0 to T/4', 'T/4 to T/2', 'T/2 to 3T/4', '3T/4 to T'].forEach((name, j) => field({ id: `B7-col${j + 1}`, tab, kind: 'value', unit: 'pi', tol: CODE, ref: b7.col_sums_over_pi[j], code,
    wrong: [{ value: -b7.col_sums_over_pi[j], hint: HINT.walkCode }, ...[...new Set(rowSums.map((x) => +x.toFixed(6)))].map((value) => ({ value, hint: HINT.alongT }))], aria: `sum of the four plaquettes of the column t from ${name}, in units of pi` }));
  field({ id: 'B7-total', tab, kind: 'value', unit: 'pi', tol: CODE, ref: b7.total_over_pi, code, wrong: [{ value: 0, hint: HINT.total }, { value: -b7.total_over_pi, hint: HINT.walkCode }], aria: 'sum of all 16 plaquette phases, in units of pi' });
  field({ id: 'B7-C', tab, kind: 'integer', ref: b7.C, code, wrong: [{ value: 0, hint: HINT.total }, { value: -b7.C, hint: HINT.walkCode }], aria: 'Chern number from the 4 by 4 grid' });
  field({ id: 'B7-C24', tab, kind: 'integer', ref: b7.C_24, code, wrong: [{ value: 0, hint: HINT.total }, { value: -b7.C_24, hint: HINT.walkCode }], aria: 'Chern number from the 24 by 24 grid' });
  const b8 = [['upper band of pump (solid cycle)', B.B8.upper_band, []], ['pump_back (solid cycle backwards), lower band', B.B8.reversed_cycle, []], ['pump_aside (dotted cycle), lower band', B.B8.not_enclosing, []],
    ['pump_sheet with the numbers of the task sheet (dashed cycle), lower band', B.B8.sheet, b7.C_sheet_3_wrong !== B.B8.sheet ? [{ value: b7.C_sheet_3_wrong, hint: HINT.coarse }] : []]];
  b8.forEach(([name, ref, wrong], i) => {
    choice({ id: `B8-p${i + 1}`, tab, options: [{ value: -1, key: 'm1', label: '−1' }, { value: 0, label: '0' }, { value: 1, label: '+1' }], lock: `B8-c${i + 1}`, aria: `your prediction of the Chern number: ${name}` });
    field({ id: `B8-c${i + 1}`, tab, kind: 'integer', ref, code, wrong, aria: `calculated Chern number: ${name}` });
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
    'The couplings are written +J, as in the hands-on code. The lecture prints the matrix with −J. The same for both: all overlaps, products, γ, plaquette phases, C. Different: the second component of u changes sign, so with −J the lower band of the pump at t = 0 is (A + B)/√2 in place of (A − B)/√2.',
    'Lower band = the smallest eigenvalue.',
    '<span class="m">k<sub>s</sub> = 2π(s − 1)/M</span>, s = 1 … M. The point 2π is the point 0 and is not repeated. The loop closes with ⟨u<sub>M</sub>|u₁⟩.',
    'By hand, for Δ = 0: <span class="m">E = −|h|</span> and <span class="m">u = (u<sub>A</sub>, u<sub>B</sub>) = (−e<sup>−iφ</sup>, 1)/√2</span>, with φ = angle of h. Another phase factor gives other single overlaps and the same product.',
    'arg is the angle of a complex number in the complex plane. Zak phase: <span class="m">γ = −arg(⟨u₁|u₂⟩⟨u₂|u₃⟩ … ⟨u<sub>M</sub>|u₁⟩)</span>, minus the angle of the product. The angles −π and π are the same. 0 and π swap if the unit cell is chosen with the J₂ pair inside: a choice, not a mistake. Here: J₁ inside.',
    'Plaquette (one small square of a grid in k and t): the same −arg, walked (k, t) → (k, next t) → (next k, next t) → (next k, t) → back: the plaquette phase F. <span class="m">C = (sum of all plaquette phases)/2π</span>.',
    'Position of the light: <span class="m">X = Σ<sub>m</sub> m·(I<sub>A,m</sub> + I<sub>B,m</sub>)</span>. I<sub>A,m</sub> is the light |ψ|² on guide A of cell m. The cells are counted from the cell where the light starts, so X(0) = 0.',
    'Calculate with four decimals. By hand, type two or more; from your code type four. Angles in degrees by hand: two decimals. γ and plaquette phases: in units of π.',
    'Typing: decimal point or comma, a fraction such as 3/8, a multiple of π such as pi/2. A field with π behind it is in units of π: type the number divided by π, between −2 and 2. A field is checked when you press Enter or leave it. An empty field is not a wrong try.',
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
      para('Check each row on paper: multiply <span class="m">H(k) = [[0, h*], [h, 0]]</span> with <span class="m">u = (u<sub>A</sub>, u<sub>B</sub>)</span> and compare with E·u.'),
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
      para(`The first one, written out: <span class="m">${ov('u₁', 'u₂')} = u<sub>1,A</sub>*·u<sub>2,A</sub> + u<sub>1,B</sub>*·u<sub>2,B</sub></span> <span class="m">= (${num(set1.uA[0].re)})*·u<sub>2,A</sub> + ${num(set1.uB)}·${num(set1.uB)}</span>, with your u<sub>A</sub> of the row k₂. Calculate with four decimals: “show the formula” prints u<sub>A</sub> of every row that is right.`),
      para('For each overlap write its value, its length <span class="m">√(Re² + Im²)</span> and −arg: minus the angle of the complex number.'),
      ...[1, 2, 3, 4].map((s) => rowOf([keyCell(ov(u(s), u(s % 4 + 1)) + (s === 4 ? '<small>closes the loop</small>' : '')),
        fieldNode(`A2-ov${s}`, { label: '=' }), fieldNode(`A2-len${s}`, { label: 'length' }), fieldNode(`A2-ang${s}`, { label: '−arg =', unitText: '°' })])),
      para('Compare each −arg with the step of φ in A1: φ₂ − φ₁, φ₃ − φ₂, φ₄ − φ₃, φ₁ − φ₄. Add or subtract 360° until the step lies between −180° and 180°. Write on the worksheet what you find.'),
    ],
    formula: () => code([
      ...[1, 2, 3, 4].map((s) => `${ov(u(s), u(s % 4 + 1))} = ${uA(s)}*·${uA(s % 4 + 1)} + ${num(set1.uB)}·${num(set1.uB)}`),
      '(a + b·i)* = a − b·i',
      'length = √(Re² + Im²)        −arg = −atan2(Im, Re)',
    ]) + ([2, 3, 4].every((s) => isOk(`A1-uA${s}`)) ? '' : '<span class="note">A missing number appears here when its row of A1 is right.</span>'),
  });

  const lens = () => ([1, 2, 3, 4].every((s) => isOk(`A2-len${s}`)) ? set1.ov_len.map((x) => num(x)).join(' · ') : 'the four lengths of A2, multiplied');
  const angs = () => ([1, 2, 3, 4].every((s) => isOk(`A2-ang${s}`)) ? set1.ov_angle_deg.map((x) => `${num(x, 2)}°`).join(' + ') : 'the four values of −arg of A2, added');
  const a3 = stepBlock({
    tag: 'A3', title: 'The product of the overlaps and the Zak phase γ',
    children: [
      para('The Zak phase is the Berry phase of this loop through all k: <span class="m">γ = −arg(product of the four overlaps)</span>, minus the angle of the product. A product of complex numbers multiplies the lengths and adds the angles. Predict first: use the picture of A1 and your values of −arg in A2.'),
      rowOf([choiceNode('A3-pred', { label: 'I predict γ =' }), dynamic(el('span', { class: 'wb-pred' }), predNote('A3-pred', 'A3-gamma', 'γ =', set1.gamma_over_pi))]),
      gate('A3-pred', [
        rowOf([fieldNode('A3-len', { label: 'Multiply the four lengths:' }), fieldNode('A3-sum', { label: 'Add the four values of −arg:', unitText: '°' })]),
        rowOf([fieldNode('A3-prod', { label: 'product =' })]),
        rowOf([fieldNode('A3-gamma', { label: 'γ = −arg(product) =', unitText: 'π' })]),
        // nothing here names a value of γ before the field is right: −π is accepted, and the remark about it comes afterwards
        dynamic(el('p', { class: 'wb-small' }), () => (isOk('A3-gamma') ? 'A calculator may give −π: the same angle.' : null)),
        doneNote(['A3-gamma', 'A1-wind'], `h goes around the origin ${howOften(set1.winding)}, and γ = ${inPi(set1.gamma_over_pi)}: γ is half of the full turn of φ. Compare with Exercise 3, tabs 2 and 3.`),
      ]),
    ],
    formula: () => code([
      `length of the product = ${lens()}`,
      `sum of the four −arg = ${angs()}`,
      'product = length·e^(−i·sum) = length·(cos(sum) − i·sin(sum))',
      'γ = −arg(product) = −atan2(Im, Re);  γ in units of π = (−arg in degrees)/180',
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
      para(`Now J₁ = ${set2.J1}, J₂ = ${set2.J2}: the dashed circle in the picture. The same four k. Only −arg of each overlap is needed. Use what you found in A2.`),
      rowOf([fieldNode('A5-wind', { label: 'How often does h(k) go around the origin now?', unitText: 'times' })]),
      ...[1, 2, 3, 4].map((s) => rowOf([keyCell(ov(u(s), u(s % 4 + 1))), fieldNode(`A5-ang${s}`, { label: '−arg =', unitText: '°' })])),
      rowOf([fieldNode('A5-sum', { label: 'Sum of the four −arg:', unitText: '°' }), fieldNode('A5-gamma', { label: 'γ =', unitText: 'π' })]),
      doneNote(['A5-gamma', 'A5-wind', 'A3-gamma'], `The origin is outside the dashed circle: φ goes back and forth, and γ = ${inPi(set2.gamma_over_pi)}. With the origin inside the solid circle, γ = ${inPi(set1.gamma_over_pi)}.`),
    ],
    formula: () => code([
      `h(k_s) = ${set2.J1} + ${set2.J2}·(cos k_s + i·sin k_s),  k_s = 0°, 90°, 180°, 270°`,
      `φ_s = atan2(Im h, Re h);  u_A = −e^(−iφ)/√2, u_B = ${num(set2.uB)}`,
      `−arg${ov('u_s', 'u_(s+1)')} = −arg( (u_s,A)*·u_(s+1),A + ${num(set2.uB)}·${num(set2.uB)} )`,
      'γ = sum of the four −arg;  in units of π: (sum in degrees)/180',
    ]),
  });
  return [conventions(false), a1, a2, a3, a4, a5];
}

// ---------- tab 2: Zak phase, your code ----------
function buildCode() {
  const a6 = stepBlock({
    tag: 'A6', title: 'Eigenvectors from the computer',
    children: [
      para(`J₁ = ${set1.J1}, J₂ = ${set1.J2}, Δ = 0. M is the number of k points: M = 4 gives the same four k as by hand. Now the eigenvectors of the lower band come from <code>eigh</code> (Python) or <code>eig</code> (MATLAB): TODO A6 <code>eigenvector</code> in the file. The computer gives every eigenvector its own phase factor.`),
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
      para('The on-site term Δ changes the propagation constant of the waveguides (short: guides): +Δ on every guide A, −Δ on every guide B. Now γ is no longer 0 or π: γ/2π is the position of the light of this band inside the unit cell. In the file: TODO A7 <code>zak_ssh</code>.'),
      rowOf([keyCell('(a) test, M = 400'), el('span', { class: 'wb-given', html: `J₁ = ${A7.exact.J1}, J₂ = ${A7.exact.J2}, Δ = ${A7.exact.D}` }), fieldNode('A7-exact', { label: 'γ =', unitText: 'π' }),
        fieldNode('A7-wA', { label: 'light of the lower band on guide A, |u<sub>A</sub>|² at any k:' })]),
      doneNote(['A7-exact', 'A7-wA'], 'γ/2π = |u<sub>A</sub>|². With J₁ = 0 the light sits on one pair: guide B of cell m and guide A of cell m + 1. The share on A counts for cell m + 1, so X = m + |u<sub>A</sub>|².'),
      rowOf([keyCell(`(b) Δ = ${A7.set1.D}`), el('span', { class: 'wb-given', html: `J₁ = ${set1.J1}, J₂ = ${set1.J2}` }), fieldNode('A7-s1-M4', { label: 'M = 4: γ =', unitText: 'π' }),
        fieldNode('A7-s1-M100', { label: 'M = 100: γ =', unitText: 'π' }), fieldNode('A7-s1-M400', { label: 'M = 400: γ =', unitText: 'π' })]),
      rowOf([keyCell(`(c) Δ = ${A7.set2.D}`), el('span', { class: 'wb-given', html: `J₁ = ${set2.J1}, J₂ = ${set2.J2}` }), fieldNode('A7-s2-M400', { label: 'M = 400: γ =', unitText: 'π' })]),
      doneNote(['A7-s1-M4', 'A7-s1-M400'], 'Four points are not enough here: a value that is not 0 or π needs many k points.'),
      para('This step tests the sign and the band. A3 to A6 cannot: without on-site term the Zak phase is 0 or π, and each of them is the same angle with the opposite sign.', 'wb-small'),
    ],
    formula: () => code([
      'H(k) = [[Δ, conj(h)], [h, −Δ]],  h = J₁ + J₂·e^(ik),  k_s = 2π(s − 1)/M',
      'γ = −arg(⟨u₁|u₂⟩·⟨u₂|u₃⟩· … ·⟨u_M|u₁⟩) with the eigenvectors of the smallest eigenvalue;  type γ/π',
      '|u_A|² = squared length of the first component of the eigenvector u',
    ]),
  });
  return [conventions(false), downloads(),
    para('Your code repeats tab 1 and then goes on. Put the two Python files (or the two MATLAB files) into one folder and run zak_chern.py (or zak_chern.m). It stops at the first open step. Write the line marked TODO there and run again. The steps of this tab in the file: TODO A1 <code>h</code>, TODO A2 <code>overlap</code>, TODO A3 <code>loop_product</code> and <code>zak</code>, TODO A6 <code>eigenvector</code>, TODO A7 <code>zak_ssh</code>. For the hand steps A1 to A5 the code prints no numbers: it says that your function is right and reproduces the hand step. Check your own numbers on tab 1. The first numbers that the code prints are those of A6: type them here with four decimals.', 'wb-intro'),
    a6, a7];
}

// ---------- tab 3: the Thouless pump ----------
function buildPump() {
  // the two states in the gap, in words, read from the model: which end has +Δ(t), and which way each one crosses the gap
  const g = B.B2.t0375.ingap, later = B.B2.t0625.ingap, upEnd = g[1].end, lowEnd = g[0].end, upLater = later.find((x) => x.end === upEnd).E;
  const st = B.B3.start, sheetAt0 = pumpParams(0, SHEET.dJ, SHEET.D0);
  const b2Note = `The state at the ${upEnd} end has the eigenvalue +Δ(t), the state at the ${lowEnd} end −Δ(t).`
    + (g[1].E > 0 && upLater < 0 ? ` In one cycle the ${upEnd} one crosses the gap from the upper to the lower band, the ${lowEnd} one the other way.` : '');
  const b1 = stepBlock({
    tag: 'B1', title: 'The two bands over k and t (task 9a)',
    children: [
      para('The two bands are <span class="m">E = ±√(Δ² + |h|²)</span>. Calculate E by hand at t = T/4 for k = 0, π/2 and π. The row for t = 0 is worked.'),
      rowOf([keyCell('t = 0'), el('span', { class: 'wb-given', html: `${atTime(0)}, so h = ${whole(hOf(0, handAt(0).J1, handAt(0).J2))} at every k: E = ±${num(B.B1.E.t0[0])}, ±${num(B.B1.E.t0[1])}, ±${num(B.B1.E.t0[2])}` })], 'worked'),
      rowOf([keyCell('t = T/4'), fieldNode('B1-E0', { label: 'k = 0: E = ±' }), fieldNode('B1-E1', { label: 'k = π/2: E = ±' }), fieldNode('B1-E2', { label: 'k = π: E = ±' })]),
      para('In your code (TODO B1 <code>band_energy</code>): calculate E on a grid in k and t/T. The gap is the distance between the two bands. The code prints the smallest gap, not the numbers of your table.'),
      rowOf([fieldNode('B1-gap', { label: 'smallest gap in the whole cycle:' }), fieldNode('B1-gapsheet', { label: 'with the numbers of the task sheet:' })]),
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
      para(`An open chain of ${B.B2.cells} unit cells (${2 * B.B2.cells} guides): J₁ inside each cell, J₂ between the cells, +Δ on every A, −Δ on every B. Guide 1 (an A) is the left end, guide ${2 * B.B2.cells} (a B) the right end. In the file: TODO B2, the on-site line of <code>H_chain</code>. Calculate its eigenvalues over t/T (figure c). At t = 3T/8 two of them lie inside the gap. Their eigenvectors are the two states in the gap (edge states).`),
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
      para(`Solve <span class="m">i·dψ/dt = H(t)·ψ</span> in Runge–Kutta steps of dt = ${B.B3.dt}. H changes during a step: take H(t) for the first slope, H(t + dt/2) for the second and the third, H(t + dt) for the fourth. Input: amplitude 1/√2 on guide A and −1/√2 on guide B of one cell in the middle, short (A − B)/√2. This is the lower band at t = 0, where J₂ = 0. X is the position of the light in unit cells, counted from the cell where it starts. In the file the Runge–Kutta step is given: at TODO B3 you write the three H(t).`),
      rowOf([fieldNode('B3-norm', { label: 'sum of |ψ|² after one cycle, T = 20:', wide: true })]),
      rowOf([keyCell('shift per cycle X(T)'), fieldNode('B3-T20', { label: `T = 20 on ${B.B3.cells.T20} cells:` }), fieldNode('B3-T50', { label: `T = 50 on ${B.B3.cells.T50} cells:` })]),
      rowOf([fieldNode('B3-T100', { label: `T = 100 on ${B.B3.cells.T100} cells:` }), el('span', { class: 'wb-small wb-note', html: 'Your code prints this number with <code>LONG</code> set to true: <code>LONG = True</code> in zak_chern.py, <code>LONG = true</code> in zak_chern.m.' })]),
      rowOf([fieldNode('B3-guide', { label: `one guide A alone as input, T = 50 on ${B.B3.cells.T50} cells:` }), fieldNode('B3-sheet', { label: `numbers of the task sheet, T = 20 on ${CELLS.sheet[20]} cells:` })]),
      doneNote(['B3-T20', 'B3-T50'], 'The light moves toward higher cell numbers. The slower the cycle, the closer the shift comes to one unit cell.'),
      doneNote(['B3-guide'], 'One guide alone excites both bands. They move in opposite directions, so the mean position X hardly moves.'),
      // the shift with the numbers of the task sheet: its two reasons, and where a slow cycle ends (SLOW_SHEET)
      dynamic(el('p', { class: 'wb-done' }), () => (isOk('B3-sheet') ? `The shift with the numbers of the task sheet (${num(st.sheet_T20_pair)} at T = 20) is well below one unit cell. It has two reasons: the cycle is too fast${allOk(['B1-gap', 'B1-gapsheet']) ? ` (the smallest gap is ${plain(B.B1.gap_min_sheet)} in place of ${plain(B.B1.gap_min)})` : ''}, and <span class="nb">(A − B)/√2</span> is not exactly the lower band at t = 0, because J₂ = ${plain(sheetAt0.J2)} there and not 0. A slow cycle ends near ${num(SLOW_SHEET.shift, 2)} cell (${num(SLOW_SHEET.shift)} at T = ${SLOW_SHEET.T} on ${SLOW_SHEET.cells} cells), not at 1.` : null)),
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
      para('At t = 0 and at t = T/2 the on-site term is zero. Calculate γ with four k, as on tab 1. In the file this step is TODO B4 <code>zak_pump</code>: the code says that your function is right and prints no number of this step.'),
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
      para('The Chern number C counts how many times γ grows by 2π in one cycle. Predict first: γ/2π is the position of the light, and figure e shows how far the light moves in one cycle.'),
      rowOf([choiceNode('B5-pred', { label: 'In one cycle γ changes by' }), dynamic(el('span', { class: 'wb-pred' }), predNote('B5-pred', 'B5-C', 'a change of', 2 * B.B5.C))]),
      gate('B5-pred', [
        para('In your code (TODO B5: <code>unwrap</code> and C): γ(t) with your function <code>zak_pump</code> at the 17 times t/T = 0, 1/16, …, 1, each with M = 400.'),
        rowOf([fieldNode('B5-quarter', { label: 'γ(T/4) =', unitText: 'π' })]),
        para('The function arg only gives angles between −π and π, so the values jump by 2π. Rule to follow γ without jumps: from one time to the next, take the change that lies between −π and π (Python <code>np.unwrap</code>, MATLAB <code>unwrap</code>).'),
        rowOf([fieldNode('B5-C', { label: 'after the rule: C = (γ(T) − γ(0))/2π =' })]),
        doneNote(['B5-quarter', 'B5-C'], `Figure e now shows γ(t)/2π together with X(t). Set T = 100: the two curves lie on each other. At T = 20 the cycle is too fast for the light to follow exactly. C = ${B.B5.C}: γ rises by ${inPi(2 * B.B5.C)}, and in a slow cycle the light moves ${B.B5.C === 1 ? 'one unit cell' : `${B.B5.C} unit cells`}.`),
      ]),
    ],
    formula: () => code([
      'γ(t) = −arg(⟨u₁|u₂⟩· … ·⟨u_M|u₁⟩) with J₁, J₂, Δ at the time t, M = 400',
      'γ without jumps: put the 17 raw values through unwrap (Python np.unwrap, MATLAB unwrap)',
      'C = (γ at the last time − γ at the first time)/2π',
    ]),
  });
  return [conventions(false),
    para(`One cycle has the length T: ${math(cycleParts(handAt, '(2πt/T)'))}. These numbers give simple hand values. The task sheet has ${SHEET_TEXT}: the button “numbers of the task sheet” shows them here, and you run them afterwards with the same code. The chain: waveguides (short: guides) A, B, A, B, … from left to right. Each guide A and the guide B to its right form a unit cell. Press Play and watch the five figures. Then calculate.`, 'wb-intro'),
    b1, b2, b3, b4, b5];
}

// ---------- tab 4: the Chern number from plaquettes ----------
function buildChern() {
  const b6 = B.B6, bVec = b6.u_kpi2_tq_times_sqrt6;
  // a and c as the student typed them (either sign is right)
  const aNum = () => (isOk('B6-a') ? `(${get('B6-a').typed.map(whole).join(', ')})/√2` : 'a (from the field above)');
  const cNum = () => (isOk('B6-c') ? `(${get('B6-c').typed.map(whole).join(', ')})` : 'c (from the field above)');
  const bText = `(${whole(bVec[0])}, ${whole(bVec[1])})/√6`, pq = handAt(0.25), hq = hOf(Math.PI / 2, pq.J1, pq.J2);
  const s6 = stepBlock({
    tag: 'B6', title: 'One plaquette by hand',
    children: [
      para(`A plaquette is one small square of a grid in k and t. Take k from π/2 to π and t from 0 to T/4: the square with the thick frame in the map. Its corners in the order of the walk: ${math(['a = u(π/2, 0)', 'b = u(π/2, T/4)', 'c = u(π, T/4)', 'd = u(π, 0)'])}. Each u is the eigenvector of the lower band at this k and t. In the file this step is TODO B6 <code>plaquette</code>: the code says that your function is right and prints no number of this step.`),
      rowOf([keyCell('check 1'), el('span', { class: 'wb-given', html: `Given: b = ${bText}. Write H at k = π/2, t = T/4 and multiply.` }), fieldNode('B6-E', { label: 'H·b =', unitText: '· b' })]),
      rowOf([keyCell('check 2'), el('span', { class: 'wb-given', html: 'Calculate h at k = π, t = T/4. Then H is diagonal. Its eigenvector with the smaller eigenvalue, with length 1:' }), fieldNode('B6-c', { label: 'c =' })]),
      rowOf([keyCell('from B4'), el('span', { class: 'wb-given', html: 'At t = 0 the eigenvector is the same at every k:' }), fieldNode('B6-a', { label: 'a = d =', unitText: '/√2' })]),
      para('An eigenvector times −1 is the same eigenvector: for a and for c both signs are right. The four overlaps are checked for a and c as you typed them.', 'wb-small'),
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
      'F = −arg(product) = −atan2(Im, Re);  in units of π: (−arg in degrees)/180',
    ]),
  });
  const colName = ['0 → T/4', 'T/4 → T/2', 'T/2 → 3T/4', '3T/4 → T'];
  const s7 = stepBlock({
    tag: 'B7', title: 'All 16 plaquettes in your code',
    children: [
      para('In the file: TODO B7 <code>chern</code>. Grid: <span class="m">k = 0, π/2, π, 3π/2</span> and <span class="m">t = 0, T/4, T/2, 3T/4</span>. After the last point comes the first one again, in k and in t. Inner edges are walked once in each direction and drop out. So the four plaquettes between two times add up to the change of γ between these times. Add the four plaquettes of each t column.'),
      ...colName.map((name, j) => rowOf([keyCell(`t: ${name}`), fieldNode(`B7-col${j + 1}`, { label: 'column sum =', unitText: 'π' })])),
      rowOf([fieldNode('B7-total', { label: 'Sum of all 16 plaquette phases:', unitText: 'π' }), fieldNode('B7-C', { label: 'C = sum/2π =' }), fieldNode('B7-C24', { label: '24 × 24 grid: C =' })]),
      para('Compare the first column sum with γ(T/4) for four k points, which your code prints in B5.', 'wb-small'),
      doneNote(['B7-total', 'B7-C'], `The sum of all plaquette phases is ${inPi(B.B7.total_over_pi)} and C = ${B.B7.C}, without the rule of B5.${Math.min(...B.B7.F_over_pi.flat()) < 0 ? ' Single plaquettes can be negative: only the sum counts.' : ''}`),
    ],
    formula: () => code([
      'plaquette(a, b, c, d) = −arg(⟨a|b⟩·⟨b|c⟩·⟨c|d⟩·⟨d|a⟩)',
      'U(s, j) = eigenvector at k_s = 2π(s − 1)/4 and t_j = (j − 1)·T/4;  s, j = 1 … 4, point 5 is point 1 again',
      'F(s, j) = plaquette(U(s, j), U(s, j+1), U(s+1, j+1), U(s+1, j))',
      'column sum j = F(1, j) + F(2, j) + F(3, j) + F(4, j)',
      'C = (sum of all plaquette phases)/2π;  type the sums divided by π',
    ]),
  });
  // the four cases in the words of the code file: its cycles are pump, pump_back, pump_aside and pump_sheet
  const rows8 = [['(a)', '<b>upper</b> band of <code>pump</code> (solid cycle)'], ['(b)', '<code>pump_back</code> (solid cycle backwards, Δ → −Δ), lower band'],
    ['(c)', `<code>pump_aside</code> (dotted cycle), lower band. One more cycle: ${ASIDE_TEXT}`], ['(d)', '<code>pump_sheet</code> with the numbers of the task sheet (dashed cycle), lower band']];
  const right8 = [B.B8.upper_band, B.B8.reversed_cycle, B.B8.not_enclosing, B.B8.sheet];
  const s8 = stepBlock({
    tag: 'B8', title: 'Other bands and other cycles: predict, then calculate',
    children: [
      para('The picture shows the cycles in the plane (J₁ − J₂, Δ). The solid cycle is the pump of tab 3: you have its C for the lower band from B5 and B7. Look at each case: does the cycle go around the point (0, 0), and which way round? Predict C, then calculate it on an 8 × 8 grid. In the file: TODO B8, your four predictions. The code prints the four C after them.'),
      ...rows8.map(([tag, text], i) => el('div', { class: 'wb-case' }, [
        rowOf([keyCell(tag), el('span', { class: 'wb-given', html: text })]),
        rowOf([choiceNode(`B8-p${i + 1}`, { label: 'I predict C =' }), dynamic(el('span', { class: 'wb-pred' }), predNote(`B8-p${i + 1}`, `B8-c${i + 1}`, 'C =', right8[i]))]),
        gate(`B8-p${i + 1}`, [rowOf([fieldNode(`B8-c${i + 1}`, { label: 'calculated: C =' })])]),
      ])),
      para('Tab 3, figure c again: the eigenvalues of the open chain over one cycle, with the two states in the gap (edge states).'),
      rowOf([choiceNode('B8-cross', { label: 'States that cross the gap at each end of the chain in one cycle:' })]),
      doneNote(['B8-cross', 'B8-c1', 'B8-c2', 'B8-c3', 'B8-c4'], `${crossing === 1 ? 'One state crosses' : `${crossing} states cross`} the gap at each end per cycle: this is |C|. <code>pump_aside</code> does not go around the point (0, 0) and has C = ${B.B8.not_enclosing}. The direction of the cycle and the band decide the sign.`),
    ],
    formula: () => code([
      'grid of 8 × 8 eigenvectors:  k_s = 2π(s − 1)/8 and t_j = (j − 1)·T/8,  s, j = 1 … 8;  upper band: the eigenvector of the larger eigenvalue',
      `pump_back:  J₁ and J₂ as in pump,  Δ = −${plain(HAND_SET.D0)}·sin(2πt/T)`,
      'C = (sum of the 64 plaquette phases)/2π',
    ]),
  });
  return [conventions(false),
    para(`Here the same Chern number comes out without following γ through the cycle. The pump is the one of tab 3: ${math(cycleParts(handAt, '(2πt/T)'))}.`, 'wb-intro'),
    s6, s7, s8];
}

export const builders = { hand: buildHand, code: buildCode, pump: buildPump, chern: buildChern };
