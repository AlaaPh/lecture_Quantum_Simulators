// Chapter 1: Hilbert space as a 3D grid, in six steps.
import { button, row, slider } from '../ui.js';
import { colors } from '../theme.js';
import { normalize, norm, fmt } from '../linalg.js';
import { THREE } from '../view3d.js';
import { makeGuide } from '../guide.js';
import { makeHud, psiEquation, probsOf, pct, comp } from '../hud.js';
import { randomUnit, siteAxes } from './kit.js';

export default {
  id: 'states', title: 'Hilbert space: sites become axes', nav: 'Hilbert space', use3d: true, layout: 'wide',
  mount({ view, tweens, store, panel, stage, onThemeChange }) {
    const c = colors();
    const siteColor = [c.v1, c.v2, c.v3];
    view.setTarget(0, 0, 0.35);
    let v = [0, 1, 0], site = 1, showArrow = false, showComps = false, cloudShown = 0, syncSliders = null;

    // grid panes in the first octant
    const gridPts = [];
    for (let t = 0; t <= 1.25 + 1e-9; t += 0.25) {
      gridPts.push(t, 0, 0, t, 1.25, 0, 0, t, 0, 1.25, t, 0, t, 0, 0, t, 0, 1.25, 0, 0, t, 1.25, 0, t, 0, t, 0, 0, t, 1.25, 0, 0, t, 0, 1.25, t);
    }
    const gridGeom = new THREE.BufferGeometry(); gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: new THREE.Color(c.grid), transparent: true, opacity: 0.95 });
    const grid = new THREE.LineSegments(gridGeom, gridMat); view.root.add(grid);
    const axes = siteAxes(view, siteColor);
    const arrow = view.makeArrow({ color: c.psi, radius: 0.034 });
    const handle = view.makeSphereHandle({ color: c.psi, radius: 0.06 });
    view.addHandle(handle, { mode: 'plane', onDrag: (p) => { v = p; render(); } });
    view.addLabel('<i>ψ</i>', () => { const n = norm(v); return n > 0.05 && arrow.obj.visible ? v.map((x) => x * (n + 0.2) / n) : null; }, 'lbl-psi');
    const drops = [0, 1, 2].map((i) => ({ drop: view.makeSegment({ color: c.axis, dashed: true, opacity: 0.9 }), comp: view.makeSegment({ color: siteColor[i] }) }));
    const compLabels = [0, 1, 2].map((i) => view.addLabel('', () => { const p = [0, 0, 0]; p[i] = v[i]; const off = [0, 0, 0]; off[(i + 1) % 3] = -0.17; off[(i + 2) % 3] = -0.17; return showComps && Math.abs(v[i]) > 0.1 ? p.map((x, k) => x + off[k]) : null; }, `lbl-small lbl-site${i + 1}`));
    const sphere = view.makeSphere({ opacity: 0.12 }); sphere.setVisible(false);
    const cloudN = 240, cloudPos = [];
    for (let k = 0; k < cloudN; k++) cloudPos.push(randomUnit());
    const cloud = view.makePoints(cloudPos, { color: c.psi, size: 0.045 }); cloud.obj.geometry.setDrawRange(0, 0); cloud.setVisible(false);
    const hud = makeHud(stage, { siteColors: siteColor, onSiteClick: (i) => { if (guide.step <= 2) putOn(i); } });

    function render(sync = true) {
      const p = probsOf(v), n = norm(v);
      arrow.set(v); arrow.setVisible(showArrow); handle.visible = showArrow && guide.step === 4; handle.position.set(...v);
      drops.forEach((d, i) => { const q = [0, 0, 0]; q[i] = v[i]; d.drop.set(v, q); d.comp.set([0, 0, 0], q); d.drop.setVisible(showComps); d.comp.setVisible(showComps); compLabels[i].setText(fmt(v[i])); });
      hud.chain(p, showArrow || guide.step === 0);
      hud.eq(showArrow ? psiEquation(v, siteColor) : guide.step === 0 ? `particle on site ${site + 1}` : '');
      if (sync && syncSliders) syncSliders();
      guide.refresh();
      view.requestRender();
    }
    const swingTo = (target) => tweens.run('psi', { from: v.slice(), to: target, duration: 700, mode: norm(v) > 0.5 ? 'slerp' : 'linear', onUpdate: (x) => { v = x; render(); } });
    function putOn(i) { site = i; const e = [0, 0, 0]; e[i] = 1; if (showArrow) swingTo(e); else { v = e; render(); } }
    const timers = [];
    function growAxes(animate = true) {
      axes.forEach((a) => a.set(0));
      axes.forEach((a, i) => timers.push(setTimeout(() => tweens.run('axis' + i, { from: 0, to: 1, duration: animate ? 550 : 0, onUpdate: (s) => a.set(s) }), animate ? i * 450 : 0)));
    }
    const siteButtons = () => row([0, 1, 2].map((i) => button(`site ${i + 1}`, () => putOn(i), { kind: 'math' })));
    const sprinkle = () => tweens.run('cloud', { from: 0, to: cloudN, duration: 1600, onUpdate: (n) => { cloudShown = Math.round(n); cloud.obj.geometry.setDrawRange(0, cloudShown); render(); } });

    const steps = [
      { title: 'Three sites', text: 'A particle on a chain of three sites. Click a site to put the particle there.',
        caption: () => `The particle is on <b style="color:${siteColor[site]}">site ${site + 1}</b>.`,
        enter(ctl) { showArrow = false; showComps = false; grid.visible = false; axes.forEach((a) => a.set(0)); sphere.setVisible(false); cloud.setVisible(false); ctl.append(siteButtons()); } },
      { title: 'Every site gets its own axis', text: 'Three sites, three perpendicular directions. Together they span a 3-dimensional space: the Hilbert space of the chain.',
        caption: () => `axis 1 = “on site 1”, axis 2 = “on site 2”, axis 3 = “on site 3”.`,
        enter(ctl) { showArrow = false; showComps = false; grid.visible = true; sphere.setVisible(false); cloud.setVisible(false); growAxes(); ctl.append(row([button('Replay', () => growAxes())])); } },
      { title: '“On site 2” is an arrow along axis 2', text: 'A state is an arrow in this space. Click a site: the arrow swings onto that axis.',
        caption: () => `<i>ψ</i> = (${v.map((x) => fmt(x, 0)).join(', ')}): the arrow lies on axis ${site + 1}, so the particle is on site ${site + 1} with ${pct(probsOf(v)[site])}.`,
        enter(ctl) { grid.visible = true; axes.forEach((a) => a.set(1)); sphere.setVisible(false); cloud.setVisible(false); showArrow = true; showComps = false; const e = [0, 0, 0]; e[site] = 1; v = e; ctl.append(siteButtons()); } },
      { title: 'Between two sites the arrow tilts', text: 'Move the slider from site 1 to site 2. The probability of a site is the square of the arrow’s component along its axis.',
        caption: () => { const p = probsOf(v); return `<i>ψ</i> = ${comp(siteColor[0], v[0])}·site 1 + ${comp(siteColor[1], v[1])}·site 2 → <b>${pct(p[0])}</b> on site 1, <b>${pct(p[1])}</b> on site 2. (${fmt(v[0])}² + ${fmt(v[1])}² = 1)`; },
        enter(ctl) {
          grid.visible = true; axes.forEach((a) => a.set(1)); sphere.setVisible(false); cloud.setVisible(false); showArrow = true; showComps = true;
          const a0 = Math.atan2(v[1], v[0]) || 0; v = [Math.cos(a0), Math.sin(a0), 0];
          const s = slider({ id: 'mix', label: 'site 1 ↔ site 2', min: 0, max: 90, step: 1, value: (a0 * 180) / Math.PI, format: (x) => x.toFixed(0) + '°', onInput: (deg) => { const a = (deg * Math.PI) / 180; v = [Math.cos(a), Math.sin(a), 0]; render(); } });
          ctl.append(s.root, row([button('site 1', () => s.set(0, true), { kind: 'math' }), button('half–half', () => s.set(45, true)), button('site 2', () => s.set(90, true), { kind: 'math' })]));
        } },
      { title: 'Three numbers, one arrow, one state', text: 'Any direction is a state. Set the three components, or drag the tip of the arrow.',
        caption: () => { const p = probsOf(v), n = norm(v); return `<i>ψ</i> = (${v.map((x, i) => comp(siteColor[i], x)).join(', ')}) → ${pct(p[0])} / ${pct(p[1])} / ${pct(p[2])}` + (Math.abs(n - 1) > 0.02 ? `. Length ${fmt(n)} ≠ 1: only the direction matters, probabilities are <i>ψ<sub>i</sub></i>²/|<i>ψ</i>|².` : '.'); },
        enter(ctl) {
          grid.visible = true; axes.forEach((a) => a.set(1)); sphere.setVisible(false); cloud.setVisible(false); showArrow = true; showComps = true;
          const sl = [0, 1, 2].map((i) => slider({ id: `psi${i + 1}`, label: `<span style="color:${siteColor[i]}"><i>ψ</i><sub>${i + 1}</sub></span>`, min: -1, max: 1, step: 0.01, value: v[i], onInput: (x) => { v[i] = x; render(false); } }));
          syncSliders = () => sl.forEach((s, i) => s.set(v[i]));
          ctl.append(...sl.map((s) => s.root), row([button('(1, 1, 1)/√3', () => swingTo([1, 1, 1].map((x) => x / Math.sqrt(3))), { kind: 'math' }), button('(1, 0, −1)/√2', () => swingTo([Math.SQRT1_2, 0, -Math.SQRT1_2]), { kind: 'math' }), button('random', () => swingTo(randomUnit()))]));
        } },
      { title: 'All states together: a sphere', text: 'Probabilities add to 1, so a state has length 1. Every arrow of length 1 is a state; all of them end on the unit sphere. That sphere is the space of states.',
        caption: () => `${cloudShown} random states of length 1 drawn.`,
        enter(ctl) {
          grid.visible = false; axes.forEach((a) => a.set(1)); showArrow = true; showComps = false; v = normalize(v); sphere.setVisible(true); cloud.setVisible(true);
          ctl.append(row([button('Sprinkle 240 random states', sprinkle, { kind: 'primary' }), button('Clear', () => { cloudShown = 0; cloud.obj.geometry.setDrawRange(0, 0); render(); })]));
        } },
    ];
    const guide = makeGuide({ panel, steps, nextHref: '#sphere', nextLabel: 'Next chapter: the sphere →', beforeStep: () => { tweens.cancelAll(); timers.forEach(clearTimeout); timers.length = 0; syncSliders = null; }, afterStep: () => render() });
    onThemeChange(() => {
      const cc = colors(); [cc.v1, cc.v2, cc.v3].forEach((col, i) => { siteColor[i] = col; axes[i].setColor(col); drops[i].comp.setColor(col); });
      hud.setColors(siteColor); gridMat.color.set(cc.grid); arrow.setColor(cc.psi); handle.material.color.set(cc.psi); render();
    });
    guide.go(0);
    return { unmount() { store.psi = norm(v) > 1e-6 ? normalize(v) : [0, 1, 0]; hud.remove(); guide.dispose(); timers.forEach(clearTimeout); } };
  },
};
