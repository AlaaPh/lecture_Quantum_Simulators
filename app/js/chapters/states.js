import { slider, toggle, readout, row, button } from '../ui.js';
import { colors } from '../theme.js';
import { ChainView } from '../chain.js';
import { norm, normalize, fmt } from '../linalg.js';
import { stateArrow, presetButtons, widget } from './kit.js';

export default {
  id: 'states', title: 'A state is a vector', nav: 'States are vectors', use3d: true,
  mount({ view, tweens, store, panel, controls, onThemeChange }) {
    const c = colors();
    panel.innerHTML = `
<h2>A state is a vector</h2>
<p>Take a particle that can sit on one of three sites. Its quantum state is a list of three numbers, the amplitudes
<span class="m">(<i>ψ</i><sub>1</sub>, <i>ψ</i><sub>2</sub>, <i>ψ</i><sub>3</sub>)</span>. The probability to find the particle on site <i>i</i> is
<span class="m">|<i>ψ</i><sub><i>i</i></sub>|²</span>.</p>
<p>A list of three numbers is a vector in a three-dimensional space. That space, with the inner product
<span class="m">⟨<i>φ</i>|<i>ψ</i>⟩ = Σ<sub><i>i</i></sub> <i>φ</i><sub><i>i</i></sub>* <i>ψ</i><sub><i>i</i></sub></span>, is the <b>Hilbert space</b> of the chain.
Its dimension is the number of sites: <i>N</i> sites, <i>N</i> dimensions.</p>
<p>The axes are the basis states: <span class="m"><i>e</i><sub>1</sub> = (1, 0, 0)</span> means "the particle is on site 1", and so on.
Every state is a combination of them,</p>
<div class="eq"><i>ψ</i> = <i>ψ</i><sub>1</sub><i>e</i><sub>1</sub> + <i>ψ</i><sub>2</sub><i>e</i><sub>2</sub> + <i>ψ</i><sub>3</sub><i>e</i><sub>3</sub>.</div>
<p>A superposition is nothing more than a direction that is not along an axis.</p>
<div class="note">Amplitudes are complex in general, so the true space is ℂ³. Here they are real, which is exactly what makes the Hilbert space of three sites the ℝ³ you can draw. The complex phases come back in chapter 6.</div>
<div class="try"><b>Try.</b> Set <span class="m"><i>ψ</i> = <i>e</i><sub>2</sub></span>, then raise <span class="m"><i>ψ</i><sub>1</sub></span>: the arrow tilts from the <i>e</i><sub>2</sub> axis toward <i>e</i><sub>1</sub> and probability moves from site 2 to site 1.
Set <span class="m">(<i>e</i><sub>1</sub> + <i>e</i><sub>2</sub>)/√2</span>: one arrow, two sites, half the probability each. You can also drag the tip of the arrow.</div>
<p>In the photonic simulator the sites are waveguides and <span class="m"><i>ψ</i><sub><i>i</i></sub></span> is the light amplitude in waveguide <i>i</i>.</p>`;
    panel.append(widget('chain-states', 'The chain: bars show the amplitude <i>ψ</i><sub><i>i</i></sub>, the fill shows the probability'));
    const chain = new ChainView(panel.querySelector('#chain-states'), { mode: 'signed' });

    view.makeAxes();
    let v = store.psi.slice();
    const psi = stateArrow(view, { color: c.psi, label: '<i>ψ</i>', cls: 'lbl-psi', mode: 'plane', onDrag: (p) => { v = p; render(); } });
    const comps = [0, 1, 2].map(() => ({ drop: view.makeSegment({ color: c.axis, dashed: true, opacity: 0.9 }), seg: view.makeSegment({ color: c.psi }) }));
    const compLabels = [0, 1, 2].map((i) => view.addLabel(`<i>ψ</i><sub>${i + 1}</sub>`, () => { const p = [0, 0, 0]; p[i] = v[i]; if (Math.abs(v[i]) < 0.12) return null; const off = [0, 0, 0]; off[(i + 1) % 3] = -0.1; off[(i + 2) % 3] = -0.1; return [p[0] + off[0], p[1] + off[1], p[2] + off[2]]; }, 'lbl-small'));

    const sliders = [0, 1, 2].map((i) => slider({ id: `psi${i + 1}`, label: `<i>ψ</i><sub>${i + 1}</sub>`, min: -1, max: 1, step: 0.01, value: v[i], onInput: (x) => { v[i] = x; render(false); } }));
    const showComp = toggle({ id: 'show-comp', label: 'Show the components (drop lines onto the axes)', checked: true, onChange: () => render() });
    const ro = readout([['n2', '|<i>ψ</i>|²'], ['p', '<i>p</i><sub>1</sub>, <i>p</i><sub>2</sub>, <i>p</i><sub>3</sub>']]);

    function render(syncSliders = true) {
      psi.set(v);
      const on = showComp.get();
      comps.forEach((cmp, i) => {
        const axisPt = [0, 0, 0]; axisPt[i] = v[i];
        cmp.drop.set(v, axisPt); cmp.seg.set([0, 0, 0], axisPt);
        cmp.drop.setVisible(on); cmp.seg.setVisible(on);
        compLabels[i].el.style.visibility = on ? '' : 'hidden';
      });
      const n2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
      const p = n2 > 1e-9 ? v.map((x) => (x * x) / n2) : [0, 0, 0];
      chain.set({ amp: v, prob: p });
      if (syncSliders) sliders.forEach((s, i) => s.set(v[i]));
      ro.set('n2', fmt(n2, 3));
      ro.set('p', p.map((x) => fmt(x, 2)).join(', ') + (Math.abs(n2 - 1) > 0.01 ? '  (ψ²/|ψ|²: only the direction counts)' : ''));
    }
    const setPsi = (target) => tweens.run('psi', { from: v.slice(), to: target, duration: 700, onUpdate: (x) => { v = x; render(); } });
    controls.append(...sliders.map((s) => s.root), presetButtons(setPsi), showComp.root, ro.root);
    onThemeChange(() => chain.draw());
    render();
    return { unmount() { store.psi = norm(v) > 1e-6 ? normalize(v) : [1, 0, 0]; chain.dispose(); } };
  },
};
