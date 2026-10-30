// Exercise 1: Hilbert space and Task 1. One instrument (three waveguides, then twenty), six acts.
import { Continuum } from './continuum.js';
import { ContinuumPanel, ChainPanel, ModesPanel } from './panels.js';
import { Plot, niceTicks } from '../plots.js';
import { el, button, row, slider, toggle, matrixView } from '../ui.js';
import { colors, invalidateTheme } from '../theme.js';
import { symEig, evolveExact, prob, components, tightBinding, sshChain, fmt, normalize } from '../linalg.js';
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
const real = (v) => ({ re: v.slice(), im: v.map(() => 0) });

// ---------- model ----------
const store = { eps: [0, 0, 0], J: [1, 1] };
let H = tightBinding(store.eps, store.J), eig = symEig(H);
const refreshH = () => { H = tightBinding(store.eps, store.J); eig = symEig(H); };
const cont = new Continuum({ V0: 12 });
let act = 0, t = 0, playing = false, psi0 = real([1, 0, 0]), psi = real([1, 0, 0]), hist = [];
let drivesOn = false, inset = null, insetOn = false, beam = 0;
// Task 1: the N-guide chain
const eigUp = (e) => ({ values: e.values, vectors: e.vectors.map((v) => (v[0] < 0 ? v.map((x) => -x) : v)) }); // display sign: guide 1 positive, the textbook sin(njπ/(N+1))
let N = 20, eigN = eigUp(symEig(sshChain(N, 1, 1, 0))), psi0N = null, psiN = null, selN = -1, propRows = [];

// ---------- panels ----------
const contPanel = new ContinuumPanel($('pane-cont').querySelector('canvas'));
const chainPanel = new ChainPanel($('pane-chain').querySelector('canvas'));
const modesPanel = new ModesPanel($('pane-modes').querySelector('canvas'));
const trace = new Plot($('pane-trace').querySelector('canvas'), { pad: { l: 46, r: 12, t: 24, b: 30 } });
const eigPlot = new Plot($('pane-eig').querySelector('canvas'), { pad: { l: 46, r: 12, t: 26, b: 32 } });
const propPlot = new Plot($('pane-prop').querySelector('canvas'), { pad: { l: 46, r: 12, t: 26, b: 32 } });
const vecPlot = new Plot($('pane-vec').querySelector('canvas.top'), { pad: { l: 46, r: 12, t: 26, b: 24 } });
const rowPlot = new Plot($('pane-vec').querySelector('canvas.bottom'), { pad: { l: 46, r: 12, t: 24, b: 28 } });
let hoverN = -1;
const farPlot = new Plot($('pane-far').querySelector('canvas'), { pad: { l: 46, r: 12, t: 26, b: 32 } });
const matBox = $('pane-matrix');
const matTitle = el('div', { class: 'mat-title' }), mat = matrixView(3, 3, { label: '<i>H</i> =' }), matNote = el('div', { class: 'mat-note' });
matBox.append(matTitle, mat.root, matNote);
const siteColor = () => { const c = colors(); return [c.v1, c.v2, c.v3]; };
const panes = { cont: $('pane-cont'), chain: $('pane-chain'), modes: $('pane-modes'), trace: $('pane-trace'), matrix: $('pane-matrix'), d3: $('pane-3d'), eig: $('pane-eig'), prop: $('pane-prop'), vec: $('pane-vec'), far: $('pane-far') };
const piTick = (v) => { const names = { '-1': '−π', '-0.5': '−π/2', '0': '0', '0.5': 'π/2', '1': 'π' }; return names[String(Math.round((v / Math.PI) * 2) / 2)] ?? v.toFixed(1); };
// far field of the output: the array factor |Σ_j ψ_j e^{-iqj}|² times a gentle single-guide envelope; q = k₀ d sin θ
function drawFar(p, { marks = [], title = 'far field of the output (after a lens): the phases become fringes' } = {}) {
  const c = colors(), n = p.re.length, qs = Array.from({ length: 241 }, (_, i) => -Math.PI + (2 * Math.PI * i) / 240);
  const I = qs.map((q) => { let re = 0, im = 0; for (let j = 0; j < n; j++) { const cs = Math.cos(q * j), sn = -Math.sin(q * j); re += p.re[j] * cs - p.im[j] * sn; im += p.re[j] * sn + p.im[j] * cs; } return (re * re + im * im) * Math.exp(-((q * 0.27) ** 2) / 2); });
  const m = Math.max(1e-9, ...I), In = I.map((v) => v / m);
  farPlot.begin({ xlim: [-Math.PI, Math.PI], ylim: [0, 1.08], xticks: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI], xtickFmt: piTick, yticks: [0, 0.5, 1], xlabel: 'direction q = k₀ d sin θ (phase step per guide)', ylabel: 'relative intensity', title });
  farPlot.band(qs, qs.map(() => 0), In, { color: c.psi, alpha: 0.22 }); farPlot.line(qs, In, { color: c.psi, width: 2 });
  marks.forEach((q) => farPlot.vline(q, { color: c.hpsi, width: 1.5, dash: [4, 3] }));
  farPlot.end();
}

// ---------- helpers ----------
const driveParts = (i) => { // contributions to (H psi)_i, head to tail
  const cols = siteColor(), c = colors(), parts = [];
  if (Math.abs(H[i][i]) > 1e-6) parts.push({ re: H[i][i] * psi.re[i], im: H[i][i] * psi.im[i], color: c['fg-2'] });
  for (const j of [i - 1, i + 1]) if (j >= 0 && j < 3 && Math.abs(H[i][j]) > 1e-6) parts.push({ re: H[i][j] * psi.re[j], im: H[i][j] * psi.im[j], color: cols[j] });
  return parts;
};
const driveScale = () => 0.5 / Math.max(1, ...H.flat().map(Math.abs));
const whichMode = () => { const cs = components(eig, psi0); for (let n = 0; n < 3; n++) if (cs[n].re ** 2 + cs[n].im ** 2 > 0.99) return n; return -1; };
const maxPop2FromSite1 = () => { let m = 0; for (let tt = 0; tt < 30; tt += 0.05) m = Math.max(m, prob(evolveExact(eig, real([1, 0, 0]), tt))[1]); return m; };
const intTicks = (n, count) => niceTicks(0, n, Math.max(2, count)).filter((v) => Number.isInteger(v) && v >= 1 && v <= n);
const exactE = (n) => 2 * Math.cos(((N + 1 - n) * Math.PI) / (N + 1)); // ascending order, J = 1, hopping +J
function setupN(n) { N = n; eigN = eigUp(symEig(sshChain(N, 1, 1, 0))); selN = -1; exciteN(Math.ceil(N / 2) - 1); }
function exciteN(k) { psi0N = real(Array.from({ length: N }, (_, i) => (i === k ? 1 : 0))); selN = -1; restartN(); }
function launchModeN(n) { psi0N = real(eigN.vectors[n]); selN = n; restartN(); }
const DT_ROW = 0.1, T_END = 10;
function sampleRows() { while (propRows.length * DT_ROW <= t + 1e-9 && propRows.length * DT_ROW <= T_END + 1e-9) propRows.push(prob(evolveExact(eigN, psi0N, propRows.length * DT_ROW))); }
function restartN() { t = 0; propRows = []; psiN = evolveExact(eigN, psi0N, 0); sampleRows(); render(); }

// ---------- acts ----------
const acts = [
  {
    id: 'guides', tab: '1 · Waveguides', heading: 'Three waveguides: a wave becomes three numbers',
    lead: 'The refractive-index profile n(x) of three guides is a potential for light. A beam enters guide 1 and the paraxial Helmholtz equation runs along z, which plays the role of time. With a strong index contrast the light only ever sits in the guides: three amplitudes with three phases describe everything. That is a discrete system. Lower the contrast and the light spills out.',
    panes: ['cont', 'chain', 'matrix'], speed: 1.2, canPlay: true, tlabel: 'z',
    enter(ctl) {
      beam = 0; cont.prepareBeam(0); t = 0;
      ctl.append(group('beam into', [button('guide 1', () => { beam = 0; cont.prepareBeam(0); t = 0; render(); }), button('guide 2', () => { beam = 1; cont.prepareBeam(1); t = 0; render(); })]),
        slider({ id: 'depth', label: 'index contrast', min: 2, max: 16, step: 0.5, value: cont.V0, format: (x) => x.toFixed(1), onInput: (v) => { cont.setDepth(v); cont.prepareBeam(beam); t = 0; render(); } }).root);
    },
    caption() {
      const o = cont.overlaps(), p = o.c.map((z) => z.re ** 2 + z.im ** 2);
      return `guides ${p.map(pct).join(' / ')} · ${(o.captured * 100).toFixed(0)}% of the light is in the three guided modes` + (o.captured < 0.9 ? ' · weak contrast: the rest has leaked out, three numbers miss it.' : ' · three numbers tell the whole story.');
    },
    render() {
      const cols = siteColor(), o = cont.overlaps();
      contPanel.draw(cont, { siteColors: cols, captured: o.captured, labels: ['guide 1', 'guide 2', 'guide 3'], title: 'the field ψ(x) at this z: |ψ|² filled, Re ψ thin; grey = refractive-index profile n(x)' });
      chainPanel.draw({ psi: { re: o.c.map((z) => z.re), im: o.c.map((z) => z.im) }, siteColors: cols, labels: ['guide 1', 'guide 2', 'guide 3'], J: [cont.H3[0][1], cont.H3[1][2]], eps: [0, 0, 0], showDials: true, pct: true, title: 'the same field as three numbers: intensity (bar) and phase (hand)' });
      matTitle.innerHTML = 'the coupled-mode matrix, computed from n(x)'; mat.set(cont.H3);
      matNote.innerHTML = `coupling J = ${fmt(cont.H3[0][1])} (evanescent overlap) · on-site ε = ${fmt(cont.H3[0][0])}, ${fmt(cont.H3[1][1])} (propagation constants)<br>direct 1↔3 coupling ${fmt(cont.H3[0][2])}: far apart, negligible<br>the sign of J is a convention: the sessions write +J`;
    },
  },
  {
    id: 'state', tab: '2 · State', heading: 'The state: an amplitude and a phase per guide',
    lead: 'Forget the field. The state is the list (ψ₁, ψ₂, ψ₃): an amplitude (bar = intensity |ψᵢ|²) and a phase (the hand) per guide. The intensities add to 100%. Such a list is a vector, and the set of all of them is the Hilbert space of the three guides. The phases are invisible in the guides but not after a lens: the far field on the right is their interference pattern. Turn the phase of guide 2 and watch the fringes move.',
    panes: ['chain', 'far'], speed: 0, canPlay: false,
    enter(ctl) {
      psi0 = real([SQ, SQ, 0]); psi = psi0; t = 0;
      const presets = [['guide 1', [1, 0, 0]], ['guide 2', [0, 1, 0]], ['1 + 2', [SQ, SQ, 0]], ['1 − 3', [SQ, 0, -SQ]], ['1 + 2 + 3', [1, 1, 1].map((x) => x / Math.sqrt(3))]];
      const sPh = slider({ id: 'ph2', label: 'phase of guide 2', min: 0, max: 360, step: 1, value: 0, format: (x) => x.toFixed(0) + '°', onInput: (d) => { const a = d * D2R, m = Math.hypot(psi0.re[1], psi0.im[1]); psi0.re[1] = m * Math.cos(a); psi0.im[1] = m * Math.sin(a); psi = psi0; render(); } });
      ctl.append(group('prepare', presets.map(([l, v]) => button(l, () => { psi0 = real(v); psi = psi0; sPh.set(0); render(); }))), sPh.root);
    },
    caption() { const p = prob(psi); return `<i>ψ</i> = ${cvec(psi, siteColor())} → intensities ${p.map(pct).join(' / ')} (sum ${pct(p[0] + p[1] + p[2])})`; },
    render() { chainPanel.draw({ psi, siteColors: siteColor(), J: [0, 0], eps: [0, 0, 0], showDials: true, pct: true, title: 'the state: bar = intensity, hand = phase' }); drawFar(psi); },
  },
  {
    id: 'rule', tab: '3 · Coupling', heading: 'The coupled-mode equations are a matrix',
    lead: 'i dψ/dt = Hψ. Guide i pushes its neighbours with the coupling J and advances its own phase with ε (its propagation constant). Nine numbers in a table. Press play: this is the directional coupler.',
    panes: ['chain', 'matrix'], speed: 0.7, canPlay: true,
    enter(ctl) {
      store.eps = [0, 0, 0]; store.J = [1, 1]; refreshH(); psi0 = real([0, 1, 0]); psi = psi0; t = 0; drivesOn = false;
      const sJ = slider({ id: 'J', label: 'coupling <i>J</i>', min: -2, max: 2, step: 0.05, value: 1, onInput: (v) => { store.J = [v, v]; refreshH(); restart(); } });
      const sE = slider({ id: 'eps2', label: 'detuning <i>ε</i><sub>2</sub>', min: -3, max: 3, step: 0.1, value: 0, onInput: (v) => { store.eps[1] = v; refreshH(); restart(); } });
      ctl.append(group('light into', [button('guide 2', () => { psi0 = real([0, 1, 0]); restart(); }), button('guide 1', () => { psi0 = real([1, 0, 0]); restart(); })]), sJ.root, sE.root,
        toggle({ id: 'drive', label: 'show how the rule drives the phase of guide 2', checked: false, onChange: (v) => { drivesOn = v; render(); } }).root);
    },
    caption() {
      const J = store.J[0], e2 = store.eps[1];
      let s = `<i>J</i> = ${fmt(J)}: light crosses one coupling in about π/(2|<i>J</i>|) = ${fmt(Math.PI / (2 * Math.max(0.05, Math.abs(J))))}`;
      if (Math.abs(e2) > 1e-6) s += ` · <i>ε</i><sub>2</sub> = ${fmt(e2)}: guide 2 is detuned, from guide 1 at most ${pct(maxPop2FromSite1())} ever reaches it`;
      return s + '.';
    },
    render() {
      chainPanel.draw({ psi, siteColors: siteColor(), J: store.J, eps: store.eps, showHops: true, showEps: true, showDials: true, pct: true, drive: drivesOn ? (i) => (i === 1 ? driveParts(1) : []) : null, driveScale: driveScale(), title: 'the rule in action' });
      matTitle.innerHTML = 'the rule as a table: row i = what drives guide i'; mat.set(H);
      matNote.innerHTML = `i d<i>ψ</i><sub>2</sub>/dt = ε<sub>2</sub>ψ<sub>2</sub> + Jψ<sub>1</sub> + Jψ<sub>3</sub>`;
    },
  },
  {
    id: 'motion', tab: '4 · Supermodes', heading: 'Supermodes: the patterns that do not change',
    lead: 'Three special patterns, the supermodes (eigenstates). For a supermode every push is at right angles to its hand, so only the phases advance, all at the same rate E, and the intensities never move. Any other input is a mix of supermodes with different rates, and the beat between them moves the light. The far field shows the signs of a supermode: all in phase gives a bright centre, guides 1 and 3 in antiphase give a dark centre.',
    panes: ['chain', 'modes', 'trace', 'far'], speed: 0.7, canPlay: true,
    enter(ctl) {
      store.eps = [0, 0, 0]; store.J = [1, 1]; refreshH(); psi0 = real([1, 0, 0]); drivesOn = true; restart();
      ctl.append(group('prepare', [button('guide 1', () => { psi0 = real([1, 0, 0]); restart(); }), button('supermode 1', () => { psi0 = real(eig.vectors[0]); restart(); }), button('supermode 2', () => { psi0 = real(eig.vectors[1]); restart(); }), button('supermode 3', () => { psi0 = real(eig.vectors[2]); restart(); }), button('supermode 1 + 3', () => { psi0 = real(normalize(eig.vectors[0].map((x, i) => x + eig.vectors[2][i]))); restart(); })]),
        toggle({ id: 'drives', label: 'show the pushes on every phase', checked: true, onChange: (v) => { drivesOn = v; render(); } }).root);
    },
    caption() {
      const m = whichMode();
      if (m >= 0) return `supermode ${m + 1}, <i>E</i> = ${fmt(eig.values[m])}: every push (orange) is at right angles to its hand, so the hands only turn, together, at rate <i>E</i>. The intensities never change${Math.abs(eig.values[m]) < 1e-6 ? ': with E = 0 even the hands stand still' : ''}.`;
      const cs = components(eig, psi0).map((z) => z.re ** 2 + z.im ** 2);
      return `a mix of supermodes (${cs.map(pct).join(' / ')}): their phases advance at different rates, the pushes have parts along the hands, the intensities move.`;
    },
    render() {
      const cols = siteColor();
      chainPanel.draw({ psi, siteColors: cols, J: store.J, eps: store.eps, showDials: true, pct: true, drive: drivesOn ? driveParts : null, driveScale: driveScale(), title: 'the state and the pushes on its phases' });
      modesPanel.draw({ eig, comps: components(eig, psi), siteColors: cols, highlight: whichMode(), title: 'the three supermodes (eigenstates)' });
      const T = 12, t0 = Math.max(0, t - T);
      trace.begin({ xlim: [t0, t0 + T], ylim: [0, 1.02], xlabel: 'propagation t (= z)', ylabel: 'intensity' });
      const ts = hist.map((h) => h.t);
      [0, 1, 2].forEach((i) => trace.line(ts, hist.map((h) => h.p[i]), { color: cols[i], width: 2 }));
      trace.end();
      drawFar(psi, { title: whichMode() >= 0 ? 'far field: for a supermode it never changes' : 'far field: it changes as the relative phases turn' });
    },
  },
  {
    id: 'hilbert', tab: '5 · Hilbert space', heading: 'Hilbert space: one state, two bases',
    lead: 'The state is a point in the space of all states, the Hilbert space. The guides are one basis, the supermodes another: the same vector read in two coordinate systems. In guide coordinates the intensities move; in supermode coordinates only the phases turn.',
    panes: ['chain', 'modes'], speed: 0.7, canPlay: true,
    enter(ctl) {
      store.eps = [0, 0, 0]; store.J = [1, 1]; refreshH(); psi0 = real([1, 0, 0]); drivesOn = false; restart();
      ctl.append(group('prepare', [button('guide 1', () => { psi0 = real([1, 0, 0]); restart(); }), button('1 − 3', () => { psi0 = real([SQ, 0, -SQ]); restart(); }), button('supermode 1 + 3', () => { psi0 = real(normalize(eig.vectors[0].map((x, i) => x + eig.vectors[2][i]))); restart(); }), button('supermode 3', () => { psi0 = real(eig.vectors[2]); restart(); })]),
        toggle({ id: 'inset3d', label: 'show the state as an arrow (guide axes and supermode axes)', checked: insetOn, onChange: (v) => { insetOn = v; panes.d3.hidden = !v; $('stage').dataset.inset = v ? '1' : '0'; if (v) ensureInset(); if (inset) inset.view.setVisible(v); render(); } }).root);
    },
    caption() {
      const cs = components(eig, psi);
      return `guide coordinates ${cvec(psi, siteColor())} change along the way · supermode coordinates (${cs.map((z) => cstr(z.re, z.im)).join(', ')}): lengths fixed, phases −<i>E</i><sub>n</sub><i>t</i>.`;
    },
    render() {
      const cols = siteColor();
      chainPanel.draw({ psi, siteColors: cols, J: store.J, eps: store.eps, showDials: true, pct: true, title: 'guide coordinates' });
      modesPanel.draw({ eig, comps: components(eig, psi), siteColors: cols, title: 'supermode coordinates: the same state' });
      if (insetOn && inset) updateInset();
    },
  },
  {
    id: 'task1', tab: '6 · Task 1', heading: 'Task 1: twenty guides',
    lead: 'The same Hilbert space with twenty guides: twenty amplitudes, a 20 × 20 coupled-mode matrix with J = 1, twenty supermodes. The two figures of Task 1: the eigenvalues as dots and the eigenstates as a colour plot. Click a dot to launch that supermode, or excite one guide and watch discrete diffraction.',
    panes: ['chain', 'eig', 'prop', 'vec', 'far'], speed: 1.0, canPlay: true,
    enter(ctl) {
      setupN(N);
      const sN = slider({ id: 'N', label: 'guides <i>N</i>', min: 3, max: 41, step: 1, value: N, format: (x) => x.toFixed(0), onInput: (v) => { setupN(v); } });
      const sM = slider({ id: 'mode', label: 'supermode <i>n</i>', min: 1, max: N, step: 1, value: 1, format: (x) => x.toFixed(0), onInput: (v) => { launchModeN(v - 1); } });
      ctl.append(group('excite', [button('middle guide', () => exciteN(Math.ceil(N / 2) - 1)), button('guide 1', () => exciteN(0))]), sM.root, sN.root,
        toggle({ id: 'exact', label: 'compare with Eₙ = −2J cos(nπ/(N+1)), n sorted ascending', checked: true, onChange: () => render() }).root);
      this._sM = sM;
    },
    caption() {
      const p = prob(psiN);
      const extra = selN >= 0 ? `supermode ${selN + 1}, <i>E</i> = ${fmt(eigN.values[selN], 3)}: a standing wave with ${N - selN - 1} sign changes = two tilted waves, so the far field has two peaks at ±kₙ = ±${fmt(((N - selN) * Math.PI) / (N + 1))}; the pattern does not change along the way, only its phase.` : `one guide excited: a mix of all ${N} supermodes, the light spreads ballistically (discrete diffraction).`;
      return `<i>N</i> = ${N}, <i>J</i> = 1: ${N} supermodes, sorted ascending: <i>E</i><sub>n</sub> = −2<i>J</i> cos(<i>n</i>π/(<i>N</i>+1)) · ${extra}`;
    },
    render() {
      const c = colors(), cols = siteColor();
      const p = prob(psiN);
      const pMax = Math.max(...p), rel = N > 8;
      chainPanel.draw({ psi: psiN, siteColors: Array.from({ length: N }, () => c.psi), J: Array.from({ length: N - 1 }, () => 1), eps: psiN.re.map(() => 0), showDials: false, pct: false, barRef: rel ? Math.max(pMax, 1e-6) : 1, title: `the ${N} guides: intensity now${rel ? ` (bars relative to the brightest guide, ${(100 * pMax).toFixed(0)}%)` : ''}` });
      // eigenvalues as dots (fig. 1)
      const ns = eigN.values.map((_, i) => i + 1);
      const xt = intTicks(N, Math.floor(eigPlot.w / 70)), yt = intTicks(N, Math.floor(vecPlot.h / 40));
      eigPlot.begin({ xlim: [0.5, N + 0.5], ylim: [-2.3, 2.3], xticks: xt, xlabel: 'supermode index n', ylabel: 'Eₙ', title: 'fig. 1: eigenvalues as dots' });
      if ($('exact') && $('exact').checked) { const ctx = eigPlot.ctx; ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1; ns.forEach((n) => { ctx.beginPath(); ctx.arc(eigPlot.x(n), eigPlot.y(exactE(n)), 6, 0, 2 * Math.PI); ctx.stroke(); }); }
      eigPlot.dots(ns, eigN.values, { color: c.psi, r: N > 30 ? 2.5 : 3.5, data: ns.map((n) => n - 1), tips: ns.map((n, i) => `n = ${n}: E = ${fmt(eigN.values[i], 3)}`) });
      if (selN >= 0) { const ctx = eigPlot.ctx; ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(eigPlot.x(selN + 1), eigPlot.y(eigN.values[selN]), 8, 0, 2 * Math.PI); ctx.stroke(); }
      eigPlot.end();
      // eigenstates as a colour plot (fig. 2)
      vecPlot.begin({ xlim: [0.5, N + 0.5], ylim: [0.5, N + 0.5], xticks: xt, yticks: yt, xlabel: '', ylabel: 'supermode n', title: 'fig. 2: one row per supermode, red = +, blue = −' });
      vecPlot.heatmap(eigN.vectors, { cmap: 'div', x0: 0.5, y0: 0.5, tips: (i, j) => `n = ${i + 1}, j = ${j + 1}: ${fmt(eigN.vectors[i][j], 3)}` });
      if (selN >= 0) vecPlot.hline(selN + 1, { color: c.hpsi, width: 2 });
      if (hoverN >= 0 && hoverN !== selN) vecPlot.hline(hoverN + 1, { color: c.fg, width: 1, dash: [4, 3] });
      vecPlot.end();
      // the hovered or selected row of fig. 2 as signed bars
      const rowN = hoverN >= 0 ? hoverN : selN;
      const rv = rowN >= 0 ? eigN.vectors[rowN] : null, rm = rv ? Math.max(0.2, ...rv.map(Math.abs)) * 1.15 : 1;
      rowPlot.begin({ xlim: [0.5, N + 0.5], ylim: [-rm, rm], xticks: xt, yticks: [-0.5, 0, 0.5].filter((v) => Math.abs(v) < rm), xlabel: 'guide j', ylabel: 'ψₙ(j)', title: rv ? `row ${rowN + 1} as bars: supermode ${rowN + 1}, a standing wave (${rowN === selN ? 'launched' : 'click to launch'})` : 'hover over fig. 2: each row is one supermode, a standing wave' });
      rowPlot.hline(0, { color: c.line });
      if (rv) { const ctx = rowPlot.ctx, bw = Math.max(2, (rowPlot.x(2) - rowPlot.x(1)) * 0.7); rv.forEach((x, j) => { ctx.fillStyle = x >= 0 ? c.pos : c.neg; const X = rowPlot.x(j + 1) - bw / 2, Y0 = rowPlot.y(0), Y1 = rowPlot.y(x); ctx.fillRect(X, Math.min(Y0, Y1), bw, Math.abs(Y1 - Y0)); }); }
      rowPlot.end();
      // propagation map: intensity along z
      const nRows = Math.round(T_END / DT_ROW), tTicks = [0, 2, 4, 6, 8, 10].map((v) => v / DT_ROW);
      propPlot.begin({ xlim: [0.5, N + 0.5], ylim: [0, nRows], xticks: xt, yticks: tTicks, ytickFmt: (v) => String(Math.round(v * DT_ROW)), xlabel: 'guide j', ylabel: 'propagation t (= z)', title: 'intensity along the way' });
      if (propRows.length) { const late = propRows.slice(Math.min(propRows.length - 1, Math.round(0.5 / DT_ROW))); propPlot.heatmap(propRows, { cmap: 'seq', vmin: 0, vmax: Math.max(0.02, ...late.map((r) => Math.max(...r))), x0: 0.5, y0: 0 }); }
      propPlot.end();
      const kSel = selN >= 0 ? ((N - selN) * Math.PI) / (N + 1) : null;
      drawFar(psiN, { marks: kSel !== null ? [-kSel, kSel] : [], title: selN >= 0 ? 'far field: the sign pattern gives two peaks at ±kₙ' : 'far field of the output now' });
      if (this._sM) { this._sM.input.max = N; if (selN >= 0) this._sM.set(selN + 1); else this._sM.set(Math.min(+this._sM.input.value, N)); }
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
  inset.modeArrows = eig.vectors.map((v, n) => { const a = inset.view.makeArrow({ color: c.axis, radius: 0.012, opacity: 0.8 }); a.set(v.map((x) => x * 1.25)); inset.view.addLabel(`supermode ${n + 1}`, v.map((x) => x * 1.45), 'lbl-small'); return a; });
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
  const id = acts[act].id;
  if (id === 'guides') { let n = 0; const target = cont.t + dts; while (cont.t < target && n++ < 80) cont.step(0.01); t = cont.t; }
  else if (id === 'task1') { t += dts; if (t > T_END) { t = T_END; setPlaying(false); } psiN = evolveExact(eigN, psi0N, t); sampleRows(); }
  else { t += dts; psi = evolveExact(eig, psi0, t); if (id === 'motion') { const p = prob(psi); if (!hist.length || t > hist[hist.length - 1].t + 0.02) hist.push({ t, p }); while (hist.length && hist[0].t < t - 12) hist.shift(); } }
}
function render() { const a = acts[act]; a.render(); captionEl.innerHTML = a.caption(); if (timeEl) timeEl.textContent = a.canPlay ? `${a.tlabel || 't'} = ${fmt(t, 1)}` : ''; }
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
  if (a.canPlay) { playBtn = button('Play', () => setPlaying(!playing), { kind: 'primary', id: 'play' }); timeEl = el('span', { class: 'time' }); ctl.append(row([playBtn, button('Restart', () => (a.id === 'task1' ? restartN() : restart())), timeEl])); } else { playBtn = null; timeEl = null; }
  a.enter(ctl);
  render();
  location.hash = a.id;
}
eigPlot.onClick = (n) => { launchModeN(n); };
vecPlot.onClick = (ij) => { launchModeN(ij[0]); };
vecPlot.onHover = (ij) => { const n = ij ? ij[0] : -1; if (n !== hoverN) { hoverN = n; if (acts[act].id === 'task1') render(); } };
acts.forEach((a, i) => $('acts').append(el('a', { href: '#' + a.id, text: a.tab, onclick: (e) => { e.preventDefault(); showAct(i); } })));
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowRight') showAct(act + 1); if (e.key === 'ArrowLeft') showAct(act - 1);
  if (e.key === ' ' && acts[act].canPlay && !e.target.matches('button')) { e.preventDefault(); setPlaying(!playing); }
});
[contPanel, chainPanel, modesPanel].forEach((p) => { p.onRedraw = () => render(); });
[trace, eigPlot, propPlot, vecPlot, rowPlot, farPlot].forEach((p) => { p.onRedraw = () => render(); });

// theme
const root = document.documentElement;
try { const th = localStorage.getItem('qsl-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('qsl-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  invalidateTheme(); if (inset) { inset.view.applyTheme(); const cols = siteColor(); inset.axes.forEach((a, i) => a.setColor(cols[i])); } render();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) { invalidateTheme(); render(); } });

const startId = (location.hash || '#guides').slice(1);
showAct(Math.max(0, acts.findIndex((a) => a.id === startId)));
window.addEventListener('hashchange', () => { const i = acts.findIndex((a) => a.id === location.hash.slice(1)); if (i >= 0 && i !== act) showAct(i); });
requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(frame); });
