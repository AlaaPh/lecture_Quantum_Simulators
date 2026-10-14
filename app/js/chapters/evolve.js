import { slider, toggle, readout, row, button, segmented, el } from '../ui.js';
import { colors } from '../theme.js';
import { ChainView } from '../chain.js';
import { Plot } from '../plots.js';
import { normalize, symEig, evolveExact, rk4Step, components, cnorm2, prob, fmt, dot } from '../linalg.js';
import { stateArrow, hamiltonianOf, hSliders, widget, SQ2 } from './kit.js';

export default {
  id: 'evolve', title: 'How states move', nav: 'Time evolution', use3d: true,
  mount({ view, tweens, store, panel, controls, onThemeChange }) {
    const c = colors();
    panel.innerHTML = `
<h2>How states move</h2>
<p>The equation <span class="m">i d<i>ψ</i>/d<i>t</i> = <i>H</i><i>ψ</i></span> is solved by one rule: in the energy basis every component is a clock.
Write <span class="m"><i>ψ</i>(0) = Σ<sub><i>n</i></sub> <i>c</i><sub><i>n</i></sub> <i>v</i><sub><i>n</i></sub></span>; then</p>
<div class="eq"><i>ψ</i>(<i>t</i>) = Σ<sub><i>n</i></sub> <i>c</i><sub><i>n</i></sub> e<sup>−i<i>E</i><sub><i>n</i></sub><i>t</i></sup> <i>v</i><sub><i>n</i></sub>.</div>
<p>Each coefficient keeps its size and turns in the complex plane at the rate <span class="m"><i>E</i><sub><i>n</i></sub></span>. The amplitudes are now complex,
so the view shows the real part of <i>ψ</i> (solid) and the imaginary part (light).</p>
<p>An eigenstate has one clock. Its phase turns and nothing else happens: the probabilities never change. It is a <b>stationary state</b>.
A superposition has several clocks at different rates; their beats, at the frequencies <span class="m"><i>E</i><sub><i>n</i></sub> − <i>E</i><sub><i>m</i></sub></span>,
move probability between the sites. A particle started on site 1 has all three clocks running and sloshes through the chain.</p>
<div class="note">Numerics corner. The coding sessions integrate this equation with Runge–Kutta (RK4). RK4 is stable only while
<span class="m">d<i>t</i> · max|<i>E</i><sub><i>n</i></sub>| &lt; 2√2 ≈ 2.83</span>, and it does not conserve the norm exactly.
Switch to RK4 and raise d<i>t</i>: the norm drifts, then explodes. The exact solution is the reference for the task 5 check:
<span class="m"><i>ψ</i>(<i>t</i>) = <i>V</i> e<sup>−i<i>E</i><i>t</i></sup> <i>V</i><sup>†</sup> <i>ψ</i>(0)</span>.</div>
<div class="try"><b>Try.</b> Start on site 1 and press play. Then start in <span class="cv1"><i>v</i><sub>1</sub></span>: the bars stand still while the arrows turn.
Start in <span class="m">(<i>v</i><sub>1</sub> + <i>v</i><sub>3</sub>)/√2</span>: a single beat at <span class="m"><i>E</i><sub>3</sub> − <i>E</i><sub>1</sub></span>.</div>`;
    panel.append(widget('chain-evolve', 'Probabilities |<i>ψ</i><sub><i>i</i></sub>(<i>t</i>)|²'));
    panel.append(widget('clocks', 'The three clocks: <i>c</i><sub><i>n</i></sub>(<i>t</i>) = <i>c</i><sub><i>n</i></sub>(0) e<sup>−i<i>E</i><sub>n</sub><i>t</i></sup>', 'clocks'));
    panel.append(widget('plot-evolve', '', 'tall'));
    const chain = new ChainView(panel.querySelector('#chain-evolve'), { mode: 'prob' });
    const clocks = panel.querySelector('#clocks'); const cctx = clocks.getContext('2d');
    const plot = new Plot(panel.querySelector('#plot-evolve'), { pad: { l: 52, r: 10, t: 24, b: 32 } });

    view.makeAxes();
    view.makeSphere({ opacity: 0.08 });
    const re = stateArrow(view, { color: c.psi, label: 'Re <i>ψ</i>', cls: 'lbl-psi', handle: false });
    const im = stateArrow(view, { color: c.psi, label: 'Im <i>ψ</i>', cls: 'lbl-psi lbl-small', handle: false, radius: 0.022, opacity: 0.4 });
    const frame = [0, 1, 2].map((n) => stateArrow(view, { color: c.v[n], label: `<i>v</i><sub>${n + 1}</sub>`, cls: `lbl-v${n + 1} lbl-small`, handle: false, radius: 0.012, opacity: 0.6 }));

    let H, eig, psi0, psi, t = 0, tRK = 0, playing = false, hist = [];
    const sSpeed = slider({ id: 'speed', label: 'speed', min: 0.1, max: 3, step: 0.1, value: 1, format: (x) => x.toFixed(1) + '×' });
    const integ = segmented({ id: 'integ', options: [{ value: 'exact', label: 'exact (eigenbasis)' }, { value: 'rk4', label: 'RK4' }], value: 'exact', onChange: () => { restart(); } });
    const sDt = slider({ id: 'dt', label: 'd<i>t</i>', min: 0.05, max: 2.2, step: 0.05, value: 0.2, onInput: () => restart() });
    const showFrame = toggle({ id: 'show-frame-ev', label: 'Show the eigenvectors', checked: false, onChange: () => render() });
    const ro = readout([['t', '<i>t</i>'], ['norm', '⟨<i>ψ</i>|<i>ψ</i>⟩'], ['stab', 'd<i>t</i> · max|<i>E</i><sub>n</sub>|'], ['beats', 'beat frequencies']]);
    const playBtn = button('Play', () => { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; }, { kind: 'primary' });
    const hs = hSliders(store, () => { setup(); restart(); }, { open: false });

    function setup() { H = hamiltonianOf(store); eig = symEig(H); }
    function setInitial(state) { psi0 = { re: normalize(state), im: [0, 0, 0] }; restart(); }
    function restart() { t = 0; tRK = 0; psi = { re: psi0.re.slice(), im: psi0.im.slice() }; hist = []; render(); }
    function step(dtReal) {
      const dts = dtReal * sSpeed.get();
      t += dts;
      if (integ.get() === 'exact') psi = evolveExact(eig, psi0, t);
      else { const dt = sDt.get(); let n = 0; while (tRK + dt <= t && n < 200) { psi = rk4Step(H, psi, dt); tRK += dt; n++; } }
      const n2 = cnorm2(psi);
      if (!isFinite(n2) || n2 > 1e6) { playing = false; playBtn.textContent = 'Play'; }
    }
    function render() {
      const p = prob(psi), n2 = cnorm2(psi);
      re.set(psi.re); im.set(psi.im);
      frame.forEach((a, n) => { a.set(eig.vectors[n]); a.setVisible(showFrame.get()); });
      chain.set({ amp: psi.re, prob: p });
      sDt.root.hidden = integ.get() !== 'rk4';
      ro.set('t', fmt(t, 2));
      ro.set('norm', isFinite(n2) ? fmt(n2, 4) : '∞');
      const Emax = Math.max(...eig.values.map(Math.abs));
      ro.set('stab', integ.get() === 'rk4' ? `${fmt(sDt.get() * Emax, 2)} ${sDt.get() * Emax < 2 * Math.SQRT2 ? '(stable, < 2.83)' : '(unstable, > 2.83)'}` : '–');
      const E = eig.values; ro.set('beats', `${fmt(E[1] - E[0])}, ${fmt(E[2] - E[1])}, ${fmt(E[2] - E[0])}`);
      // history and plot
      if (!hist.length || t > hist[hist.length - 1].t + 1e-9) hist.push({ t, p, n2: Math.min(n2, 1e3) });
      const win = 24; while (hist.length > 2 && hist[0].t < t - win) hist.shift();
      const t0 = Math.max(0, t - win), ts = hist.map((h) => h.t);
      plot.begin({ xlim: [t0, Math.max(t0 + win, t)], ylim: [0, Math.max(1.05, ...hist.map((h) => Math.min(2, h.n2)))], xlabel: 'time t', ylabel: '|ψᵢ|²' });
      [0, 1, 2].forEach((i) => plot.line(ts, hist.map((h) => h.p[i]), { color: [c.psi, c.hpsi, c.v1][i], width: 1.8 }));
      plot.line(ts, hist.map((h) => h.n2), { color: c['fg-2'], width: 1, dash: [4, 3] });
      plot.end();
      plot.legend([{ color: c.psi, label: 'site 1' }, { color: c.hpsi, label: 'site 2' }, { color: c.v1, label: 'site 3' }, { color: c['fg-2'], label: 'norm ⟨ψ|ψ⟩' }], { x: 0, y: -12 });
      drawClocks();
    }
    function drawClocks() {
      const r = clocks.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      clocks.width = Math.round(r.width * dpr); clocks.height = Math.round(r.height * dpr);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0); cctx.clearRect(0, 0, r.width, r.height);
      const comp = components(eig, psi), R = Math.min(r.height * 0.3, r.width / 8);
      cctx.font = '12px ' + getComputedStyle(document.documentElement).getPropertyValue('--font-mono'); cctx.textAlign = 'center';
      comp.forEach((cn, n) => {
        const cx = (r.width * (n + 0.5)) / 3, cy = r.height * 0.4;
        cctx.strokeStyle = c.line; cctx.lineWidth = 1; cctx.beginPath(); cctx.arc(cx, cy, R, 0, 2 * Math.PI); cctx.stroke();
        const mag = Math.hypot(cn.re, cn.im), ang = Math.atan2(cn.im, cn.re);
        cctx.strokeStyle = c.v[n]; cctx.lineWidth = 2.5; cctx.beginPath(); cctx.moveTo(cx, cy); cctx.lineTo(cx + R * mag * Math.cos(ang), cy - R * mag * Math.sin(ang)); cctx.stroke();
        cctx.fillStyle = c.v[n]; cctx.beginPath(); cctx.arc(cx + R * mag * Math.cos(ang), cy - R * mag * Math.sin(ang), 3, 0, 2 * Math.PI); cctx.fill();
        cctx.fillStyle = c['fg-2']; cctx.fillText(`|c${n + 1}| = ${fmt(mag)}`, cx, r.height - 20); cctx.fillText(`E${n + 1} = ${fmt(eig.values[n])}`, cx, r.height - 6);
      });
    }
    const stopTicker = view.addTicker((dt) => { if (!playing) return false; step(dt); render(); return true; });
    const initRow = row([
      button('site 1', () => setInitial([1, 0, 0])), button('site 2', () => setInitial([0, 1, 0])), button('site 3', () => setInitial([0, 0, 1])),
      button('<span class="cv1"><i>v</i><sub>1</sub></span>', () => setInitial(eig.vectors[0]), { kind: 'math' }),
      button('(<i>v</i><sub>1</sub> + <i>v</i><sub>3</sub>)/√2', () => setInitial(eig.vectors[0].map((x, i) => SQ2 * (x + eig.vectors[2][i]))), { kind: 'math' }),
      button('<i>ψ</i> from the previous chapter', () => setInitial(store.psi), { kind: 'math' }),
    ]);
    controls.append(row([playBtn, button('Restart', restart)]), sSpeed.root, el('div', { class: 'widget-label', html: 'Initial state:' }), initRow, el('div', { class: 'widget-label', html: 'Integrator:' }), integ.root, sDt.root, ro.root, showFrame.root, hs.root);
    setup(); setInitial([1, 0, 0]);
    plot.onRedraw = render;
    onThemeChange(() => render());
    return { unmount() { stopTicker(); chain.dispose(); plot.dispose(); } };
  },
};
