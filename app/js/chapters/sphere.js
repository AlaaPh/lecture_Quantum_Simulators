import { slider, toggle, readout, row, button } from '../ui.js';
import { colors } from '../theme.js';
import { ChainView } from '../chain.js';
import { normalize, fromAngles, toAngles, fmt } from '../linalg.js';
import { stateArrow, presetButtons, widget, deg } from './kit.js';

export default {
  id: 'sphere', title: 'All states live on a sphere', nav: 'The space of states', use3d: true,
  mount({ view, tweens, store, panel, controls, onThemeChange }) {
    const c = colors();
    panel.innerHTML = `
<h2>All states live on a sphere</h2>
<p>Probabilities add up to one:</p>
<div class="eq">|<i>ψ</i><sub>1</sub>|² + |<i>ψ</i><sub>2</sub>|² + |<i>ψ</i><sub>3</sub>|² = 1.</div>
<p>The left side is the squared length of the vector. So every physical state has length 1 and its tip lies on the unit sphere.
The sphere <b>is</b> the space of states: one point, one state.</p>
<p>Drag the tip over the sphere. Two angles <span class="m">(<i>θ</i>, <i>φ</i>)</span> fix a state, and the three probabilities are the squares of its coordinates.</p>
<p><span class="m"><i>ψ</i></span> and <span class="m">−<i>ψ</i></span> have the same probabilities and, as the next chapters show, the same physics. They are the same state.
With complex amplitudes the same holds for <span class="m"><i>ψ</i></span> and <span class="m">e<sup>i<i>α</i></sup><i>ψ</i></span>: the global phase is not observable.</p>
<div class="note">Counting dimensions: 3 real amplitudes − 1 for normalization = the 2-dimensional surface of the sphere, with antipodes identified.
With complex amplitudes: 6 − 1 (norm) − 1 (phase) = 4. For two sites with complex amplitudes: 4 − 2 = 2, again a sphere: the Bloch sphere of the Mach–Zehnder session.</div>
<div class="try"><b>Try.</b> Go to the pole <span class="m"><i>θ</i> = 0</span>: the particle is on site 3 with certainty. Walk along the equator <span class="m"><i>θ</i> = 90°</span>: site 3 is never visited and the probability moves between sites 1 and 2.</div>`;
    panel.append(widget('chain-sphere', 'Probabilities <i>p</i><sub><i>i</i></sub> = |<i>ψ</i><sub><i>i</i></sub>|²'));
    const chain = new ChainView(panel.querySelector('#chain-sphere'), { mode: 'prob' });

    view.makeAxes();
    view.makeSphere({ opacity: 0.14 });
    let v = normalize(store.psi);
    const psi = stateArrow(view, { color: c.psi, label: '<i>ψ</i>', cls: 'lbl-psi', mode: 'sphere', onDrag: (p) => { v = normalize(p); render(); } });
    const anti = view.makeArrow({ color: c.psi, radius: 0.02, opacity: 0.35 });
    const antiLabel = view.addLabel('−<i>ψ</i>', () => (showAnti.get() ? v.map((x) => -x * 1.17) : null), 'lbl-psi lbl-small');
    const ring = view.makeRing({ color: c.axis, radius: 1, normal: [0, 0, 1], opacity: 0.6 }); // equator (theta = 90 deg)

    const a0 = toAngles(v);
    const sTheta = slider({ id: 'theta', label: '<i>θ</i>', min: 0, max: 180, step: 1, value: deg(a0.theta), format: (x) => x.toFixed(0) + '°', onInput: () => fromSliders() });
    const sPhi = slider({ id: 'phi', label: '<i>φ</i>', min: -180, max: 180, step: 1, value: deg(a0.phi), format: (x) => x.toFixed(0) + '°', onInput: () => fromSliders() });
    const showAnti = toggle({ id: 'show-anti', label: 'Show −<i>ψ</i> (the same state)', checked: false, onChange: () => render() });
    const ro = readout([['psi', '<i>ψ</i>'], ['p', '<i>p</i><sub>1</sub>, <i>p</i><sub>2</sub>, <i>p</i><sub>3</sub>'], ['sum', 'Σ <i>p</i><sub><i>i</i></sub>']]);
    function fromSliders() { v = fromAngles((sTheta.get() * Math.PI) / 180, (sPhi.get() * Math.PI) / 180); render(false); }
    function render(syncSliders = true) {
      psi.set(v);
      anti.set(v.map((x) => -x)); anti.setVisible(showAnti.get());
      const p = v.map((x) => x * x);
      chain.set({ amp: v, prob: p });
      if (syncSliders) { const a = toAngles(v); sTheta.set(deg(a.theta)); sPhi.set(deg(a.phi)); }
      ro.set('psi', '(' + v.map((x) => fmt(x)).join(', ') + ')');
      ro.set('p', p.map((x) => fmt(x)).join(', '));
      ro.set('sum', fmt(p[0] + p[1] + p[2], 3));
    }
    const setPsi = (target, mode = 'slerp') => tweens.run('psi', { from: v.slice(), to: target, duration: 800, mode, onUpdate: (x) => { v = mode === 'slerp' ? normalize(x) : x; render(); }, onDone: () => { v = normalize(v); render(); } });
    controls.append(sTheta.root, sPhi.root, presetButtons(setPsi), row([button('Flip the sign: <i>ψ</i> → −<i>ψ</i>', () => setPsi(v.map((x) => -x), 'linear'))]), showAnti.root, ro.root);
    onThemeChange(() => chain.draw());
    render();
    return { unmount() { store.psi = normalize(v); chain.dispose(); } };
  },
};
