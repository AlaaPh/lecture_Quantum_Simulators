// Chapter 2: the unit sphere is the space of states, in six steps.
import { button, row, slider, toggle } from '../ui.js';
import { colors, hexToRgb } from '../theme.js';
import { normalize, norm, fromAngles, toAngles, fmt } from '../linalg.js';
import { makeGuide } from '../guide.js';
import { makeHud, psiEquation, probsOf, pct, comp } from '../hud.js';
import { siteAxes, deg } from './kit.js';

const SITE = ['site 1', 'site 2', 'site 3'];

export default {
  id: 'sphere', title: 'All states live on a sphere', nav: 'The space of states', use3d: true, layout: 'wide',
  mount({ view, tweens, store, panel, stage, onThemeChange }) {
    const c = colors();
    const siteColor = [c.v1, c.v2, c.v3];
    view.setTarget(0, 0, 0.15);
    let v = normalize(store.psi), len = 1, dragOn = false, showAnti = false, walking = false, syncSliders = null;
    if (Math.max(...v.map((x) => x * x)) > 0.95) v = normalize([0.5, Math.SQRT1_2, 0.5]); // a mixed state shows more than a pole

    const axes = siteAxes(view, siteColor); axes.forEach((a) => a.set(1));
    const sphere = view.makeSphere({ opacity: 0.14 }); sphere.setFade(0);
    const arrow = view.makeArrow({ color: c.psi, radius: 0.034 });
    const ghost = view.makeSphereHandle({ color: c['fg-2'], radius: 0.05 }); ghost.visible = false; // marks the point at length 1
    const anti = view.makeArrow({ color: c.psi, radius: 0.024, opacity: 0.35 }); anti.setVisible(false);
    const handle = view.makeSphereHandle({ color: c.psi, radius: 0.06 });
    view.addHandle(handle, { mode: 'sphere', onDrag: (p) => { v = normalize(p); render(); } });
    view.addLabel('<i>ψ</i>', () => v.map((x) => x * (len + 0.2)), 'lbl-psi');
    view.addLabel('−<i>ψ</i>', () => (showAnti ? v.map((x) => -x * 1.2) : null), 'lbl-psi lbl-small');
    const latRing = view.makeRing({ color: c['fg-2'], radius: 1, normal: [0, 0, 1], opacity: 0.8 }); latRing.setVisible(false);
    const merRing = view.makeRing({ color: c['fg-2'], radius: 1, normal: [0, 1, 0], opacity: 0.8 }); merRing.setVisible(false);
    const hud = makeHud(stage, { siteColors: siteColor, onSiteClick: (i) => { const e = [0, 0, 0]; e[i] = 1; swingTo(e); } });

    const angles = () => { const a = toAngles(v); return { th: deg(a.theta), ph: deg(a.phi) }; };
    const dominant = (p) => (p[0] >= p[1] && p[0] >= p[2] ? 0 : p[1] >= p[2] ? 1 : 2);
    function paintMap(on) {
      if (!on) { sphere.colorBy(null); return; }
      const cc = colors(), surf = hexToRgb(cc.surface), sc = siteColor.map(hexToRgb);
      sphere.colorBy((x, y, z) => {
        const p = [x * x, y * y, z * z], k = dominant(p), t = Math.max(0, (p[k] - 1 / 3) / (2 / 3)), w = 0.18 + 0.82 * t;
        return [0, 1, 2].map((i) => surf[i] + (sc[k][i] - surf[i]) * w);
      }, 0.75);
    }
    function render(sync = true) {
      const p = probsOf(v), a = toAngles(v);
      const shown = v.map((x) => x * len);
      arrow.set(shown); handle.position.set(...shown); handle.visible = dragOn;
      ghost.position.set(...v); ghost.visible = guide.step === 0 && Math.abs(len - 1) > 0.02;
      anti.set(v.map((x) => -x)); anti.setVisible(showAnti);
      const st = Math.sin(a.theta);
      latRing.obj.scale.set(Math.max(st, 1e-3), Math.max(st, 1e-3), 1); latRing.obj.position.z = Math.cos(a.theta);
      merRing.setNormal([-Math.sin(a.phi), Math.cos(a.phi), 0]);
      hud.chain(p, true);
      hud.eq(psiEquation(shown, siteColor));
      if (sync && syncSliders) syncSliders();
      guide.refresh();
      view.requestRender();
    }
    const swingTo = (target, ms = 700) => tweens.run('psi', { from: v.slice(), to: target, duration: ms, mode: 'slerp', onUpdate: (x) => { v = normalize(x); render(); } });
    const fadeSphere = (to) => tweens.run('sphere', { from: 0, to: 1, duration: 900, onUpdate: (t) => { sphere.setFade(to ? t : 1 - t); view.requestRender(); } });

    const steps = [
      { title: 'Only the direction counts', text: 'Stretch or shrink the arrow. The percentages do not move: they are ψᵢ² divided by the squared length. Physics ignores the length, so we fix it at 1.',
        caption: () => { const p = probsOf(v); return `length ${fmt(len)}: ${pct(p[0])} / ${pct(p[1])} / ${pct(p[2])}${Math.abs(len - 1) > 0.02 ? ' — unchanged. The grey dot marks length 1.' : '. Length 1: the state as we will always write it.'}`; },
        enter(ctl) {
          dragOn = false; showAnti = false; latRing.setVisible(false); merRing.setVisible(false); paintMap(false); sphere.setFade(0);
          const s = slider({ id: 'len', label: 'length', min: 0.3, max: 1.6, step: 0.01, value: len, onInput: (x) => { len = x; render(); } });
          ctl.append(s.root, row([button('length 1', () => tweens.run('len', { from: len, to: 1, duration: 500, onUpdate: (x) => { len = x; s.set(x); render(); } }))]));
        } },
      { title: 'Length 1: the tip sits on a sphere', text: 'Every arrow of length 1 ends on the unit sphere. Drag the tip: it slides over the sphere, and the three percentages always add to 100%.',
        caption: () => { const p = probsOf(v); return `${comp(siteColor[0], v[0])}² + ${comp(siteColor[1], v[1])}² + ${comp(siteColor[2], v[2])}² = ${pct(p[0])} + ${pct(p[1])} + ${pct(p[2])} = 100%`; },
        enter(ctl) { len = 1; dragOn = true; showAnti = false; latRing.setVisible(false); merRing.setVisible(false); paintMap(false); fadeSphere(true); ctl.append(row([button('site 1', () => swingTo([1, 0, 0]), { kind: 'math' }), button('site 2', () => swingTo([0, 1, 0]), { kind: 'math' }), button('site 3', () => swingTo([0, 0, 1]), { kind: 'math' }), button('(1,1,1)/√3', () => swingTo([1, 1, 1].map((x) => x / Math.sqrt(3))), { kind: 'math' })])); } },
      { title: 'Two dials fix a state', text: 'A point on a sphere needs two angles: θ down from the site-3 pole, φ around it. Two numbers, so the space of states is a 2-dimensional surface.',
        caption: () => { const { th, ph } = angles(), p = probsOf(v); return `<i>θ</i> = ${th.toFixed(0)}°, <i>φ</i> = ${((ph + 540) % 360 - 180).toFixed(0)}° → <i>ψ</i> = (${v.map((x, i) => comp(siteColor[i], x)).join(', ')}) → ${pct(p[0])} / ${pct(p[1])} / ${pct(p[2])}`; },
        enter(ctl) {
          len = 1; dragOn = true; showAnti = false; sphere.setFade(1); latRing.setVisible(true); merRing.setVisible(true); paintMap(false);
          const { th, ph } = angles();
          const sT = slider({ id: 'theta', label: '<i>θ</i> (from site 3)', min: 0, max: 180, step: 1, value: th, format: (x) => x.toFixed(0) + '°', onInput: () => fromDials() });
          const sP = slider({ id: 'phi', label: '<i>φ</i> (around)', min: -180, max: 180, step: 1, value: ph, format: (x) => x.toFixed(0) + '°', onInput: () => fromDials() });
          const fromDials = () => { v = fromAngles((sT.get() * Math.PI) / 180, (sP.get() * Math.PI) / 180); render(false); };
          syncSliders = () => { const a = angles(); sT.set(a.th); sP.set(a.ph); };
          ctl.append(sT.root, sP.root, row([button('pole: site 3', () => { sT.set(0, true); }), button('equator', () => { sT.set(90, true); }), button('site 1', () => { sT.set(90); sP.set(0, true); }, { kind: 'math' })]));
        } },
      { title: 'Walk once around the equator', text: 'On the equator θ = 90°, so site 3 never appears. Press walk and watch the probability flow from site 1 to site 2 and back.',
        caption: () => { const { ph } = angles(), p = probsOf(v); const phn = ((ph + 540) % 360 - 180); return `<i>φ</i> = ${phn.toFixed(0)}°: ${pct(p[0])} / ${pct(p[1])} / <b>${pct(p[2])}</b>` + (Math.abs(Math.abs(phn) - 180) < 4 ? ` — <i>ψ</i> = (−1, 0, 0): site 1 again, with a minus sign.` : Math.abs(phn) < 4 && !walking ? '' : ''); },
        enter(ctl) {
          len = 1; dragOn = false; showAnti = false; sphere.setFade(1); latRing.setVisible(true); merRing.setVisible(true); paintMap(false);
          v = [1, 0, 0]; walking = false;
          const walk = () => { walking = true; tweens.run('walk', { from: 0, to: 360, duration: 8000, ease: (t) => t, onUpdate: (d) => { v = [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180), 0]; render(); }, onDone: () => { walking = false; render(); } }); };
          ctl.append(row([button('Walk once around', walk, { kind: 'primary' }), button('Stop', () => { tweens.cancel('walk'); walking = false; render(); })]));
        } },
      { title: 'ψ and −ψ are the same state', text: 'Opposite points of the sphere give the same percentages, and (as the next chapters show) the same physics. A global sign is invisible. The sphere’s antipodes are one state.',
        caption: () => { const p = probsOf(v); return `<i>ψ</i> = (${v.map((x, i) => comp(siteColor[i], x)).join(', ')}) and −<i>ψ</i> = (${v.map((x, i) => comp(siteColor[i], -x)).join(', ')}): both ${pct(p[0])} / ${pct(p[1])} / ${pct(p[2])}.`; },
        enter(ctl) {
          len = 1; dragOn = true; showAnti = true; sphere.setFade(1); latRing.setVisible(false); merRing.setVisible(false); paintMap(false);
          if (Math.abs(v[2]) > 0.95) v = normalize([1, 1, 0.3]);
          const flip = () => tweens.run('psi', { from: v.slice(), to: v.map((x) => -x), duration: 900, mode: 'linear', onUpdate: (x) => { if (norm(x) > 0.05) v = normalize(x); len = Math.max(0.02, norm(x)); render(); }, onDone: () => { len = 1; render(); } });
          ctl.append(row([button('Flip the sign: <i>ψ</i> → −<i>ψ</i>', flip, { kind: 'primary' })]));
        } },
      { title: 'The map of the sphere', text: 'Each point is painted with the colour of the most likely site. Near a pole the particle is almost surely there; between the poles it is shared.',
        caption: () => { const p = probsOf(v), k = dominant(p); return p[k] > 0.9 ? `Near the ${SITE[k]} pole: ${pct(p[k])} on <b style="color:${siteColor[k]}">${SITE[k]}</b>.` : Math.abs(p[0] - p[1]) < 0.04 && Math.abs(p[1] - p[2]) < 0.04 ? `Equal mix: ${pct(p[0])} / ${pct(p[1])} / ${pct(p[2])}, no site is preferred.` : `Mostly <b style="color:${siteColor[k]}">${SITE[k]}</b> (${pct(p[k])}), the rest shared: ${pct(p[0])} / ${pct(p[1])} / ${pct(p[2])}.`; },
        enter(ctl) {
          len = 1; dragOn = true; showAnti = false; sphere.setFade(1); latRing.setVisible(false); merRing.setVisible(false); paintMap(true);
          ctl.append(row([button('site 1', () => swingTo([1, 0, 0]), { kind: 'math' }), button('site 2', () => swingTo([0, 1, 0]), { kind: 'math' }), button('site 3', () => swingTo([0, 0, 1]), { kind: 'math' }), button('equal mix', () => swingTo([1, 1, 1].map((x) => x / Math.sqrt(3))), { kind: 'primary' })]),
            toggle({ id: 'map-on', label: 'Paint the map', checked: true, onChange: (on) => paintMap(on) }).root);
        } },
    ];
    const guide = makeGuide({ panel, steps, nextHref: '#operator', nextLabel: 'Next chapter: the Hamiltonian →', beforeStep: () => { tweens.cancelAll(); syncSliders = null; walking = false; }, afterStep: () => render() });
    onThemeChange(() => {
      const cc = colors(); [cc.v1, cc.v2, cc.v3].forEach((col, i) => { siteColor[i] = col; axes[i].setColor(col); });
      hud.setColors(siteColor); arrow.setColor(cc.psi); ghost.material.color.set(cc['fg-2']); anti.setColor(cc.psi); handle.material.color.set(cc.psi);
      latRing.obj.material.color.set(cc['fg-2']); merRing.obj.material.color.set(cc['fg-2']);
      if (guide.step === 5) paintMap(true); render();
    });
    guide.go(0);
    return { unmount() { store.psi = normalize(v); hud.remove(); guide.dispose(); } };
  },
};
