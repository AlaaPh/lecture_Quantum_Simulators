// Chapter 4: the phase of an amplitude, shown as a clock on each site. Ends with the dark middle waveguide.
import { button, row, slider } from '../ui.js';
import { colors } from '../theme.js';
import { symEig, evolveExact, prob, fmt } from '../linalg.js';
import { makeGuide } from '../guide.js';
import { makeHud, pct, comp } from '../hud.js';
import { Plot } from '../plots.js';
import { siteAxes, hamiltonianOf, widget } from './kit.js';

const SQ = Math.SQRT1_2, D2R = Math.PI / 180;
const sq = (x) => (x < 0 ? `(${fmt(x)})²` : `${fmt(x)}²`);
// complex number as text: 0.71, −0.71 or 0.71·e^{i·60°}
export function cstr(re, im) {
  const m = Math.hypot(re, im); if (m < 0.005) return '0';
  const ph = Math.atan2(im, re) / D2R;
  if (Math.abs(ph) < 0.5) return fmt(m);
  if (Math.abs(Math.abs(ph) - 180) < 0.5) return '−' + fmt(m);
  return `${fmt(m)}·e<sup>${ph < 0 ? '−' : ''}i·${Math.abs(ph).toFixed(0)}°</sup>`;
}

export default {
  id: 'phase', title: 'Phase: a clock on every site', nav: 'Phase', use3d: true, layout: 'wide',
  mount({ view, tweens, store, panel, stage, onThemeChange }) {
    const c = colors();
    const siteColor = [c.v1, c.v2, c.v3];
    view.setTarget(0, 0, 0.2);
    store.eps = [0, 0, 0]; store.J = [1, 1]; // the dark state needs the mirror-symmetric chain
    const H = hamiltonianOf(store), eig = symEig(H), J = store.J[0];
    const base = [0.5, SQ, 0.5];
    let alpha = 0, phi2 = 60, phi = 0, t = 0, playing = false, focus = -1;
    let psi = { re: base.slice(), im: [0, 0, 0] };

    const axes = siteAxes(view, siteColor); axes.forEach((a) => a.set(1));
    const reA = view.makeArrow({ color: c.psi, radius: 0.034 });
    const imA = view.makeArrow({ color: c.psi, radius: 0.022, opacity: 0.4 });
    view.addLabel('Re <i>ψ</i>', () => { const v = psi.re, n = Math.hypot(...v); return n > 0.08 ? v.map((x) => x * (n + 0.2) / n) : null; }, 'lbl-psi');
    view.addLabel('Im <i>ψ</i>', () => { const v = psi.im, n = Math.hypot(...v); return n > 0.08 ? v.map((x) => x * (n + 0.2) / n) : null; }, 'lbl-psi lbl-small');
    const dropRe = view.makeSegment({ color: c.axis, dashed: true, opacity: 0.9 }), dropIm = view.makeSegment({ color: c.axis, dashed: true, opacity: 0.6 });
    const hud = makeHud(stage, { siteColors: siteColor });

    const plotBox = widget('plot-phase', '', 'tall'); plotBox.hidden = true;
    const plot = new Plot(plotBox.querySelector('canvas'), { pad: { l: 52, r: 10, t: 24, b: 32 } });

    const stateFor = (step) => {
      if (step === 0) return { re: base.map((x) => x * Math.cos(alpha * D2R)), im: base.map((x) => x * Math.sin(alpha * D2R)) };
      if (step === 1 || step === 2) return { re: [SQ, SQ * Math.cos(phi2 * D2R), 0], im: [0, SQ * Math.sin(phi2 * D2R), 0] };
      return { re: [SQ, 0, SQ * Math.cos(phi * D2R)], im: [0, 0, SQ * Math.sin(phi * D2R)] };
    };
    const psiStr = (p) => `<i>ψ</i> = (${[0, 1, 2].map((i) => `<span style="color:${siteColor[i]}">${cstr(p.re[i], p.im[i])}</span>`).join(', ')})`;
    const hopsIn = () => { const re = J * (psi.re[0] + psi.re[2]), im = J * (psi.im[0] + psi.im[2]); return { re, im }; };

    function render() {
      const step = guide.step, p = prob(psi);
      reA.set(psi.re); imA.set(psi.im); imA.setVisible(Math.hypot(...psi.im) > 1e-3);
      if (focus >= 0) { const a = [0, 0, 0], b = [0, 0, 0]; a[focus] = psi.re[focus]; b[focus] = psi.im[focus]; dropRe.set(psi.re, a); dropIm.set(psi.im, b); dropRe.setVisible(true); dropIm.setVisible(Math.hypot(...psi.im) > 1e-3); }
      else { dropRe.setVisible(false); dropIm.setVisible(false); }
      hud.chain(p, true); hud.dials(psi);
      hud.eq(psiStr(psi));
      if (step === 3) { const h = hopsIn(); hud.hopsInto(1, store.J); hud.dialParts(1, [{ re: J * psi.re[0], im: J * psi.im[0], color: siteColor[0] }, { re: J * psi.re[2], im: J * psi.im[2], color: siteColor[2] }]); hud.eq2(`into site 2: <i>J</i><i>ψ</i><sub>1</sub> + <i>J</i><i>ψ</i><sub>3</sub> = <span style="color:${c.hpsi}">${cstr(h.re, h.im)}</span>`); }
      else { hud.hopsInto(null); hud.eq2(step === 4 ? `<i>t</i> = ${fmt(t, 2)}/<i>J</i>` : step === 2 ? '' : `<i>p</i> = |<i>ψ</i>|² = ${p.map(pct).join(' / ')}`); }
      if (step === 4) drawPlot();
      guide.refresh();
      view.requestRender();
    }
    function drawPlot() {
      const T = 7, env = Math.cos((phi * D2R) / 2) ** 2;
      const ts = Array.from({ length: 141 }, (_, i) => (i * T) / 140);
      const p2 = ts.map((tt) => prob(evolveExact(eig, stateFor(4), tt))[1]);
      plot.begin({ xlim: [0, T], ylim: [0, 1.05], xlabel: 'time t  (units of 1/J)', ylabel: 'population', title: 'Middle guide |ψ₂(t)|²' });
      plot.hline(env, { color: c['fg-2'], dash: [4, 3] });
      plot.line(ts, p2, { color: c.hpsi, width: 2 });
      const shown = ts.filter((tt) => tt <= t); plot.line(shown, shown.map((tt) => prob(evolveExact(eig, stateFor(4), tt))[1]), { color: c.hpsi, width: 4 });
      if (t <= T) { plot.vline(t, { color: c.fg, width: 1 }); }
      plot.text(T - 0.1, env, `max = cos²(φ/2) = ${pct(env)}`, { align: 'right', dy: -9, color: c['fg-2'], font: '11px ' + getComputedStyle(document.documentElement).getPropertyValue('--font-mono') });
      plot.end();
    }
    const stopTicker = view.addTicker((dt) => { if (!playing) return false; t += dt * 1.2; if (t > 7) { t = 7; playing = false; playBtn.textContent = 'Play'; } psi = evolveExact(eig, stateFor(4), t); render(); return true; });
    let playBtn = null;
    const restart = () => { t = 0; psi = stateFor(4); render(); };

    const steps = [
      { title: 'A complex amplitude is a clock', text: 'Each amplitude ψᵢ = |ψᵢ| e^{iφᵢ} has a length and an angle. The dial on each site shows both. Turn the global phase: all clocks turn together and nothing measurable changes.',
        caption: () => `global phase <i>α</i> = ${alpha}°: all three hands turn by the same angle; the percentages stay ${prob(psi).map(pct).join(' / ')}. Real amplitudes are the special case of hands pointing right (0°) or left (180°).`,
        enter(ctl) { focus = -1; playing = false; plotBox.hidden = true; psi = stateFor(0);
          ctl.append(slider({ id: 'alpha', label: '<i>α</i> (global)', min: 0, max: 360, step: 1, value: alpha, format: (x) => x.toFixed(0) + '°', onInput: (x) => { alpha = x; psi = stateFor(0); render(); } }).root); } },
      { title: 'Measuring a site throws the angle away', text: 'The probability of site 2 is the squared length of its hand, nothing else: p₂ = (Re ψ₂)² + (Im ψ₂)². Turn the phase of site 2: the hand rotates, the percentages do not move.',
        caption: () => `<i>φ</i><sub>2</sub> = ${phi2}°: <i>p</i><sub>2</sub> = ${sq(psi.re[1])} + ${sq(psi.im[1])} = ${pct(prob(psi)[1])}. In the 3D view the two dashed shadows on axis 2 are Re <i>ψ</i><sub>2</sub> and Im <i>ψ</i><sub>2</sub>.`,
        enter(ctl) { focus = 1; playing = false; plotBox.hidden = true; psi = stateFor(1);
          ctl.append(slider({ id: 'phi2', label: '<i>φ</i><sub>2</sub> (site 2)', min: 0, max: 360, step: 1, value: phi2, format: (x) => x.toFixed(0) + '°', onInput: (x) => { phi2 = x; psi = stateFor(1); render(); } }).root); } },
      { title: 'A different question sees the phase', text: 'Ask instead “symmetric or antisymmetric combination of sites 1 and 2?”, which is what a 50:50 coupler between the two guides measures. Now the answer follows the phase.',
        caption: () => { const ps = ((psi.re[0] + psi.re[1]) ** 2 + (psi.im[0] + psi.im[1]) ** 2) / 2, pa = ((psi.re[0] - psi.re[1]) ** 2 + (psi.im[0] - psi.im[1]) ** 2) / 2; return `<i>φ</i><sub>2</sub> = ${phi2}°: <i>P</i>(sym) = |<i>ψ</i><sub>1</sub> + <i>ψ</i><sub>2</sub>|²/2 = cos²(<i>φ</i><sub>2</sub>/2) = <b>${pct(ps)}</b>, <i>P</i>(anti) = <b>${pct(pa)}</b>. The site percentages are still 50 / 50 / 0.`; },
        enter(ctl) { focus = 1; playing = false; plotBox.hidden = true; psi = stateFor(2);
          const s = slider({ id: 'phi2', label: '<i>φ</i><sub>2</sub> (site 2)', min: 0, max: 360, step: 1, value: phi2, format: (x) => x.toFixed(0) + '°', onInput: (x) => { phi2 = x; psi = stateFor(2); render(); } });
          ctl.append(s.root, row([button('0°', () => s.set(0, true)), button('90°', () => s.set(90, true)), button('180°', () => s.set(180, true))])); } },
      { title: 'Two guides feed the middle one: the hops add with their phases', text: 'Light in guides 1 and 3, nothing in guide 2. What flows into guide 2 is the sum of the two hops, J ψ₁ + J ψ₃. The dial of site 2 shows the two hands added head to tail.',
        caption: () => { const h = hopsIn(), m2 = h.re ** 2 + h.im ** 2; return `<i>φ</i> = ${phi}°: the two hops into site 2 ${Math.abs(((phi % 360) + 360) % 360 - 180) < 1 ? 'cancel exactly: nothing can ever enter the middle guide' : `add to <span style="color:${c.hpsi}">${cstr(h.re, h.im)}</span>, strength |·|² = ${fmt(m2)} (max 2.00 at 0°)`}.`; },
        enter(ctl) { focus = -1; playing = false; plotBox.hidden = true; psi = stateFor(3);
          const s = slider({ id: 'phi', label: '<i>φ</i> (site 3 vs 1)', min: 0, max: 360, step: 1, value: phi, format: (x) => x.toFixed(0) + '°', onInput: (x) => { phi = x; psi = stateFor(3); render(); } });
          ctl.append(s.root, row([button('in phase 0°', () => s.set(0, true)), button('90°', () => s.set(90, true)), button('opposite 180°', () => s.set(180, true), { kind: 'primary' })])); } },
      { title: 'Watch it: the node in the middle', text: 'Run the Schrödinger equation. In phase, the middle guide fills completely and empties again. With opposite phases it stays dark forever: a node. That state is an eigenvector with E = 0, the subject of the next chapter.',
        caption: () => { const env = Math.cos((phi * D2R) / 2) ** 2, p = prob(psi); return `<i>φ</i> = ${phi}°: middle guide now ${pct(p[1])}, at most cos²(<i>φ</i>/2) = ${pct(env)}` + (env < 0.001 ? '. Dark: (1, 0, −1)/√2 is an eigenvector, <i>H</i><i>ψ</i> = 0.' : env > 0.999 ? `. Full transfer at <i>t</i> = π/(2√2 <i>J</i>) ≈ 1.11/<i>J</i>.` : '.'); },
        enter(ctl) { focus = -1; t = 0; psi = stateFor(4); plotBox.hidden = false;
          playBtn = button('Play', () => { if (t >= 7) t = 0; playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; }, { kind: 'primary' });
          const s = slider({ id: 'phi', label: '<i>φ</i> (site 3 vs 1)', min: 0, max: 360, step: 1, value: phi, format: (x) => x.toFixed(0) + '°', onInput: (x) => { phi = x; restart(); } });
          ctl.append(row([playBtn, button('Restart', restart)]), s.root, row([button('in phase 0°', () => s.set(0, true)), button('90°', () => s.set(90, true)), button('opposite 180°', () => s.set(180, true))]));
          plot.onRedraw = () => drawPlot(); } },
    ];
    const guide = makeGuide({ panel, steps, nextHref: '#eigen', nextLabel: 'Next chapter: eigenvectors →', beforeStep: () => { tweens.cancelAll(); playing = false; }, afterStep: () => render() });
    guide.slot.append(plotBox);
    onThemeChange(() => { const cc = colors(); [cc.v1, cc.v2, cc.v3].forEach((col, i) => { siteColor[i] = col; axes[i].setColor(col); }); hud.setColors(siteColor); reA.setColor(cc.psi); imA.setColor(cc.psi); render(); });
    guide.go(0);
    return { unmount() { stopTicker(); plot.dispose(); hud.remove(); guide.dispose(); store.psi = [SQ, 0, -SQ]; } };
  },
};
