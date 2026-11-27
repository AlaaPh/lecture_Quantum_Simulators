// The figures of the workbook. Each one draws what is known so far: a point, a turn of the dial, a cell of the map
// appears when the field that asks for it is right. Nothing here shows a number before the student has typed it:
// the turn of the dial that closes the loop waits for the sum of the four −arg, the last dot of γ(t) for the sum of
// all plaquettes, the curve γ(t) for C.
import { Canvas2D, arrow } from '../lecture1/panels.js';
import { Plot } from '../plots.js';
import { colors } from '../theme.js';
import { steps, zakOf, TAU, pumpParams, notEnclosingParams, HAND, SHEET } from './model.js';
import { isOk } from './fields.js';
import { num } from './content.js';
import { simulation, frameAt, spectrum, gammaOverCycle, bandsAt, paramsAt, CHAIN_CELLS } from './pump.js';

const S = steps(), set1 = S.A.set1, set2 = S.A.set2;
const SUB = ['₀', '₁', '₂', '₃', '₄'];
const PAD = { l: 52, r: 12, t: 26, b: 32 };
const kTicks = [0, Math.PI / 2, Math.PI, 1.5 * Math.PI, TAU];
const piTick = (v) => ({ '0': '0', '0.5': 'π/2', '1': 'π', '1.5': '3π/2', '2': '2π' })[String(Math.round((v / Math.PI) * 2) / 2)] ?? v.toFixed(1);
const quarters = [0, 0.25, 0.5, 0.75, 1];
const inPi = (x) => (Math.abs(x) < 1e-9 ? '0' : Math.abs(x - 1) < 1e-9 ? 'π' : `${num(x)}π`);
const count = (ids) => ids.filter(isOk).length;
// number of right fields from the start of the list: a turn of the dial needs all turns before it
const leading = (ids) => { let n = 0; while (n < ids.length && isOk(ids[n])) n++; return n; };
// The two dials of tab 1. The fourth turn closes the loop: with it the dial shows the sum of the four −arg, which the
// student has to add. So it is drawn only when the field of the sum (sumId) is right.
const DIALS = [
  { name: `J₁ = ${set1.J1}, J₂ = ${set1.J2} (A2, A3)`, angles: set1.ov_angle_deg, ids: [1, 2, 3, 4].map((s) => `A2-ang${s}`), sumId: 'A3-sum', gammaId: 'A3-gamma', gamma: set1.gamma_over_pi },
  { name: `J₁ = ${set2.J1}, J₂ = ${set2.J2} (A5)`, angles: set2.ov_angle_deg, ids: [1, 2, 3, 4].map((s) => `A5-ang${s}`), sumId: 'A5-sum', gammaId: 'A5-gamma', gamma: set2.gamma_over_pi },
];
export const turnsShown = (n) => Math.min(leading(DIALS[n].ids), isOk(DIALS[n].sumId) ? 4 : 3);
// The dots of γ(t) on tab 4, one per column sum. The last one shows the sum of all plaquettes and waits for its field.
const COLS = [1, 2, 3, 4].map((j) => `B7-col${j}`);
export const dotsShown = () => Math.min(leading(COLS), isOk('B7-total') ? 4 : 3);
// a short title where the figure is narrow (two figures side by side on a phone)
const titleFor = (plot, long, short) => (plot.w < 260 ? short : long);

// ---------- tab 1: h(k_s) on its circle ----------
class CirclePanel extends Canvas2D {
  draw() {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    this.clear();
    if (w < 140 || h < 130) return;                           // pane still hidden or not laid out yet
    const x0 = -1.75, x1 = 3.75, yr = 2.4, top = 28, bot = 40;
    const sc = Math.min((w - 20) / (x1 - x0), (h - top - bot) / (2 * yr));
    const ox = (w - sc * (x1 - x0)) / 2 - sc * x0, oy = top + (h - top - bot) / 2;
    const X = (re) => ox + sc * re, Y = (im) => oy - sc * im;
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('h(k) = J₁ + J₂·e^(ik) in the complex plane', 12, 6);
    // axes
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(x0), oy); ctx.lineTo(X(x1), oy); ctx.moveTo(ox, Y(-yr)); ctx.lineTo(ox, Y(yr)); ctx.stroke();
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 400, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    // the tick at Re h = J₁ + J₂ has no number: the point k₁ sits on it
    for (const v of [-1, 1, 2, 3]) { ctx.beginPath(); ctx.moveTo(X(v), oy - 3); ctx.lineTo(X(v), oy + 3); ctx.stroke(); if (v !== set1.J1 + set1.J2) ctx.fillText(String(v).replace('-', '−'), X(v) - 7, oy + 5); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const v of [-2, -1, 1, 2]) { ctx.beginPath(); ctx.moveTo(ox - 3, Y(v)); ctx.lineTo(ox + 3, Y(v)); ctx.stroke(); ctx.fillText(String(v).replace('-', '−'), ox - 6, Y(v) - 7); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('Re h', X(x1), oy + 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('Im h', ox - 20, Y(yr) - 2);
    // the two circles: centre J₁, radius J₂
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X(set2.J1), oy, sc * set2.J2, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = c.psi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(set1.J1), oy, sc * set1.J2, 0, TAU); ctx.stroke();
    // rays from the origin to the points whose angle φ is right, then the points whose h is right
    const angles = [];
    for (let s = 1; s <= 4; s++) {
      const p = set1.h[s - 1], known = s === 1 || isOk(`A1-h${s}`);
      if (known && (s === 1 || isOk(`A1-phi${s}`))) {
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = c.hpsi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(X(p.re), Y(p.im)); ctx.stroke(); ctx.restore();
        angles.push(`k${SUB[s]} ${num(set1.phi_deg[s - 1], 2)}°`);
      }
    }
    for (let s = 1; s <= 4; s++) {
      if (s > 1 && !isOk(`A1-h${s}`)) continue;
      const p = set1.h[s - 1], dx = p.re - set1.J1, dy = p.im, L = Math.hypot(dx, dy) || 1;
      ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(X(p.re), Y(p.im), 4.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = c.fg; ctx.font = this.font(12, 600, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`k${SUB[s]}`, X(p.re) + (15 * dx) / L - (s === 1 ? 2 : 0), Y(p.im) - (15 * dy) / L - (s === 1 || s === 3 ? 13 : 0));
    }
    // the origin
    ctx.fillStyle = c.surface; ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    // two lines of text at the bottom
    ctx.font = this.font(11, 400); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = c['fg-2'];
    ctx.fillText(`solid: J₁ = ${set1.J1}, J₂ = ${set1.J2}   dashed: J₁ = ${set2.J1}, J₂ = ${set2.J2} (A5)   ring: the origin`, 12, h - 20);
    ctx.fillStyle = c.hpsi; ctx.font = this.font(11, 500, true);
    ctx.fillText(`φ:  ${angles.join('  ')}`, 12, h - 5);
  }
}

// ---------- tab 1: the dial that turns by −arg of each overlap ----------
class DialPanel extends Canvas2D {
  draw() {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    this.clear();
    if (w < 140 || h < 110) return;
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('the dial turns by −arg of each overlap', 12, 6);
    const cols = [c.v1, c.v2, c.v3, c.hpsi], top = 42, bot = 22, R = Math.max(18, Math.min(w / 4 - 34, (h - top - bot) / 2 - 12));
    DIALS.forEach((d, n) => {
      const cx = (w * (2 * n + 1)) / 4, cy = top + (h - top - bot) / 2;
      ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(d.name, cx, 24);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.font = this.font(10, 400, true); ctx.fillStyle = c['fg-2'];
      for (const [a, label, ax, ay] of [[0, '0°', 'left', 'middle'], [90, '90°', 'center', 'bottom'], [180, '180°', 'right', 'middle'], [270, '−90°', 'center', 'top']]) {
        const ca = Math.cos((a * Math.PI) / 180), sa = Math.sin((a * Math.PI) / 180);
        ctx.beginPath(); ctx.moveTo(cx + (R - 4) * ca, cy - (R - 4) * sa); ctx.lineTo(cx + (R + 3) * ca, cy - (R + 3) * sa); ctx.stroke();
        ctx.textAlign = ax; ctx.textBaseline = ay; ctx.fillText(label, cx + (R + 6) * ca, cy - (R + 6) * sa);
      }
      // the turns that are right so far, one after the other, each on its own radius
      const done = turnsShown(n);
      let acc = 0;
      for (let s = 0; s < done; s++) {
        const a0 = (acc * Math.PI) / 180, a1 = ((acc + d.angles[s]) * Math.PI) / 180, r = R * (0.34 + 0.15 * s);
        ctx.strokeStyle = cols[s]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, -a0, -a1, a1 > a0); ctx.stroke();
        const am = (a0 + a1) / 2;
        ctx.fillStyle = cols[s]; ctx.font = this.font(10, 600, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (Math.abs(d.angles[s]) < 30) ctx.fillText(String(s + 1), cx + r * Math.cos(am), cy - r * Math.sin(am) + (am >= 0 ? -12 : 12));
        else ctx.fillText(String(s + 1), cx + (r + 8) * Math.cos(am), cy - (r + 8) * Math.sin(am));
        acc += d.angles[s];
      }
      const ah = (acc * Math.PI) / 180;
      arrow(ctx, cx, cy, cx + R * 0.96 * Math.cos(ah), cy - R * 0.96 * Math.sin(ah), c.psi, 2.6, 8);
      ctx.fillStyle = c.surface; ctx.strokeStyle = c.psi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, TAU); ctx.fill(); ctx.stroke();
      // the number under the dial is the sum of all four: it is written only with the fourth turn
      const text = done === 0 ? 'no turn yet' : done < 4 ? `${done} of 4 turns` : `4 of 4 turns: ${num(acc, 2)}°${isOk(d.gammaId) ? ` → γ = ${inPi(d.gamma)}` : ''}`;
      ctx.fillStyle = done ? c.psi : c['fg-2']; ctx.font = this.font(11, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(text, cx, h - 5);
    });
  }
}

// ---------- tab 2: where the light sits inside the unit cell ----------
class PositionPanel extends Canvas2D {
  draw() {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    this.clear();
    if (w < 160 || h < 120) return;
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('γ/2π: the position of the light inside the unit cell', 12, 6);
    const side = Math.max(96, w * 0.16), xL = side, xR = w - side, X = (v) => xL + v * (xR - xL), yAxis = h - 58;
    // the axis from cell m to cell m + 1
    ctx.strokeStyle = c.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(-0.12), yAxis); ctx.lineTo(X(1.12), yAxis); ctx.stroke();
    ctx.font = this.font(11, 400, true); ctx.fillStyle = c['fg-2']; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const [v, label] of [[0, '0'], [0.25, '0.25'], [0.5, '0.5'], [0.75, '0.75'], [1, '1']]) { ctx.beginPath(); ctx.moveTo(X(v), yAxis - 4); ctx.lineTo(X(v), yAxis + 4); ctx.stroke(); ctx.fillText(label, X(v), yAxis + 6); }
    // the two unit cells below the axis: both guides of a cell count for the same cell number
    const yCell = h - 22, r = 6.5;
    [[0, 'cell m'], [1, 'cell m + 1']].forEach(([v, name]) => {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = c['fg-2']; ctx.lineWidth = 1; ctx.strokeRect(X(v) - 26, yCell - 11, 52, 22); ctx.restore();
      for (const [dx, col, label] of [[-12, c.v1, 'A'], [12, c.v3, 'B']]) {
        ctx.fillStyle = c.surface; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(v) + dx, yCell, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col; ctx.font = this.font(9, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, X(v) + dx, yCell + 0.5);
      }
      ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 400); ctx.textAlign = v ? 'left' : 'right'; ctx.textBaseline = 'middle'; ctx.fillText(name, X(v) + (v ? 32 : -32), yCell);
    });
    ctx.strokeStyle = c.axis; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0) + 19, yCell); ctx.lineTo(X(1) - 19, yCell); ctx.stroke();
    // one mark per Zak phase that is right
    const marks = [
      { id: 'A5-gamma', v: set2.gamma_over_pi / 2, label: `J₁ = ${set2.J1}, J₂ = ${set2.J2}, Δ = 0`, col: c['fg-2'] },
      { id: 'A3-gamma', v: set1.gamma_over_pi / 2, label: `J₁ = ${set1.J1}, J₂ = ${set1.J2}, Δ = 0`, col: c.fg },
      { id: 'A7-exact', v: S.A.A7.exact.gamma_over_pi_M400 / 2, label: `J₁ = ${S.A.A7.exact.J1}, J₂ = ${S.A.A7.exact.J2}, Δ = ${S.A.A7.exact.D}`, col: c.v1 },
      { id: 'A7-s1-M400', v: S.A.A7.set1.M400_over_pi / 2, label: `J₁ = ${set1.J1}, J₂ = ${set1.J2}, Δ = ${S.A.A7.set1.D}`, col: c.psi },
      { id: 'A7-s2-M400', v: S.A.A7.set2.M400_over_pi / 2, label: `J₁ = ${set2.J1}, J₂ = ${set2.J2}, Δ = ${S.A.A7.set2.D}`, col: c.hpsi },
    ];
    marks.sort((a, b) => a.v - b.v);                      // from left to right: no line of one mark crosses the text of another
    const rowH = Math.max(13, Math.min(17, (yAxis - 34) / marks.length));
    let shown = 0;
    marks.forEach((m, i) => {
      if (!isOk(m.id)) return;
      shown++;
      const x = X(m.v), y = 30 + i * rowH + rowH / 2;
      ctx.strokeStyle = m.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, yAxis - 6); ctx.stroke();
      ctx.fillStyle = m.col; ctx.beginPath(); ctx.moveTo(x, yAxis - 1); ctx.lineTo(x - 4.5, yAxis - 9); ctx.lineTo(x + 4.5, yAxis - 9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      ctx.font = this.font(11, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(`${m.label}: ${num(m.v)}`, x + 7, y);
    });
    if (!shown) { ctx.fillStyle = c['fg-2']; ctx.font = this.font(12, 400); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A mark appears for every Zak phase that is right.', w / 2, 30 + (yAxis - 40) / 2); }
  }
}

// ---------- the panels and plots, one per pane ----------
const canvasOf = (id) => document.getElementById(id).querySelector('canvas');
const circlePanel = new CirclePanel(canvasOf('pane-wcircle')), dialPanel = new DialPanel(canvasOf('pane-wturn')), positionPanel = new PositionPanel(canvasOf('pane-wpos'));
const plotOf = (id) => new Plot(canvasOf(id), { pad: PAD });
const convPlot = plotOf('pane-wconv'), cyclePlot = plotOf('pane-wcycle'), bandsPlot = plotOf('pane-wbands'), levelsPlot = plotOf('pane-wlevels'), lightPlot = plotOf('pane-wlight'), shiftPlot = plotOf('pane-wshift');
const mapPlot = new Plot(canvasOf('pane-wmap'), { pad: { l: 52, r: 12, t: 26, b: 34 } }), gammaPlot = plotOf('pane-wgamma'), loopsPlot = plotOf('pane-wloops');
export const everyPanel = [circlePanel, dialPanel, positionPanel, convPlot, cyclePlot, bandsPlot, levelsPlot, lightPlot, shiftPlot, mapPlot, gammaPlot, loopsPlot];
const uiFont = (size, weight = 400) => `${weight} ${size}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-ui') || 'sans-serif'}`;

// ---------- tab 2: γ against the number of k points ----------
const curves = new Map();
function curveOf(J1, J2, D) {
  const key = `${J1}|${J2}|${D}`;
  if (!curves.has(key)) { const Ms = [], g = []; for (let M = 4; M <= 400; M++) { Ms.push(Math.log10(M)); g.push(zakOf(J1, J2, D, M) / Math.PI); } curves.set(key, { Ms, g }); }
  return curves.get(key);
}
function drawConv() {
  const c = colors(), lx = Math.log10, A7 = S.A.A7;
  const series = [
    { name: `J₁ = ${set1.J1}, J₂ = ${set1.J2}, Δ = 0`, col: c['fg-2'], J: [set1.J1, set1.J2, 0], curveId: 'A6-gamma100', marks: [[4, 'A6-prod4', set1.gamma_over_pi], [100, 'A6-gamma100', set1.gamma_M100_over_pi]] },
    { name: `J₁ = ${set1.J1}, J₂ = ${set1.J2}, Δ = ${A7.set1.D}`, col: c.psi, J: [set1.J1, set1.J2, A7.set1.D], curveId: 'A7-s1-M400', marks: [[4, 'A7-s1-M4', A7.set1.M4_over_pi], [100, 'A7-s1-M100', A7.set1.M100_over_pi], [400, 'A7-s1-M400', A7.set1.M400_over_pi]] },
    { name: `J₁ = ${A7.exact.J1}, J₂ = ${A7.exact.J2}, Δ = ${A7.exact.D}`, col: c.v1, J: [A7.exact.J1, A7.exact.J2, A7.exact.D], curveId: 'A7-exact', marks: [[400, 'A7-exact', A7.exact.gamma_over_pi_M400]] },
    { name: `J₁ = ${set2.J1}, J₂ = ${set2.J2}, Δ = ${A7.set2.D}`, col: c.hpsi, J: [set2.J1, set2.J2, A7.set2.D], curveId: 'A7-s2-M400', marks: [[400, 'A7-s2-M400', A7.set2.M400_over_pi]] },
  ];
  convPlot.begin({ xlim: [lx(3.2), lx(520)], ylim: [-0.12, 1.16], xticks: [4, 10, 40, 100, 400].map(lx), xtickFmt: (v) => String(Math.round(10 ** v)), yticks: [0, 0.25, 0.5, 0.75, 1], xlabel: 'number of k points M', ylabel: 'γ / π', title: 'Zak phase against the number of k points' });
  let shown = 0;
  for (const s of series) {
    const marks = s.marks.filter(([, id]) => isOk(id));
    if (!marks.length) continue;
    shown++;
    if (isOk(s.curveId)) { const cu = curveOf(...s.J); convPlot.line(cu.Ms, cu.g, { color: s.col, width: 1.8, alpha: 0.75 }); }
    convPlot.dots(marks.map(([M]) => lx(M)), marks.map(([, , g]) => g), { color: s.col, r: 5, ring: true });
    const last = marks[marks.length - 1];
    convPlot.text(lx(last[0]), last[2], s.name, { color: s.col, align: 'right', dx: -9, dy: last[2] > 0.9 ? 12 : -11, font: uiFont(11, 500) });
  }
  if (!shown) convPlot.text((lx(3.2) + lx(520)) / 2, 0.5, 'Your values appear here as dots when they are right.', { color: c['fg-2'], align: 'center', font: uiFont(12) });
  convPlot.end();
}

// ---------- tab 3: the pump ----------
function drawCycle(pump) {
  const c = colors(), n = 120, xs = [], ys = [];
  for (let i = 0; i <= n; i++) { const p = paramsAt(pump.sheet, i / n); xs.push(p.J1 - p.J2); ys.push(p.D); }
  cyclePlot.begin({ xlim: [-2.5, 2.5], ylim: [-0.74, 0.74], yticks: [-0.5, 0, 0.5], xlabel: 'J₁ − J₂', ylabel: 'Δ', title: 'a · the cycle' });
  cyclePlot.hline(0, { color: c.line }); cyclePlot.vline(0, { color: c.line });
  cyclePlot.line(xs, ys, { color: c.psi, width: 2 });
  const ctx = cyclePlot.ctx, P = (s) => { const p = paramsAt(pump.sheet, s); return [cyclePlot.x(p.J1 - p.J2), cyclePlot.y(p.D)]; };
  const [ax, ay] = P(0.14), [bx, by] = P(0.18);
  arrow(ctx, ax, ay, bx, by, c.psi, 2, 9);
  ctx.font = uiFont(11); ctx.fillStyle = c['fg-2']; ctx.textBaseline = 'middle';
  // "t = 0" stands outside the cycle, to the right of its point, where there is room for it; else inside, above the axis
  const [x0, y0] = P(0), outside = x0 + 10 + ctx.measureText('t = 0').width < cyclePlot.w - cyclePlot.opts.pad.r;
  for (const [s, label, align, dx, dy] of [[0, 't = 0', outside ? 'left' : 'right', outside ? 10 : -8, outside ? 0 : -11], [0.25, 'T/4', 'left', 8, -8], [0.5, 'T/2', 'left', 8, 12], [0.75, '3T/4', 'left', 8, 9]]) {
    const [x, y] = P(s);
    ctx.fillStyle = c.psi; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = c['fg-2']; ctx.textAlign = align; ctx.fillText(label, x + dx, y + dy);
  }
  // the point (0, 0): a cross, with its name where the cycle leaves room for it below the axis
  const zx = cyclePlot.x(0), zy = cyclePlot.y(0);
  ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(zx - 5, zy - 5); ctx.lineTo(zx + 5, zy + 5); ctx.moveTo(zx - 5, zy + 5); ctx.lineTo(zx + 5, zy - 5); ctx.stroke();
  if (y0 - P(0.25)[1] >= 34) { ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.fillText('(0, 0)', zx + 8, zy + 11); }
  const [px, py] = P(pump.s);
  ctx.fillStyle = c.hpsi; ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill(); ctx.stroke();
  cyclePlot.end();
}
function drawBands(pump) {
  const c = colors(), b = bandsAt(pump.sheet, pump.s);
  bandsPlot.begin({ xlim: [0, TAU], ylim: [-3, 3], xticks: kTicks, xtickFmt: piTick, yticks: [-2, -1, 0, 1, 2], xlabel: 'k', ylabel: 'E', title: titleFor(bandsPlot, 'b · the two bands at this t', 'b · the two bands') });
  bandsPlot.hspan(-b.min, b.min, { color: c.hpsi, alpha: 0.13 });
  bandsPlot.line(b.k, b.E, { color: c['fg-2'], width: 1.8 });
  bandsPlot.line(b.k, b.E.map((x) => -x), { color: c.psi, width: 2.6 });
  bandsPlot.text(Math.PI, 0, 'gap', { color: c.hpsi, align: 'center', font: uiFont(11, 600) });
  bandsPlot.text(0.2, -2.62, 'lower band', { color: c.psi, font: uiFont(11, 600) });
  bandsPlot.text(0.2, 2.62, 'upper band', { color: c['fg-2'], font: uiFont(11, 600) });
  bandsPlot.end();
}
function drawLevels(pump) {
  const c = colors(), sp = spectrum(pump.sheet), known = isOk('B2-end'), ctx = levelsPlot.ctx;
  levelsPlot.begin({ xlim: [0, 1], ylim: [-2.4, 2.4], xticks: quarters, xlabel: 't / T', ylabel: 'eigenvalues', title: titleFor(levelsPlot, `c · open chain of ${CHAIN_CELLS} cells`, 'c · open chain') });
  ctx.save(); ctx.strokeStyle = c['fg-2']; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.8; ctx.beginPath();
  for (let n = 0; n < sp.levels[0].length; n++) for (let j = 0; j < sp.s.length; j++) { const x = levelsPlot.x(sp.s[j]), y = levelsPlot.y(sp.levels[j][n]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke(); ctx.restore();
  // the states in the gap, as one line per end of the chain
  for (const [end, col] of [['left', known ? c.v1 : c.hpsi], ['right', known ? c.v3 : c.hpsi]]) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath();
    let pen = false;
    for (let j = 0; j < sp.s.length; j++) {
      const st = sp.states[j].find((x) => x.end === end);
      if (!st) { pen = false; continue; }
      const x = levelsPlot.x(sp.s[j]), y = levelsPlot.y(st.E);
      if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      pen = true;
    }
    ctx.stroke(); ctx.restore();
  }
  levelsPlot.vline(pump.s, { color: c.hpsi, width: 1.2, dash: [4, 3] });
  if (known) {      // each line named in its own colour, inside the gap next to it: at 0.55 of the band edge, for both sets of numbers
    const yLab = 0.55 * sp.edge[Math.round(0.39 * (sp.s.length - 1))];
    levelsPlot.text(0.39, yLab, 'left end', { color: c.v1, font: uiFont(11, 600) });
    levelsPlot.text(0.39, -yLab, 'right end', { color: c.v3, font: uiFont(11, 600) });
  }
  levelsPlot.end();
}
const SCALES = [0.03, 0.06, 0.12, 0.25, 0.6, 1.1];
function drawLight(pump) {
  const c = colors(), sim = simulation(pump.sheet, pump.T, pump.input), f = frameAt(sim, pump.s), I = sim.frames[f], W = sim.W, ctx = lightPlot.ctx;
  const ymax = SCALES.find((v) => v >= 1.08 * sim.peak[f]) ?? 1.1;
  lightPlot.begin({ xlim: [-W - 0.8, W + 0.8], ylim: [0, ymax], xlabel: 'unit cell m, counted from the cell where the light starts', ylabel: '|ψ|²', title: 'd · the light in the chain at this t' });
  const bw = Math.max(1, (lightPlot.x(1) - lightPlot.x(0)) * 0.34), y0 = lightPlot.y(0);
  for (let m = -W; m <= W; m++) {
    const j = 2 * (sim.m0 + m);
    for (const [dx, v, col] of [[-0.2, I[j], c.v1], [0.2, I[j + 1], c.v3]]) {
      const x = lightPlot.x(m + dx), y = lightPlot.y(v);
      ctx.fillStyle = col; ctx.fillRect(x - bw / 2, y, bw, y0 - y);
    }
  }
  const xX = lightPlot.x(sim.X[f]);
  ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xX, lightPlot.y(0)); ctx.lineTo(xX, lightPlot.y(ymax) + 14); ctx.stroke();
  ctx.fillStyle = c.hpsi; ctx.beginPath(); ctx.moveTo(xX, lightPlot.y(ymax) + 16); ctx.lineTo(xX - 5, lightPlot.y(ymax) + 6); ctx.lineTo(xX + 5, lightPlot.y(ymax) + 6); ctx.closePath(); ctx.fill();
  ctx.font = uiFont(11, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('X', xX + 8, lightPlot.y(ymax) + 3);
  lightPlot.legend([{ color: c.v1, label: 'A guides' }, { color: c.v3, label: 'B guides' }], { x: 6, y: 9 });
  lightPlot.end();
}
function drawShift(pump) {
  // the curve γ(t)/2π rises by C: it is drawn when γ(T/4) and C are both right, not before
  const c = colors(), sim = simulation(pump.sheet, pump.T, pump.input), f = frameAt(sim, pump.s), g = gammaOverCycle(pump.sheet), full = isOk('B5-quarter') && isOk('B5-C');
  const marks = [];
  if (isOk('B4-g0')) marks.push([0, g.cells[0]]);
  if (isOk('B4-gh')) marks.push([0.5, g.cells[(g.s.length - 1) / 2]]);
  shiftPlot.begin({ xlim: [0, 1], ylim: [-0.3, 1.3], xticks: quarters, yticks: [0, 0.5, 1], xlabel: 't / T', ylabel: 'unit cells', title: full ? 'e · X(t) and γ(t)/2π' : titleFor(shiftPlot, 'e · position X(t) of the light', 'e · position X(t)') });
  shiftPlot.hline(0, { color: c.line }); shiftPlot.hline(1, { color: c.line, dash: [4, 4] });
  if (full) shiftPlot.line(g.s, g.cells, { color: c.hpsi, width: 2, dash: [6, 4] });
  shiftPlot.line(sim.s, sim.X, { color: c.psi, width: 2.2 });
  if (marks.length) shiftPlot.dots(marks.map((m) => m[0]), marks.map((m) => m[1]), { color: c.hpsi, r: 5, ring: true });
  shiftPlot.vline(pump.s, { color: c.hpsi, width: 1.2, dash: [4, 3] });
  shiftPlot.dots([sim.s[f]], [sim.X[f]], { color: c.psi, r: 4.5, ring: true });
  const items = [{ color: c.psi, label: 'X(t)' }];
  if (full || marks.length) items.push({ color: c.hpsi, label: 'γ(t)/2π' });
  shiftPlot.legend(items, { x: 6, y: 9 });
  shiftPlot.end();
}

// ---------- tab 4: plaquettes ----------
function drawMap() {
  const c = colors(), F = S.B.B7.F_over_pi, sums = S.B.B7.col_sums_over_pi, ctx = mapPlot.ctx;
  const colOk = [1, 2, 3, 4].map((j) => isOk(`B7-col${j}`)), cellOk = (i, j) => colOk[j] || (i === 1 && j === 0 && isOk('B6-F'));
  const vmax = Math.max(...F.flat().map(Math.abs));
  mapPlot.begin({ xlim: [0, 4], ylim: [-1.45, 4], grid: false, xticks: [0, 1, 2, 3, 4], xtickFmt: (v) => ['0', 'T/4', 'T/2', '3T/4', 'T'][v], yticks: [-0.8, 0, 1, 2, 3, 4], ytickFmt: (v) => (v < 0 ? 'sum' : ['0', 'π/2', 'π', '3π/2', '2π'][v]), xlabel: 't', ylabel: 'k', title: 'plaquette phases F/π · red: positive, blue: negative' });
  mapPlot.heatmap(F.map((row, i) => row.map((v, j) => (cellOk(i, j) ? v : 0))), { cmap: 'div', vmin: -vmax, vmax, border: c.line, labels: (i, j) => (cellOk(i, j) ? num(F[i][j]) : '') });
  mapPlot.heatmap([sums.map(() => 0)], { cmap: 'div', vmin: -1, vmax: 1, y0: -1.3, border: c['fg-2'], labels: (i, j) => (colOk[j] ? num(sums[j]) : '') });
  // the plaquette of B6: k from π/2 to π, t from 0 to T/4
  ctx.strokeStyle = c.fg; ctx.lineWidth = 2.5; ctx.strokeRect(mapPlot.x(0) + 1.5, mapPlot.y(2) + 1.5, mapPlot.x(1) - mapPlot.x(0) - 3, mapPlot.y(1) - mapPlot.y(2) - 3);
  mapPlot.end();
}
function drawGamma() {
  const c = colors(), g = gammaOverCycle(false), sums = S.B.B7.col_sums_over_pi, done = dotsShown();
  gammaPlot.begin({ xlim: [0, 1], ylim: [-0.25, 2.25], xticks: quarters, yticks: [0, 0.5, 1, 1.5, 2], ytickFmt: (v) => ({ 0: '0', 0.5: 'π/2', 1: 'π', 1.5: '3π/2', 2: '2π' })[v], xlabel: 't / T', ylabel: 'γ', title: 'γ(t): four k points (dots), M = 400 (line)' });
  // the line ends at 2π·C: it is drawn when C of B5 or the sum of all plaquettes is right
  if (isOk('B5-C') || isOk('B7-total')) gammaPlot.line(g.s, g.overPi, { color: c.psi, width: 2 });
  if (done) {
    const xs = [0], ys = [0];
    for (let j = 0; j < done; j++) { xs.push((j + 1) / 4); ys.push(ys[j] + sums[j]); }
    gammaPlot.line(xs, ys, { color: c.hpsi, width: 1.4, dash: [4, 3] });
    gammaPlot.dots(xs, ys, { color: c.hpsi, r: 5, ring: true });
    // the size of each step, written where neither curve passes
    const place = [[0.125, 0.46, 'center'], [0.36, 1.02, 'right'], [0.64, 0.98, 'left'], [0.79, S.B.B7.total_over_pi + 0.11, 'right']];
    for (let j = 0; j < done; j++) gammaPlot.text(place[j][0], place[j][1], `+${num(sums[j])}π`, { color: c.hpsi, font: uiFont(11, 500), align: place[j][2] });
  } else gammaPlot.text(0.5, 1, 'A dot appears for every column sum that is right.', { color: c['fg-2'], align: 'center', font: uiFont(11) });
  gammaPlot.end();
}
function drawLoops() {
  const c = colors(), ctx = loopsPlot.ctx, n = 120;
  const loops = [
    { at: (s) => pumpParams(s, HAND.dJ, HAND.D0), col: c.psi, dash: [], cases: [['(a)', 'B8-c1', S.B.B8.upper_band], ['(b) backwards', 'B8-c2', S.B.B8.reversed_cycle]] },
    { at: (s) => pumpParams(s, SHEET.dJ, SHEET.D0), col: c.hpsi, dash: [7, 4], cases: [['(d)', 'B8-c4', S.B.B8.sheet]] },
    { at: notEnclosingParams, col: c.v2, dash: [2, 3], cases: [['(c)', 'B8-c3', S.B.B8.not_enclosing]] },
  ];
  loopsPlot.begin({ xlim: [-2.5, 4.3], ylim: [-0.78, 0.78], xticks: [-2, -1, 0, 1, 2, 3, 4], yticks: [-0.5, 0, 0.5], xlabel: 'J₁ − J₂', ylabel: 'Δ', title: 'the cycles of B8 · ✕ is the point (0, 0)' });
  loopsPlot.hline(0, { color: c.line }); loopsPlot.vline(0, { color: c.line });
  for (const L of loops) {
    const xs = [], ys = [];
    for (let i = 0; i <= n; i++) { const p = L.at(i / n); xs.push(p.J1 - p.J2); ys.push(p.D); }
    loopsPlot.line(xs, ys, { color: L.col, width: 2, dash: L.dash });
    const P = (s) => { const p = L.at(s); return [loopsPlot.x(p.J1 - p.J2), loopsPlot.y(p.D)]; };
    // the arrow of the first case: forward in time, on the upper half
    const [ax, ay] = P(0.21), [bx, by] = P(0.27), [sx, sy] = P(0);
    arrow(ctx, ax, ay, bx, by, L.col, 2, 9);
    ctx.fillStyle = L.col; ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, TAU); ctx.fill();
    const name = ([tag, id, C]) => (isOk(id) ? `${tag} C = ${C > 0 ? '+' : ''}${String(C).replace('-', '−')}` : tag);
    const top = L.at(0.25), bottom = L.at(0.75);
    // the cycle that lies aside is named to its right, outside the solid cycle; the others above their highest point
    if (L.at === notEnclosingParams) { const p0 = L.at(0); loopsPlot.text(p0.J1 - p0.J2, top.D, name(L.cases[0]), { color: L.col, align: 'left', dx: 8, font: uiFont(11, 600) }); }
    else loopsPlot.text(top.J1 - top.J2, top.D, name(L.cases[0]), { color: L.col, align: 'center', baseline: 'bottom', dy: -7, font: uiFont(11, 600) });
    // a second case on the same line is this cycle run backwards: its own arrow on the lower half, against the first,
    // and its name below the lowest point
    if (L.cases.length > 1) {
      const [qx, qy] = P(0.79), [rx, ry] = P(0.73);
      arrow(ctx, qx, qy, rx, ry, L.col, 2, 9);
      loopsPlot.text(bottom.J1 - bottom.J2, bottom.D, name(L.cases[1]), { color: L.col, align: 'center', baseline: 'top', dy: 8, font: uiFont(11, 600) });
    }
  }
  // the point (0, 0): a cross. Its name stands in the title: next to the cross it would lie on the dashed cycle.
  const zx = loopsPlot.x(0), zy = loopsPlot.y(0);
  ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(zx - 5, zy - 5); ctx.lineTo(zx + 5, zy + 5); ctx.moveTo(zx - 5, zy + 5); ctx.lineTo(zx + 5, zy - 5); ctx.stroke();
  loopsPlot.end();
}

// ---------- what each tab draws ----------
export const draw = {
  hand: () => { circlePanel.draw(); dialPanel.draw(); },
  code: () => { drawConv(); positionPanel.draw(); },
  pump: (pump) => { drawCycle(pump); drawBands(pump); drawLevels(pump); drawLight(pump); drawShift(pump); },
  chern: () => { drawMap(); drawGamma(); drawLoops(); },
};
export { count, leading };
