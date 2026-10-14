// Chapter 3: the Hamiltonian is a matrix, told through hopping. Six steps.
import { button, row, slider, toggle } from '../ui.js';
import { colors } from '../theme.js';
import { matvec, normalize, norm, angleBetween, fmt } from '../linalg.js';
import { makeGuide } from '../guide.js';
import { makeHud, psiEquation, probsOf, comp } from '../hud.js';
import { siteAxes, hamiltonianOf, deg, randomUnit } from './kit.js';

export default {
  id: 'operator', title: 'Why the Hamiltonian is a matrix', nav: 'Hamiltonian = matrix', use3d: true, layout: 'wide',
  mount({ view, tweens, store, panel, stage, onThemeChange }) {
    const c = colors();
    const siteColor = [c.v1, c.v2, c.v3];
    view.setTarget(0, 0, 0.2);
    store.eps = [0, 0, 0]; store.J = [1, 1]; // start from the uniform chain; the sliders change it from here
    let v = [0, 1, 0], site = 1, hiCol = -1, dragOn = false, showCols = false, showParts = false, morph = 0, syncSliders = null;

    const axes = siteAxes(view, siteColor); axes.forEach((a) => a.set(1));
    const psi = view.makeArrow({ color: c.psi, radius: 0.034 });
    const hpsi = view.makeArrow({ color: c.hpsi, radius: 0.034 });
    const handle = view.makeSphereHandle({ color: c.psi, radius: 0.06 }); handle.visible = false;
    view.addHandle(handle, { mode: 'sphere', onDrag: (p) => { v = normalize(p); render(); } });
    view.addLabel('<i>ψ</i>', () => (psi.obj.visible ? v.map((x) => x * (norm(v) + 0.2) / (norm(v) || 1)) : null), 'lbl-psi');
    view.addLabel('<i>H</i><i>ψ</i>', () => { const h = hpsi.get(), n = norm(h); return hpsi.obj.visible && n > 0.05 ? h.map((x) => x * (n + 0.22) / n) : null; }, 'lbl-hpsi');
    const cols = [0, 1, 2].map((j) => view.makeArrow({ color: c.hpsi, radius: 0.014, opacity: 0.7 }));
    const colLabels = [0, 1, 2].map((j) => view.addLabel(`<i>H</i><i>e</i><sub>${j + 1}</sub>`, () => { const h = cols[j].get(), n = norm(h); return cols[j].obj.visible && n > 0.05 ? h.map((x) => x * (n + 0.2) / n) : null; }, 'lbl-hpsi lbl-small'));
    const parts = [0, 1].map(() => view.makeArrow({ color: c.hpsi, radius: 0.016, opacity: 0.55 }));
    const partLabels = [0, 1].map((k) => view.addLabel('', () => { const h = parts[k].get(), n = norm(h); return parts[k].obj.visible && n > 0.08 ? h.map((x) => x * (n + 0.2) / n) : null; }, 'lbl-hpsi lbl-small'));
    const dashes = [0, 1].map(() => view.makeSegment({ color: c.hpsi, dashed: true, opacity: 0.7 }));
    const base = [];
    for (const x of [-0.75, -0.25, 0.25, 0.75]) for (const y of [-0.75, -0.25, 0.25, 0.75]) for (const z of [-0.75, -0.25, 0.25, 0.75]) base.push([x, y, z]);
    const cloud = view.makePoints(base, { color: c.axis, size: 0.05 }); cloud.setVisible(false);
    const hud = makeHud(stage, { siteColors: siteColor, onSiteClick: (i) => { if (guide.step <= 2) putOn(i); } });
    const H = () => hamiltonianOf(store);
    const hv = (x) => `<span style="color:${c.hpsi}">${fmt(x)}</span>`;
    const hvec = (h) => `(${h.map(hv).join(', ')})`;

    function render(sync = true) {
      const M = H(), Hv = matvec(M, v), step = guide.step;
      psi.set(v); handle.position.set(...v); handle.visible = dragOn;
      // step 3: the selected column is the thick arrow (psi is that basis state), the other columns are thin
      hpsi.set(Hv); hpsi.setVisible(!(step === 2 && hiCol < 0));
      cols.forEach((a, j) => { a.set(M.map((r) => r[j])); const on = showCols && j !== hiCol; a.setVisible(on); colLabels[j].el.style.visibility = on ? '' : 'hidden'; });
      if (showParts) {
        const p0 = M.map((r) => r[0] * v[0]), p1 = M.map((r) => r[1] * v[1]);
        parts[0].set(p0); parts[1].set(p1); parts.forEach((a) => a.setVisible(true));
        partLabels[0].setText(`${fmt(v[0])}·<i>H</i><i>e</i><sub>1</sub>`); partLabels[1].setText(`${fmt(v[1])}·<i>H</i><i>e</i><sub>2</sub>`);
        dashes[0].set(p0, Hv); dashes[1].set(p1, Hv); dashes.forEach((d) => d.setVisible(true));
      } else { parts.forEach((a) => a.setVisible(false)); dashes.forEach((d) => d.setVisible(false)); }
      cloud.set(base.map((p) => { const q = matvec(M, p); return p.map((x, i) => (1 - morph) * x + morph * q[i]); }));
      hud.chain(probsOf(v), true);
      hud.eq(psiEquation(v, siteColor, { length: false }));
      hud.eq2(`<i>H</i><i>ψ</i> = ${hvec(Hv)}`);
      hud.matrix(step >= 2 ? M : null, { hiCol: step === 2 ? hiCol : -1 });
      hud.hops(step <= 1 ? { source: site, J: store.J, eps: step === 1 ? store.eps : null } : null);
      if (sync && syncSliders) syncSliders();
      guide.refresh();
      view.requestRender();
    }
    const swingTo = (t) => tweens.run('psi', { from: v.slice(), to: t, duration: 700, mode: norm(v) > 0.5 ? 'slerp' : 'linear', onUpdate: (x) => { v = x; render(); } });
    function putOn(i) { site = i; hiCol = i; const e = [0, 0, 0]; e[i] = 1; swingTo(e); }
    const siteButtons = () => row([0, 1, 2].map((i) => button(`site ${i + 1}`, () => putOn(i), { kind: 'math' })));
    const neighbours = (i) => [i - 1, i + 1].filter((j) => j >= 0 && j <= 2);
    const hopTerms = (i) => neighbours(i).map((j) => `${hv(store.J[Math.min(i, j)])}·site ${j + 1}`).join(' + ');

    const steps = [
      { title: 'Hopping: amplitude leaks to the neighbours', text: 'Put the particle on a site. The Hamiltonian turns that state into a new arrow, Hψ (orange): the amplitude leaks to the neighbouring sites with strength J.',
        caption: () => `<i>H</i>·(site ${site + 1}) = ${hopTerms(site)} = ${hvec(matvec(H(), v))}. ${neighbours(site).length === 1 ? `Site ${site + 1} has one neighbour.` : `Site ${site + 1} leaks to both neighbours.`}`,
        enter(ctl) {
          dragOn = false; showCols = false; showParts = false; cloud.setVisible(false); morph = 0; store.eps = [0, 0, 0];
          const e = [0, 0, 0]; e[site] = 1; v = e;
          const sJ = slider({ id: 'J', label: '<i>J</i>', min: -2, max: 2, step: 0.05, value: store.J[0], onInput: (x) => { store.J = [x, x]; render(); } });
          ctl.append(siteButtons(), sJ.root);
        } },
      { title: 'On-site energy: a site also feeds itself', text: 'The diagonal of H. With ε₂ ≠ 0 the image of “site 2” also has a part along site 2 itself: the arrow Hψ tilts toward axis 2.',
        caption: () => `<i>H</i>·(site 2) = ${hv(store.eps[1])}·site 2 + ${hopTerms(1)} = ${hvec(matvec(H(), v))}.`,
        enter(ctl) {
          dragOn = false; showCols = false; showParts = false; cloud.setVisible(false); morph = 0; site = 1; v = [0, 1, 0];
          const sE = slider({ id: 'eps2', label: '<i>ε</i><sub>2</sub>', min: -2, max: 2, step: 0.05, value: store.eps[1], onInput: (x) => { store.eps[1] = x; render(); } });
          const sJ = slider({ id: 'J', label: '<i>J</i>', min: -2, max: 2, step: 0.05, value: store.J[0], onInput: (x) => { store.J = [x, x]; render(); } });
          ctl.append(sE.root, sJ.root);
        } },
      { title: 'Three columns are the whole rule', text: 'What H does to each of the three basis states is all there is to know. Written side by side, the three images are the columns of a 3 × 3 matrix: the Hamiltonian.',
        caption: () => hiCol >= 0 ? `Column ${hiCol + 1} of <i>H</i> is <i>H</i>·(site ${hiCol + 1}) = ${hvec(H().map((r) => r[hiCol]))}.` : `Three images, nine numbers. Click a site to see its column.`,
        enter(ctl) {
          dragOn = false; showCols = true; showParts = false; cloud.setVisible(false); morph = 0; hiCol = site; const e = [0, 0, 0]; e[site] = 1; v = e;
          ctl.append(siteButtons(), row([button('all three columns', () => { hiCol = -1; render(); })]));
        } },
      { title: 'A mixture is handled piece by piece', text: 'H is linear: a state made of two sites is mapped by mapping the two sites and adding. That is why the columns suffice, and why the rule is a matrix.',
        caption: () => `<i>ψ</i> = ${comp(siteColor[0], v[0])}·site 1 + ${comp(siteColor[1], v[1])}·site 2 → <i>H</i><i>ψ</i> = ${fmt(v[0])}·<i>H</i><i>e</i><sub>1</sub> + ${fmt(v[1])}·<i>H</i><i>e</i><sub>2</sub> = ${hvec(matvec(H(), v))}.`,
        enter(ctl) {
          dragOn = false; showCols = false; showParts = true; cloud.setVisible(false); morph = 0; hiCol = -1;
          const a0 = Math.atan2(Math.abs(v[1]), Math.abs(v[0])) || Math.PI / 4; v = [Math.cos(a0), Math.sin(a0), 0];
          const s = slider({ id: 'mix', label: 'site 1 ↔ site 2', min: 0, max: 90, step: 1, value: (a0 * 180) / Math.PI, format: (x) => x.toFixed(0) + '°', onInput: (d) => { const a = (d * Math.PI) / 180; v = [Math.cos(a), Math.sin(a), 0]; render(); } });
          ctl.append(s.root, row([button('site 1', () => s.set(0, true), { kind: 'math' }), button('half–half', () => s.set(45, true)), button('site 2', () => s.set(90, true), { kind: 'math' })]));
        } },
      { title: 'Every arrow is pushed at once', text: 'Drag ψ anywhere and read Hψ. Then push a whole cube of states through H: some directions are stretched, some squeezed, some turned.',
        caption: () => { const Hv = matvec(H(), v), ang = deg(angleBetween(v, Hv)); return `<i>H</i><i>ψ</i> = ${hvec(Hv)}, turned by ${norm(Hv) > 1e-6 ? fmt(ang, 0) + '°' : '–'}${morph > 0.99 ? '. Three directions were not turned at all: the next chapter.' : '.'}`; },
        enter(ctl) {
          dragOn = true; showCols = false; showParts = false; hiCol = -1; v = normalize(v);
          const tog = toggle({ id: 'show-cube', label: 'Show a cube of states', checked: false, onChange: (on) => { cloud.setVisible(on); sM.root.hidden = !on; render(); } });
          const sM = slider({ id: 'morph', label: 'push through <i>H</i>', min: 0, max: 1, step: 0.01, value: 0, onInput: (x) => { morph = x; render(); } }); sM.root.hidden = true;
          ctl.append(row([button('random <i>ψ</i>', () => swingTo(randomUnit())), button('(1,1,1)/√3', () => swingTo([1, 1, 1].map((x) => x / Math.sqrt(3))), { kind: 'math' })]), tog.root, sM.root);
        } },
      { title: 'Symmetric: hopping works both ways', text: 'The hop from site 1 to site 2 and the hop back are the same number, so H equals its own transpose (Hermitian). This is what makes the energies real and keeps |ψ| = 1 in time.',
        caption: () => `<i>H</i><sub>12</sub> = <i>H</i><sub>21</sub> = ${hv(store.J[0])}, <i>H</i><sub>23</sub> = <i>H</i><sub>32</sub> = ${hv(store.J[1])}. The matrix mirrors across its diagonal.`,
        enter(ctl) {
          dragOn = true; showCols = false; showParts = false; cloud.setVisible(false); morph = 0; hiCol = -1;
          const s12 = slider({ id: 'j12', label: '<i>J</i><sub>12</sub>', min: -2, max: 2, step: 0.05, value: store.J[0], onInput: (x) => { store.J[0] = x; render(); } });
          const s23 = slider({ id: 'j23', label: '<i>J</i><sub>23</sub>', min: -2, max: 2, step: 0.05, value: store.J[1], onInput: (x) => { store.J[1] = x; render(); } });
          ctl.append(s12.root, s23.root, row([button('Uniform chain (ε = 0, J = 1)', () => { store.eps = [0, 0, 0]; store.J = [1, 1]; s12.set(1); s23.set(1); render(); })]));
        } },
    ];
    const guide = makeGuide({ panel, steps, nextHref: '#phase', nextLabel: 'Next chapter: phase →', beforeStep: () => { tweens.cancelAll(); syncSliders = null; }, afterStep: () => render() });
    onThemeChange(() => {
      const cc = colors(); [cc.v1, cc.v2, cc.v3].forEach((col, i) => { siteColor[i] = col; axes[i].setColor(col); });
      hud.setColors(siteColor); psi.setColor(cc.psi); handle.material.color.set(cc.psi); hpsi.setColor(cc.hpsi); cols.forEach((a) => a.setColor(cc.hpsi)); parts.forEach((a) => a.setColor(cc.hpsi)); dashes.forEach((d) => d.setColor(cc.hpsi)); render();
    });
    guide.go(0);
    return { unmount() { store.psi = normalize(v); hud.remove(); guide.dispose(); } };
  },
};
