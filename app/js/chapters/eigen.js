import { slider, toggle, readout, row, button, matrixView, el } from '../ui.js';
import { colors, cmapDiv } from '../theme.js';
import { matvec, normalize, angleBetween, norm, dot, symEig, matmul, transpose, fmt } from '../linalg.js';
import { stateArrow, presetButtons, hamiltonianOf, hSliders, deg } from './kit.js';

export default {
  id: 'eigen', title: 'Eigenvectors: the directions H does not rotate', nav: 'Eigenvectors', use3d: true,
  mount({ view, tweens, store, panel, controls, onThemeChange }) {
    const c = colors();
    panel.innerHTML = `
<h2>Eigenvectors: the directions <i>H</i> does not rotate</h2>
<p>For most states <span class="m"><i>H</i><i>ψ</i></span> points somewhere else than <span class="m"><i>ψ</i></span>. For three special directions it does not:</p>
<div class="eq"><i>H</i><i>ψ</i> = <i>E</i><i>ψ</i>.</div>
<p><i>H</i> only stretches these vectors, by the factor <i>E</i>. They are the <b>eigenvectors</b>; the factors are the <b>eigenvalues</b>, the energies.</p>
<p>Hunt them yourself: drag the tip and watch the angle between <span class="cpsi"><i>ψ</i></span> and <span class="chpsi"><i>H</i><i>ψ</i></span>.
The sphere is coloured by the energy expectation value <span class="m">⟨<i>ψ</i>|<i>H</i>|<i>ψ</i>⟩ = <i>ψ</i> · <i>H</i><i>ψ</i></span>.
The eigenvectors sit where this landscape is flat: at its minimum (the ground state), at its maximum, and at a saddle in between.
This is the Rayleigh–Ritz principle, and it is how variational methods find ground states.</p>
<p>Because <i>H</i> is symmetric, the three eigenvectors are orthogonal: they form a rotated frame, the <b>energy basis</b>.
In that frame <i>H</i> is diagonal. The physics does not depend on the basis; only the matrix gets simpler.</p>
<div class="note">Uniform chain (<span class="m"><i>ε</i> = 0</span>, hopping <i>J</i>): <span class="m"><i>E</i> = −√2 <i>J</i>, 0, +√2 <i>J</i></span> with eigenvectors
∝ (1, −√2, 1), (1, 0, −1), (1, √2, 1). With the coding-session convention <span class="m"><i>H</i><sub><i>n</i>,<i>n</i>+1</sub> = +<i>J</i></span> the smooth state without sign changes, (1, √2, 1), has the highest energy.
Flip the sign of <i>J</i> and it becomes the ground state. The sign convention decides which end of the band is smooth, nothing else.</div>
<div class="try"><b>Try.</b> Snap to <span class="cv3"><i>v</i><sub>3</sub></span> and set <span class="m"><i>J</i><sub>12</sub> = <i>J</i><sub>23</sub> = −1</span>: the energies swap places while the eigenvectors stay.
Then set <span class="m"><i>ε</i><sub>2</sub> = 1.5</span>: the landscape deforms and the frame rotates.</div>`;
    const matH = matrixView(3, 3, { label: '<i>H</i> =' });
    const matD = matrixView(3, 3, { label: '<i>V</i><sup>T</sup><i>H</i><i>V</i> =' });
    panel.append(el('div', { class: 'mat-row' }, [matH.root, matD.root]));
    const table = el('div', { class: 'eigvals' });
    panel.append(table);

    view.makeAxes();
    const sphere = view.makeSphere({ opacity: 0.14 });
    let v = normalize(store.psi);
    const psi = stateArrow(view, { color: c.psi, label: '<i>ψ</i>', cls: 'lbl-psi', mode: 'sphere', onDrag: (p) => { v = normalize(p); render(); } });
    const hpsi = stateArrow(view, { color: c.hpsi, label: '<i>H</i><i>ψ</i>', cls: 'lbl-hpsi', handle: false });
    const frame = [0, 1, 2].map((n) => stateArrow(view, { color: c.v[n], label: `<i>v</i><sub>${n + 1}</sub>`, cls: `lbl-v${n + 1}`, handle: false, radius: 0.02, labelOffset: 0.34 }));

    const landscape = toggle({ id: 'landscape', label: 'Colour the sphere by ⟨<i>ψ</i>|<i>H</i>|<i>ψ</i>⟩', checked: true, onChange: () => render(true) });
    const showFrame = toggle({ id: 'show-frame', label: 'Show the eigenvectors <i>v</i><sub>1</sub>, <i>v</i><sub>2</sub>, <i>v</i><sub>3</sub>', checked: false, onChange: () => render() });
    const status = el('div', { class: 'status' });
    const ro = readout([['ang', 'angle(<i>ψ</i>, <i>H</i><i>ψ</i>)'], ['ray', '⟨<i>ψ</i>|<i>H</i>|<i>ψ</i>⟩'], ['ratio', '|<i>H</i><i>ψ</i>| / |<i>ψ</i>|']]);
    const hs = hSliders(store, () => render(true), { open: false });
    let eig = null;
    const legend = el('div', { class: 'legend', html: `<span><i style="background:${c.neg}"></i>low energy</span><span><i style="background:${c.neutral};border:1px solid ${c.line}"></i>⟨H⟩ = 0</span><span><i style="background:${c.pos}"></i>high energy</span>` });

    function render(recolor = false) {
      const H = hamiltonianOf(store);
      if (!eig || recolor) {
        eig = symEig(H);
        const Emax = Math.max(1e-9, ...eig.values.map(Math.abs));
        sphere.colorBy(landscape.get() ? (x, y, z) => cmapDiv(((H[0][0] * x + H[0][1] * y + H[0][2] * z) * x + (H[1][0] * x + H[1][1] * y + H[1][2] * z) * y + (H[2][0] * x + H[2][1] * y + H[2][2] * z) * z) / Emax) : null, 0.62);
        legend.hidden = !landscape.get();
        matH.set(H);
        const V = transpose(eig.vectors); // columns are eigenvectors
        matD.set(matmul(transpose(V), matmul(H, V)));
        table.innerHTML = '<span class="h">n</span><span class="h">E<sub>n</sub></span><span class="h">sign changes of v<sub>n</sub></span>' + eig.values.map((E, n) => {
          const w = eig.vectors[n]; let nodes = 0; for (let i = 0; i < 2; i++) if (w[i] * w[i + 1] < 0) nodes++;
          return `<span class="cv${n + 1}">v<sub>${n + 1}</sub></span><span>${fmt(E, 3)}</span><span>${nodes}</span>`;
        }).join('');
      }
      const Hv = matvec(H, v);
      psi.set(v); hpsi.set(Hv);
      frame.forEach((a, n) => { a.set(eig.vectors[n]); a.setVisible(showFrame.get()); });
      const ang = deg(angleBetween(v, Hv));
      const found = norm(Hv) > 1e-6 && (ang < 3 || ang > 177);
      status.className = 'status' + (found ? ' found' : '');
      status.innerHTML = found ? `Eigenvector found: <i>H</i><i>ψ</i> = <i>E</i><i>ψ</i> with <i>E</i> ≈ ${fmt(dot(v, Hv), 2)}` : 'Drag the tip until the orange arrow is parallel (or antiparallel) to the blue one.';
      ro.set('ang', norm(Hv) > 1e-6 ? fmt(ang, 1) + '°' : '–');
      ro.set('ray', fmt(dot(v, Hv), 3));
      ro.set('ratio', fmt(norm(Hv), 3));
    }
    const setPsi = (t) => tweens.run('psi', { from: v.slice(), to: t, duration: 800, mode: 'slerp', onUpdate: (x) => { v = normalize(x); render(); } });
    const snap = (n) => { const w = eig.vectors[n]; setPsi(dot(w, v) < 0 ? w.map((x) => -x) : w.slice()); };
    controls.append(
      row([button('Snap to <span class="cv1"><i>v</i><sub>1</sub></span>', () => snap(0), { kind: 'math' }), button('Snap to <span class="cv2"><i>v</i><sub>2</sub></span>', () => snap(1), { kind: 'math' }), button('Snap to <span class="cv3"><i>v</i><sub>3</sub></span>', () => snap(2), { kind: 'math' })]),
      status, ro.root, landscape.root, legend, showFrame.root, presetButtons(setPsi), hs.root);
    onThemeChange(() => render(true));
    render(true);
    return { unmount() { store.psi = normalize(v); } };
  },
};
