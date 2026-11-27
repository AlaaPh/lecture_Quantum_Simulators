// Is a typed answer right? No DOM, so that node can test every question of the workbook.
// judge(step, texts) → { state, text, values }
//   state  'right' | 'wrong' | 'empty' | 'unreadable'   (empty and unreadable also count as a try on the page)
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

export function judge(step, texts) {
  if (step.type === 'choice') return texts[0] === step.ref ? { state: 'right', text: null, values: [step.ref] } : { state: 'wrong', text: null };
  if (step.type === 'complex') {
    const a = read(texts[0]), b = read(texts[1]), tol = step.tol ?? 0.011, r = val(step.ref);
    if (a.state === 'empty' || b.state === 'empty') return { state: 'empty', text: 'Fill in both fields: the real part and the imaginary part. A part can be 0.' };
    if (a.state !== 'ok' || b.state !== 'ok') return { state: 'unreadable', text: 'Type plain numbers, for example 2 or −1.' };
    if (Math.abs(a.value - r.re) <= tol && Math.abs(b.value - r.im) <= tol) return { state: 'right', text: null, values: texts.slice(0, 2) };
    if (Math.abs(a.value - r.im) <= tol && Math.abs(b.value - r.re) <= tol) return { state: 'wrong', text: 'The two parts are exchanged: the real part comes first.' };
    if (Math.abs(Math.abs(a.value) - Math.abs(r.re)) <= tol && Math.abs(Math.abs(b.value) - Math.abs(r.im)) <= tol) return { state: 'wrong', text: `Check the signs. ${step.hint}` };
    return { state: 'wrong', text: null };
  }
  const a = read(texts[0], step.unit);
  if (a.state === 'empty') return { state: 'empty', text: 'Type your number into the field.' };
  if (a.state !== 'ok') return { state: 'unreadable', text: 'Type a plain number, for example 0.25 or −1.5.' };
  if (step.mod && Math.abs(a.value) > step.mod) return { state: 'wrong', text: 'This number is too large for a phase in units of π: γ lies between −π and π. Did you type it in degrees or in radians?' };
  if (near(a.value, val(step.ref), step.tol, step.mod)) return { state: 'right', text: null, values: [texts[0]] };
  for (const k of step.wrongs || []) if (near(a.value, val(k.ref), k.tol ?? step.tol, k.mod)) return { state: 'wrong', text: k.text };
  return { state: 'wrong', text: null };
}
