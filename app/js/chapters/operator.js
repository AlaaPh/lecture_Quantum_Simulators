// Chapter 3: the Hamiltonian is a matrix, told through hopping. Four steps.
import { button, row, slider } from '../ui.js';
import { colors } from '../theme.js';
import { matvec, normalize, norm, fmt } from '../linalg.js';
import { makeGuide } from '../guide.js';
import { makeHud, psiEquation, probsOf } from '../hud.js';
import { siteAxes, hamiltonianOf } from './kit.js';

export default {
  id: 'operator', title: 'Why the Hamiltonian is a matrix', nav: 'Hamiltonian = matrix',
  mount({ view, tweens, store, panel, stage, onThemeChange }) {
    const c = colors();
    const siteColor = [c.v1, c.v2, c.v3];
    view.setTarget(0, 0, 0.2);
    store.eps = [0, 0, 0]; store.J = [1, 1]; // start from the uniform chain; the sliders change it from here
    let v = [0, 1, 0], site = 1, hiCol = -1, dragOn = false, showCols = false;

    const axes = siteAxes(view, siteColor); axes.forEach((a) => a.set(1));
    const psi = view.makeArrow({ color: c.psi, radius: 0.034 });
    const hpsi = view.makeArrow({ color: c.hpsi, radius: 0.034 });
    const handle = view.makeSphereHandle({ color: c.psi, radius: 0.06 }); handle.visible = false;
    view.addHandle(handle, { mode: 'sphere', onDrag: (p) => { v = normalize(p); render(); } });
    view.addLabel('<i>ψ</i>', () => (psi.obj.visible ? v.map((x) => x * (norm(v) + 0.2) / (norm(v) || 1)) : null), 'lbl-psi');
    view.addLabel('<i>H</i><i>ψ</i>', () => { const h = hpsi.get(), n = norm(h); return hpsi.obj.visible && n > 0.05 ? h.map((x) => x * (n + 0.22) / n) : null; }, 'lbl-hpsi');
    const cols = [0, 1, 2].map(() => view.makeArrow({ color: c.hpsi, radius: 0.014, opacity: 0.7 }));
    const colLabels = [0, 1, 2].map((j) => view.addLabel(`<i>H</i><i>e</i><sub>${j + 1}</sub>`, () => { const h = cols[j].get(), n = norm(h); return cols[j].obj.visible && n > 0.05 ? h.map((x) => x * (n + 0.2) / n) : null; }, 'lbl-hpsi lbl-small'));
    const hud = makeHud(stage, { siteColors: siteColor, onSiteClick: (i) => { if (guide.step <= 2) putOn(i); } });
    const H = () => hamiltonianOf(store);
    const hv = (x) => `<span style="color:${c.hpsi}">${fmt(x)}</span>`;
    const hvec = (h) => `(${h.map(hv).join(', ')})`;

    function render() {
      const M = H(), Hv = matvec(M, v), step = guide.step;
      psi.set(v); handle.position.set(...v); handle.visible = dragOn;
      // step 3: the selected column is the thick arrow (psi is that basis state), the other columns are thin
      hpsi.set(Hv); hpsi.setVisible(!(step === 2 && hiCol < 0));
      cols.forEach((a, j) => { a.set(M.map((r) => r[j])); const on = showCols && j !== hiCol; a.setVisible(on); colLabels[j].el.style.visibility = on ? '' : 'hidden'; });
      hud.chain(probsOf(v), true);
      hud.eq(psiEquation(v, siteColor, { length: false }));
      hud.eq2(`<i>H</i><i>ψ</i> = ${hvec(Hv)}`);
      hud.matrix(step >= 2 ? M : null, { hiCol: step === 2 ? hiCol : -1 });
      hud.hops(step <= 1 ? { source: site, J: store.J, eps: step === 1 ? store.eps : null } : null);
      guide.refresh();
      view.requestRender();
    }
    const swingTo = (t) => tweens.run('psi', { from: v.slice(), to: t, duration: 700, mode: norm(v) > 0.5 ? 'slerp' : 'linear', onUpdate: (x) => { v = x; render(); } });
    function putOn(i) { site = i; hiCol = i; const e = [0, 0, 0]; e[i] = 1; swingTo(e); }
    const siteButtons = () => row([0, 1, 2].map((i) => button(`site ${i + 1}`, () => putOn(i), { kind: 'math' })));
    const neighbours = (i) => [i - 1, i + 1].filter((j) => j >= 0 && j <= 2);
    const hopTerms = (i) => neighbours(i).map((j) => `${hv(store.J[Math.min(i, j)])}·site ${j + 1}`).join(' + ');

    const steps = [
      { title: 'Hopping: amplitude leaks to the neighbours', text: 'Put the particle on a site. The Hamiltonian turns that state into a new arrow, Hψ (orange): the amplitude leaks to the neighbouring sites with strength J. There is no direct hop from site 1 to site 3: the two guides are too far apart.',
        caption: () => `<i>H</i>·(site ${site + 1}) = ${hopTerms(site)} = ${hvec(matvec(H(), v))}. ${neighbours(site).length === 1 ? `Site ${site + 1} has one neighbour.` : `Site ${site + 1} leaks to both neighbours.`}`,
        enter(ctl) {
          dragOn = false; showCols = false; store.eps = [0, 0, 0];
          const e = [0, 0, 0]; e[site] = 1; v = e;
          ctl.append(siteButtons(), slider({ id: 'J', label: '<i>J</i>', min: -2, max: 2, step: 0.05, value: store.J[0], onInput: (x) => { store.J = [x, x]; render(); } }).root);
        } },
      { title: 'On-site energy: a site also feeds itself', text: 'The diagonal of H. With ε₂ ≠ 0 the image of “site 2” also has a part along site 2 itself: the arrow Hψ tilts toward axis 2.',
        caption: () => `<i>H</i>·(site 2) = ${hv(store.eps[1])}·site 2 + ${hopTerms(1)} = ${hvec(matvec(H(), v))}.`,
        enter(ctl) {
          dragOn = false; showCols = false; site = 1; v = [0, 1, 0];
          ctl.append(slider({ id: 'eps2', label: '<i>ε</i><sub>2</sub>', min: -2, max: 2, step: 0.05, value: store.eps[1], onInput: (x) => { store.eps[1] = x; render(); } }).root,
            slider({ id: 'J', label: '<i>J</i>', min: -2, max: 2, step: 0.05, value: store.J[0], onInput: (x) => { store.J = [x, x]; render(); } }).root);
        } },
      { title: 'Three columns are the whole rule', text: 'What H does to each of the three basis states is all there is to know. Written side by side, the three images are the columns of a 3 × 3 matrix: the Hamiltonian.',
        caption: () => hiCol >= 0 ? `Column ${hiCol + 1} of <i>H</i> is <i>H</i>·(site ${hiCol + 1}) = ${hvec(H().map((r) => r[hiCol]))}.` : `Three images, nine numbers. Click a site to see its column.`,
        enter(ctl) { dragOn = false; showCols = true; hiCol = site; const e = [0, 0, 0]; e[site] = 1; v = e; ctl.append(siteButtons(), row([button('all three columns', () => { hiCol = -1; render(); })])); } },
      { title: 'Symmetric: hopping works both ways', text: 'The hop from site 1 to site 2 and the hop back are the same number, so H equals its own transpose (Hermitian). This is what makes the energies real and keeps |ψ| = 1 in time.',
        caption: () => `<i>H</i><sub>12</sub> = <i>H</i><sub>21</sub> = ${hv(store.J[0])}, <i>H</i><sub>23</sub> = <i>H</i><sub>32</sub> = ${hv(store.J[1])}. The matrix mirrors across its diagonal.`,
        enter(ctl) {
          dragOn = true; showCols = false; hiCol = -1;
          const s12 = slider({ id: 'j12', label: '<i>J</i><sub>12</sub>', min: -2, max: 2, step: 0.05, value: store.J[0], onInput: (x) => { store.J[0] = x; render(); } });
          const s23 = slider({ id: 'j23', label: '<i>J</i><sub>23</sub>', min: -2, max: 2, step: 0.05, value: store.J[1], onInput: (x) => { store.J[1] = x; render(); } });
          ctl.append(s12.root, s23.root, row([button('Uniform chain (ε = 0, J = 1)', () => { store.eps = [0, 0, 0]; store.J = [1, 1]; s12.set(1); s23.set(1); render(); })]));
        } },
    ];
    const guide = makeGuide({ panel, steps, nextHref: '#phase', nextLabel: 'Next chapter: phase →', beforeStep: () => tweens.cancelAll(), afterStep: () => render() });
    onThemeChange(() => {
      const cc = colors(); [cc.v1, cc.v2, cc.v3].forEach((col, i) => { siteColor[i] = col; axes[i].setColor(col); });
      hud.setColors(siteColor); psi.setColor(cc.psi); handle.material.color.set(cc.psi); hpsi.setColor(cc.hpsi); cols.forEach((a) => a.setColor(cc.hpsi)); render();
    });
    guide.go(0);
    return { unmount() { store.psi = normalize(v); hud.remove(); guide.dispose(); } };
  },
};
