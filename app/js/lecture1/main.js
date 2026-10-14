// Lecture 1: one instrument (three wells / three sites), five acts.
import { Continuum } from './continuum.js';
import { ContinuumPanel, ChainPanel, ModesPanel } from './panels.js';
import { Plot } from '../plots.js';
import { el, button, row, slider, toggle, matrixView } from '../ui.js';
import { colors, invalidateTheme } from '../theme.js';
import { symEig, evolveExact, prob, components, tightBinding, fmt, dot, normalize } from '../linalg.js';
import { View3D } from '../view3d.js';
import { siteAxes } from '../chapters/kit.js';

const SQ = Math.SQRT1_2, D2R = Math.PI / 180;
const $ = (id) => document.getElementById(id);
const pct = (p) => Math.round(p * 100) + '%';
function cstr(re, im) {
  const m = Math.hypot(re, im); if (m < 0.005) return '0';
  const ph = Math.atan2(im, re) / D2R;
  if (Math.abs(ph) < 0.5) return fmt(m);
  if (Math.abs(Math.abs(ph) - 180) < 0.5) return '−' + fmt(m);
  return `${fmt(m)}·e<sup>${ph < 0 ? '−' : ''}i·${Math.abs(ph).toFixed(0)}°</sup>`;
}
const cvec = (p, cols) => `(${[0, 1, 2].map((i) => `<span style="color:${cols[i]}">${cstr(p.re[i], p.im[i])}</span>`).join(', ')})`;
const real = (v) => ({ re: v.slice(), im: [0, 0, 0] });

// ---------- model ----------
const store = { eps: [0, 0, 0], J: [1, 1] };
let H = tightBinding(store.eps, store.J), eig = symEig(H);
const refreshH = () => { H = tightBinding(store.eps, store.J); eig = symEig(H); };
const cont = new Continuum({ V0: 12 });
let act = 0, t = 0, playing = false, psi0 = real([1, 0, 0]), psi = real([1, 0, 0]), hist = [];
let drivesOn = false, inset = null, insetOn = false, beam = 0;

// ---------- panels ----------
const contPanel = new ContinuumPanel($('pane-cont').querySelector('canvas'));
const chainPanel = new ChainPanel($('pane-chain').querySelector('canvas'));
const modesPanel = new ModesPanel($('pane-modes').querySelector('canvas'));
const trace = new Plot($('pane-trace').querySelector('canvas'), { pad: { l: 46, r: 12, t: 24, b: 30 } });
const matBox = $('pane-matrix');
const matTitle = el('div', { class: 'mat-title' }), mat = matrixView(3, 3, { label: '<i>H</i> =' }), matNote = el('div', { class: 'mat-note' });
matBox.append(matTitle, mat.root, matNote);
const siteColor = () => { const c = colors(); return [c.v1, c.v2, c.v3]; };
const panes = { cont: $('pane-cont'), chain: $('pane-chain'), modes: $('pane-modes'), trace: $('pane-trace'), matrix: $('pane-matrix'), d3: $('pane-3d') };

// ---------- helpers ----------
const amps = () => cont.overlaps().c; // well amplitudes from the wave
const driveParts = (i) => { // contributions to (H psi)_i, head to tail
  const cols = siteColor(), c = colors(), parts = [];
  if (Math.abs(H[i][i]) > 1e-6) parts.push({ re: H[i][i] * psi.re[i], im: H[i][i] * psi.im[i], color: c['fg-2'] });
  for (const j of [i - 1, i + 1]) if (j >= 0 && j < 3 && Math.abs(H[i][j]) > 1e-6) parts.push({ re: H[i][j] * psi.re[j], im: H[i][j] * psi.im[j], color: cols[j] });
  return parts;
};
const driveScale = () => 0.5 / Math.max(1, ...H.flat().map(Math.abs));
const whichMode = () => { // index of the eigenstate psi0 is (within 1%), else -1
  const cs = components(eig, psi0);
  for (let n = 0; n < 3; n++) if (cs[n].re ** 2 + cs[n].im ** 2 > 0.99) return n;
  return -1;
};
const maxPop2FromSite1 = () => { let m = 0; for (let tt = 0; tt < 30; tt += 0.05) m = Math.max(m, prob(evolveExact(eig, real([1, 0, 0]), tt))[1]); return m; };

// ---------- acts ----------
const acts = [
  {
    id: 'discrete', tab: '1 · Discrete', heading: 'A particle in three wells',
    lead: 'A real wave in a real potential. A beam enters well 1. Deep wells: the wave only ever sits in the wells, so three numbers (and three clocks) describe it. That is a discrete system. Make the wells shallow and the wave spills out: the numbers no longer suffice.',
    panes: ['cont', 'chain', 'matrix'], speed: 1.2, canPlay: true,
    enter(ctl) {
      beam = 0; cont.prepareBeam(0); t = 0;
      ctl.append(group('beam into', [button('well 1', () => { beam = 0; cont.prepareBeam(0); t = 0; render(); }), button('well 2', () => { beam = 1; cont.prepareBeam(1); t = 0; render(); })]),
        slider({ id: 'depth', label: 'well depth', min: 2, max: 16, step: 0.5, value: cont.V0, format: (x) => x.toFixed(1), onInput: (v) => { cont.setDepth(v); cont.prepareBeam(beam); t = 0; render(); } }).root);
    },
    caption() {
      const o = cont.overlaps(), p = o.c.map((z) => z.re ** 2 + z.im ** 2);
      return `wells ${p.map(pct).join(' / ')} · ${(o.captured * 100).toFixed(0)}% of the wave is inside the three well modes` + (o.captured < 0.9 ? ' · shallow wells: the rest has spilled out, three numbers miss it.' : ' · three numbers are the whole story.');
    },
    render() {
      const cols = siteColor(), o = cont.overlaps();
      contPanel.draw(cont, { siteColors: cols, captured: o.captured });
      chainPanel.draw({ psi: { re: o.c.map((z) => z.re), im: o.c.map((z) => z.im) }, siteColors: cols, labels: ['well 1', 'well 2', 'well 3'], J: [cont.H3[0][1], cont.H3[1][2]], eps: [0, 0, 0], showDials: true, pct: true, title: 'the same wave as three numbers: how much (bar) and the clock (hand)' });
      matTitle.innerHTML = 'the 3 × 3 rule, computed from the wells'; mat.set(cont.H3);
      matNote.innerHTML = `hop J = ${fmt(cont.H3[0][1])} · on-site ε = ${fmt(cont.H3[0][0])}, ${fmt(cont.H3[1][1])}<br>direct 1↔3 hop ${fmt(cont.H3[0][2])} (far apart: negligible)<br>the sign of J is a convention: the course writes +J`;
    },
  },
  {
    id: 'state', tab: '2 · State', heading: 'A state is three numbers with clocks',
    lead: 'Forget the wave. The state is the list (ψ₁, ψ₂, ψ₃): a length (how much light) and an angle (the phase) per site. The squared lengths add up to 100%.',
    panes: ['chain'], speed: 0, canPlay: false,
    enter(ctl) {
      psi0 = real([SQ, SQ, 0]); psi = psi0; t = 0;
      const presets = [['site 1', [1, 0, 0]], ['site 2', [0, 1, 0]], ['1 + 2', [SQ, SQ, 0]], ['1 − 3', [SQ, 0, -SQ]], ['1 + 2 + 3', [1, 1, 1].map((x) => x / Math.sqrt(3))]];
      const sPh = slider({ id: 'ph2', label: 'phase of site 2', min: 0, max: 360, step: 1, value: 0, format: (x) => x.toFixed(0) + '°', onInput: (d) => { const a = d * D2R, m = Math.hypot(psi0.re[1], psi0.im[1]); psi0.re[1] = m * Math.cos(a); psi0.im[1] = m * Math.sin(a); psi = psi0; render(); } });
      ctl.append(group('prepare', presets.map(([l, v]) => button(l, () => { psi0 = real(v); psi = psi0; sPh.set(0); render(); }))), sPh.root);
    },
    caption() { const p = prob(psi); return `<i>ψ</i> = ${cvec(psi, siteColor())} → ${p.map(pct).join(' / ')} (sum ${pct(p[0] + p[1] + p[2])})`; },
    render() { chainPanel.draw({ psi, siteColors: siteColor(), J: [0, 0], eps: [0, 0, 0], showDials: true, pct: true, title: 'the state: bar = how much, hand = phase' }); },
  },
  {
    id: 'rule', tab: '3 · Rule', heading: 'The Hamiltonian is the rulebook',
    lead: 'Each site pushes its neighbours (J) and sets its own clock rate (ε). Nine numbers in a table. Press play and the rule moves the light.',
    panes: ['chain', 'matrix'], speed: 0.7, canPlay: true,
    enter(ctl) {
      store.eps = [0, 0, 0]; store.J = [1, 1]; refreshH(); psi0 = real([0, 1, 0]); psi = psi0; t = 0; drivesOn = false;
      const sJ = slider({ id: 'J', label: '<i>J</i>', min: -2, max: 2, step: 0.05, value: 1, onInput: (v) => { store.J = [v, v]; refreshH(); restart(); } });
      const sE = slider({ id: 'eps2', label: '<i>ε</i><sub>2</sub>', min: -3, max: 3, step: 0.1, value: 0, onInput: (v) => { store.eps[1] = v; refreshH(); restart(); } });
      ctl.append(group('light into', [button('site 2', () => { psi0 = real([0, 1, 0]); restart(); }), button('site 1', () => { psi0 = real([1, 0, 0]); restart(); })]), sJ.root, sE.root,
        toggle({ id: 'drive', label: 'show how the rule drives the clock of site 2', checked: false, onChange: (v) => { drivesOn = v; render(); } }).root);
    },
    caption() {
      const J = store.J[0], e2 = store.eps[1];
      let s = `<i>J</i> = ${fmt(J)}: light crosses one bond in about π/(2|<i>J</i>|) = ${fmt(Math.PI / (2 * Math.max(0.05, Math.abs(J))))}`;
      if (Math.abs(e2) > 1e-6) s += ` · <i>ε</i><sub>2</sub> = ${fmt(e2)}: site 2 runs off-pitch, from site 1 at most ${pct(maxPop2FromSite1())} ever reaches it`;
      return s + '.';
    },
    render() {
      chainPanel.draw({ psi, siteColors: siteColor(), J: store.J, eps: store.eps, showHops: true, showEps: true, showDials: true, pct: true, drive: drivesOn ? (i) => (i === 1 ? driveParts(1) : []) : null, driveScale: driveScale(), title: 'the rule in action' });
      matTitle.innerHTML = 'the rule as a table: row i = what drives site i'; mat.set(H);
      matNote.innerHTML = `i d<i>ψ</i><sub>2</sub>/dt = ε<sub>2</sub>ψ<sub>2</sub> + Jψ<sub>1</sub> + Jψ<sub>3</sub>`;
    },
  },
  {
    id: 'motion', tab: '4 · Motion', heading: 'Why an eigenstate stands still',
    lead: 'Three special patterns, the modes. For a mode every push is parallel to its hand, so the hands only turn, all at the same rate E, and the bars never move. Anything else is a mix of modes with different rates: that is motion.',
    panes: ['chain', 'modes', 'trace'], speed: 0.7, canPlay: true,
    enter(ctl) {
      store.eps = [0, 0, 0]; store.J = [1, 1]; refreshH(); psi0 = real([1, 0, 0]); drivesOn = true; restart();
      ctl.append(group('prepare', [button('site 1', () => { psi0 = real([1, 0, 0]); restart(); }), button('mode 1', () => { psi0 = real(eig.vectors[0]); restart(); }), button('mode 2', () => { psi0 = real(eig.vectors[1]); restart(); }), button('mode 3', () => { psi0 = real(eig.vectors[2]); restart(); }), button('mode 1 + mode 3', () => { psi0 = real(normalize(eig.vectors[0].map((x, i) => x + eig.vectors[2][i]))); restart(); })]),
        toggle({ id: 'drives', label: 'show the pushes on every clock', checked: true, onChange: (v) => { drivesOn = v; render(); } }).root);
    },
    caption() {
      const m = whichMode();
      if (m >= 0) return `mode ${m + 1}, <i>E</i> = ${fmt(eig.values[m])}: every push (orange) is at right angles to its hand, so the hands only turn, together, at rate <i>E</i>. The bars never change${Math.abs(eig.values[m]) < 1e-6 ? ': with E = 0 even the hands stand still' : ''}.`;
      const cs = components(eig, psi0).map((z) => z.re ** 2 + z.im ** 2);
      return `a mix of modes (${cs.map(pct).join(' / ')}): their clocks run at different rates, the pushes have parts along the hands, the bars move.`;
    },
    render() {
      const cols = siteColor();
      chainPanel.draw({ psi, siteColors: cols, J: store.J, eps: store.eps, showDials: true, pct: true, drive: drivesOn ? driveParts : null, driveScale: driveScale(), title: 'the state and the pushes on its clocks' });
      modesPanel.draw({ eig, comps: components(eig, psi), siteColors: cols, highlight: whichMode() });
      const T = 12, t0 = Math.max(0, t - T);
      trace.begin({ xlim: [t0, t0 + T], ylim: [0, 1.02], xlabel: 'time', ylabel: 'population' });
      const ts = hist.map((h) => h.t);
      [0, 1, 2].forEach((i) => trace.line(ts, hist.map((h) => h.p[i]), { color: cols[i], width: 2 }));
      trace.end();
    },
  },
  {
    id: 'hilbert', tab: '5 · Hilbert space', heading: 'One state, two ways to read it',
    lead: 'The state is a point in a space of states, the Hilbert space. The sites are one set of coordinates, the modes another. Same state, same motion: in site coordinates the bars dance, in mode coordinates only the clocks turn.',
    panes: ['chain', 'modes'], speed: 0.7, canPlay: true,
    enter(ctl) {
      store.eps = [0, 0, 0]; store.J = [1, 1]; refreshH(); psi0 = real([1, 0, 0]); drivesOn = false; restart();
      ctl.append(group('prepare', [button('site 1', () => { psi0 = real([1, 0, 0]); restart(); }), button('1 − 3', () => { psi0 = real([SQ, 0, -SQ]); restart(); }), button('mode 1 + mode 3', () => { psi0 = real(normalize(eig.vectors[0].map((x, i) => x + eig.vectors[2][i]))); restart(); }), button('mode 3', () => { psi0 = real(eig.vectors[2]); restart(); })]),
        toggle({ id: 'inset3d', label: 'show the state as an arrow (site axes and mode axes)', checked: insetOn, onChange: (v) => { insetOn = v; panes.d3.hidden = !v; $('stage').dataset.inset = v ? '1' : '0'; if (v) ensureInset(); if (inset) inset.view.setVisible(v); render(); } }).root);
    },
    caption() {
      const cs = components(eig, psi);
      return `site coordinates ${cvec(psi, siteColor())} change with time · mode coordinates (${cs.map((z, n) => cstr(z.re, z.im)).join(', ')}): lengths fixed, angles −<i>E</i><sub>n</sub><i>t</i>.`;
    },
    render() {
      const cols = siteColor();
      chainPanel.draw({ psi, siteColors: cols, J: store.J, eps: store.eps, showDials: true, pct: true, title: 'site coordinates: the three sites' });
      modesPanel.draw({ eig, comps: components(eig, psi), siteColors: cols, title: 'mode coordinates: the same state along the three modes' });
      if (insetOn && inset) updateInset();
    },
  },
];

// ---------- 3D inset (act 5) ----------
function ensureInset() {
  if (inset) return;
  inset = { view: new View3D(panes.d3) };
  inset.view.orbit.dist = 7.5;
  const cols = siteColor(), c = colors();
  inset.axes = siteAxes(inset.view, cols, { length: 1.4 }); inset.axes.forEach((a) => a.set(1));
  inset.modeArrows = eig.vectors.map((v, n) => { const a = inset.view.makeArrow({ color: c.axis, radius: 0.012, opacity: 0.8 }); a.set(v.map((x) => x * 1.25)); inset.view.addLabel(`mode ${n + 1}`, v.map((x) => x * 1.45), 'lbl-small'); return a; });
  inset.arrow = inset.view.makeArrow({ color: c.psi, radius: 0.03 });
  inset.view.addLabel('<i>ψ</i>(0)', () => psi0.re.map((x) => x * 1.2), 'lbl-psi');
}
function updateInset() { inset.arrow.set(psi0.re); inset.modeArrows.forEach((a, n) => a.set(eig.vectors[n].map((x) => x * 1.25))); inset.view.requestRender(); }

// ---------- shell ----------
const group = (label, btns) => el('div', { class: 'group' }, [el('span', { class: 'group-label', text: label }), ...btns]);
const ctl = $('controls'), captionEl = $('caption');
let playBtn = null, timeEl = null, lastNow = 0;
function restart() { t = 0; hist = []; psi = evolveExact(eig, psi0, 0); if (act === 0) cont.prepareBeam(beam); render(); }
function setPlaying(v) { playing = v; if (playBtn) playBtn.textContent = playing ? 'Pause' : 'Play'; }
function advance(dts) {
  if (act === 0) { let n = 0; const target = cont.t + dts; while (cont.t < target && n++ < 80) cont.step(0.01); t = cont.t; }
  else { t += dts; psi = evolveExact(eig, psi0, t); if (acts[act].id === 'motion') { const p = prob(psi); if (!hist.length || t > hist[hist.length - 1].t + 0.02) hist.push({ t, p }); while (hist.length && hist[0].t < t - 12) hist.shift(); } }
}
function render() { const a = acts[act]; a.render(); captionEl.innerHTML = a.caption(); if (timeEl) timeEl.textContent = a.canPlay ? `t = ${fmt(t, 1)}` : ''; }
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  if (playing) { advance(dt * acts[act].speed); render(); }
}
function showAct(i) {
  act = Math.max(0, Math.min(acts.length - 1, i));
  const a = acts[act];
  setPlaying(false); t = 0; hist = [];
  $('stage').dataset.act = a.id;
  for (const [k, p] of Object.entries(panes)) if (k !== 'd3') p.hidden = !a.panes.includes(k);
  panes.d3.hidden = !(a.id === 'hilbert' && insetOn); $('stage').dataset.inset = a.id === 'hilbert' && insetOn ? '1' : '0';
  if (inset) inset.view.setVisible(a.id === 'hilbert' && insetOn);
  $('heading').textContent = a.heading; $('lead').textContent = a.lead;
  document.querySelectorAll('.acts a').forEach((x, k) => x.classList.toggle('active', k === act));
  ctl.innerHTML = '';
  if (a.canPlay) { playBtn = button('Play', () => setPlaying(!playing), { kind: 'primary', id: 'play' }); timeEl = el('span', { class: 'time' }); ctl.append(row([playBtn, button('Restart', () => { restart(); }), timeEl])); } else { playBtn = null; timeEl = null; }
  a.enter(ctl);
  render();
  location.hash = a.id;
}
acts.forEach((a, i) => $('acts').append(el('a', { href: '#' + a.id, text: a.tab, onclick: (e) => { e.preventDefault(); showAct(i); } })));
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowRight') showAct(act + 1); if (e.key === 'ArrowLeft') showAct(act - 1);
  if (e.key === ' ' && acts[act].canPlay && !e.target.matches('button')) { e.preventDefault(); setPlaying(!playing); }
});
[contPanel, chainPanel, modesPanel].forEach((p) => { p.onRedraw = () => render(); });
trace.onRedraw = () => render();

// theme
const root = document.documentElement;
try { const th = localStorage.getItem('qsl-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) root.dataset.theme = 'light'; else root.dataset.theme = 'dark';
  try { localStorage.setItem('qsl-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  invalidateTheme(); if (inset) { inset.view.applyTheme(); const cols = siteColor(); inset.axes.forEach((a, i) => a.setColor(cols[i])); } render();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) { invalidateTheme(); render(); } });

const startId = (location.hash || '#discrete').slice(1);
showAct(Math.max(0, acts.findIndex((a) => a.id === startId)));
requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(frame); });
