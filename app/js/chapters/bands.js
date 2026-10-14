import { slider, toggle, readout, row, button, segmented, el } from '../ui.js';
import { colors } from '../theme.js';
import { ChainView } from '../chain.js';
import { Plot } from '../plots.js';
import { symEig, sshChain, sshBand, ipr, fmt } from '../linalg.js';

export default {
  id: 'bands', title: 'From three sites to bands', nav: 'Bands', use3d: false,
  mount({ store, panel, controls, stage2d, onThemeChange }) {
    const c = colors();
    panel.innerHTML = `
<h2>From three sites to bands</h2>
<p>Nothing changes for <i>N</i> sites except the size: the Hilbert space has <i>N</i> dimensions and <i>H</i> is an <i>N</i> × <i>N</i> matrix with
<span class="m"><i>ε</i><sub><i>i</i></sub></span> on the diagonal and the hoppings next to it. The vectors can no longer be drawn, but the <i>N</i> eigenvalues can (dots),
and so can every eigenvector, as an amplitude profile along the chain.</p>
<p><b>Uniform chain</b> (<span class="m"><i>J</i><sub>1</sub> = <i>J</i><sub>2</sub> = <i>J</i></span>):
<span class="m"><i>E</i><sub><i>n</i></sub> = 2<i>J</i> cos(<i>n</i>π/(<i>N</i>+1))</span> and <span class="m"><i>ψ</i><sub><i>n</i></sub>(<i>j</i>) ∝ sin(<i>n</i><i>j</i>π/(<i>N</i>+1))</span>:
standing waves with <i>n</i> − 1 nodes. As <i>N</i> grows the dots fill the interval <span class="m">[−2<i>J</i>, 2<i>J</i>]</span> more and more densely. This interval is the <b>band</b>.
In the infinite chain the levels form a continuum labelled by the wavenumber <i>k</i>, <span class="m"><i>E</i>(<i>k</i>) = 2<i>J</i> cos <i>k</i></span>.</p>
<p><b>Dimerized chain</b> (<span class="m"><i>J</i><sub>1</sub> ≠ <i>J</i><sub>2</sub></span>). The unit cell now holds two sites, A and B, and the <i>N</i> levels split into two groups: two bands,</p>
<div class="eq"><i>E</i><sub>±</sub>(<i>k</i>) = ±√(<i>Δ</i>² + <i>J</i><sub>1</sub>² + <i>J</i><sub>2</sub>² + 2<i>J</i><sub>1</sub><i>J</i><sub>2</sub> cos <i>k</i>),</div>
<p>separated by a gap of width <span class="m">2√(<i>Δ</i>² + (<i>J</i><sub>1</sub> − <i>J</i><sub>2</sub>)²)</span> in which no bulk state exists.</p>
<p><b>Edge states.</b> If the chain starts and ends with a weak bond (<span class="m"><i>J</i><sub>1</sub> &lt; <i>J</i><sub>2</sub></span>, <i>N</i> even), two levels sit in the middle of the gap and their
eigenvectors are localized at the two ends. These are the topological edge states of the SSH model (tasks 1–4). The staggered potential
<span class="m">±<i>Δ</i></span> on A and B sites pushes them away from <span class="m"><i>E</i> = 0</span> and onto one sublattice each (task 3).</p>
<div class="try"><b>Try.</b> Set <span class="m"><i>J</i><sub>1</sub> = <i>J</i><sub>2</sub> = 1</span> and raise <i>N</i> from 3 to 60: the band fills.
Set <span class="m"><i>J</i><sub>1</sub> = 1, <i>J</i><sub>2</sub> = 2</span>: a gap opens and two orange levels appear in it; click one and look at its profile.
Swap to <span class="m"><i>J</i><sub>1</sub> = 2, <i>J</i><sub>2</sub> = 1</span>: the gap stays, the edge states are gone. Try <i>N</i> = 21 (task 2).</div>`;

    stage2d.append(
      el('div', { class: 'plot-box' }, [el('canvas', { id: 'plot-levels' })]),
      el('div', { class: 'plot-box' }, [el('canvas', { id: 'plot-bands' })]),
      el('div', { class: 'plot-box' }, [el('canvas', { id: 'plot-heat' })]),
      el('div', { class: 'plot-box' }, [el('canvas', { id: 'plot-state' })]),
      el('div', { class: 'plot-box wide', style: 'min-height:130px' }, [el('canvas', { id: 'chain-bands', class: 'widget', style: 'position:absolute;inset:0;width:100%;height:100%;border:0' })]),
    );
    const pLevels = new Plot(stage2d.querySelector('#plot-levels'));
    const pBands = new Plot(stage2d.querySelector('#plot-bands'));
    const pHeat = new Plot(stage2d.querySelector('#plot-heat'), { pad: { l: 46, r: 14, t: 26, b: 36 } });
    const pState = new Plot(stage2d.querySelector('#plot-state'));
    const chain = new ChainView(stage2d.querySelector('#chain-bands'), { mode: 'signed', sublattice: true });

    const sN = slider({ id: 'N', label: '<i>N</i>', min: 3, max: 80, step: 1, value: 20, format: (x) => x.toFixed(0), onInput: () => { sel = Math.min(sel, sN.get() - 1); update(); } });
    const sJ1 = slider({ id: 'J1', label: '<i>J</i><sub>1</sub>', min: 0, max: 2, step: 0.05, value: 1, onInput: () => update() });
    const sJ2 = slider({ id: 'J2', label: '<i>J</i><sub>2</sub>', min: 0, max: 2, step: 0.05, value: 1, onInput: () => update() });
    const sD = slider({ id: 'Delta', label: '<i>Δ</i>', min: 0, max: 1, step: 0.05, value: 0, onInput: () => update() });
    const sSel = slider({ id: 'sel', label: '<i>n</i>', min: 1, max: 20, step: 1, value: 10, format: (x) => x.toFixed(0), onInput: () => { sel = sSel.get() - 1; draw(); } });
    const heatMode = segmented({ id: 'heatmode', options: [{ value: 'signed', label: 'ψ<sub>n</sub>(j)' }, { value: 'prob', label: '|ψ<sub>n</sub>(j)|²' }], value: 'signed', onChange: () => draw() });
    const showExact = toggle({ id: 'show-exact', label: 'Compare with 2<i>J</i> cos(<i>n</i>π/(<i>N</i>+1)) (uniform chain)', checked: true, onChange: () => draw() });
    const ro = readout([['gap', 'gap'], ['bands', 'bands'], ['edge', 'levels in the gap'], ['sel', 'selected <i>E</i><sub>n</sub>'], ['ipr', 'IPR of <i>ψ</i><sub>n</sub>']]);
    const presets = row([
      button('Uniform (1, 1)', () => { sJ1.set(1); sJ2.set(1); sD.set(0); update(); }),
      button('Trivial (2, 1)', () => { sJ1.set(2); sJ2.set(1); sD.set(0); update(); }),
      button('Topological (1, 2)', () => { sJ1.set(1); sJ2.set(2); sD.set(0); update(); }),
      button('Task 3 (1, 2, Δ = 0.5)', () => { sJ1.set(1); sJ2.set(2); sD.set(0.5); update(); }),
      button('N = 21', () => { sN.set(21); sel = Math.min(sel, 20); update(); }),
    ]);
    controls.append(sN.root, sJ1.root, sJ2.root, sD.root, presets, sSel.root, el('div', { class: 'widget-label', html: 'Colour map of all eigenvectors:' }), heatMode.root, showExact.root, ro.root);

    let eig = null, sel = 9, N = 20, gapHalf = 0, inGap = [];
    function update() {
      N = sN.get();
      const J1 = sJ1.get(), J2 = sJ2.get(), D = sD.get();
      eig = symEig(sshChain(N, J1, J2, D));
      gapHalf = Math.sqrt(D * D + (J1 - J2) ** 2);
      inGap = eig.values.map((E) => Math.abs(E) < gapHalf - 1e-6);
      sSel.input.max = N; sSel.set(sel + 1);
      draw();
    }
    function draw() {
      const J1 = sJ1.get(), J2 = sJ2.get(), D = sD.get();
      const ns = eig.values.map((_, i) => i + 1);
      const Emax = Math.max(2.2, J1 + J2 + 0.3, Math.sqrt(D * D + (J1 + J2) ** 2) + 0.3);
      // (A) levels
      pLevels.begin({ xlim: [0, N + 1], ylim: [-Emax, Emax], xlabel: 'index n', ylabel: 'Eₙ', title: 'Eigenvalues of the N-site chain' });
      if (gapHalf > 1e-6) pLevels.hspan(-gapHalf, gapHalf, { color: c.hpsi, alpha: 0.08 });
      if (showExact.get() && Math.abs(J1 - J2) < 1e-9 && D < 1e-9) {
        const ex = ns.map((n) => 2 * J1 * Math.cos(((N + 1 - n) * Math.PI) / (N + 1)));
        pLevels.dots(ns, ex, { color: 'transparent', r: 6 });
        const ctx = pLevels.ctx; ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1; ns.forEach((n, i) => { ctx.beginPath(); ctx.arc(pLevels.x(n), pLevels.y(ex[i]), 6, 0, 2 * Math.PI); ctx.stroke(); });
      }
      pLevels.hits = [];
      pLevels.dots(ns, eig.values, { colors: eig.values.map((E, i) => (inGap[i] ? c.hpsi : c.psi)), r: N > 40 ? 2.5 : 3.5, data: ns.map((n) => n - 1), tips: ns.map((n, i) => `n = ${n}: E = ${fmt(eig.values[i], 3)}`) });
      pLevels.dots([sel + 1], [eig.values[sel]], { color: 'transparent', r: 7 });
      { const ctx = pLevels.ctx; ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pLevels.x(sel + 1), pLevels.y(eig.values[sel]), 7, 0, 2 * Math.PI); ctx.stroke(); }
      pLevels.end();
      pLevels.legend([{ color: c.psi, label: 'bulk' }, { color: c.hpsi, label: 'in the gap' }], { x: 0, y: -12, align: 'right' });
      // (B) bands in k-space with the finite levels as lines
      const ks = Array.from({ length: 121 }, (_, i) => -Math.PI + (i * 2 * Math.PI) / 120);
      pBands.begin({ xlim: [-Math.PI, Math.PI], ylim: [-Emax, Emax], xlabel: 'wavenumber k', ylabel: 'E(k)', title: 'Infinite chain: E±(k), with the N levels as lines', xticks: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI], xtickFmt: (v) => ({ '-3.14': '−π', '-1.57': '−π/2', '0': '0', '1.57': 'π/2', '3.14': 'π' })[v.toFixed(2)] || '' });
      eig.values.forEach((E, i) => pBands.hline(E, { color: inGap[i] ? c.hpsi : c['fg-2'], alpha: inGap[i] ? 0.9 : 0.28, width: inGap[i] ? 1.5 : 1 }));
      const up = ks.map((k) => sshBand(J1, J2, D, k)), dn = up.map((e) => -e);
      pBands.line(ks, up, { color: c.psi, width: 2 }); pBands.line(ks, dn, { color: c.psi, width: 2 });
      pBands.end();
      // (C) heat map of all eigenvectors
      const signed = heatMode.get() === 'signed';
      const M = eig.vectors.map((v) => (signed ? v.slice() : v.map((x) => x * x)));
      pHeat.begin({ xlim: [0, N], ylim: [0, N], xlabel: 'site j', ylabel: 'eigenvector index n', title: signed ? 'ψₙ(j)  (blue < 0 < red)' : '|ψₙ(j)|²', xtickFmt: (v) => String(Math.round(v)), ytickFmt: (v) => String(Math.round(v)) });
      pHeat.heatmap(M, { cmap: signed ? 'div' : 'seq', vmin: signed ? undefined : 0, tips: (i, j) => `n = ${i + 1}, j = ${j + 1}: ${fmt(M[i][j], 3)}` });
      pHeat.hline(sel + 0.5, { color: c.fg, width: 1, dash: [3, 3] });
      pHeat.end();
      // (D) selected eigenvector
      const v = eig.vectors[sel], js = v.map((_, j) => j + 1);
      pState.begin({ xlim: [0, N + 1], ylim: [-1, 1], xlabel: 'site j', ylabel: 'ψₙ(j)', title: `Eigenvector n = ${sel + 1},  E = ${fmt(eig.values[sel], 3)}` });
      pState.hline(0, { color: c.line });
      pState.line(js, v, { color: c['fg-2'], width: 1 });
      pState.dots(js, v, { colors: v.map((x) => (x >= 0 ? c.pos : c.neg)), r: N > 40 ? 2.5 : 3.5, tips: js.map((j, i) => `j = ${j}: ${fmt(v[i], 3)}`) });
      pState.end();
      chain.set({ amp: v, J1, J2 });
      ro.set('gap', gapHalf > 1e-6 ? fmt(2 * gapHalf, 3) : '0 (metal)');
      const lo = Math.sqrt(D * D + (J1 - J2) ** 2), hi = Math.sqrt(D * D + (J1 + J2) ** 2);
      ro.set('bands', `[${fmt(-hi)}, ${fmt(-lo)}] ∪ [${fmt(lo)}, ${fmt(hi)}]`);
      ro.set('edge', String(inGap.filter(Boolean).length) + (inGap.filter(Boolean).length ? ': E = ' + eig.values.filter((_, i) => inGap[i]).map((E) => fmt(E, 3)).join(', ') : ''));
      ro.set('sel', fmt(eig.values[sel], 4));
      ro.set('ipr', fmt(ipr(v), 3) + ` (1/N = ${fmt(1 / N, 3)})`);
    }
    pLevels.onClick = (n) => { sel = n; sSel.set(sel + 1); draw(); };
    pHeat.onClick = (ij) => { sel = ij[0]; sSel.set(sel + 1); draw(); };
    pLevels.onRedraw = pBands.onRedraw = pHeat.onRedraw = pState.onRedraw = () => draw();
    onThemeChange(() => draw());
    update();
    return { unmount() { [pLevels, pBands, pHeat, pState].forEach((p) => p.dispose()); chain.dispose(); } };
  },
};
