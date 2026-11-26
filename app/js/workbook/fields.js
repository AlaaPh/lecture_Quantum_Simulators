// Input fields of the workbook: one registry of all fields, their text, their verdict and their place in the page.
// A field is defined once (field, choice), evaluated from its stored text (answers.js), and built once as DOM
// (fieldNode, choiceNode). After that only its verdict nodes change: a redraw never rebuilds a field, so the text
// and the focus stay where they are. Typed strings are kept in localStorage under STORE_KEY.
import { el } from '../ui.js';
import { parse, check } from './answers.js';

export const STORE_KEY = 'qsl-workbook-v1';
export const TEXT = {
  unreadable: 'not a number I can read: write 0.7236 or -1/4',
  otherPhase: 'right length, other angle: your eigenvector has another phase; only the product is fixed',
  partial: 'both numbers are needed: write 0 for a part that is zero',
  wrongHand: 'not this value. Two decimals are enough. The button “show the formula” gives the formula with the numbers.',
  wrongCode: 'not this value. Compare with the OK line that your code prints for this step. Type four decimals.',
  wrongChoice: 'not this one. Look at the figure again.',
};
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
// A typed field. kind, unit, tol, otherPhase as in answers.js. ref is the reference value in the unit of the field.
// wrong: [{ value, hint }] known wrong values with the text shown for them. hint: the text for any other wrong value.
// aria: the field in plain words, for a screen reader. tab: the id of the tab that holds the field.
export function field({ id, tab, kind = 'real', unit, tol, ref, wrong = [], hint = TEXT.wrongHand, otherPhase, aria = id, partNames }) {
  const parts = kind === 'complex' ? ['re', 'im'] : kind === 'vector' ? ref.map((_, i) => String(i)) : [''];
  const names = kind === 'complex' ? ['real part', 'imaginary part'] : kind === 'vector' ? (partNames || parts.map((p) => `component ${+p + 1}`)) : [''];
  const f = { type: 'text', id, tab, kind, unit, tol, ref, wrong, hint, otherPhase, aria, parts, names, text: {}, state: 'empty', message: '', partial: false, typed: undefined, root: null };
  if (registry.has(id)) throw new Error(`workbook: field "${id}" is defined twice`);
  registry.set(id, f);
  evaluate(f);                       // with empty text: a wrong reference shows up here as an error, not later as "wrong"
  return f;
}
// A choice between a few buttons. right: the value that is right; without it the choice is a prediction, which is
// stored and compared later with the calculated result, and gets no verdict.
export function choice({ id, tab, options, right, hint = TEXT.wrongChoice, aria = id }) {
  const f = { type: 'choice', id, tab, options, right, prediction: right === undefined, hint, aria, value: null, state: 'empty', message: '', root: null };
  if (registry.has(id)) throw new Error(`workbook: field "${id}" is defined twice`);
  if (!f.prediction && !options.some((o) => String(o.value) === String(right))) throw new Error(`workbook: choice "${id}" has no button for its right value`);
  registry.set(id, f);
  return f;
}

function evaluate(f) {
  if (f.type === 'choice') {
    f.state = f.value === null ? 'empty' : f.prediction ? 'chosen' : String(f.value) === String(f.right) ? 'ok' : 'wrong';
    f.message = f.state === 'wrong' ? f.hint : '';
    return;
  }
  const ps = f.parts.map((p) => parse(f.text[p] ?? '', f));
  const typed = f.kind === 'complex' ? { re: ps[0], im: ps[1] } : f.kind === 'vector' ? ps : ps[0];
  const res = check(typed, f.ref, { kind: f.kind, unit: f.unit, tol: f.tol, otherPhase: f.otherPhase, wrong: f.wrong.map((w, i) => ({ value: w.value, hintId: i })) });
  f.state = res.state; f.typed = res.value;
  f.partial = res.state === 'empty' && f.parts.some((p) => (f.text[p] ?? '').trim() !== '');
  f.message = res.state === 'unreadable' ? TEXT.unreadable : res.state === 'other-phase' ? TEXT.otherPhase
    : res.state === 'wrong' ? (res.hintId !== null ? f.wrong[res.hintId].hint : f.hint) : '';
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
    f.root.dataset.state = f.state;
    for (const b of f.buttons) b.setAttribute('aria-pressed', String(f.value !== null && b.dataset.value === String(f.value)));
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
  if (before !== `${f.state}|${f.message}|${JSON.stringify(f.typed)}`) changed();
}
// After Enter on a right answer the next field of the same pane takes the focus; after a wrong one the text is selected.
function afterEnter(f, input) {
  const stay = f.state === 'wrong' || f.state === 'unreadable' || (f.state === 'empty' && input.value.trim() === '');
  if (stay) { input.select(); return; }
  const pane = input.closest('.wb-steps') || document, list = [...pane.querySelectorAll('input.wb-in')].filter((x) => x.offsetParent !== null);
  const next = list[list.indexOf(input) + 1];
  if (next) { next.focus(); next.select(); }
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
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(f); afterEnter(f, input); } });
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
    b.addEventListener('click', () => { f.value = String(o.value); store.choice[id] = f.value; save(); evaluate(f); show(f); changed(); });
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
