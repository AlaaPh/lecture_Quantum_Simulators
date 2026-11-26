// Workbook: the students calculate the Zak phase (task 8), the Thouless pump (task 9) and its Chern number
// themselves, in small steps that are checked at once. Four tabs. Each has a lead text, the step blocks with their
// fields, and the figures that fill in with the right answers.
// Conventions: H(k) = [[Δ, h*], [h, −Δ]], h(k) = J₁ + J₂e^{ik}, basis (A, B), +Δ on A, lower band = smallest eigenvalue,
// k_s = 2π(s − 1)/M, γ = −arg of the closed product of overlaps, C = (sum of the plaquette phases)/2π.
// Files: model.js (physics), answers.js (reading a typed value), fields.js (the fields and their storage),
// content.js (the steps), pump.js (data of the pump), figures.js (the drawings), this file (the page shell).
import { el, button, row, slider } from '../ui.js';
import { invalidateTheme } from '../theme.js';
import { fmt } from '../linalg.js';
import { onChange, progress, resetAll, restore, refreshDynamics } from './fields.js';
import { builders } from './content.js';
import { draw, everyPanel, count, leading } from './figures.js';
import { T_VALUES, DT, CELLS, paramsAt, simulation } from './pump.js';

const $ = (id) => document.getElementById(id);
const num = (x, d = 2) => fmt(x, d).replace('-', '−');

// ---------- state ----------
let act = 0, playing = false;
const pump = { s: 0, T: T_VALUES[0], input: 'pair', sheet: false };       // tab 3: time s = t/T, period, input, parameter set
const CYCLE_SECONDS = 12;                                                  // one cycle on the screen, for every T

// ---------- acts ----------
const group = (label, btns) => el('div', { class: 'group' }, [el('span', { class: 'group-label', text: label }), ...btns]);
const pressed = (btn, on) => { btn.setAttribute('aria-pressed', String(on)); return btn; };
let tsSlider = null;
const acts = [
  {
    id: 'hand', tab: '1 · Zak phase by hand', heading: 'Zak phase by hand: four values of k (task 8)',
    lead: 'The overlap ⟨u|v⟩ = u_A*·v_A + u_B*·v_B of two eigenvectors is one complex number, and arg is its angle. u and e^(iχ)·u are the same eigenvector, so one overlap has no fixed angle, but in a closed loop every e^(iχ) cancels. Berry phase of a closed loop = −arg(product of the overlaps around the loop), and the loop once through all k from 0 to 2π gives the Zak phase γ.',
    panes: ['wa', 'wcircle', 'wturn'], canPlay: false,
    enter(ctl) { ctl.append(el('a', { class: 'btn', href: 'pdf/zak_chern_worksheet.pdf', download: '', text: 'worksheet (PDF)' })); },
    caption() {
      const pts = 1 + count([2, 3, 4].map((s) => `A1-h${s}`)), turns = leading([1, 2, 3, 4].map((s) => `A2-ang${s}`)), turns5 = leading([1, 2, 3, 4].map((s) => `A5-ang${s}`));
      return `A point h(k<sub>s</sub>) appears on the circle when h of its row is right, its dashed ray when the angle φ is right: ${pts} of 4 points so far. The dial starts at 0 and turns by −arg of each overlap that is right, in the order of the loop: ${turns} of 4 turns for J₁ = 1, J₂ = 2 and ${turns5} of 4 for J₁ = 2, J₂ = 1. Where the dial stops after the fourth turn is γ.`;
    },
    render() { draw.hand(); },
  },
  {
    id: 'code', tab: '2 · Zak phase, your code', heading: 'Zak phase in your own code',
    lead: 'The computer chooses the phase factor e^(iχ) of every eigenvector anew at every k. In the closed loop each χ enters one overlap as e^(+iχ) and the next one as e^(−iχ): together 1, so the product of the overlaps is fixed. With an on-site term the Zak phase is no longer 0 or π: γ/2π is the position of the light of this band inside the unit cell.',
    panes: ['wb', 'wconv', 'wpos'], canPlay: false,
    enter() {},
    caption: () => 'Type the numbers that your code prints. A dot appears at (M, γ/π) for every value that is right, and the curve through the dots when the value for the largest M is right. Lower figure: γ/2π on the way from one unit cell to the next. 0 is the pair (A, B) of a cell, 0.5 is half a cell further, on the pair (B, next A).',
    render() { draw.code(); },
  },
  {
    id: 'pump', tab: '3 · Thouless pump (task 9)', heading: 'The Thouless pump (task 9)',
    lead: 'Pump: J₁, J₂ and Δ go slowly through one cycle of length T, so the Zak phase γ depends on the time t. γ/2π is the position of the light of the lower band inside the unit cell. Chern number C = how often γ goes around in one cycle = unit cells that the light moves per cycle.',
    panes: ['wc', 'wcycle', 'wbands', 'wlevels', 'wlight', 'wshift'], canPlay: true,
    enter(ctl) {
      tsSlider = slider({ id: 'ts', label: '<i>t</i> / <i>T</i>', min: 0, max: 1, step: 0.005, value: pump.s, format: (v) => v.toFixed(2), onInput: (v) => { pump.s = v; setPlaying(false); render(); } });
      const pair = button('pair (A − B)/√2', () => setInput('pair'), { id: 'in-pair', title: 'amplitude 1/√2 on guide A and −1/√2 on guide B of the middle cell: the lower band at t = 0' }), guide = button('one guide', () => setInput('guide'), { id: 'in-guide', title: 'all light on guide A of the middle cell' });
      const sheet = button('numbers of the sheet', () => { pump.sheet = !pump.sheet; pressed(sheet, pump.sheet); render(); }, { id: 'sheet', title: 'δJ = 0.5, Δ₀ = 0.2 as on the task sheet, in place of δJ = 1, Δ₀ = 0.5' });
      const setInput = (v) => { pump.input = v; pressed(pair, v === 'pair'); pressed(guide, v === 'guide'); render(); };
      pressed(pair, pump.input === 'pair'); pressed(guide, pump.input === 'guide'); pressed(sheet, pump.sheet);
      const period = slider({ id: 'T', label: '<i>T</i>', min: 0, max: T_VALUES.length - 1, step: 1, value: T_VALUES.indexOf(pump.T), format: (v) => String(T_VALUES[v]), onInput: (v) => { pump.T = T_VALUES[v]; render(); } });
      period.root.classList.add('wb-short'); period.input.setAttribute('aria-valuetext', `T = ${pump.T}`);
      period.input.addEventListener('input', () => period.input.setAttribute('aria-valuetext', `T = ${pump.T}`));
      ctl.append(tsSlider.root, period.root, group('input', [pair, guide]), sheet);
    },
    caption() {
      const p = paramsAt(pump.sheet, pump.s), sim = simulation(pump.sheet, pump.T, pump.input);
      return `t/T = ${pump.s.toFixed(2)}: J₁ = ${num(p.J1)}, J₂ = ${num(p.J2)}, Δ = ${num(p.D)} · ${pump.sheet ? 'numbers of the sheet, ' : ''}T = ${pump.T} on ${CELLS[pump.sheet ? 'sheet' : 'hand'][pump.T]} unit cells, dt = ${DT}, input ${pump.input === 'pair' ? '(A − B)/√2 on one cell' : 'one guide A alone'} · d shows the cells −${sim.W} … ${sim.W}: the light spreads, because the band is not flat during the cycle. X is its mean position, the orange line in d and the blue curve in e.`;
    },
    render() { draw.pump(pump); },
  },
  {
    id: 'chern', tab: '4 · Chern number', heading: 'The Chern number from plaquettes',
    lead: 'The change of γ between two neighbouring times is itself the Berry phase of a closed loop. Cut it into small squares, the plaquettes: inner edges are walked once in each direction and drop out. So the plaquettes between two times add up to the change of γ, up to a multiple of 2π, and C = (sum of all plaquette phases)/2π.',
    panes: ['wd', 'wmap', 'wgamma', 'wloops'], canPlay: false,
    enter() {},
    caption() {
      const cols = count([1, 2, 3, 4].map((j) => `B7-col${j}`));
      return `Map: one cell per plaquette, k upward and t to the right, the row “sum” below it holds the four column sums. The cell with the thick frame is the plaquette of B6 and fills in when F is right. A column fills in when its sum is right: ${cols} of 4 so far. Each right column sum adds a dot to γ(t): the step from one time to the next. Lower right: the cycles of B8, each with an arrow in the direction of the time and a dot at t = 0.`;
    },
    render() { draw.chern(); },
  },
];
const panes = Object.fromEntries(['wa', 'wb', 'wc', 'wd', 'wcircle', 'wturn', 'wconv', 'wpos', 'wcycle', 'wbands', 'wlevels', 'wlight', 'wshift', 'wmap', 'wgamma', 'wloops'].map((k) => [k, $('pane-' + k)]));

// ---------- shell ----------
const ctl = $('controls'), captionEl = $('caption');
let playBtn = null, timeEl = null, progressEl = null, lastNow = 0;
const built = new Set();                  // the tabs whose fields exist
function setPlaying(v) { playing = v; if (playBtn) playBtn.textContent = playing ? 'Pause' : 'Play'; }
function advance(dts) { if (pump.s >= 1 - 1e-9) pump.s = 0; pump.s = Math.min(1, pump.s + dts / CYCLE_SECONDS); if (pump.s >= 1) setPlaying(false); }
// A redraw: the canvases of this tab, the caption and the counters. The fields are not touched.
function render() {
  const a = acts[act];
  a.render(); captionEl.innerHTML = a.caption();
  if (timeEl) timeEl.textContent = `t = ${(pump.s * pump.T).toFixed(1)}`;
  if (tsSlider && a.canPlay) tsSlider.set(pump.s);
  if (progressEl) { const p = progress(a.id); progressEl.textContent = `right: ${p.ok} of ${p.total}`; }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  if (playing) { advance(dt); render(); }
}
function showAct(i) {
  act = Math.max(0, Math.min(acts.length - 1, i));
  const a = acts[act], stepsPane = panes[a.panes[0]];
  setPlaying(false); tsSlider = null;
  if (!built.has(a.id)) { stepsPane.append(...builders[a.id]()); built.add(a.id); refreshDynamics(); }     // the fields of a tab are built once
  $('stage').dataset.act = a.id;
  for (const [key, p] of Object.entries(panes)) p.hidden = !a.panes.includes(key);
  $('heading').textContent = a.heading; $('lead').textContent = a.lead;
  document.querySelectorAll('.acts a').forEach((x, n) => { x.classList.toggle('active', n === act); if (n === act) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
  ctl.innerHTML = ''; playBtn = null; timeEl = null;
  if (a.canPlay) { playBtn = button('Play', () => setPlaying(!playing), { kind: 'primary', id: 'play' }); timeEl = el('span', { class: 'time', id: 'time' }); ctl.append(row([playBtn, button('Restart', () => { pump.s = 0; setPlaying(false); render(); }, { id: 'restart' }), timeEl])); }
  a.enter(ctl);
  progressEl = el('span', { class: 'time wb-progress', id: 'progress' });
  ctl.append(el('span', { class: 'spacer' }), progressEl, button('reset', () => { if (window.confirm('Clear every value that you typed on the four tabs of this page?')) resetAll(); }, { id: 'reset', title: 'Clear every value that you typed on this page' }));
  render();
  if (location.hash !== '#' + a.id) history.replaceState(null, '', '#' + a.id);
}
acts.forEach((a, i) => $('acts').append(el('a', { href: '#' + a.id, text: a.tab, onclick: (e) => { e.preventDefault(); showAct(i); } })));
// Keys: the arrows change the tab and the space bar plays, but never while a field or a slider has the focus.
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') showAct(act + 1); if (e.key === 'ArrowLeft') showAct(act - 1);
  if (e.key === ' ' && !e.target.matches('button, a, summary') && acts[act].canPlay) { e.preventDefault(); setPlaying(!playing); }
});
everyPanel.forEach((p) => { p.onRedraw = () => render(); });
onChange(() => render());                       // a verdict has changed: the figures may show more

// theme
const root = document.documentElement;
try { const th = localStorage.getItem('qsl-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('qsl-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  invalidateTheme(); render();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) { invalidateTheme(); render(); } });

restore();                                      // the typed strings of the last visit, checked again
const startId = (location.hash || '#hand').slice(1);
showAct(Math.max(0, acts.findIndex((a) => a.id === startId)));
window.addEventListener('hashchange', () => { const i = acts.findIndex((a) => a.id === location.hash.slice(1)); if (i >= 0 && i !== act) showAct(i); });
requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(frame); });
