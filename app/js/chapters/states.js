// Chapter 1: Hilbert space as a 3D grid, told in six steps. Little text; every control has a live caption.
import { el, button, row, slider } from '../ui.js';
import { colors } from '../theme.js';
import { normalize, norm, fmt } from '../linalg.js';
import { THREE } from '../view3d.js';
import { randomUnit } from './kit.js';

const pct = (p) => Math.round(p * 100) + '%';

export default {
  id: 'states', title: 'Hilbert space: sites become axes', nav: 'Hilbert space', use3d: true, layout: 'wide',
  mount({ view, tweens, store, panel, controls, stage, onThemeChange }) {
    const c = colors();
    const siteColor = [c.v1, c.v2, c.v3];
    view.setTarget(0, 0, 0.35); // the scene lives in the positive octant: look a little above the origin
    let v = [0, 1, 0];           // the state (real amplitudes)
    let step = 0, site = 1;

    // ---------- 3D scene ----------
    const L = 1.5;
    // grid panes in the first octant: the "3D grid" of the space
    const gridPts = [];
    for (let t = 0; t <= 1.25 + 1e-9; t += 0.25) {
      gridPts.push(t, 0, 0, t, 1.25, 0, 0, t, 0, 1.25, t, 0); // xy plane
      gridPts.push(t, 0, 0, t, 0, 1.25, 0, 0, t, 1.25, 0, t); // xz plane
      gridPts.push(0, t, 0, 0, t, 1.25, 0, 0, t, 0, 1.25, t); // yz plane
    }
    const gridGeom = new THREE.BufferGeometry(); gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: new THREE.Color(c.grid), transparent: true, opacity: 0.95 });
    const grid = new THREE.LineSegments(gridGeom, gridMat); view.root.add(grid);
    onThemeChange(() => { gridMat.color.set(colors().grid); view.requestRender(); });

    const dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const axes = dirs.map((d, i) => {
      const seg = view.makeSegment({ color: siteColor[i] });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 16), new THREE.MeshStandardMaterial({ color: new THREE.Color(siteColor[i]), roughness: 0.6 }));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d)); view.root.add(cone);
      let s = 0;
      const lab = view.addLabel(`site ${i + 1}<span class="lbl-sub"> · <i>e</i><sub>${i + 1}</sub></span>`, () => (s > 0.05 ? d.map((x) => x * (L * s + 0.22)) : null), `lbl-site lbl-site${i + 1}`);
      const api = {
        set(scale) { s = scale; seg.set([0, 0, 0], d.map((x) => x * L * s)); cone.position.set(...d.map((x) => x * L * s)); cone.visible = s > 0.02; seg.setVisible(s > 0.001); view.requestRender(); },
        setColor(col) { seg.setColor(col); cone.material.color.set(col); },
      };
      api.set(0);
      return api;
    });
    const arrow = view.makeArrow({ color: c.psi, radius: 0.034 });
    const handle = view.makeSphereHandle({ color: c.psi, radius: 0.06 });
    view.addHandle(handle, { mode: 'plane', onDrag: (p) => { v = p; render(); } });
    const psiLabel = view.addLabel('<i>ψ</i>', () => { const n = norm(v); return n > 0.05 && arrow.obj.visible ? v.map((x) => x * (n + 0.2) / n) : null; }, 'lbl-psi');
    const drops = dirs.map((d, i) => ({ drop: view.makeSegment({ color: c.axis, dashed: true, opacity: 0.9 }), comp: view.makeSegment({ color: siteColor[i] }) }));
    const compLabels = dirs.map((d, i) => view.addLabel('', () => { const p = [0, 0, 0]; p[i] = v[i]; const off = [0, 0, 0]; off[(i + 1) % 3] = -0.17; off[(i + 2) % 3] = -0.17; return showComps && Math.abs(v[i]) > 0.1 ? p.map((x, k) => x + off[k]) : null; }, `lbl-small lbl-site${i + 1}`));
    const sphere = view.makeSphere({ opacity: 0.12 }); sphere.setVisible(false);
    const cloudN = 240, cloudPos = [];
    for (let k = 0; k < cloudN; k++) cloudPos.push(randomUnit());
    const cloud = view.makePoints(cloudPos, { color: c.psi, size: 0.045 }); cloud.obj.geometry.setDrawRange(0, 0); cloud.setVisible(false);
    let showComps = false, showArrow = false;

    // ---------- HUD inside the stage: equation on top, the chain at the bottom ----------
    const hud = el('div', { class: 'hud' });
    const eq = el('div', { class: 'hud-eq' });
    const chainSvg = el('div', { class: 'hud-chain' });
    chainSvg.innerHTML = `<svg viewBox="0 0 320 96" width="100%" height="100%" aria-hidden="true">
      <line x1="48" y1="44" x2="272" y2="44" class="bond"/>
      ${[0, 1, 2].map((i) => `<g class="site" data-i="${i}" style="cursor:pointer"><circle cx="${48 + 112 * i}" cy="44" r="22" class="site-bg"/><circle cx="${48 + 112 * i}" cy="44" r="22" class="site-fill" fill="${siteColor[i]}" fill-opacity="0"/><circle cx="${48 + 112 * i}" cy="44" r="22" class="site-ring" stroke="${siteColor[i]}"/><text x="${48 + 112 * i}" y="48" class="site-name" text-anchor="middle">${i + 1}</text><text x="${48 + 112 * i}" y="86" class="site-p" text-anchor="middle"></text></g>`).join('')}
    </svg>`;
    hud.append(eq, chainSvg); stage.append(hud);
    chainSvg.querySelectorAll('g.site').forEach((g) => g.addEventListener('click', () => { if (step <= 2) putOn(+g.dataset.i); }));
    const fills = [...chainSvg.querySelectorAll('.site-fill')], ptexts = [...chainSvg.querySelectorAll('.site-p')];

    // ---------- panel: step strip ----------
    const stepsBar = el('div', { class: 'steps' });
    const title = el('h2', { class: 'step-title' });
    const text = el('p', { class: 'step-text' });
    const caption = el('div', { class: 'caption' });
    const ctl = el('div', { class: 'controls' });
    const nav = el('div', { class: 'row step-nav' });
    panel.append(stepsBar, title, text, caption, ctl, nav);

    const comp = (i, x) => `<span style="color:${siteColor[i]}">${fmt(x)}</span>`;
    function probs() { const n2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2; return n2 > 1e-9 ? v.map((x) => (x * x) / n2) : [0, 0, 0]; }

    function render() {
      const p = probs(), n = norm(v);
      arrow.set(v); arrow.setVisible(showArrow); handle.visible = showArrow && step === 4; handle.position.set(...v);
      drops.forEach((d, i) => { const q = [0, 0, 0]; q[i] = v[i]; d.drop.set(v, q); d.comp.set([0, 0, 0], q); d.drop.setVisible(showComps); d.comp.setVisible(showComps); compLabels[i].setText(fmt(v[i])); });
      fills.forEach((f, i) => f.setAttribute('fill-opacity', (showArrow || step === 0) ? p[i].toFixed(3) : '0'));
      ptexts.forEach((t, i) => { t.textContent = (showArrow || step === 0) ? pct(p[i]) : ''; });
      if (!showArrow) eq.innerHTML = step === 0 ? `particle on site ${site + 1}` : '';
      else eq.innerHTML = `<i>ψ</i> = ${comp(0, v[0])}·site 1 + ${comp(1, v[1])}·site 2 + ${comp(2, v[2])}·site 3` + (Math.abs(n - 1) > 0.02 ? `<span class="hud-dim"> length ${fmt(n)}</span>` : '');
      caption.innerHTML = steps[step].caption();
      view.requestRender();
    }
    function swingTo(target) { tweens.run('psi', { from: v.slice(), to: target, duration: 700, mode: norm(v) > 0.5 ? 'slerp' : 'linear', onUpdate: (x) => { v = x; render(); } }); }
    function putOn(i) { site = i; const e = [0, 0, 0]; e[i] = 1; if (showArrow) swingTo(e); else { v = e; render(); } }
    const timers = [];
    function growAxes(animate = true) {
      axes.forEach((a) => a.set(0));
      axes.forEach((a, i) => timers.push(setTimeout(() => tweens.run('axis' + i, { from: 0, to: 1, duration: animate ? 550 : 0, onUpdate: (s) => a.set(s) }), animate ? i * 450 : 0)));
    }
    onThemeChange(() => {
      const cc = colors(); [cc.v1, cc.v2, cc.v3].forEach((col, i) => { siteColor[i] = col; fills[i].setAttribute('fill', col); axes[i].setColor(col); drops[i].comp.setColor(col); });
      chainSvg.querySelectorAll('.site-ring').forEach((r, i) => r.setAttribute('stroke', siteColor[i]));
      arrow.setColor(cc.psi); handle.material.color.set(cc.psi); render();
    });
    const siteButtons = () => row([0, 1, 2].map((i) => button(`site ${i + 1}`, () => putOn(i), { kind: 'math' })));

    const steps = [
      {
        title: 'Three sites',
        text: 'A particle on a chain of three sites. Click a site to put the particle there.',
        caption: () => `The particle is on <b style="color:${siteColor[site]}">site ${site + 1}</b>.`,
        enter() { showArrow = false; showComps = false; grid.visible = false; axes.forEach((a) => a.set(0)); sphere.setVisible(false); cloud.setVisible(false); ctl.append(siteButtons()); },
      },
      {
        title: 'Every site gets its own axis',
        text: 'Three sites, three perpendicular directions. Together they span a 3-dimensional space: the Hilbert space of the chain.',
        caption: () => `axis 1 = “on site 1”, axis 2 = “on site 2”, axis 3 = “on site 3”.`,
        enter() { showArrow = false; grid.visible = true; growAxes(); ctl.append(row([button('Replay', () => growAxes())])); },
      },
      {
        title: '“On site 2” is an arrow along axis 2',
        text: 'A state is an arrow in this space. Click a site: the arrow swings onto that axis.',
        caption: () => `<i>ψ</i> = (${v.map((x) => fmt(x, 0)).join(', ')}): the arrow lies on axis ${site + 1}, so the particle is on site ${site + 1} with ${pct(probs()[site])}.`,
        enter() { grid.visible = true; axes.forEach((a) => a.set(1)); showArrow = true; showComps = false; const e = [0, 0, 0]; e[site] = 1; v = e; ctl.append(siteButtons()); },
      },
      {
        title: 'Between two sites the arrow tilts',
        text: 'Move the slider from site 1 to site 2. The probability of a site is the square of the arrow’s component along its axis.',
        caption: () => `<i>ψ</i> = ${comp(0, v[0])}·site 1 + ${comp(1, v[1])}·site 2 → <b>${pct(probs()[0])}</b> on site 1, <b>${pct(probs()[1])}</b> on site 2. (${fmt(v[0])}² + ${fmt(v[1])}² = 1)`,
        enter() {
          grid.visible = true; axes.forEach((a) => a.set(1)); showArrow = true; showComps = true;
          const a0 = Math.atan2(v[1], v[0]) || 0; v = [Math.cos(a0), Math.sin(a0), 0];
          const s = slider({ id: 'mix', label: 'site 1 ↔ site 2', min: 0, max: 90, step: 1, value: (a0 * 180) / Math.PI, format: (x) => x.toFixed(0) + '°', onInput: (deg) => { const a = (deg * Math.PI) / 180; v = [Math.cos(a), Math.sin(a), 0]; render(); } });
          ctl.append(s.root, row([button('site 1', () => s.set(0, true), { kind: 'math' }), button('half–half', () => s.set(45, true)), button('site 2', () => s.set(90, true), { kind: 'math' })]));
        },
      },
      {
        title: 'Three numbers, one arrow, one state',
        text: 'Any direction is a state. Set the three components, or drag the tip of the arrow.',
        caption: () => { const p = probs(), n = norm(v); return `<i>ψ</i> = (${v.map((x, i) => comp(i, x)).join(', ')}) → ${pct(p[0])} / ${pct(p[1])} / ${pct(p[2])}` + (Math.abs(n - 1) > 0.02 ? `. Length ${fmt(n)} ≠ 1: only the direction matters, probabilities are <i>ψ<sub>i</sub></i>²/|<i>ψ</i>|².` : '.'); },
        enter() {
          grid.visible = true; axes.forEach((a) => a.set(1)); showArrow = true; showComps = true;
          const sl = [0, 1, 2].map((i) => slider({ id: `psi${i + 1}`, label: `<span style="color:${siteColor[i]}"><i>ψ</i><sub>${i + 1}</sub></span>`, min: -1, max: 1, step: 0.01, value: v[i], onInput: (x) => { v[i] = x; render(false); } }));
          const sync = () => sl.forEach((s, i) => s.set(v[i]));
          renderHook = sync;
          ctl.append(...sl.map((s) => s.root), row([button('(1, 1, 1)/√3', () => swingTo([1, 1, 1].map((x) => x / Math.sqrt(3))), { kind: 'math' }), button('(1, 0, −1)/√2', () => swingTo([Math.SQRT1_2, 0, -Math.SQRT1_2]), { kind: 'math' }), button('random', () => swingTo(randomUnit()))]));
        },
      },
      {
        title: 'All states together: a sphere',
        text: 'Probabilities add to 1, so a state has length 1. Every arrow of length 1 is a state; all of them end on the unit sphere. That sphere is the space of states.',
        caption: () => `${cloudShown} random states of length 1 drawn.`,
        enter() {
          grid.visible = false; axes.forEach((a) => a.set(1)); showArrow = true; showComps = false; v = normalize(v); sphere.setVisible(true); cloud.setVisible(true);
          ctl.append(row([button('Sprinkle 240 random states', () => sprinkle(), { kind: 'primary' }), button('Clear', () => { cloudShown = 0; cloud.obj.geometry.setDrawRange(0, 0); render(); })]));
        },
      },
    ];
    let renderHook = null, cloudShown = 0;
    const baseRender = render;
    render = function (sync = true) { baseRender(); if (sync && renderHook) renderHook(); };
    function sprinkle() { tweens.run('cloud', { from: 0, to: cloudN, duration: 1600, onUpdate: (n) => { cloudShown = Math.round(n); cloud.obj.geometry.setDrawRange(0, cloudShown); render(); } }); }

    function go(i) {
      step = Math.max(0, Math.min(steps.length - 1, i));
      tweens.cancelAll(); renderHook = null; ctl.innerHTML = ''; nav.innerHTML = '';
      stepsBar.innerHTML = steps.map((s, k) => `<span class="dot${k === step ? ' on' : k < step ? ' done' : ''}" title="${s.title}"></span>`).join('');
      title.innerHTML = `<span class="step-num">${step + 1} / ${steps.length}</span> ${steps[step].title}`;
      text.innerHTML = steps[step].text;
      steps[step].enter();
      nav.append(button('← Back', () => go(step - 1), { id: 'step-back' }), step < steps.length - 1 ? button('Next →', () => go(step + 1), { kind: 'primary', id: 'step-next' }) : el('a', { class: 'btn primary', href: '#sphere', html: 'Next chapter: the sphere →' }));
      nav.firstChild.disabled = step === 0;
      render();
    }
    stepsBar.addEventListener('click', (e) => { const dots = [...stepsBar.children]; const k = dots.indexOf(e.target); if (k >= 0) go(k); });
    const keyHandler = (e) => { if (e.target.matches('input')) return; if (e.key === 'ArrowRight' && !e.altKey && step < steps.length - 1) go(step + 1); if (e.key === 'ArrowLeft' && !e.altKey) go(step - 1); };
    window.addEventListener('keydown', keyHandler);
    go(0);
    return { unmount() { store.psi = norm(v) > 1e-6 ? normalize(v) : [0, 1, 0]; hud.remove(); timers.forEach(clearTimeout); window.removeEventListener('keydown', keyHandler); } };
  },
};
