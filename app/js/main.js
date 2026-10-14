import { View3D } from './view3d.js';
import { Tweens } from './tween.js';
import { invalidateTheme } from './theme.js';
import { el } from './ui.js';
import states from './chapters/states.js';
import sphere from './chapters/sphere.js';
import operator from './chapters/operator.js';
import phase from './chapters/phase.js';

const chapters = [states, sphere, operator, phase];

// Shared model: the three-site Hamiltonian and the current state follow the reader from chapter to chapter.
const store = { eps: [0, 0, 0], J: [1, 1], psi: [0.5, 0.7071, 0.5] };

const $ = (id) => document.getElementById(id);
const view = new View3D($('view3d'));
const tweens = new Tweens();
let current = null, currentId = null, themeCbs = [];

// ----- theme -----
const root = document.documentElement;
function applyTheme(t) {
  if (t) root.dataset.theme = t; else delete root.dataset.theme;
  try { if (t) localStorage.setItem('qsl-theme', t); else localStorage.removeItem('qsl-theme'); } catch (e) { /* storage unavailable */ }
  onThemeChanged();
}
function onThemeChanged() { invalidateTheme(); view.applyTheme(); for (const cb of themeCbs) cb(); }
try { const t = localStorage.getItem('qsl-theme'); if (t) root.dataset.theme = t; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(dark ? 'light' : 'dark');
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) onThemeChanged(); });

// ----- navigation -----
const rail = $('rail');
chapters.forEach((c, i) => {
  rail.append(el('a', { class: 'chap', href: '#' + c.id, id: 'nav-' + c.id }, [el('span', { class: 'num', text: String(i + 1) }), el('span', { text: c.nav })]));
});
function show(id) {
  const idx = Math.max(0, chapters.findIndex((c) => c.id === id));
  const chap = chapters[idx];
  if (currentId === chap.id) return;
  if (current) { current.unmount && current.unmount(); }
  tweens.cancelAll(); view.clear(); view.resetCamera(); themeCbs = [];
  $('panel').innerHTML = '';
  document.querySelectorAll('.rail a.chap').forEach((a) => a.classList.toggle('active', a.id === 'nav-' + chap.id));
  const ctx = { view, tweens, store, panel: $('panel'), stage: $('stage'), onThemeChange: (cb) => themeCbs.push(cb) };
  current = chap.mount(ctx) || {};
  currentId = chap.id;
  $('panel-wrap').scrollTop = 0;
  document.title = `${idx + 1}. ${chap.title} · Quantum Simulators Lab`;
}
const route = () => show((location.hash || '#' + chapters[0].id).slice(1));
window.addEventListener('hashchange', route);
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  const idx = chapters.findIndex((c) => c.id === currentId);
  if (e.key === 'ArrowRight' && e.altKey && chapters[idx + 1]) location.hash = chapters[idx + 1].id;
  if (e.key === 'ArrowLeft' && e.altKey && chapters[idx - 1]) location.hash = chapters[idx - 1].id;
});
route();
