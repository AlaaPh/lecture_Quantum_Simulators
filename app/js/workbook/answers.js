// Reading and checking one typed answer of the workbook. No DOM.
//
// parse(text, spec) reads ONE real number from the text of a field. It is strict: a text is read completely or not at all.
//   It returns { state: 'empty' }, { state: 'unreadable' } or { state: 'ok', value, number, pi, suffix }.
//   Read are: an optional sign (+, the ASCII minus, the minus sign − U+2212, the en dash –), then
//     a number        0.5   .5   0,5 (decimal comma)   1e-3
//     a fraction      1/4   0.5/2
//     a multiple of π pi   π   0.5pi   0.5 π   2*pi   pi/2   3π/4
//   and, only in a field with unit 'deg', the unit behind the number: 63.43°  or  63.43 deg.
//   Spaces around the text are ignored. Everything else is unreadable: 0.72+0.44i, 1..2, 1/0, --1, 0x10, Infinity, NaN,
//   1/4pi (π/4 or 1/(4π)?), and a number that ends with the decimal sign (5. or 5, looks unfinished).
//   value = number·π if a π was typed, else value = number. spec is the kind as a string or the field description { kind, unit }.
//
// check(parsed, reference, spec) compares a parsed answer with the reference value.
//   It returns { state, hintId, value }: state is 'ok', 'wrong', 'empty', 'unreadable' or 'other-phase'.
//   spec = { kind, unit, tol, wrong, hintId, otherPhase, minOverlap }
//     kind 'real'     the number itself, |typed − reference| ≤ tol
//          'value'    the same comparison, for an angle or a sum of angles that counts as the number itself
//          'angle'    equal up to a multiple of the full turn
//          'integer'  exactly equal
//          'complex'  parsed = { re, im } (two parsed parts), reference = { re, im } or [re, im]; both parts within tol.
//                     Same length |z| and another angle gives 'other-phase' (switch it off with otherPhase: false,
//                     for a number that does not depend on the phases of the eigenvectors, such as a closed product).
//          'vector'   parsed = array of components, each a parsed real part or { re, im }; reference = array of complex
//                     numbers. Both are normalised; ok if |⟨reference|typed⟩|² ≥ minOverlap (0.999). A phase factor is free.
//     unit 'pi'       the field is in units of π: 0.5, pi/2 and 0.5pi all mean π/2. The reference is in units of π.
//          'deg'      the field is in degrees: 90 and pi/2 both mean 90°. The reference is in degrees.
//          none       radians (for 'real': a plain number).
//     tol             tolerance in the unit of the field (default 0.006: two typed decimals are enough)
//     wrong           optional list [{ value, hintId }] of known wrong values, written like the reference.
//                     A wrong answer that equals one of them returns its hintId; otherwise hintId = spec.hintId or null.
//   Empty or unreadable input is not a wrong try: with several parts, one unreadable part gives 'unreadable',
//   else one empty part gives 'empty'.
//   A reference that is not a finite number (or not complex, not a vector, as the kind needs) is a mistake of the page:
//   check throws an error instead of calling the answer wrong.

const NUM = '(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)(?:[eE][+\\-\\u2212\\u2013]?\\d+)?';
const PI = '(?:[pP][iI]|π)';
const RE_SIGN = /^[+\-\u2212\u2013]/;                      // +, ASCII minus, minus sign U+2212, en dash U+2013
const RE_DEG = /\s*(?:°|[dD][eE][gG])$/;
const RE_PLAIN = new RegExp(`^(${NUM})(?:\\s*/\\s*(${NUM}))?$`);
const RE_PI = new RegExp(`^(?:(${NUM})\\s*[*·×]?\\s*)?${PI}(?:\\s*/\\s*(${NUM}))?$`);
const toNumber = (s) => Number(s.replace(',', '.').replace(/[\u2212\u2013]/, '-'));
const EMPTY = Object.freeze({ state: 'empty' }), UNREADABLE = Object.freeze({ state: 'unreadable' });

export function parse(text, spec = 'real') {
  let body = (text === null || text === undefined ? '' : String(text)).trim();
  if (body === '') return EMPTY;
  const unit = spec && typeof spec === 'object' ? spec.unit : undefined;
  let sign = 1, suffix = null;
  const sg = RE_SIGN.exec(body);
  if (sg) { if (sg[0] !== '+') sign = -1; body = body.slice(1).trimStart(); }
  if (unit === 'deg') {
    const d = RE_DEG.exec(body);
    if (d) { suffix = 'deg'; body = body.slice(0, d.index); }
  }
  let number, pi = false;
  let m = RE_PLAIN.exec(body);
  if (m) {
    number = toNumber(m[1]);
    if (m[2] !== undefined) number = toNumber(m[2]) === 0 ? NaN : number / toNumber(m[2]);
  } else if (suffix === null && (m = RE_PI.exec(body))) {
    pi = true;
    number = m[1] === undefined ? 1 : toNumber(m[1]);
    if (m[2] !== undefined) number = toNumber(m[2]) === 0 ? NaN : number / toNumber(m[2]);
  } else return UNREADABLE;
  if (!Number.isFinite(number)) return UNREADABLE;
  number = sign * number + 0;                                  // + 0 turns −0 into 0
  return { state: 'ok', value: pi ? number * Math.PI : number, number, pi, suffix };
}

// ---------- comparison ----------
const DEFAULT_TOL = 0.006;
const KINDS = ['real', 'value', 'angle', 'integer', 'complex', 'vector'];
const isParsed = (p) => p !== null && typeof p === 'object' && typeof p.state === 'string';
// a part of an answer: a result of parse, a number (taken as read), or nothing (taken as empty)
const part = (p) => (isParsed(p) ? p : typeof p === 'number' && Number.isFinite(p) ? { state: 'ok', value: p, number: p, pi: false, suffix: null } : p === null || p === undefined ? EMPTY : UNREADABLE);
// the typed number in the unit of the field
function inUnit(p, unit) {
  if (unit === 'pi') return p.pi ? p.number : p.value;
  if (unit === 'deg') return p.pi ? p.number * 180 : p.value;
  return p.value;
}
const period = (unit) => (unit === 'pi' ? 2 : unit === 'deg' ? 360 : 2 * Math.PI);
const close = (a, b, tol) => Math.abs(a - b) <= tol;
function sameAngle(a, b, per, tol) {
  let d = (a - b) % per;
  if (d < 0) d += per;
  return Math.min(d, per - d) <= tol;
}
// a complex number given as { re, im }, [re, im] or a real number
const asComplex = (z) => (typeof z === 'number' ? { re: z, im: 0 } : Array.isArray(z) ? { re: z[0], im: z[1] } : { re: z.re, im: z.im });
// the two parts of a typed complex number: { re, im }, [re, im] or one real part
function complexParts(p) {
  if (Array.isArray(p)) return [part(p[0]), part(p[1])];
  if (p !== null && typeof p === 'object' && !isParsed(p) && ('re' in p || 'im' in p)) return [part(p.re), part(p.im)];
  return [part(p), null];
}
const fromParts = ([r, i]) => ({ re: r.value, im: i ? i.value : 0 });
// |⟨a|b⟩|² of the normalised vectors; 0 if one of them is the zero vector
function fidelity(a, b) {
  let re = 0, im = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    re += a[i].re * b[i].re + a[i].im * b[i].im;
    im += a[i].re * b[i].im - a[i].im * b[i].re;
    na += a[i].re * a[i].re + a[i].im * a[i].im;
    nb += b[i].re * b[i].re + b[i].im * b[i].im;
  }
  return na > 0 && nb > 0 ? (re * re + im * im) / (na * nb) : 0;
}

const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const finiteComplex = (z) => finite(z) || (Array.isArray(z) ? z.length === 2 && finite(z[0]) && finite(z[1]) : z !== null && typeof z === 'object' && finite(z.re) && finite(z.im));
function validReference(kind, x) {
  if (kind === 'complex') return finiteComplex(x);
  if (kind === 'vector') return Array.isArray(x) && x.length > 0 && x.every(finiteComplex);
  return finite(x);
}

export function check(parsed, reference, spec = {}) {
  const kind = spec.kind ?? 'real', tol = spec.tol ?? DEFAULT_TOL, unit = spec.unit;
  if (!KINDS.includes(kind)) throw new TypeError(`check: unknown kind "${kind}"`);
  if (!validReference(kind, reference)) throw new TypeError(`check: the reference value of a field of kind "${kind}" is ${JSON.stringify(reference)}`);
  const result = (state, hintId = null, value = undefined) => ({ state, hintId, value });

  // 1. collect the parts and stop if one of them is unreadable or empty
  let parts;
  if (kind === 'complex') parts = complexParts(parsed);
  else if (kind === 'vector') parts = Array.isArray(parsed) ? parsed.map(complexParts) : [[UNREADABLE, null]];
  else parts = [part(parsed)];
  const flat = parts.flat().filter((p) => p !== null);
  if (flat.some((p) => p.state === 'unreadable')) return result('unreadable');
  if (flat.length === 0 || flat.some((p) => p.state === 'empty')) return result('empty');

  // 2. the typed value and the test "equal to x" for this kind
  let typed, equals;
  if (kind === 'complex') {
    typed = fromParts(parts);
    equals = (x) => { const z = asComplex(x); return close(typed.re, z.re, tol) && close(typed.im, z.im, tol); };
  } else if (kind === 'vector') {
    typed = parts.map(fromParts);
    equals = (x) => x.length === typed.length && fidelity(x.map(asComplex), typed) >= (spec.minOverlap ?? 0.999);
  } else {
    typed = inUnit(parts[0], unit);
    if (kind === 'angle') equals = (x) => sameAngle(typed, x, period(unit), tol);
    else if (kind === 'integer') equals = (x) => Number.isInteger(typed) && typed === x;
    else equals = (x) => close(typed, x, tol);
  }

  // 3. the verdict
  if (equals(reference)) return result('ok', null, typed);
  for (const w of spec.wrong ?? []) if (validReference(kind, w.value) && equals(w.value)) return result('wrong', w.hintId ?? null, typed);
  if (kind === 'complex' && spec.otherPhase !== false) {
    const ref = asComplex(reference), len = Math.hypot(ref.re, ref.im);
    if (len > 2 * tol && close(Math.hypot(typed.re, typed.im), len, tol * Math.SQRT2)) return result('other-phase', null, typed);
  }
  return result('wrong', spec.hintId ?? null, typed);
}
