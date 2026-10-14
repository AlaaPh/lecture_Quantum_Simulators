import { slider, toggle, readout, row, button, matrixView, el } from '../ui.js';
import { colors } from '../theme.js';
import { matvec, normalize, angleBetween, norm, fmt } from '../linalg.js';
import { stateArrow, presetButtons, hamiltonianOf, hSliders, deg } from './kit.js';

export default {
  id: 'operator', title: 'Why the Hamiltonian is a matrix', nav: 'Hamiltonian = matrix', use3d: true,
  mount({ view, tweens, store, panel, controls, onThemeChange }) {
    const c = colors();
    panel.innerHTML = `
<h2>Why the Hamiltonian is a matrix</h2>
<p>Physics enters through how the amplitudes change in time, the Schrödinger equation</p>
<div class="eq">i d<i>ψ</i>/d<i>t</i> = <i>H</i><i>ψ</i>&nbsp;&nbsp;(ħ = 1).</div>
<p>It is linear: the rate of change of each amplitude is a weighted sum of all amplitudes. A linear map from three numbers to three numbers is a 3 × 3 matrix.
That is all a Hamiltonian is in a finite Hilbert space: the table of weights.</p>
<p>For a chain the weights have a meaning. The diagonal entry <span class="m"><i>ε</i><sub><i>i</i></sub></span> is the on-site energy of site <i>i</i>.
The off-diagonal entry <span class="m"><i>J</i></span> between neighbours is the hopping: amplitude on site 2 feeds sites 1 and 3.</p>
<p>The <i>j</i>-th column of <i>H</i> is <span class="m"><i>H</i><i>e</i><sub><i>j</i></sub></span>, the image of "particle on site <i>j</i>". For instance
<span class="m"><i>H</i><i>e</i><sub>2</sub> = <i>J</i><sub>12</sub><i>e</i><sub>1</sub> + <i>ε</i><sub>2</sub><i>e</i><sub>2</sub> + <i>J</i><sub>23</sub><i>e</i><sub>3</sub></span>.
Read the matrix column by column: it says where each basis state is sent.</p>
<p><i>H</i> is symmetric (Hermitian, <span class="m"><i>H</i> = <i>H</i><sup>†</sup></span>). That is what makes the energies real, the eigenvectors orthogonal and the length of <i>ψ</i> constant in time.</p>
<div class="note">Waveguide dictionary: <span class="m"><i>ε</i><sub><i>i</i></sub></span> is the propagation constant of waveguide <i>i</i> (set by its width or refractive index),
<span class="m"><i>J</i></span> the evanescent coupling (set by the gap between waveguides), and the time <i>t</i> is the propagation distance <i>z</i>.</div>
<div class="try"><b>Try.</b> Switch on the columns and set <span class="m"><i>ε</i><sub>2</sub> = 1</span>: the second column tilts along <i>e</i><sub>2</sub>.
Switch on the grid and move its slider: the cube of states is stretched along some directions and squeezed along others. Those directions are the subject of the next chapter.</div>`;
    const matH = matrixView(3, 3, { label: '<i>H</i> =' });
    const vecPsi = matrixView(3, 1, { label: '<i>ψ</i> =' });
    const vecH = matrixView(3, 1, { label: '<i>H</i><i>ψ</i> =' });
    panel.append(el('div', { class: 'mat-row' }, [matH.root, vecPsi.root, vecH.root]));

    view.makeAxes();
    const sphere = view.makeSphere({ opacity: 0.08 });
    let v = normalize(store.psi);
    const psi = stateArrow(view, { color: c.psi, label: '<i>ψ</i>', cls: 'lbl-psi', mode: 'sphere', onDrag: (p) => { v = normalize(p); render(); } });
    const hpsi = stateArrow(view, { color: c.hpsi, label: '<i>H</i><i>ψ</i>', cls: 'lbl-hpsi', handle: false });
    const cols = [0, 1, 2].map((j) => stateArrow(view, { color: c.hpsi, label: `<i>H</i><i>e</i><sub>${j + 1}</sub>`, cls: 'lbl-hpsi lbl-small', handle: false, radius: 0.014, opacity: 0.75 }));
    // a small cube of states to show the map as a deformation
    const base = [];
    for (const x of [-0.75, -0.25, 0.25, 0.75]) for (const y of [-0.75, -0.25, 0.25, 0.75]) for (const z of [-0.75, -0.25, 0.25, 0.75]) base.push([x, y, z]);
    const cloud = view.makePoints(base, { color: c.axis, size: 0.05 });

    const showCols = toggle({ id: 'show-cols', label: 'Show the columns <i>H</i><i>e</i><sub>1</sub>, <i>H</i><i>e</i><sub>2</sub>, <i>H</i><i>e</i><sub>3</sub>', checked: false, onChange: () => render() });
    const showGrid = toggle({ id: 'show-grid', label: 'Show a cube of states and apply <i>H</i> to all of them', checked: false, onChange: () => render() });
    const sMorph = slider({ id: 'morph', label: '<i>ψ</i> → <i>H</i><i>ψ</i>', min: 0, max: 1, step: 0.01, value: 0, onInput: () => render() });
    const ro = readout([['ang', 'angle(<i>ψ</i>, <i>H</i><i>ψ</i>)'], ['len', '|<i>H</i><i>ψ</i>|']]);
    const hs = hSliders(store, () => render());

    function render() {
      const H = hamiltonianOf(store);
      const Hv = matvec(H, v);
      psi.set(v); hpsi.set(Hv);
      matH.set(H); vecPsi.set([[v[0]], [v[1]], [v[2]]]); vecH.set([[Hv[0]], [Hv[1]], [Hv[2]]]);
      cols.forEach((a, j) => { a.set(H.map((r) => r[j])); a.setVisible(showCols.get()); });
      const g = showGrid.get(); cloud.setVisible(g); sMorph.root.hidden = !g;
      if (g) { const s = sMorph.get(); cloud.set(base.map((p) => { const q = matvec(H, p); return p.map((x, i) => (1 - s) * x + s * q[i]); })); }
      ro.set('ang', fmt(deg(angleBetween(v, Hv)), 1) + '°');
      ro.set('len', fmt(norm(Hv), 3));
    }
    const setPsi = (t) => tweens.run('psi', { from: v.slice(), to: t, duration: 700, mode: 'slerp', onUpdate: (x) => { v = normalize(x); render(); } });
    controls.append(hs.root, presetButtons(setPsi), showCols.root, showGrid.root, sMorph.root, ro.root);
    render();
    return { unmount() { store.psi = normalize(v); } };
  },
};
