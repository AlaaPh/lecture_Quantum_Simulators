// Workbook: one small question on the screen at a time, one picture next to it. Three parts:
// the Zak phase (zak.js), a Thouless pump (pump.js), the Chern number (chern.js).
// A part is { id, chip, next, steps, draw(panel, spec, colors) → caption }. A step is
//   { type: 'info', title, html, button, end }                     a card to read
//   { type: 'complex', text, formula, ref: { re, im } }            two fields: real and imaginary part
//   { type: 'number', text, formula, extra, ask, label, unit, ref, tol, mod, wrongs, ph }   one field (ph: its form)
//   { type: 'choice', text, ask, options, ref }                    buttons
// with hint (shown after a wrong answer), how (text, or { py, m } code; offered after two wrong tries), after (shown
// after the right answer) and pic(solved) → what the picture shows. ref, after and the ref of a known wrong value may
// be functions: they are evaluated when needed. mod: 2 compares a phase in units of π up to a full turn.
// look: true marks a question that is answered from the picture: on a narrow screen the picture is shown first.
import { Canvas2D } from '../lecture1/panels.js';
import { colors, invalidateTheme } from '../theme.js';
import { judge, val } from './judge.js';
import { zak } from './zak.js';
import { pump } from './pump.js';
import { chern } from './chern.js';

const PARTS = [zak, pump, chern];
const $ = (id) => document.getElementById(id);
const STORE = 'qsl-workbook-v2';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- state ----------
const st = { part: 'zak', pos: {}, solved: {}, lang: 'py' };
for (const p of PARTS) { st.pos[p.id] = 0; st.solved[p.id] = {}; }
let tries = 0, howShown = false;
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (!o || typeof o !== 'object') return;
    if (PARTS.some((p) => p.id === o.part)) st.part = o.part;
    if (o.lang === 'py' || o.lang === 'm') st.lang = o.lang;
    for (const p of PARTS) {
      if (o.solved && o.solved[p.id] && typeof o.solved[p.id] === 'object') for (const [k, v] of Object.entries(o.solved[p.id])) if (p.steps[k] && p.steps[k].type !== 'info' && Array.isArray(v)) st.solved[p.id][k] = v.map(String);
      if (o.pos && Number.isInteger(o.pos[p.id])) st.pos[p.id] = Math.min(p.steps.length - 1, Math.max(0, o.pos[p.id]));
    }
  } catch (e) { /* no storage */ }
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* no storage */ } }
const part = () => PARTS.find((p) => p.id === st.part);
const isSolved = (p, n) => p.steps[n].type === 'info' || Object.prototype.hasOwnProperty.call(st.solved[p.id], n);
const allSolved = (p) => p.steps.every((s, n) => isSolved(p, n));
const questions = (p) => p.steps.filter((s) => s.type !== 'info').length;

// ---------- the picture ----------
const panel = new Canvas2D($('pic'));
function drawPic() {
  const p = part(), i = st.pos[p.id], s = p.steps[i];
  panel.ctx.clearRect(0, 0, panel.w, panel.h);
  if (panel.w < 80 || panel.h < 80) return;
  $('pic-cap').textContent = p.draw(panel, s.pic(s.type !== 'info' && isSolved(p, i)), colors()) || '';
}
panel.onRedraw = drawPic;

// ---------- the card ----------
const card = $('card');
function howHtml(how) {
  if (typeof how === 'string') return `<div class="step-how">${how}</div>`;
  const lang = how[st.lang] ? st.lang : 'py';
  return `<div class="step-how code"><div class="step-lang" role="group" aria-label="Language of the code"><button type="button" data-lang="py" class="${lang === 'py' ? 'on' : ''}">Python</button><button type="button" data-lang="m" class="${lang === 'm' ? 'on' : ''}"${how.m ? '' : ' disabled'}>MATLAB</button></div><pre><code>${esc(how[lang])}</code></pre></div>`;
}
function putHow() {
  const s = part().steps[st.pos[st.part]], box = $('how');
  box.innerHTML = howHtml(s.how);
  box.querySelectorAll('.step-lang button').forEach((b) => b.addEventListener('click', () => { st.lang = b.dataset.lang; save(); putHow(); }));
}
function show(n) {
  const p = part(); st.pos[p.id] = Math.max(0, Math.min(p.steps.length - 1, n)); tries = 0; howShown = false; save();
  const i = st.pos[p.id], s = p.steps[i], done = isSolved(p, i), vals = st.solved[p.id][i] || [], qn = p.steps.slice(0, i + 1).filter((x) => x.type !== 'info').length;
  const input = (id, label, v) => `<input id="${id}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(label)}"${s.ph ? ` placeholder="${esc(s.ph)}"` : ''} value="${esc(v || '')}">`;
  let html = '';
  if (s.type === 'info') {
    html += `<h2>${s.title}</h2>${s.html}<div class="step-nav">${i > 0 ? '<button class="btn link" id="back" type="button">← Back</button>' : ''}<span class="grow"></span>`;
    if (s.end) html += `<button class="btn" id="again" type="button">Start this part again</button>${p.next ? `<button class="btn primary" id="nextpart" type="button">Next part: ${p.next} →</button>` : ''}`;
    else html += `<button class="btn primary" id="next" type="button">${s.button || 'Next'} →</button>`;
    html += '</div>';
  } else {
    html += `<div class="step-count">Question ${qn} of ${questions(p)}</div><div class="step-dots">${p.steps.map((x, k) => (x.type === 'info' ? '' : `<i class="${isSolved(p, k) ? 'done' : k === i ? 'now' : ''}"></i>`)).join('')}</div>`;
    html += `<p class="step-text">${val(s.text)}</p>`;
    if (s.formula) html += `<div class="step-formula">${s.formula}</div>`;
    if (s.extra) html += s.extra;
    if (s.ask) html += `<p class="step-text"><b>${s.ask}</b></p>`;
    if (s.type === 'complex') html += `<div class="step-ask"><span>h =</span>${input('f0', 'real part of h', vals[0])}<span>+</span>${input('f1', 'imaginary part of h', vals[1])}<span>· i</span></div>`;
    if (s.type === 'number') html += `<div class="step-ask"><span>${s.label}</span>${input('f0', s.label, vals[0])}<span>${s.unit || ''}</span></div>`;
    if (s.type === 'choice') html += `<div class="step-choice">${s.options.map((o) => `<button type="button" data-v="${o}" class="${done && o === s.ref ? 'ok' : ''}">${o}</button>`).join('')}</div>`;
    html += `<p class="step-msg${done ? ' ok' : ''}" id="msg">${done ? `<b>Right.</b> ${val(s.after)}` : ''}</p><div id="how"></div>`;
    html += '<div class="step-nav"><button class="btn link" id="back" type="button">← Back</button><span class="grow"></span>';
    if (s.type !== 'choice' && !done) html += '<button class="btn primary" id="check" type="button">Check</button>';
    if (done) html += '<button class="btn primary" id="next" type="button">Next →</button>';
    html += '</div>';
  }
  card.innerHTML = html;
  card.parentElement.classList.toggle('look', Boolean(s.look));      // on a phone the picture then stands above the question
  const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };
  on('back', () => show(i - 1)); on('next', () => show(i + 1)); on('check', check);
  on('again', () => { st.solved[p.id] = {}; show(0); chips(); });
  on('nextpart', () => setPart(PARTS[PARTS.indexOf(p) + 1].id));
  card.querySelectorAll('.step-ask input').forEach((inp) => {
    if (done) { inp.classList.add('ok'); inp.readOnly = true; }
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (isSolved(part(), st.pos[st.part])) show(st.pos[st.part] + 1); else check(); } });
  });
  card.querySelectorAll('.step-choice button').forEach((b) => b.addEventListener('click', () => choose(b)));
  const first = card.querySelector(done || s.type === 'info' ? '#next, #nextpart' : '.step-ask input');
  if (first) first.focus({ preventScroll: true });
  drawPic();
}
function wrong(text) {
  const s = part().steps[st.pos[st.part]], msg = $('msg'); tries++;
  msg.className = 'step-msg no'; msg.innerHTML = `<b>Not yet.</b> ${text || s.hint}`;
  if (tries >= 2 && s.how && !howShown) { $('how').innerHTML = '<button class="btn" id="showhow" type="button">Show me how</button>'; $('showhow').addEventListener('click', () => { howShown = true; putHow(); }); }
}
function right(values) { const p = part(); st.solved[p.id][st.pos[p.id]] = values; show(st.pos[p.id]); chips(); }
function check() {
  const s = part().steps[st.pos[st.part]], r = judge(s, [$('f0').value, $('f1') ? $('f1').value : '']);
  if (r.state === 'right') right(r.values); else wrong(r.text);
}
function choose(btn) {
  const p = part(), s = p.steps[st.pos[p.id]]; if (isSolved(p, st.pos[p.id])) return;
  const r = judge(s, [btn.dataset.v]);
  if (r.state === 'right') return right(r.values);
  btn.classList.add('no'); wrong();
}

// ---------- the parts, the address and the theme ----------
function chips() { $('parts').innerHTML = PARTS.map((p) => `<a href="#${p.id}" class="${p.id === st.part ? 'active' : ''}"${p.id === st.part ? ' aria-current="page"' : ''}>${p.chip}${allSolved(p) && questions(p) === Object.keys(st.solved[p.id]).length ? ' ✓' : ''}</a>`).join(''); }
function setPart(id, { keep = false } = {}) {
  if (!PARTS.some((p) => p.id === id)) return;
  st.part = id; const p = part();
  let i = keep ? st.pos[id] : st.pos[id];
  while (i > 0 && !isSolved(p, i - 1)) i--;        // never land behind an open question
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  chips(); show(i);
  document.title = `Quantum Simulators Workbook: ${p.chip.replace(/^\d · /, '')}`;
}
window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id !== st.part) setPart(id); });

const root = document.documentElement;
try { const th = localStorage.getItem('qsl-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('qsl-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  invalidateTheme(); drawPic();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) { invalidateTheme(); drawPic(); } });

load();
setPart(PARTS.some((p) => `#${p.id}` === location.hash) ? location.hash.slice(1) : st.part);
