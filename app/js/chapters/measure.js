import { toggle, readout, row, button, segmented, el } from '../ui.js';
import { colors } from '../theme.js';
import { matvec, normalize, dot, symEig, fmt } from '../linalg.js';
import { stateArrow, presetButtons, hamiltonianOf, hSliders } from './kit.js';

export default {
  id: 'measure', title: 'Measuring is projecting', nav: 'Measurement', use3d: true,
  mount({ view, tweens, store, panel, controls, onThemeChange }) {
    const c = colors();
    panel.innerHTML = `
<h2>Measuring is projecting</h2>
<p>A measurement asks a question with a fixed list of answers. "Which site?" has the answers 1, 2, 3, one per basis vector <span class="m"><i>e</i><sub><i>i</i></sub></span>.
The probability of answer <i>i</i> is the squared length of the shadow of <i>ψ</i> on <span class="m"><i>e</i><sub><i>i</i></sub></span>:</p>
<div class="eq"><i>p</i><sub><i>i</i></sub> = |⟨<i>e</i><sub><i>i</i></sub>|<i>ψ</i>⟩|² = <i>ψ</i><sub><i>i</i></sub>².</div>
<p>After the measurement the state is <span class="m"><i>e</i><sub><i>i</i></sub></span>: the vector has jumped onto the axis of the answer.</p>
<p>Pythagoras guarantees <span class="m"><i>p</i><sub>1</sub> + <i>p</i><sub>2</sub> + <i>p</i><sub>3</sub> = |<i>ψ</i>|² = 1</span>. The Born rule is normalization in a different costume.</p>
<p>A different question uses a different frame. "Which energy?" projects <i>ψ</i> onto the eigenvectors <span class="m"><i>v</i><sub><i>n</i></sub></span>:
<span class="m"><i>P</i>(<i>E</i><sub><i>n</i></sub>) = |⟨<i>v</i><sub><i>n</i></sub>|<i>ψ</i>⟩|²</span>, and the state jumps to <span class="m"><i>v</i><sub><i>n</i></sub></span>.
The mean energy <span class="m">Σ<sub><i>n</i></sub> <i>P</i>(<i>E</i><sub><i>n</i></sub>) <i>E</i><sub><i>n</i></sub></span> equals <span class="m">⟨<i>ψ</i>|<i>H</i>|<i>ψ</i>⟩</span>, the quantity that coloured the sphere in chapter 4.</p>
<p>A vector cannot lie on an axis of both frames unless the frames share that axis. A state with a sharp position (<span class="m"><i>e</i><sub>2</sub></span>) has a spread of energies;
a state with a sharp energy (<span class="m"><i>v</i><sub>1</sub></span>) is spread over the sites. That is what it means for position and energy not to commute.</p>
<div class="try"><b>Try.</b> Prepare <span class="m">(<i>e</i><sub>1</sub> + <i>e</i><sub>2</sub>)/√2</span> and measure the position once: the state collapses onto site 1 or site 2.
Measure again: the same answer, with certainty. Prepare again and measure 100 times: the counts approach the predicted probabilities. Then ask for the energy instead.</div>`;

    view.makeAxes();
    const sphere = view.makeSphere({ opacity: 0.1 });
    let prepared = normalize(store.psi);
    let v = prepared.slice();
    const psi = stateArrow(view, { color: c.psi, label: '<i>ψ</i>', cls: 'lbl-psi', mode: 'sphere', onDrag: (p) => { v = normalize(p); prepared = v.slice(); resetCounts(); render(); } });
    const frame = [0, 1, 2].map((n) => stateArrow(view, { color: c.v[n], label: `<i>v</i><sub>${n + 1}</sub>`, cls: `lbl-v${n + 1}`, handle: false, radius: 0.02, labelOffset: 0.34 }));
    const proj = [0, 1, 2].map((i) => ({ drop: view.makeSegment({ color: c.axis, dashed: true, opacity: 0.9 }), seg: view.makeSegment({ color: c.fg }) }));
    const basisSel = segmented({ id: 'basis', options: [{ value: 'site', label: 'Which site? (basis <i>e</i><sub>i</sub>)' }, { value: 'energy', label: 'Which energy? (basis <i>v</i><sub>n</sub>)' }], value: 'site', onChange: () => { resetCounts(); render(); } });
    const showProj = toggle({ id: 'show-proj', label: 'Show the projections', checked: true, onChange: () => render() });
    const tally = el('div', { class: 'tally' });
    const ro = readout([['pred', 'predicted'], ['mean', '⟨<i>H</i>⟩ = Σ <i>P</i>(<i>E</i><sub>n</sub>) <i>E</i><sub>n</sub>'], ['ray', '⟨<i>ψ</i>|<i>H</i>|<i>ψ</i>⟩']]);
    const status = el('div', { class: 'status' });
    const hs = hSliders(store, () => { resetCounts(); render(); }, { open: false });
    let counts = [0, 0, 0], eig = null;
    const resetCounts = () => { counts = [0, 0, 0]; };

    function basis() {
      const H = hamiltonianOf(store); eig = symEig(H);
      return basisSel.get() === 'site' ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : eig.vectors;
    }
    function probs(state) { return basis().map((b) => dot(b, state) ** 2); }
    function render() {
      const B = basis(), p = probs(v), energy = basisSel.get() === 'energy';
      psi.set(v);
      frame.forEach((a, n) => { a.set(eig.vectors[n]); a.setVisible(energy); });
      proj.forEach((pr, i) => {
        const s = dot(B[i], v), foot = B[i].map((x) => x * s);
        pr.drop.set(v, foot); pr.seg.set([0, 0, 0], foot);
        pr.seg.setColor(energy ? c.v[i] : c.psi);
        pr.drop.setVisible(showProj.get()); pr.seg.setVisible(showProj.get());
      });
      const total = counts.reduce((a, b) => a + b, 0);
      tally.innerHTML = '';
      const labels = energy ? eig.values.map((E, n) => `<span class="cv${n + 1}">E<sub>${n + 1}</sub></span>`) : ['site 1', 'site 2', 'site 3'];
      p.forEach((pi, i) => {
        const f = total ? counts[i] / total : 0;
        tally.append(el('span', { html: labels[i] }), el('div', { class: 'bar' }, [el('div', { class: 'obs', style: `width:${(f * 100).toFixed(1)}%` }), el('div', { class: 'pred', style: `left:${(pi * 100).toFixed(1)}%` })]), el('span', { class: 'n', text: `${counts[i]} / ${total}  (${(f * 100).toFixed(0)}%)` }));
      });
      ro.set('pred', p.map((x) => fmt(x)).join(', ') + '   sum ' + fmt(p[0] + p[1] + p[2], 3));
      const pe = eig.vectors.map((w) => dot(w, v) ** 2);
      ro.set('mean', fmt(pe.reduce((s, x, n) => s + x * eig.values[n], 0), 3));
      ro.set('ray', fmt(dot(v, matvec(hamiltonianOf(store), v)), 3));
    }
    function draw(p) { const r = Math.random(); let acc = 0; for (let i = 0; i < p.length; i++) { acc += p[i]; if (r < acc) return i; } return p.length - 1; }
    function measureOnce() {
      const B = basis(), p = probs(v), i = draw(p);
      counts[i]++;
      const target = dot(B[i], v) < 0 ? B[i].map((x) => -x) : B[i].slice();
      const names = basisSel.get() === 'site' ? ['site 1', 'site 2', 'site 3'] : eig.values.map((E, n) => `E<sub>${n + 1}</sub> = ${fmt(E)}`);
      status.innerHTML = `Outcome: <b>${names[i]}</b> (probability was ${fmt(p[i])}). The state collapsed onto it.`;
      tweens.run('psi', { from: v.slice(), to: target, duration: 500, mode: 'slerp', onUpdate: (x) => { v = normalize(x); render(); }, onDone: () => { v = target; render(); } });
    }
    function measureMany(n) {
      const p = probs(prepared);
      for (let k = 0; k < n; k++) counts[draw(p)]++;
      status.innerHTML = `${n} measurements on freshly prepared copies of <i>ψ</i>.`;
      render();
    }
    function prepare() { tweens.run('psi', { from: v.slice(), to: prepared.slice(), duration: 500, mode: 'slerp', onUpdate: (x) => { v = normalize(x); render(); }, onDone: () => { v = prepared.slice(); render(); } }); status.textContent = ''; }
    const setPsi = (t) => { prepared = t.slice(); resetCounts(); status.textContent = ''; tweens.run('psi', { from: v.slice(), to: t, duration: 700, mode: 'slerp', onUpdate: (x) => { v = normalize(x); render(); }, onDone: () => { v = t.slice(); render(); } }); };
    controls.append(basisSel.root,
      row([button('Measure once', measureOnce, { kind: 'primary' }), button('Measure 100 times', () => measureMany(100)), button('Prepare <i>ψ</i> again', prepare), button('Reset counts', () => { resetCounts(); render(); })]),
      status, tally, ro.root, showProj.root, el('div', { class: 'widget-label', html: 'Prepare a state:' }), presetButtons(setPsi), hs.root);
    render();
    return { unmount() { store.psi = normalize(prepared); } };
  },
};
