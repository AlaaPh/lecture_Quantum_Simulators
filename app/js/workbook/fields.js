// Input fields of the workbook: one registry of all fields, their text, their verdict and their place in the page.
// A field is defined once (field, choice), evaluated from its stored text (answers.js), and built once as DOM
// (fieldNode, choiceNode). After that only its verdict nodes change: a redraw never rebuilds a field, so the text
// and the focus stay where they are. Typed strings are kept in localStorage under STORE_KEY.
import { el } from '../ui.js';
import { parse, check } from './answers.js';

export const STORE_KEY = 'qsl-workbook-v1';
// The example numbers in these texts (12.5, 3/8, 0.75, 135, 2.36) are not the result of any step: the node test checks it.
export const TEXT = {
  unreadable: 'this is not a number. Write for example 12.5 or 3/8. A complex number goes into the two fields Re and Im.',
  otherPhase: 'right length, other angle. With the u of A1: check the signs and the star. With another phase factor on u this is not a mistake: go on, the closed product is the same and A3 checks it.',
  partial: 'both numbers are needed: write 0 for a part that is zero',
  wrongHand: 'not this value. Calculate with four decimals and type two or more. The button “show the formula” gives the formula with the numbers.',
  wrongCode: 'not this value. Compare with the OK line that your code prints for this step. Type four decimals.',
  wrongInteger: 'not this number. C is an integer. Compare with the OK line that your code prints for this step.',
  wrongChoice: 'not this one. Look at the figure again.',
  near: 'close, but not close enough: this looks like a rounding error. Calculate with four decimals and round only the number that you type.',
  unitPi: 'this field is in units of π: type the angle divided by π, a number between −2 and 2. For the angle 3π/4 type 0.75 or 3pi/4, not 135 and not 2.36.',
  unitDeg: 'this field is in degrees: type a number between −360 and 360.',
  radiansInPi: 'this is the angle in radians. Type the angle divided by π.',
  radiansInDeg: 'this is the angle in radians. This field is in degrees.',
  length: 'right direction, wrong length. An eigenvector on this page has length 1.',
  locked: 'The result is calculated: the prediction stays as it was.',
};
const NEAR = 4;                      // a hand value within 4 tolerances of the reference is called a rounding error
const HAND_TOL = 0.006;              // the tolerance of answers.js when a field names none
const MARK = { ok: '✓', wrong: '✗', unreadable: '?', 'other-phase': '≈' };

const registry = new Map();          // id → field
const listeners = [];                // called after a verdict has changed
const dynamics = [];                 // nodes whose text follows the verdicts: { node, make, last }
const gates = [];                    // blocks that open after a prediction: { id, node }
let store = { v: 1, text: {}, choice: {} };

export const get = (id) => { const f = registry.get(id); if (!f) throw new Error(`workbook: no field "${id}"`); return f; };
export const isOk = (id) => get(id).state === 'ok';
export const allOk = (ids) => ids.every(isOk);
export const chosen = (id) => get(id).value;
export const fields = () => [...registry.values()];
export const onChange = (fn) => listeners.push(fn);

function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* storage may be off: the page works without it */ } }
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!o || typeof o !== 'object') return;
    const strings = (x) => Object.fromEntries(Object.entries(x && typeof x === 'object' ? x : {}).filter(([, v]) => typeof v === 'string' && v.length <= 60));
    store = { v: 1, text: strings(o.text), choice: strings(o.choice) };
  } catch (e) { /* unreadable storage: start empty */ }
}
const keyOf = (f, part) => (part ? `${f.id}.${part}` : f.id);

// ---------- definitions ----------
// A typed field. kind, unit, tol, otherPhase, length as in answers.js. ref is the reference value in the unit of the field.
// wrong: [{ value, hint, tol }] known wrong values with the text shown for them. hint: the text for any other wrong value.
// code: the number comes from the student's code (four decimals, no talk of rounding); without it the field is a hand field:
//   a wrong value within NEAR tolerances of the reference is answered as a rounding error (TEXT.near).
// ref and wrong may be functions: then they are read when the field is checked, and may use what stands in the fields
//   named in after. The field is checked again whenever one of those changes.
// aria: the field in plain words, for a screen reader. tab: the id of the tab that holds the field.
export function field({ id, tab, kind = 'real', unit, tol, ref, wrong = [], code = false, hint, otherPhase, length, lengthHint = TEXT.length, after = [], aria = id, partNames }) {
  const ref0 = valueOf(ref);
  const parts = kind === 'complex' ? ['re', 'im'] : kind === 'vector' ? ref0.map((_, i) => String(i)) : [''];
  const names = kind === 'complex' ? ['real part', 'imaginary part'] : kind === 'vector' ? (partNames || parts.map((p) => `component ${+p + 1}`)) : [''];
  hint = hint ?? (!code ? TEXT.wrongHand : kind === 'integer' ? TEXT.wrongInteger : TEXT.wrongCode);
  const near = code || kind === 'integer' || kind === 'vector' ? 0 : NEAR * (tol ?? HAND_TOL);
  const f = { type: 'text', id, tab, kind, unit, tol, ref, wrong, code, hint, near, otherPhase, length, lengthHint, after, aria, parts, names, text: {}, state: 'empty', message: '', partial: false, typed: undefined, root: null };
  if (registry.has(id)) throw new Error(`workbook: field "${id}" is defined twice`);
  for (const a of after) get(a);     // a field can only follow fields that are defined before it
  registry.set(id, f);
  evaluate(f);                       // with empty text: a wrong reference shows up here as an error, not later as "wrong"
  return f;
}
// A choice between a few buttons. right: the value that is right; without it the choice is a prediction, which is
// stored and compared later with the calculated result, and gets no verdict.
// lock: the id of the field with the calculated result. Once that field is right, the prediction cannot be changed.
export function choice({ id, tab, options, right, hint = TEXT.wrongChoice, lock, aria = id }) {
  const f = { type: 'choice', id, tab, options, right, prediction: right === undefined, hint, lock, aria, value: null, state: 'empty', message: '', root: null };
  if (registry.has(id)) throw new Error(`workbook: field "${id}" is defined twice`);
  if (!f.prediction && !options.some((o) => String(o.value) === String(right))) throw new Error(`workbook: choice "${id}" has no button for its right value`);
  registry.set(id, f);
  return f;
}
const valueOf = (x) => (typeof x === 'function' ? x() : x);
// The reference value and the known wrong values of a field, as they are now.
export const referenceOf = (f) => valueOf(f.ref);
// An angle typed in radians is a known wrong value of every field with a unit: for the reference x it is x·π in a field in
// units of π and x·π/180 in a field in degrees. It is compared as the number itself, with two decimals.
function radians(f, ref) {
  if (!f.unit || typeof ref !== 'number' || Math.abs(ref) < 1e-9) return [];
  const value = f.unit === 'pi' ? ref * Math.PI : (ref * Math.PI) / 180, tol = Math.min(f.tol ?? HAND_TOL, HAND_TOL);
  if (Math.abs(value - ref) <= 2 * (f.tol ?? HAND_TOL) + tol) return [];
  return [{ value, hint: f.unit === 'pi' ? TEXT.radiansInPi : TEXT.radiansInDeg, tol, exact: true }];
}
export const wrongOf = (f) => { const ref = referenceOf(f); return [...valueOf(f.wrong), ...radians(f, ref)]; };
const locked = (f) => !!f.lock && f.value !== null && isOk(f.lock);

// The verdict for the texts of a field (one string per part), without changing the field.
function verdict(f, text) {
  const ps = f.parts.map((p) => parse(text[p] ?? '', f));
  const typed = f.kind === 'complex' ? { re: ps[0], im: ps[1] } : f.kind === 'vector' ? ps : ps[0];
  const wrong = wrongOf(f);
  const res = check(typed, referenceOf(f), { kind: f.kind, unit: f.unit, tol: f.tol, otherPhase: f.otherPhase, near: f.near, length: f.length, wrong: wrong.map((w, i) => ({ value: w.value, hintId: i, tol: w.tol, exact: w.exact })) });
  let message = '';
  if (res.state === 'unreadable') message = TEXT.unreadable;
  else if (res.state === 'other-phase') message = TEXT.otherPhase;
  else if (res.state === 'wrong') {
    message = res.reason === 'range' ? (f.unit === 'pi' ? TEXT.unitPi : TEXT.unitDeg) : res.reason === 'length' ? f.lengthHint
      : res.hintId !== null ? wrong[res.hintId].hint : res.reason === 'near' ? TEXT.near : f.hint;
  }
  return { state: res.state, typed: res.value, reason: res.reason, message, partial: res.state === 'empty' && f.parts.some((p) => (text[p] ?? '').trim() !== '') };
}
function evaluate(f) {
  if (f.type === 'choice') {
    f.state = f.value === null ? 'empty' : f.prediction ? 'chosen' : String(f.value) === String(f.right) ? 'ok' : 'wrong';
    f.message = f.state === 'wrong' ? f.hint : '';
    return;
  }
  Object.assign(f, verdict(f, f.text));
}
const textOf = (f, strings) => Object.fromEntries(f.parts.map((p, i) => [p, strings[i] ?? '']));
// What the page answers to these strings in this field: { state, message, reason, typed }. Nothing is stored. For the tests.
export function judge(id, strings) { const f = get(id); return verdict(f, textOf(f, [].concat(strings))); }
// Type these strings into a field from code and check it, as Enter does. For the tests, and for a page without its DOM.
export function enter(id, strings) {
  const f = get(id);
  if (f.type === 'choice') { if (locked(f)) return f; f.value = strings === null ? null : String(strings); if (f.value === null) delete store.choice[id]; else store.choice[id] = f.value; save(); evaluate(f); show(f); changed(); return f; }
  f.text = textOf(f, [].concat(strings));
  for (const p of f.parts) store.text[keyOf(f, p)] = f.text[p];
  save(); commit(f);
  if (f.root) show(f, { fill: true });
  return f;
}

// Read the stored strings and evaluate every field. Call once, after all fields are defined.
export function restore() {
  load();
  for (const f of registry.values()) {
    if (f.type === 'choice') { const v = store.choice[f.id]; f.value = v !== undefined && f.options.some((o) => String(o.value) === v) ? v : null; }
    else for (const p of f.parts) f.text[p] = store.text[keyOf(f, p)] ?? '';
    evaluate(f);
  }
}
// Clear every typed value and every choice.
export function resetAll() {
  store = { v: 1, text: {}, choice: {} };
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  for (const f of registry.values()) {
    if (f.type === 'choice') f.value = null; else for (const p of f.parts) f.text[p] = '';
    evaluate(f); show(f, { fill: true });
  }
  changed();
}
// Number of right answers and number of fields of a tab (predictions are not counted).
export function progress(tab) {
  let ok = 0, total = 0;
  for (const f of registry.values()) if (f.tab === tab && !f.prediction) { total++; if (f.state === 'ok') ok++; }
  return { ok, total };
}

// ---------- the page follows the verdicts ----------
function changed() {
  for (const g of gates) g.node.hidden = get(g.id).value === null;
  for (const f of registry.values()) if (f.type === 'choice' && f.lock) show(f);
  refreshDynamics();
  for (const fn of listeners) fn();
}
export function refreshDynamics() {
  for (const d of dynamics) { const html = d.make(); if (html !== d.last) { d.last = html; d.node.innerHTML = html ?? ''; d.node.hidden = html === null || html === ''; } }
}
// A node whose content is make() after every change of a verdict. make returns HTML, or null to hide the node.
export function dynamic(node, make) { dynamics.push({ node, make, last: undefined }); return node; }
// A block that stays closed until the prediction with this id is made.
export function gate(id, children) { const node = el('div', { class: 'wb-gated' }, children); node.hidden = get(id).value === null; gates.push({ id, node }); return node; }

// Write the verdict of a field into its nodes. fill: also write the stored text into the inputs.
function show(f, { fill = false, quiet = false } = {}) {
  if (!f.root) return;
  if (f.type === 'choice') {
    const fixed = locked(f);
    f.root.dataset.state = f.state;
    for (const b of f.buttons) {
      const mine = f.value !== null && b.dataset.value === String(f.value);
      b.setAttribute('aria-pressed', String(mine)); b.disabled = fixed && !mine;
    }
    if (fixed) f.root.title = TEXT.locked; else f.root.removeAttribute('title');
    f.markEl.textContent = MARK[f.state] || '';
    f.msgEl.textContent = f.message; f.msgEl.hidden = !f.message;
    return;
  }
  if (fill) for (const p of f.parts) if (f.inputs[p].value !== f.text[p]) f.inputs[p].value = f.text[p];
  const note = f.message || (f.partial && !quiet ? TEXT.partial : '');
  f.root.dataset.state = f.state;
  f.markEl.textContent = MARK[f.state] || '';
  f.msgEl.textContent = note; f.msgEl.hidden = !note;
  for (const p of f.parts) { if (f.state === 'wrong' || f.state === 'unreadable') f.inputs[p].setAttribute('aria-invalid', 'true'); else f.inputs[p].removeAttribute('aria-invalid'); }
}

// Check a field now: on Enter, or when the field loses the focus. Never while a key is typed.
function commit(f, { quiet = false } = {}) {
  const before = `${f.state}|${f.message}|${JSON.stringify(f.typed)}`;
  evaluate(f); show(f, { quiet });
  if (before === `${f.state}|${f.message}|${JSON.stringify(f.typed)}`) return;
  for (const g of registry.values()) if (g.type === 'text' && g.after.includes(f.id)) { evaluate(g); show(g); }   // the fields whose reference follows this one
  changed();
}
// After Enter on a right answer the next field of the same pane takes the focus; after a wrong one the text is selected.
// If a question with buttons comes next and is not answered yet (or answered wrongly), the focus stays where it is and the
// question is brought into view: Enter never jumps over it.
function afterEnter(f, input) {
  const stay = f.state === 'wrong' || f.state === 'unreadable' || (f.state === 'empty' && input.value.trim() === '');
  if (stay) { input.select(); return; }
  const pane = input.closest('.wb-steps') || document;
  const list = [...pane.querySelectorAll('input.wb-in, .wb-choice[data-state="empty"], .wb-choice[data-state="wrong"]')].filter((x) => x.offsetParent !== null);
  const next = list[list.indexOf(input) + 1];
  if (!next) return;
  if (next.matches('.wb-choice')) { (next.closest('.wb-row') || next).scrollIntoView({ block: 'nearest' }); return; }
  next.focus(); next.select();
}

// ---------- DOM, built once ----------
// label: HTML in front of the field. unitText: HTML behind the inputs (°, π, a word). wide: a longer input.
export function fieldNode(id, { label = '', unitText = '', wide = false } = {}) {
  const f = get(id);
  if (f.root) throw new Error(`workbook: field "${id}" is placed twice`);
  const msgId = `m-${id}`;
  const root = el('span', { class: `wb-f wb-${f.kind}`, 'data-field': id, 'data-state': f.state });
  const line = el('span', { class: 'wb-line' });
  if (label) line.append(el('span', { class: 'lab', html: label }));
  f.inputs = {};
  f.parts.forEach((p, i) => {
    const inputId = `f-${id}${p ? '-' + p : ''}`;
    if (f.kind === 'complex') line.append(el('label', { class: 'part', for: inputId, text: p === 're' ? 'Re' : 'Im' }));
    if (f.kind === 'vector') line.append(el('span', { class: 'lab', text: i === 0 ? '(' : ',' }));
    const input = el('input', { type: 'text', class: `wb-in${wide ? ' wide' : ''}`, id: inputId, autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'next', 'aria-label': f.names[i] ? `${f.aria}, ${f.names[i]}` : f.aria, 'aria-describedby': msgId });
    input.value = f.text[p] ?? '';
    input.addEventListener('input', () => {
      f.text[p] = input.value; store.text[keyOf(f, p)] = input.value; save();
      root.dataset.state = 'editing'; f.markEl.textContent = ''; f.msgEl.textContent = ''; f.msgEl.hidden = true;
    });
    // Enter in the first of two parts goes on to the second part without a remark about the missing one
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(f, { quiet: i < f.parts.length - 1 }); afterEnter(f, input); } });
    input.addEventListener('blur', (e) => commit(f, { quiet: !!e.relatedTarget && root.contains(e.relatedTarget) }));
    f.inputs[p] = input; line.append(input);
  });
  if (f.kind === 'vector') line.append(el('span', { class: 'lab', text: ')' }));
  if (unitText) line.append(el('span', { class: 'unit', html: unitText }));
  f.markEl = el('span', { class: 'wb-mark', 'aria-hidden': 'true' });
  f.msgEl = el('span', { class: 'wb-msg', id: msgId, role: 'status' });
  line.append(f.markEl); root.append(line, f.msgEl);
  f.root = root; show(f);
  return root;
}
export function choiceNode(id, { label = '' } = {}) {
  const f = get(id);
  if (f.root) throw new Error(`workbook: field "${id}" is placed twice`);
  const root = el('span', { class: 'wb-f wb-choice', 'data-field': id, 'data-state': f.state, role: 'group', 'aria-label': f.aria });
  const line = el('span', { class: 'wb-line' });
  if (label) line.append(el('span', { class: 'lab', html: label }));
  f.buttons = f.options.map((o) => {
    const b = el('button', { type: 'button', class: 'btn wb-opt', id: `c-${id}-${o.key ?? o.value}`, 'data-value': String(o.value), 'aria-pressed': 'false', html: o.label });
    b.addEventListener('click', () => { if (locked(f)) return; f.value = String(o.value); store.choice[id] = f.value; save(); evaluate(f); show(f); changed(); });
    line.append(b); return b;
  });
  f.markEl = el('span', { class: 'wb-mark', 'aria-hidden': 'true' });
  f.msgEl = el('span', { class: 'wb-msg', role: 'status' });
  line.append(f.markEl); root.append(line, f.msgEl);
  f.root = root; show(f);
  return root;
}

// One step: its label and title, its sentences and rows, and the button that shows the formula with the numbers inserted.
// formula() returns HTML. It is made when the button is pressed and again after every change of a verdict.
export function stepBlock({ tag, title, children, formula }) {
  const node = el('section', { class: 'wb-step', id: `step-${tag}`, 'aria-label': `${tag}: ${title}` }, [el('h3', {}, [el('span', { class: 'tag', text: tag }), el('span', { html: title })]), ...children]);
  if (formula) {
    const box = el('div', { class: 'wb-formula', id: `formula-${tag}` }); box.hidden = true;
    const btn = el('button', { type: 'button', class: 'btn wb-formula-btn', id: `show-${tag}`, 'aria-expanded': 'false', 'aria-controls': box.id, text: 'show the formula' });
    let open = false;
    btn.addEventListener('click', () => { open = !open; btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'hide the formula' : 'show the formula'; refreshDynamics(); });
    dynamic(box, () => (open ? formula() : null));
    node.append(btn, box);
  }
  return node;
}
export const para = (html, cls = '') => el('p', { class: cls, html });
export const rowOf = (children, cls = '') => el('div', { class: `wb-row ${cls}`.trim() }, children);
export const keyCell = (html) => el('span', { class: 'wb-k', html });
// A sentence that appears when all these fields are right.
export const doneNote = (ids, html) => dynamic(el('p', { class: 'wb-done' }), () => (allOk(ids) ? html : null));
