// Reading one typed number of the workbook. No DOM.
//
// parse(text, spec) reads ONE real number from the text of a field. It is strict: a text is read completely or not at all.
//   It returns { state: 'empty' }, { state: 'unreadable' } or { state: 'ok', value, number, pi, suffix }.
//   Read are: an optional sign (+, the ASCII minus, the minus sign − U+2212, the en dash –), then
//     a number        0.5   .5   0,5 (decimal comma)   1e-3
//     a fraction      1/4   0.5/2
//     a multiple of π pi   π   0.5pi   0.5 π   2*pi   pi/2   3π/4
//   and, only with spec = { unit: 'deg' }, the unit behind the number: 63.43°  or  63.43 deg.
//   Spaces around the text are ignored. Everything else is unreadable: 0.72+0.44i, 1..2, 1/0, --1, 0x10, Infinity, NaN,
//   1/4pi (π/4 or 1/(4π)?), and a number that ends with the decimal sign (5. or 5, looks unfinished).
//   value = number·π if a π was typed, else value = number.

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
