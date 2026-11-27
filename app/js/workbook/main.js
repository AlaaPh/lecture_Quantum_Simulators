// Workbook: one small question on the screen at a time, one picture next to it. The parts and their order are
// listed in parts.js, grouped by exercise; the first card (address #contents or no address) lists them all.
// A part is { id, title, steps, draw(panel, spec, colors) → caption }. A step is
//   { type: 'info', title, html, button, end }                     a card to read
//   { type: 'complex', text, formula, label, ref: { re, im }, tol }   two fields: real and imaginary part
//   { type: 'number', text, formula, extra, ask, label, unit, ref, tol, mod, wrongs, ph }   one field (ph: its form)
//   { type: 'choice', text, ask, options, ref }                    buttons
// with hint (shown after a wrong answer), how (text, or { py, m } code; offered after two wrong tries), after (shown
// after the right answer) and pic(solved) → what the picture shows. ref, after and the ref of a known wrong value may
// be functions: they are evaluated when needed. mod: 2 compares a phase in units of π up to a full turn.
// look: true marks a question that is answered from the picture: on a narrow screen the picture then stands inside
// the card, between the text and the buttons.
import { Canvas2D } from '../lecture1/panels.js';
import { colors, invalidateTheme } from '../theme.js';
import { judge, val } from './judge.js';
import { GROUPS, PARTS, groupOf, questions } from './parts.js';

const HOME = 'contents';
const $ = (id) => document.getElementById(id);
const STORE = 'qsl-workbook-v2';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- state ----------
const st = { part: HOME, pos: {}, solved: {}, lang: 'py' };
for (const p of PARTS) { st.pos[p.id] = 0; st.solved[p.id] = {}; }
let tries = 0, howShown = false, shownAt = '';
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (!o || typeof o !== 'object') return;
    if (o.lang === 'py' || o.lang === 'm') st.lang = o.lang;
    for (const p of PARTS) {
      // a stored answer counts only if it is the right answer of the question that stands at this place now
      if (o.solved && o.solved[p.id] && typeof o.solved[p.id] === 'object') for (const [k, v] of Object.entries(o.solved[p.id])) if (p.steps[k] && p.steps[k].type !== 'info' && Array.isArray(v) && judge(p.steps[k], v.map(String)).state === 'right') st.solved[p.id][k] = v.map(String);
      if (o.pos && Number.isInteger(o.pos[p.id])) st.pos[p.id] = Math.min(p.steps.length - 1, Math.max(0, o.pos[p.id]));
    }
  } catch (e) { /* no storage */ }
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* no storage */ } }
const part = () => PARTS.find((p) => p.id === st.part);
const isSolved = (p, n) => p.steps[n].type === 'info' || Object.prototype.hasOwnProperty.call(st.solved[p.id], n);
const allSolved = (p) => p.steps.every((s, n) => isSolved(p, n));
const solvedCount = (p) => p.steps.filter((s, n) => s.type !== 'info' && isSolved(p, n)).length;

// ---------- the picture ----------
const panel = new Canvas2D($('pic')), figure = document.querySelector('.step-pic'), frame = document.querySelector('.steps-main');
const narrow = window.matchMedia('(max-width: 1080px)');       // one column, as in the stylesheet
function drawPic() {
  const p = part(); if (!p) return;
  const i = st.pos[p.id], s = p.steps[i];
  panel.ctx.clearRect(0, 0, panel.w, panel.h);
  if (panel.w < 80 || panel.h < 80) return;
  $('pic-cap').textContent = p.draw(panel, s.pic(s.type !== 'info' && isSolved(p, i)), colors()) || '';
}
panel.onRedraw = drawPic;
// On a narrow screen the picture of a question that is answered from it stands inside the card, between the text and
// the buttons. Everywhere else it stands beside or below the card.
function placePicture() {
  if (!part()) return;
  const s = part().steps[st.pos[st.part]], answer = card.querySelector('.step-choice, .step-ask');
  if (narrow.matches && s.look && answer) { if (figure.parentElement !== card || figure.nextElementSibling !== answer) card.insertBefore(figure, answer); } else if (figure.parentElement !== frame) frame.appendChild(figure);
}
narrow.addEventListener('change', placePicture);

// ---------- the card ----------
const card = $('card');
function howHtml(how) {
  if (typeof how === 'string') return `<div class="step-how">${how}</div>`;
  const lang = how[st.lang] ? st.lang : 'py';
  return `<div class="step-how code"><div class="step-lang" role="group" aria-label="Language of the code"><button type="button" data-lang="py" class="${lang === 'py' ? 'on' : ''}">Python</button><button type="button" data-lang="m" class="${lang === 'm' ? 'on' : ''}"${how.m ? '' : ' disabled'}>MATLAB</button></div><pre><code>${esc(how[lang])}</code></pre></div>`;
}
// The worked answer stands below the buttons Back and Check, so that the field and Check stay together.
function putHow(focusLang) {
  const s = part().steps[st.pos[st.part]], box = $('howbox');
  $('how').innerHTML = '';
  box.innerHTML = howHtml(s.how);
  box.querySelectorAll('.step-lang button').forEach((b) => b.addEventListener('click', () => { st.lang = b.dataset.lang; save(); putHow(true); }));
  const to = focusLang ? box.querySelector('.step-lang button.on') : null;
  if (to) to.focus({ preventScroll: true }); else { box.tabIndex = -1; box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
function show(n) {
  const p = part(); st.pos[p.id] = Math.max(0, Math.min(p.steps.length - 1, n)); tries = 0; howShown = false; save();
  const i = st.pos[p.id], s = p.steps[i], done = isSolved(p, i), vals = st.solved[p.id][i] || [], qn = p.steps.slice(0, i + 1).filter((x) => x.type !== 'info').length;
  const input = (id, label, v) => `<input id="${id}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(label)}"${s.ph ? ` placeholder="${esc(s.ph)}"` : ''} value="${esc(v || '')}">`;
  let html = '';
  if (s.type === 'info') {
    html += `<h2>${s.title}</h2>${s.html}<div class="step-nav">${i > 0 ? '<button class="btn link" id="back" type="button">← Back</button>' : ''}<span class="grow"></span>`;
    const after = PARTS[PARTS.indexOf(p) + 1];
    if (s.end) html += `<button class="btn" id="again" type="button">Start this part again</button><button class="btn primary" id="nextpart" type="button">${after ? `Next part: ${after.title}` : 'All parts'} →</button>`;
    else html += `<button class="btn primary" id="next" type="button">${s.button || 'Next'} →</button>`;
    html += '</div>';
  } else {
    html += `<div class="step-count">Question ${qn} of ${questions(p)}</div><div class="step-dots">${p.steps.map((x, k) => (x.type === 'info' ? '' : `<i class="${isSolved(p, k) ? 'done' : k === i ? 'now' : ''}"></i>`)).join('')}</div>`;
    html += `<p class="step-text">${val(s.text)}</p>`;
    if (s.formula) html += `<div class="step-formula">${s.formula}</div>`;
    if (s.extra) html += s.extra;
    if (s.ask) html += `<p class="step-text"><b>${s.ask}</b></p>`;
    if (s.type === 'complex') html += `<div class="step-ask"><span>${s.label || 'h ='}</span>${input('f0', 'real part', vals[0])}<span>+</span>${input('f1', 'imaginary part', vals[1])}<span>· i</span></div>`;
    if (s.type === 'number') html += `<div class="step-ask"><span>${s.label}</span>${input('f0', s.label, vals[0])}<span>${s.unit || ''}</span></div>`;
    if (s.type === 'choice') html += `<div class="step-choice">${s.options.map((o) => `<button type="button" data-v="${o}" class="${done && o === s.ref ? 'ok' : ''}">${o}</button>`).join('')}</div>`;
    html += `<p class="step-msg${done ? ' ok' : ''}" id="msg">${done ? `<b>Right.</b> ${val(s.after)}` : ''}</p><div id="how"></div>`;
    html += '<div class="step-nav"><button class="btn link" id="back" type="button">← Back</button><span class="grow"></span>';
    if (s.type !== 'choice' && !done) html += '<button class="btn primary" id="check" type="button">Check</button>';
    if (done) html += '<button class="btn primary" id="next" type="button">Next →</button>';
    html += '</div><div id="howbox"></div>';
  }
  if (figure.parentElement !== frame) frame.appendChild(figure);      // out of the card before the card is written anew
  card.innerHTML = html;
  placePicture();
  const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };
  on('back', () => show(i - 1)); on('next', () => show(i + 1)); on('check', check);
  on('again', () => { st.solved[p.id] = {}; show(0); chips(); });
  on('nextpart', () => { const after = PARTS[PARTS.indexOf(p) + 1]; setPart(after ? after.id : HOME); });
  card.querySelectorAll('.step-ask input').forEach((inp) => {
    if (done) { inp.classList.add('ok'); inp.readOnly = true; }
    inp.addEventListener('input', () => inp.classList.remove('no'));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (isSolved(part(), st.pos[st.part])) show(st.pos[st.part] + 1); else check(); } });
  });
  card.querySelectorAll('.step-choice button').forEach((b) => b.addEventListener('click', () => choose(b)));
  const first = card.querySelector(done || s.type === 'info' ? '#next, #nextpart' : '.step-ask input');
  if (first) first.focus({ preventScroll: true }); else { card.tabIndex = -1; card.focus({ preventScroll: true }); }
  const at = `${p.id}:${i}`;
  if (at !== shownAt) { shownAt = at; window.scrollTo(0, 0); }       // a new card starts at its top
  drawPic();
}
// counts: false for the right number with too few decimals; it is no wrong try
function wrong(text, counts = true) {
  const s = part().steps[st.pos[st.part]], msg = $('msg'); if (counts) tries++;
  msg.className = 'step-msg no'; msg.innerHTML = `<b>${counts ? 'Not yet.' : 'Almost.'}</b> ${text || s.hint}`;
  card.querySelectorAll('.step-ask input').forEach((inp) => inp.classList.add('no'));
  if (tries >= 2 && s.how && !howShown) { $('how').innerHTML = '<button class="btn" id="showhow" type="button">Show me how</button>'; $('showhow').addEventListener('click', () => { howShown = true; putHow(false); }); }
  msg.scrollIntoView({ block: 'nearest' });
}
function right(values) {
  const p = part(); st.solved[p.id][st.pos[p.id]] = values; show(st.pos[p.id]); chips();
  const next = $('next') || $('nextpart'); if (next) next.scrollIntoView({ block: 'nearest' });
}
function check() {
  const s = part().steps[st.pos[st.part]], r = judge(s, [$('f0').value, $('f1') ? $('f1').value : '']);
  if (r.state === 'right') right(r.values); else wrong(r.text, r.state !== 'short');
}
function choose(btn) {
  const p = part(), s = p.steps[st.pos[p.id]]; if (isSolved(p, st.pos[p.id])) return;
  const r = judge(s, [btn.dataset.v]);
  if (r.state === 'right') return right(r.values);
  btn.classList.add('no'); wrong();
}

// ---------- the contents, the parts, the address and the theme ----------
// The first card: every part of the workbook, grouped by exercise, with what is done.
function showContents() {
  st.part = HOME; save(); shownAt = HOME;
  if (figure.parentElement !== frame) frame.appendChild(figure);
  frame.classList.add('home');
  const row = (p) => { const n = questions(p), k = solvedCount(p); return `<a class="toc-part${k === n ? ' done' : ''}" href="#${p.id}"><span class="toc-title">${p.title}</span><span class="toc-meta">${k === n ? '✓ done' : k ? `${k} of ${n}` : `${n} questions`}</span></a>`; };
  card.innerHTML = `<h2>Workbook</h2><p class="step-text">Small questions, one on the screen at a time. Every answer is checked at once. A wrong answer gets a hint; after two wrong answers you can open the worked answer. Choose a part.</p>${GROUPS.map((g) => `<section class="toc-group"><h3><b>${g.title}</b> · ${g.about}${g.demo ? ` <a class="toc-demo" href="${g.demo}">interactive page</a>` : ''}</h3>${g.parts.map(row).join('')}</section>`).join('')}`;
  chips(); document.title = 'Quantum Simulators Workbook';
  if (location.hash && location.hash !== `#${HOME}`) history.replaceState(null, '', `#${HOME}`);
  window.scrollTo(0, 0);
}
// The header: the contents and the parts of the exercise that is open. A finished part has a tick.
function chips() {
  const p = part(), g = p ? groupOf(p) : null;
  $('parts').innerHTML = `<a href="#${HOME}" class="${p ? '' : 'active'}">Contents</a>${g ? `<span class="acts-group">${g.title}</span>` : ''}${(g ? g.parts : []).map((q) => `<a href="#${q.id}" class="${q === p ? 'active' : ''}"${q === p ? ' aria-current="page"' : ''}>${allSolved(q) ? '✓ ' : ''}${q.title}</a>`).join('')}`;
}
function setPart(id) {
  if (id === HOME || id === '') return showContents();
  if (!PARTS.some((p) => p.id === id)) return showContents();
  st.part = id; const p = part(); frame.classList.remove('home');
  const open = p.steps.findIndex((x, k) => !isSolved(p, k)), i = open >= 0 ? Math.min(st.pos[id], open) : st.pos[id];      // never land behind an open question
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  chips(); show(i);
  document.title = `Quantum Simulators Workbook: ${p.title}`;
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
setPart(location.hash.slice(1));
