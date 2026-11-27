// Is a typed answer right? No DOM, so that node can test every question of the workbook.
// judge(step, texts) → { state, text, values }
//   state  'right' | 'wrong' | 'short' | 'empty' | 'unreadable'   (empty and unreadable also count as a try on the page)
//          'short': the right number, rounded or cut to fewer decimals than the field needs. It does not count as a try.
//   text   the hint for this answer, or null: then the page shows the hint of the step
import { parse } from './answers.js';

export const val = (x) => (typeof x === 'function' ? x() : x);
const near = (v, ref, tol, mod) => { let d = v - ref; if (mod) d -= mod * Math.round(d / mod); return Math.abs(d) <= tol; };
// In a field with the unit π a typed "0.5pi" means 0.5; in a field in degrees "63.43°" is read as 63.43.
function read(text, unit) {
  const p = parse(text, unit === '°' ? { unit: 'deg' } : 'real');
  if (p.state !== 'ok') return p;
  return { state: 'ok', value: unit === 'π' && p.pi ? p.number : p.value };
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
// how many decimals a plainly typed number has ("1.98" → 2, "2" → 0); null for a fraction, a power of ten, a multiple of π
const typedDecimals = (text) => { const m = /^\s*[+\-\u2212\u2013]?\s*\d*(?:[.,](\d*))?\s*(?:°|deg)?\s*$/i.exec(String(text)); return m ? (m[1] || '').length : null; };
// how many decimals the field needs: as many as its placeholder shows, else as many as the tolerance asks for
export const neededDecimals = (step) => (step.ph ? (step.ph.split('.')[1] || '').length : Math.max(0, Math.ceil(-Math.log10(2 * step.tol))));

export function judge(step, texts) {
  if (step.type === 'choice') return texts[0] === step.ref ? { state: 'right', text: null, values: [step.ref] } : { state: 'wrong', text: null };
  if (step.type === 'complex') {
    const a = read(texts[0]), b = read(texts[1]), tol = step.tol ?? 0.011, r = val(step.ref);
    if (a.state === 'empty' || b.state === 'empty') return { state: 'empty', text: 'Fill in both fields: the real part and the imaginary part. A part can be 0.' };
    if (a.state !== 'ok' || b.state !== 'ok') return { state: 'unreadable', text: 'Type plain numbers, for example 2 or −1.' };
    if (Math.abs(a.value - r.re) <= tol && Math.abs(b.value - r.im) <= tol) return { state: 'right', text: null, values: texts.slice(0, 2) };
    for (const k of step.wrongs || []) if (Math.abs(a.value - val(k.re)) <= (k.tol ?? tol) && Math.abs(b.value - val(k.im)) <= (k.tol ?? tol)) return { state: 'wrong', text: k.text };      // a known wrong pair
    if (Math.abs(a.value - r.im) <= tol && Math.abs(b.value - r.re) <= tol) return { state: 'wrong', text: 'The two parts are exchanged: the real part comes first.' };
    if (Math.abs(Math.abs(a.value) - Math.abs(r.re)) <= tol && Math.abs(Math.abs(b.value) - Math.abs(r.im)) <= tol) return { state: 'wrong', text: `Check the signs. ${step.hint}` };
    return { state: 'wrong', text: null };
  }
  const a = read(texts[0], step.unit);
  if (a.state === 'empty') return { state: 'empty', text: 'Type your number into the field.' };
  if (a.state !== 'ok') return { state: 'unreadable', text: 'Type a plain number, for example 0.25 or −1.5.' };
  if (step.mod && Math.abs(a.value) > step.mod) return { state: 'wrong', text: 'The field counts in units of π: for γ = π type 1, so the number lies between −1 and 1. Yours is too large for that. Did you type γ in radians or in degrees?' };
  if (near(a.value, val(step.ref), step.tol, step.mod)) return { state: 'right', text: null, values: [texts[0]] };
  for (const k of step.wrongs || []) if (Math.abs(a.value - val(k.ref)) < 1e-9) return { state: 'wrong', text: k.text };      // a known wrong value, typed exactly
  {                                                 // the right number with too few decimals gets no hint that blames something else
    const d = typedDecimals(texts[0]), need = neededDecimals(step), ref = val(step.ref), f = 10 ** (d ?? 0);
    // rounded (a half goes away from zero, as on a calculator) or cut off
    const same = (r) => Math.abs(a.value - (Math.sign(r) * Math.round(Math.abs(r) * f)) / f) < 1e-9 || Math.abs(a.value - Math.trunc(r * f) / f) < 1e-9;
    // a phase one full turn away counts too, but not for a whole number: −1 is no rounded −1.29
    if (d !== null && d < need && (step.mod && d > 0 ? [ref, ref - step.mod, ref + step.mod] : [ref]).some(same)) return { state: 'short', text: `As far as you typed it, this agrees with the right number. Type it with ${WORDS[need] ?? need} decimal${need === 1 ? '' : 's'}.` };
  }
  for (const k of step.wrongs || []) if (near(a.value, val(k.ref), k.tol ?? step.tol, k.mod)) return { state: 'wrong', text: k.text };
  if (step.unit === 'π' && Math.abs(val(step.ref)) > 0.02 && near(a.value, val(step.ref) * Math.PI, step.tol * Math.PI)) return { state: 'wrong', text: 'This is γ in radians. The field counts in units of π: divide your number by π.' };
  return { state: 'wrong', text: null };
}
