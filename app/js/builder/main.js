// Hamiltonian builder. One model (model.js): a palette of couplings, the rules of one unit cell, single-entry defects.
// View 1 plugs couplings into the N × N matrix or onto the chain and shows eigenvalues and eigenvectors at once.
// View 2 shows the same rules as the m × m Bloch matrix H(k), with its bands, the winding of h(k) and the Zak phases.
// Conventions as in the exercises: i dψ/dz = Hψ with +J, site 1 is an A site, H[i][j] couples site j into site i.
import { Canvas2D } from '../lecture1/panels.js';
import { Plot, niceTicks } from '../plots.js';
import { el, button, slider, toggle } from '../ui.js';
import { colors, cssVar, invalidateTheme } from '../theme.js';
import { fmt } from '../linalg.js';
import { TAU, SUBL, BRUSHES, ERASE, N_MAX, R_MAX, PRESETS, brushOf, cloneModel, reviveModel, normalize, value, isComplex, bondOf, bondKey, assemble, paint, paintRule, blochTerms, solve, describeState, preset, toPython } from './model.js';

const $ = (id) => document.getElementById(id);
const num = (x, d = 2) => fmt(x, d).replace('-', '−');
const cstr = (v, d = 2) => (Math.abs(v.im) < 1e-12 ? num(v.re, d) : Math.abs(v.re) < 1e-12 ? `${num(v.im, d)}i` : `${num(v.re, d)} ${v.im < 0 ? '−' : '+'} ${fmt(Math.abs(v.im), d)}i`);
const inPi = (x, d = 2) => { const q = x / Math.PI; return Math.abs(q) < 0.5 * 10 ** -d ? '0' : Math.abs(q - 1) < 0.5 * 10 ** -d ? 'π' : `${num(q, d)}π`; };
const piTick = (v) => ({ '0': '0', '0.5': 'π/2', '1': 'π', '1.5': '3π/2', '2': '2π' })[String(Math.round((v / Math.PI) * 2) / 2)] ?? v.toFixed(1);
const intTicks = (n, count) => { const t = niceTicks(0, n, Math.max(2, count)).filter((v) => Number.isInteger(v) && v >= 1 && v <= n); if (t[0] === 1) return t; return t.length > 1 && t[0] - 1 <= (t[1] - t[0]) / 2 ? [1, ...t.slice(1)] : [1, ...t]; };
const count = (n, one, many = one + 's') => (n === 1 ? `one ${one}` : `${n} ${many}`);
const expoHtml = (s) => (s === 0 ? '' : `e<sup>${s < 0 ? '−' : ''}${Math.abs(s) === 1 ? '' : Math.abs(s)}i<i>k</i></sup>`);
const kTicks = [0, Math.PI / 2, Math.PI, 1.5 * Math.PI, TAU];

// ---------- state ----------
const STORE = 'qsl-builder';
function restore() { try { const raw = localStorage.getItem(STORE); return raw ? reviveModel(JSON.parse(raw)) : null; } catch (e) { return null; } }
let model = restore() || preset('ssh');
let brush = 'J1', mode = 'cell', factor = 0, act = 0, sel = -1, hoverN = -1, armed = -1, showPhase = false, status = '';
let D = null, matPrev = null, chainPrev = null, saved = JSON.stringify(model), dragging = false;
const undoStack = [];

let kc = null;                                          // the coupling colours, read from the theme tokens
const kcol = (id) => { if (!kc) { kc = { ink: cssVar('--k-ink'), ink4: cssVar('--k4-ink') }; for (const b of BRUSHES) kc[b.id] = cssVar(b.token); } return kc[id]; };
const inkOn = (id) => kcol(id === 'J4' ? 'ink4' : 'ink');
const entryValue = (e) => { const v = e.c === ERASE ? { re: 0, im: 0 } : value(model, e.c); return { re: v.re, im: e.conj ? -v.im : v.im }; };
const entryName = (e) => (e.c === ERASE ? '0' : brushOf(e.c).name + (e.conj && isComplex(model, e.c) ? '*' : ''));
const sameEntry = (x, y) => (!x && !y) || (!!x && !!y && x.c === y.c && x.conj === y.conj && x.patch === y.patch);
const bondWords = (B) => (B.site ? `the on-site energy of every ${SUBL[B.a]} site` : B.d === 0 ? `${SUBL[B.a]} and ${SUBL[B.b]} inside the unit cell` : `${SUBL[B.a]} and ${SUBL[B.b]} ${B.d === 1 ? 'of the next cell' : `${B.d} cells further`}`);
const changes = (res) => res === 'set' || res === 'removed' || res === 'unpatched';
const shownState = () => (hoverN >= 0 && hoverN < model.N ? hoverN : sel);
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// What a click on entry (i, j) would do: the result of paint() and every entry that changes.
function previewFor(i, j) {
  const copy = cloneModel(model), res = paint(copy, i, j, brush, mode), cells = [];
  if (changes(res)) { const g2 = assemble(copy).grid, g1 = D.asm.grid; for (let a = 0; a < model.N; a++) for (let b = 0; b < model.N; b++) if (!sameEntry(g1[a][b], g2[a][b])) cells.push({ i: a, j: b, to: g2[a][b] }); }
  return { i, j, res, cells };
}

// ---------- panels ----------
// The matrix H: one square per entry, in the colour of the coupling plugged into it. A click plugs the selected one in.
class MatrixPanel extends Canvas2D {
  constructor(canvas) {
    super(canvas); this.g = null; this.hover = null; this.onCell = null; this.onHoverCell = null;
    this.tipEl = el('div', { class: 'plot-tip' }); this.tipEl.hidden = true; canvas.parentElement.append(this.tipEl);
    const at = (e) => { const r = canvas.getBoundingClientRect(); return this.cellAt(e.clientX - r.left, e.clientY - r.top); };
    const same = (a, b) => (!a && !b) || (!!a && !!b && a.i === b.i && a.j === b.j);
    canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const c = at(e); canvas.style.cursor = c ? 'pointer' : ''; if (!same(c, this.hover)) { this.hover = c; this.onHoverCell && this.onHoverCell(c); } });
    canvas.addEventListener('pointerleave', () => { if (this.hover) { this.hover = null; this.onHoverCell && this.onHoverCell(null); } });
    canvas.addEventListener('click', (e) => { const c = at(e); if (c && this.onCell) this.onCell(c.i, c.j); });
  }
  cellAt(x, y) { const g = this.g; if (!g) return null; const j = Math.floor((x - g.x0) / g.cell), i = Math.floor((y - g.y0) / g.cell); return i >= 0 && j >= 0 && i < g.N && j < g.N ? { i, j } : null; }
  entry(ctx, c, e, X, Y, cell, alpha) {
    if (e.c === ERASE) {
      const q = cell * 0.3; ctx.strokeStyle = c['fg-2']; ctx.lineWidth = Math.max(1, cell * 0.08);
      ctx.beginPath(); ctx.moveTo(X + q, Y + q); ctx.lineTo(X + cell - q, Y + cell - q); ctx.moveTo(X + cell - q, Y + q); ctx.lineTo(X + q, Y + cell - q); ctx.stroke();
    } else {
      const b = brushOf(e.c), v = value(model, e.c), zero = Math.hypot(v.re, v.im) < 1e-12, gap = cell >= 9 ? 1 : 0.5, rad = Math.max(1.5, cell * 0.33);
      ctx.save(); ctx.globalAlpha = alpha * (zero ? 0.35 : 1); ctx.fillStyle = kcol(e.c);
      if (b.kind === 'site') { ctx.beginPath(); ctx.arc(X + cell / 2, Y + cell / 2, rad, 0, TAU); ctx.fill(); } else {
        rr(ctx, X + gap, Y + gap, cell - 2 * gap, cell - 2 * gap, Math.min(4, cell * 0.2)); ctx.fill();
        if (e.conj && Math.abs(v.im) > 1e-12) {                  // the complex-conjugate entries are hatched
          ctx.clip(); ctx.strokeStyle = c.surface; ctx.globalAlpha = alpha * 0.5; ctx.lineWidth = Math.max(1, cell * 0.09); ctx.beginPath();
          for (let q = -cell; q < cell; q += Math.max(3.5, cell * 0.32)) { ctx.moveTo(X + q, Y + cell); ctx.lineTo(X + q + cell, Y); } ctx.stroke();
        }
      }
      ctx.restore();
      if (alpha === 1 && (b.kind === 'site' ? rad >= 10 : cell >= 23)) { ctx.fillStyle = inkOn(e.c); ctx.font = this.font(Math.min(13, Math.round(cell * 0.42)), 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(entryName(e), X + cell / 2, Y + cell / 2 + 0.5); }
    }
    if (e.patch) { ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.strokeRect(X + 1.25, Y + 1.25, cell - 2.5, cell - 2.5); }
  }
  draw({ grid, prev, title, tip }) {
    const c = colors(), ctx = this.ctx, { N, m } = model, w = this.w, h = this.h;
    this.clear(); this.g = null;
    if (w < 140 || h < 140) return;
    const padL = 36, padT = 52, padR = 12, padB = 12, S = Math.min(w - padL - padR, h - padT - padB), cell = S / N;
    const x0 = Math.round(padL + (w - padL - padR - S) / 2), y0 = padT;
    this.g = { x0, y0, cell, N };
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, 12, 6);
    // the unit cells on the diagonal, the grid, the lines between cells
    ctx.fillStyle = c['surface-2'];
    for (let a = 0; a < N; a += m) { const b = Math.min(N, a + m); ctx.fillRect(x0 + a * cell, y0 + a * cell, (b - a) * cell, (b - a) * cell); }
    const lines = (qs, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); for (const q of qs) { const X = Math.round(x0 + q * cell) + 0.5, Y = Math.round(y0 + q * cell) + 0.5; ctx.moveTo(X, y0); ctx.lineTo(X, y0 + S); ctx.moveTo(x0, Y); ctx.lineTo(x0 + S, Y); } ctx.stroke(); };
    const all = Array.from({ length: N + 1 }, (_, q) => q);
    if (cell >= 6) lines(all.filter((q) => q % m !== 0 && q !== N), c.grid);
    lines(all.filter((q) => q % m === 0 || q === N), c.line);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const e = grid[i][j]; if (e) this.entry(ctx, c, e, x0 + j * cell, y0 + i * cell, cell, 1); }
    // what the next click would change, and the entry under the pointer
    if (prev) {
      for (const p of prev.cells) {
        const X = x0 + p.j * cell, Y = y0 + p.i * cell, inCell = Math.floor(p.i / m) === Math.floor(p.j / m);
        ctx.fillStyle = inCell ? c['surface-2'] : c.surface; ctx.globalAlpha = 0.72; ctx.fillRect(X + 0.5, Y + 0.5, cell - 1, cell - 1); ctx.globalAlpha = 1;
        if (p.to && p.to.c !== ERASE) this.entry(ctx, c, { ...p.to, patch: false }, X, Y, cell, 0.62);
        ctx.save(); ctx.strokeStyle = p.to && p.to.c !== ERASE ? kcol(p.to.c) : c['fg-2']; ctx.lineWidth = 1.5; if (!p.to || p.to.c === ERASE) ctx.setLineDash([3, 2]); ctx.strokeRect(X + 1, Y + 1, cell - 2, cell - 2); ctx.restore();
      }
      ctx.strokeStyle = changes(prev.res) ? c.fg : c['fg-2']; ctx.lineWidth = 2; ctx.strokeRect(x0 + prev.j * cell + 1, y0 + prev.i * cell + 1, cell - 2, cell - 2);
    }
    // headers: the site number and its sublattice
    const every = cell >= 18 ? 1 : 5;
    for (let q = 0; q < N; q++) {
      const xc = x0 + (q + 0.5) * cell, yc = y0 + (q + 0.5) * cell, hot = prev && (prev.i === q || prev.j === q);
      if (cell >= 11) { ctx.fillStyle = hot ? c.fg : c['fg-2']; ctx.font = this.font(Math.min(11, Math.round(cell * 0.8)), 600, true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(SUBL[q % m], xc, y0 - 4); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(SUBL[q % m], x0 - 5, yc); }
      if (q === 0 || (q + 1) % every === 0) { ctx.fillStyle = c['fg-2']; ctx.font = this.font(10, 400, true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(String(q + 1), xc, y0 - (cell >= 11 ? 17 : 4)); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(q + 1), x0 - (cell >= 11 ? 17 : 5), yc); }
    }
    // tooltip beside the entry under the pointer
    if (prev && tip) {
      this.tipEl.hidden = false; this.tipEl.innerHTML = tip;
      const tw = this.tipEl.offsetWidth, th = this.tipEl.offsetHeight; let L = x0 + (prev.j + 1) * cell + 8; if (L + tw > w - 4) L = x0 + prev.j * cell - tw - 8;
      this.tipEl.style.left = Math.max(4, L) + 'px'; this.tipEl.style.top = Math.max(4, Math.min(h - th - 4, y0 + prev.i * cell - 6)) + 'px';
    } else this.tipEl.hidden = true;
  }
}

// The chain: sites, the bonds in the colours of their couplings, the unit cells, and one eigenstate as bars above it.
class StructPanel extends Canvas2D {
  constructor(canvas) {
    super(canvas); this.L = null; this.hover = -1; this.onSite = null; this.onHoverSite = null;
    this.tipEl = el('div', { class: 'plot-tip' }); this.tipEl.hidden = true; canvas.parentElement.append(this.tipEl);
    const at = (e) => { const r = canvas.getBoundingClientRect(); return this.siteAt(e.clientX - r.left, e.clientY - r.top); };
    canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const s = at(e); if (s !== this.hover) { this.hover = s; canvas.style.cursor = s >= 0 ? 'pointer' : ''; this.onHoverSite && this.onHoverSite(s); } });
    canvas.addEventListener('pointerleave', () => { if (this.hover >= 0) { this.hover = -1; this.onHoverSite && this.onHoverSite(-1); } });
    canvas.addEventListener('click', (e) => { this.onSite && this.onSite(at(e)); });
  }
  siteAt(x, y) { const L = this.L; if (!L) return -1; let best = -1, bd = Math.max(L.r + 7, 13); for (let i = 0; i < L.xs.length; i++) { const d = Math.hypot(L.xs[i] - x, L.ys[i] - y); if (d < bd) { bd = d; best = i; } } return best; }
  // the bond between sites j < i: a straight line where nothing is in the way, an arc otherwise
  bond(ctx, j, i, { color, width, dash, alpha = 1, outline, arrowTo = -1 }) {
    const L = this.L, zig = model.layout === 'zigzag', d = i - j, xa = L.xs[j], ya = L.ys[j], xb = L.xs[i], yb = L.ys[i];
    const straight = zig ? d % 2 === 1 || d === 2 : d === 1;
    let p0, p1, cp = null;
    if (straight) { const len = Math.hypot(xb - xa, yb - ya) || 1, ux = (xb - xa) / len, uy = (yb - ya) / len; p0 = [xa + ux * L.r, ya + uy * L.r]; p1 = [xb - ux * L.r, yb - uy * L.r]; } else {
      const up = j % 2 === 0, sgn = up ? -1 : 1, bh = Math.min(L.room, 7 + (d - 1) * Math.min(13, L.pitch * 0.5));
      p0 = [xa, ya + sgn * L.r]; p1 = [xb, yb + sgn * L.r]; cp = [(xa + xb) / 2, (ya + yb) / 2 + sgn * (L.r + 2 * bh)];
    }
    const path = () => { ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); if (cp) ctx.quadraticCurveTo(cp[0], cp[1], p1[0], p1[1]); else ctx.lineTo(p1[0], p1[1]); };
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = alpha;
    if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = width + 2.5; path(); ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); path(); ctx.stroke(); ctx.setLineDash([]);
    if (arrowTo >= 0) {                                         // arrowhead at the middle, pointing to site arrowTo
      const mx = cp ? (p0[0] + 2 * cp[0] + p1[0]) / 4 : (p0[0] + p1[0]) / 2, my = cp ? (p0[1] + 2 * cp[1] + p1[1]) / 4 : (p0[1] + p1[1]) / 2;
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1]; const tl = Math.hypot(tx, ty) || 1, s = arrowTo === i ? 1 : -1, a = Math.max(5, width * 2.2); tx = (s * tx) / tl; ty = (s * ty) / tl;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(mx + tx * a, my + ty * a); ctx.lineTo(mx - tx * a * 0.6 - ty * a * 0.7, my - ty * a * 0.6 + tx * a * 0.7); ctx.lineTo(mx - tx * a * 0.6 + ty * a * 0.7, my - ty * a * 0.6 - tx * a * 0.7); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  draw({ grid, state, real, title, prev, tip }) {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h, { N, m, ring } = model, zig = model.layout === 'zigzag';
    this.clear(); this.L = null;
    if (w < 140 || h < 90) return;
    const padX = ring ? 30 : 14, top = 24, avail = h - top - 8, pitch = (w - 2 * padX) / N;
    const r = Math.max(2.5, Math.min(11, pitch * 0.27, avail * 0.09)), dz = zig ? Math.min(avail * 0.1, 18, pitch * 1.2) : 0;
    let reach = 0;                                               // how far the widest arc wants to rise above its sites
    for (let i = 0; i < N; i++) for (let j = 0; j < i; j++) { const e = grid[i][j], d = i - j; if (e && e.c !== ERASE && !e.wrap && !(zig ? d % 2 === 1 || d === 2 : d === 1)) reach = Math.max(reach, 7 + (d - 1) * Math.min(13, pitch * 0.5)); }
    const sH = state ? Math.max(2 * (dz + r) + 22, Math.min(avail * 0.6, 2 * (dz + r + reach) + 16)) : avail, barsH = state ? avail - sH - 6 : 0;
    const sTop = top + barsH + (state ? 6 : 0), yMid = sTop + sH / 2;
    const xs = Array.from({ length: N }, (_, i) => padX + pitch * (i + 0.5)), ys = xs.map((_, i) => yMid + (zig ? (i % 2 ? dz : -dz) : 0));
    this.L = { xs, ys, r, pitch, room: Math.max(6, sH / 2 - dz - r - 5) };
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, 12, 6);
    // the eigenstate: one bar per site, exactly above the site
    let pmax = 1e-12; const p = state ? state.re.map((x, j) => x * x + state.im[j] * state.im[j]) : null;
    if (state) {
      const amax = Math.max(1e-9, ...state.re.map(Math.abs), ...state.im.map(Math.abs)), yb = top + barsH / 2, sc = (barsH / 2 - 2) / amax, bw = Math.max(2, Math.min(16, pitch * 0.5));
      pmax = Math.max(...p);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padX, Math.round(yb) + 0.5); ctx.lineTo(w - padX, Math.round(yb) + 0.5); ctx.stroke();
      for (let j = 0; j < N; j++) {
        const hr = state.re[j] * sc; ctx.fillStyle = c.psi;
        if (real) ctx.fillRect(xs[j] - bw / 2, hr >= 0 ? yb - hr : yb, bw, Math.abs(hr));
        else { const hi = state.im[j] * sc, b2 = bw * 0.46; ctx.fillRect(xs[j] - b2 - 0.5, hr >= 0 ? yb - hr : yb, b2, Math.abs(hr)); ctx.fillStyle = c.hpsi; ctx.fillRect(xs[j] + 0.5, hi >= 0 ? yb - hi : yb, b2, Math.abs(hi)); }
      }
    }
    // the unit cells: the first one framed, the others outlined
    if (pitch * m >= 14) for (let a = 0; a < N; a += m) {
      const b = Math.min(N, a + m) - 1, bx = xs[a] - r - 4, bw = xs[b] - xs[a] + 2 * r + 8, by = yMid - dz - r - 5, bh = 2 * (dz + r + 5);
      ctx.save(); if (a === 0) { ctx.fillStyle = c.accent; ctx.globalAlpha = 0.09; rr(ctx, bx, by, bw, bh, 5); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5; rr(ctx, bx, by, bw, bh, 5); ctx.stroke(); } else if (b - a + 1 === m) { ctx.setLineDash([3, 3]); ctx.strokeStyle = c.line; ctx.lineWidth = 1; rr(ctx, bx, by, bw, bh, 5); ctx.stroke(); }
      ctx.restore();
    }
    // bonds: every entry below the diagonal is one line, in the colour of its coupling
    let stubs = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < i; j++) {
      const e = grid[i][j]; if (!e || e.c === ERASE) continue;
      const v = entryValue(e), mag = Math.hypot(v.re, v.im), zero = mag < 1e-12, width = 1.6 + 1.3 * Math.min(2, mag), color = kcol(e.c);
      if (e.wrap) {                                             // a ring: the bond leaves on one side and comes back on the other
        const off = ((stubs++ % 3) - 1) * 5; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash([4, 3]); ctx.globalAlpha = zero ? 0.35 : 1;
        ctx.beginPath(); ctx.moveTo(xs[i] + r, ys[i]); ctx.lineTo(w - 4, ys[i] + off); ctx.moveTo(4, ys[j] + off); ctx.lineTo(xs[j] - r, ys[j]); ctx.stroke(); ctx.restore(); continue;
      }
      const ph = Math.atan2(v.im, v.re), cx = Math.abs(v.im) > 1e-12;       // H[i][j] = |t|e^{iφ}: the step j → i carries +φ
      this.bond(ctx, j, i, { color, width, dash: zero ? [3, 3] : null, alpha: zero ? 0.4 : 1, outline: e.patch ? c.fg : null, arrowTo: cx ? (ph > 0 ? i : j) : -1 });
    }
    if (prev) for (const q of prev.cells) if (q.i > q.j && q.to && q.to.c !== ERASE && !q.to.wrap) this.bond(ctx, q.j, q.i, { color: kcol(q.to.c), width: 2, dash: [4, 3], alpha: 0.9 });
    // sites, with the on-site energies as rings
    const ringOf = (i, e, dash) => { const v = entryValue(e); ctx.save(); ctx.strokeStyle = kcol(e.c); ctx.lineWidth = 2.5; ctx.globalAlpha = Math.abs(v.re) < 1e-12 ? 0.35 : 1; if (dash) ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.arc(xs[i], ys[i], r + 3.5, 0, TAU); ctx.stroke(); ctx.restore(); if (e.patch) { ctx.strokeStyle = c.fg; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(xs[i], ys[i], r + 5.6, 0, TAU); ctx.stroke(); } };
    for (let i = 0; i < N; i++) {
      const e = grid[i][i]; if (e && e.c !== ERASE) ringOf(i, e, false);
      ctx.beginPath(); ctx.arc(xs[i], ys[i], r, 0, TAU); ctx.fillStyle = c.surface; ctx.fill();
      if (p) { ctx.fillStyle = c.psi; ctx.globalAlpha = 0.85 * (p[i] / pmax); ctx.fill(); ctx.globalAlpha = 1; }
      const hot = i === this.hover || i === armed;
      ctx.lineWidth = hot ? 2.5 : 1.5; ctx.strokeStyle = hot ? c.accent : c['fg-2']; ctx.stroke();
      if (i === armed) { ctx.beginPath(); ctx.arc(xs[i], ys[i], r + 3, 0, TAU); ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
      if (r >= 7.5) { ctx.fillStyle = c.fg; ctx.font = this.font(Math.round(r * 1.05), 600, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(SUBL[i % m], xs[i], ys[i] + 0.5); }
    }
    if (prev) for (const q of prev.cells) if (q.i === q.j && q.to && q.to.c !== ERASE) ringOf(q.i, q.to, true);
    if (tip && this.hover >= 0) {
      this.tipEl.hidden = false; this.tipEl.innerHTML = tip; const tw = this.tipEl.offsetWidth;
      this.tipEl.style.left = Math.max(4, Math.min(w - tw - 4, xs[this.hover] - tw / 2)) + 'px'; this.tipEl.style.top = Math.max(2, ys[this.hover] - r - 30) + 'px';
    } else this.tipEl.hidden = true;
  }
}

// h(k) in the complex plane: the closed curve it draws when k runs once through the Brillouin zone, and the origin.
class PlanePanel extends Canvas2D {
  draw({ curve, nu, title, foot }) {
    const c = colors(), ctx = this.ctx, w = this.w, h = this.h;
    this.clear();
    if (w < 120 || h < 100 || !curve) return;
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    for (const z of curve) { x0 = Math.min(x0, z.re); x1 = Math.max(x1, z.re); y0 = Math.min(y0, z.im); y1 = Math.max(y1, z.im); }
    const span = Math.max(x1 - x0, y1 - y0, 0.5), mg = 0.16 * span; x0 -= mg; x1 += mg; y0 -= mg; y1 += mg;
    const top = 30, bot = 26, sc = Math.min((w - 28) / (x1 - x0), (h - top - bot) / (y1 - y0));
    const ox = 14 + (w - 28 - sc * (x1 - x0)) / 2 - sc * x0, oy = top + (h - top - bot - sc * (y1 - y0)) / 2 + sc * y1, X = (re) => ox + sc * re, Y = (im) => oy - sc * im;
    ctx.fillStyle = c.fg; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, 12, 6);
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(x0), oy); ctx.lineTo(X(x1), oy); ctx.moveTo(ox, Y(y0)); ctx.lineTo(ox, Y(y1)); ctx.stroke();
    ctx.fillStyle = c['fg-2']; ctx.font = this.font(11, 400, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const v of niceTicks(x0, x1, Math.max(2, Math.floor((sc * (x1 - x0)) / 60)))) { if (v === 0) continue; ctx.beginPath(); ctx.moveTo(X(v), oy - 3); ctx.lineTo(X(v), oy + 3); ctx.stroke(); ctx.fillText(String(+v.toFixed(3)).replace('-', '−'), X(v), oy + 5); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('Re', X(x1), oy - 4); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Im', ox + 6, Y(y1));
    const col = nu ? c.psi : c['fg-2'], path = () => { ctx.beginPath(); curve.forEach((z, i) => (i ? ctx.lineTo(X(z.re), Y(z.im)) : ctx.moveTo(X(z.re), Y(z.im)))); };
    ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = col; path(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; path(); ctx.stroke();
    const n = curve.length - 1;
    for (const f of [0.125, 0.375, 0.625, 0.875]) {              // arrowheads: the direction of growing k
      const i = Math.round(f * n), a = curve[i - 1], b = curve[i + 1]; let tx = (b.re - a.re) * sc, ty = -(b.im - a.im) * sc; const tl = Math.hypot(tx, ty); if (tl < 1e-6) continue; tx /= tl; ty /= tl;
      const px = X(curve[i].re), py = Y(curve[i].im), s = 6; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px + tx * s, py + ty * s); ctx.lineTo(px - tx * s * 0.6 - ty * s * 0.75, py - ty * s * 0.6 + tx * s * 0.75); ctx.lineTo(px - tx * s * 0.6 + ty * s * 0.75, py - ty * s * 0.6 - tx * s * 0.75); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(X(curve[0].re), Y(curve[0].im), 3.5, 0, TAU); ctx.fill();
    { const px = X(curve[0].re), py = Y(curve[0].im), right = px > w - 70; ctx.font = this.font(11, 500); ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'top'; ctx.fillText('k = 0', px + (right ? -6 : 6), py + (Math.abs(py - oy) < 14 ? 20 : 6)); }
    ctx.fillStyle = c.surface; ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = nu ? c.psi : c['fg-2']; ctx.font = this.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(foot, 12, h - 6);
  }
}

const matPanel = new MatrixPanel($('pane-mat').querySelector('canvas'));
const chainPanel = new StructPanel($('pane-chain').querySelector('canvas'));
const planePanel = new PlanePanel($('pane-plane').querySelector('canvas'));
const pad = { l: 46, r: 12, t: 26, b: 32 };
const eigPlot = new Plot($('pane-eig').querySelector('canvas'), { pad });
const vecPlot = new Plot($('pane-vec').querySelector('canvas'), { pad });
const bandPlot = new Plot($('pane-band').querySelector('canvas'), { pad });
const panes = { pal: $('pane-pal'), mat: $('pane-mat'), hk: $('pane-hk'), chain: $('pane-chain'), eig: $('pane-eig'), vec: $('pane-vec'), band: $('pane-band'), plane: $('pane-plane') };

// ---------- drawing ----------
function matTip(pv) {
  const { m } = model, e = D.asm.grid[pv.i][pv.j], one = mode === 'one';
  const now = !e ? 'empty' : e.c === ERASE ? '0 (cut by hand)' : `${entryName(e)} = ${cstr(entryValue(e))}${e.patch ? ' (set by hand)' : ''}`;
  const what = { set: brush === ERASE ? 'click: set this entry to 0' : `click: plug in ${brushOf(brush).name} ${one ? 'here only' : 'in every unit cell'}`, removed: 'click: take it out of every unit cell', unpatched: 'click: let this entry follow the unit cell again', same: brush === ERASE ? 'nothing to erase here' : 'already there', diag: 'a coupling belongs off the diagonal', offdiag: 'an on-site energy belongs on the diagonal' }[pv.res];
  return `row ${pv.i + 1} (${SUBL[pv.i % m]}), column ${pv.j + 1} (${SUBL[pv.j % m]}): ${now}<br>${what}`;
}
function drawMatrix() {
  const { N } = model, nP = Object.keys(model.patches).length;
  matPanel.draw({ grid: D.asm.grid, prev: matPrev, tip: matPrev ? matTip(matPrev) : null, title: `the matrix H, ${N} × ${N}: row i, column j couples site j into site i${nP ? ` · framed: ${count(nP, 'entry', 'entries')} set by hand` : ''}` });
}
function chainTip(s) {
  const { m } = model, n = shownState(), v = n >= 0 && act === 0 ? D.eig.vectors[n] : null;
  let t = `site ${s + 1}: ${SUBL[s % m]} of cell ${Math.floor(s / m) + 1}`;
  if (v) t += ` · ψ = ${cstr({ re: v.re[s], im: v.im[s] }, 3)}`;
  if (armed >= 0 && armed !== s) t += `<br>click: ${brush === ERASE ? 'erase the bond' : `connect with ${brushOf(brush).name}`} between site ${armed + 1} and site ${s + 1}`;
  else if (armed < 0 && brush !== ERASE && brushOf(brush).kind === 'site') t += `<br>click: ${brushOf(brush).name} on ${mode === 'cell' ? `every ${SUBL[s % m]} site` : 'this site'}`;
  else if (armed < 0) t += '<br>click, then click a second site';
  return t;
}
function drawChain() {
  const n = shownState(), withState = act === 0 && n >= 0, cx = Object.values(model.rules).concat(Object.values(model.patches)).some((r) => r.c !== ERASE && isComplex(model, r.c));
  const title = withState ? `eigenstate n = ${n + 1}, E = ${num(D.eig.values[n], 4)}: ${D.real ? 'ψ(j)' : 'Re ψ(j) blue, Im ψ(j) orange'} above each site` : `the chain${cx ? ' · arrow: the direction that carries the phase +φ' : ''}`;
  chainPanel.draw({ grid: D.asm.grid, state: withState ? D.eig.vectors[n] : null, real: D.real, title, prev: chainPrev, tip: chainPanel.hover >= 0 ? chainTip(chainPanel.hover) : null });
}
const eRange = () => { const v = [...D.eig.values, ...D.bands.ranges.flat()], lo = Math.min(...v), hi = Math.max(...v), p = Math.max(0.3, (hi - lo) * 0.08); return [lo - p, hi + p]; };
const eTicks = (plot) => { const [lo, hi] = eRange(); return niceTicks(lo, hi, Math.max(3, Math.min(9, Math.floor((plot.h - 58) / 28)))); };
function drawEig() {
  const c = colors(), { N } = model, E = D.eig.values, ns = E.map((_, i) => i + 1), ing = ns.map((v) => v - 1).filter((i) => D.inGap[i]), n = shownState();
  eigPlot.begin({ xlim: [0.5, N + 0.5], ylim: eRange(), yticks: eTicks(eigPlot), xticks: intTicks(N, Math.floor(eigPlot.w / 60)), xlabel: 'n (eigenvalues sorted, lowest first)', ylabel: 'Eₙ', title: `eigenvalues · shaded: bands of the infinite chain${ing.length ? ` · orange: ${ing.length} outside` : ''}` });
  for (const [a, b] of D.bands.ranges) { if (b - a > 1e-9) eigPlot.hspan(a, b, { color: c.psi, alpha: 0.12 }); else eigPlot.hline(a, { color: c.psi, width: 3, alpha: 0.3 }); }
  eigPlot.dots(ns, E, { color: c.psi, r: N > 40 ? 2.6 : 3.5, data: ns.map((v) => v - 1), tips: ns.map((v, i) => `n = ${v}: E = ${num(E[i], 4)}`) });
  if (ing.length) eigPlot.dots(ing.map((i) => i + 1), ing.map((i) => E[i]), { color: c.hpsi, r: 4.5, data: ing, tips: ing.map((i) => `n = ${i + 1}: E = ${num(E[i], 4)}, ${describeState(model, D.eig.vectors[i]).where}`) });
  if (n >= 0) { const ctx = eigPlot.ctx; ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(eigPlot.x(n + 1), eigPlot.y(E[n]), 8, 0, TAU); ctx.stroke(); }
  eigPlot.end();
}
function drawVec() {
  const c = colors(), { N, m } = model, V = D.eig.vectors, n = shownState();
  const Mx = Array.from({ length: N }, (_, j) => V.map((v) => (D.real ? v.re[j] : Math.hypot(v.re[j], v.im[j]))));       // rows: sites, columns: eigenstates
  vecPlot.begin({ xlim: [0.5, N + 0.5], ylim: [N + 0.5, 0.5], xticks: intTicks(N, Math.floor(vecPlot.w / 60)), yticks: intTicks(N, Math.floor((vecPlot.h - 58) / 26)), grid: false, xlabel: 'eigenstate n', ylabel: 'site j', title: D.real ? 'eigenvectors: column n is ψₙ(j) · red +, blue −' : 'eigenvectors: column n is |ψₙ(j)|' });
  vecPlot.heatmap(Mx, { cmap: D.real ? 'div' : 'seq', x0: 0.5, y0: 0.5, ...(D.real ? {} : { vmin: 0 }), tips: (j, q) => `n = ${q + 1}, site ${j + 1} (${SUBL[j % m]}): ${cstr({ re: V[q].re[j], im: V[q].im[j] }, 3)}` });
  if (n >= 0) { const ctx = vecPlot.ctx; ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.strokeRect(vecPlot.x(n + 0.5), vecPlot.y(0.5), vecPlot.x(n + 1.5) - vecPlot.x(n + 0.5), vecPlot.y(N + 0.5) - vecPlot.y(0.5)); }
  vecPlot.end();
}
function drawBand() {
  const c = colors(), B = D.bands, E = D.eig.values, ctx = bandPlot.ctx;
  bandPlot.begin({ xlim: [0, TAU * 1.09], ylim: eRange(), yticks: eTicks(bandPlot), xticks: kTicks, xtickFmt: piTick, xlabel: 'wavenumber k (phase per unit cell)', ylabel: 'E(k)', title: `bands of the infinite chain · right: the ${model.N} levels of the ${model.ring ? 'ring' : 'chain'}` });
  B.E.forEach((b, q) => { bandPlot.line(B.ks, b, { color: c.psi, width: 2.2 }); for (let i = 0; i < B.ks.length; i += 6) bandPlot.hits.push({ x: bandPlot.x(B.ks[i]), y: bandPlot.y(b[i]), data: `${q}:${i}`, tip: `band ${q + 1}: k = ${inPi(B.ks[i])}, E = ${num(b[i], 3)}` }); });
  bandPlot.vline(TAU, { color: c.line });
  E.forEach((v, i) => { ctx.strokeStyle = D.inGap[i] ? c.hpsi : c.fg; ctx.lineWidth = D.inGap[i] ? 2.4 : 1.2; ctx.beginPath(); ctx.moveTo(bandPlot.x(TAU * 1.015), bandPlot.y(v)); ctx.lineTo(bandPlot.x(TAU * 1.08), bandPlot.y(v)); ctx.stroke(); });
  bandPlot.end();
}
function drawPlane() {
  const ch = D.chiral; $('stage').dataset.plane = ch.curve && act === 1 ? '1' : '0'; panes.plane.hidden = !(ch.curve && act === 1);
  if (!ch.curve || act !== 1) return;
  const what = ch.what === 'det h(k)' ? 'det h(k)' : `h(k) = ${ch.what}`;
  const foot = !ch.chiral ? 'H(k) has terms on its diagonal: no winding number' : ch.nu === null ? 'the curve passes through the origin: winding not defined' : ch.nu === 0 ? 'the origin lies outside: winding ν = 0' : `it goes around the origin ${Math.abs(ch.nu) === 1 ? 'once' : `${Math.abs(ch.nu)} times`}: winding ν = ${num(ch.nu, 0)}`;
  planePanel.draw({ curve: ch.curve, nu: ch.chiral ? ch.nu : 0, title: `${what} in the complex plane, k from 0 to 2π`, foot });
}

// ---------- the palette ----------
const palRefs = {};
function pickBrush(id) { brush = id; armed = -1; chainPrev = null; matPrev = matPanel.hover ? previewFor(matPanel.hover.i, matPanel.hover.j) : null; syncPalette(); if (act === 0) drawMatrix(); drawChain(); }
function beginDrag() { if (!dragging) { undoStack.push(saved); dragging = true; } }
function buildPalette() {
  const pane = panes.pal; pane.innerHTML = '';
  const brushRow = (b) => {
    const chip = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', title: b.kind === 'hop' ? `${b.name}: a coupling between two sites (key ${BRUSHES.indexOf(b) + 1})` : `${b.name}: an on-site energy, for the diagonal (key ${BRUSHES.indexOf(b) + 1})`, onclick: () => pickBrush(b.id) }, [el('span', { class: `sw${b.kind === 'site' ? ' dot' : ''}`, style: `background: var(${b.token})` }), el('span', { text: b.name })]);
    const amp = el('input', { type: 'range', id: `amp-${b.id}`, min: -R_MAX, max: R_MAX, step: 0.05, 'aria-label': `value of ${b.name}` });
    const out = el('input', { type: 'text', id: `val-${b.id}`, class: 'num', inputmode: 'decimal', autocomplete: 'off', 'aria-label': `value of ${b.name}, typed`, title: `type a value between −${R_MAX} and ${R_MAX}` });
    amp.addEventListener('input', () => { beginDrag(); model.vals[b.id].r = +amp.value; refresh(); });
    amp.addEventListener('change', () => { dragging = false; });
    out.addEventListener('focus', () => { out.value = String(model.vals[b.id].r); out.select(); });
    out.addEventListener('keydown', (e) => { if (e.key === 'Enter') out.blur(); if (e.key === 'Escape') { out.value = String(model.vals[b.id].r); out.blur(); } });
    out.addEventListener('change', () => { const v = parseFloat(out.value.replace(',', '.').replace('−', '-')); if (Number.isFinite(v) && v !== model.vals[b.id].r) edit(() => { model.vals[b.id].r = Math.max(-R_MAX, Math.min(R_MAX, v)); }); });
    out.addEventListener('blur', () => { out.value = num(model.vals[b.id].r); });
    const rowEl = el('div', { class: 'brush' }, [chip, amp, out]);
    const ref = palRefs[b.id] = { chip, amp, out };
    if (b.kind === 'hop') {
      const ph = el('input', { type: 'range', id: `phi-${b.id}`, min: -1, max: 1, step: 1 / 24, 'aria-label': `phase of ${b.name}` }), pout = el('output'), lab = el('span', { class: 'phase-l', text: 'φ' });
      ph.addEventListener('input', () => { beginDrag(); model.vals[b.id].phi = Math.round(+ph.value * 24) / 24; refresh(); });
      ph.addEventListener('change', () => { dragging = false; });
      rowEl.append(lab, ph, pout); Object.assign(ref, { ph, pout, lab });
    }
    return rowEl;
  };
  palRefs.status = el('p', { class: 'pal-status', 'aria-live': 'polite' });
  palRefs.cell = el('button', { type: 'button', 'aria-pressed': 'true', title: 'One click sets the bond along the whole chain: the same entry in every unit cell', onclick: () => setMode('cell') }, 'every unit cell');
  palRefs.one = el('button', { type: 'button', 'aria-pressed': 'false', title: 'One click changes a single entry and its mirror image: a defect', onclick: () => setMode('one') }, 'this entry only');
  pane.append(palRefs.status, el('div', { class: 'pal-h', text: 'One click plugs it into' }), el('div', { class: 'seg', role: 'group', 'aria-label': 'what one click changes' }, [palRefs.cell, palRefs.one]), el('div', { class: 'pal-h', text: 'Couplings' }));
  for (const b of BRUSHES.filter((x) => x.kind === 'hop')) pane.append(brushRow(b));
  pane.append(el('div', { class: 'pal-h', text: 'On-site energies' }));
  for (const b of BRUSHES.filter((x) => x.kind === 'site')) pane.append(brushRow(b));
  palRefs.erase = el('button', { type: 'button', class: 'chip plain', 'aria-pressed': 'false', title: 'Erase: a click takes the coupling out (key 0)', onclick: () => pickBrush(ERASE) }, [el('span', { class: 'sw none' }), el('span', { text: 'erase' })]);
  palRefs.undo = button('undo', undo, { title: 'Undo the last change (Ctrl+Z)' });
  pane.append(el('div', { class: 'row', style: 'margin-top: 4px' }, [palRefs.erase, palRefs.undo]));
  palRefs.phase = toggle({ id: 'phases', label: 'complex couplings: <i>J</i> = |<i>J</i>|·e<sup>iφ</sup>', checked: showPhase, onChange: (v) => { showPhase = v; syncPalette(); } });
  pane.append(palRefs.phase.root);
}
function setMode(v) { mode = v; armed = -1; matPrev = matPanel.hover ? previewFor(matPanel.hover.i, matPanel.hover.j) : null; syncPalette(); if (act === 0) drawMatrix(); drawChain(); }
function syncPalette() {
  const anyPhase = BRUSHES.some((b) => b.kind === 'hop' && Math.abs(model.vals[b.id].phi) > 1e-9);
  if (anyPhase) showPhase = true;
  palRefs.phase.set(showPhase); palRefs.phase.input.disabled = anyPhase;
  for (const b of BRUSHES) {
    const ref = palRefs[b.id], v = model.vals[b.id];
    ref.chip.setAttribute('aria-pressed', String(brush === b.id));
    if (document.activeElement !== ref.amp) ref.amp.value = v.r;
    if (document.activeElement !== ref.out) ref.out.value = num(v.r);
    if (ref.ph) { if (document.activeElement !== ref.ph) ref.ph.value = v.phi; ref.pout.textContent = inPi(v.phi * Math.PI); ref.pout.title = `${b.name} = ${cstr(value(model, b.id))}`; for (const x of [ref.ph, ref.pout, ref.lab]) x.hidden = !showPhase; }
  }
  palRefs.erase.setAttribute('aria-pressed', String(brush === ERASE));
  palRefs.cell.setAttribute('aria-pressed', String(mode === 'cell')); palRefs.one.setAttribute('aria-pressed', String(mode === 'one'));
  palRefs.undo.disabled = !undoStack.length;
  palRefs.status.textContent = status;
}

// ---------- H(k) as a table of terms ----------
function hkDom() {
  const pane = panes.hk, { m } = model, T = blochTerms(model), B = D.bands;
  pane.innerHTML = '';
  const fs = [0, 1, -1, 2, -2].map((s) => { const b = button(s === 0 ? '1' : expoHtml(s), () => { factor = s; hkDom(); }, { kind: 'math', title: s === 0 ? 'partner in the same unit cell' : `partner ${Math.abs(s) === 1 ? 'one cell' : 'two cells'} to the ${s > 0 ? 'right' : 'left'}` }); b.setAttribute('aria-pressed', String(factor === s)); return b; });
  pane.append(el('div', { class: 'hk-row' }, [el('span', { class: 'lab', text: 'factor for the next click on an entry:' }), ...fs]));
  const grid = el('div', { class: 'hk-grid', style: `grid-template-columns: auto repeat(${m}, minmax(0, 1fr))` });
  grid.append(el('span')); for (let j = 0; j < m; j++) grid.append(el('span', { class: 'hd', text: SUBL[j] }));
  for (let i = 0; i < m; i++) {
    grid.append(el('span', { class: 'hd', text: SUBL[i] }));
    for (let j = 0; j < m; j++) {
      const cell = el('div', { class: `hk-cell${i === j ? ' diag' : ''}`, role: 'button', tabindex: '0', 'aria-label': `entry ${SUBL[i]}, ${SUBL[j]} of H(k): plug the selected coupling in`, title: 'click: plug the selected coupling in with the chosen factor (a second click takes it out)', onclick: () => plugK(i, j), onkeydown: (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); plugK(i, j); } } });
      if (!T[i][j].length) cell.append(el('span', { text: '0' }));
      T[i][j].forEach((t, q) => {
        if (q) cell.append(el('span', { text: '+' }));
        const b = brushOf(t.c), star = t.conj && isComplex(model, t.c) ? '*' : '';
        const x = el('button', { type: 'button', class: 'term-x', 'aria-label': `take ${b.name} out`, title: 'take this term out', onclick: (e) => { e.stopPropagation(); edit(() => { delete model.rules[t.key]; }, `${b.name} taken out of H(k).`); } }, '×');
        cell.append(el('span', { class: 'term', title: `${b.name}${star} = ${cstr(entryValue(t))}` }, [el('span', { class: `sw${b.kind === 'site' ? ' dot' : ''}`, style: `background: var(${b.token})` }), el('span', { html: `${b.name}${star}${t.s ? '·' + expoHtml(t.s) : ''}` }), x]));
      });
      grid.append(cell);
    }
  }
  pane.append(el('div', { class: 'hk-wrap' }, [el('span', { class: 'hk-label', html: 'H(<i>k</i>) =' }), el('span', { class: 'mat-br' }), grid, el('span', { class: 'mat-br mat-br-r' })]));
  const rows = B.ranges.map(([a, b], n) => `<tr><td>${n + 1}</td><td>${num(a)} … ${num(b)}</td><td>${B.zak[n] === null ? 'touches another band' : inPi(B.zak[n], 3)}</td></tr>`).join('');
  pane.append(el('table', { html: `<tr><th>band</th><th>E(k) from … to</th><th>Zak phase γ</th></tr>${rows}` }));
  pane.append(el('div', { class: 't why', text: 'Row α, column β: sublattice β couples into sublattice α. A partner in the same cell enters with 1, a partner s cells to the right with e^(iks). The Zak phase is γ = −arg ∏⟨u(kₛ)|u(kₛ₊₁)⟩ on 240 points of the Brillouin zone and depends on which sites are taken as the unit cell. Entries set by hand in the real-space matrix are defects and not part of H(k).' }));
}

// ---------- captions ----------
function realCaption() {
  const { N, m, ring } = model, nc = Math.floor(N / m), rest = N % m, nR = Object.keys(model.rules).length, nP = Object.keys(model.patches).length;
  if (!nR && !nP) return 'The matrix is empty. Pick a coupling on the left and click an entry below or above the diagonal, or click two sites of the chain.';
  const parts = [`${N} sites, ${m} per unit cell${rest ? ` (${count(nc, 'cell')} and ${count(rest, 'extra site')})` : ''}, ${ring ? 'closed to a ring' : 'open ends'}`];
  if (!D.real) parts.push('H is complex and Hermitian: the mirror entry is the complex conjugate (hatched)');
  parts.push(`bands of the infinite chain: ${D.bands.ranges.map(([a, b]) => (b - a < 1e-9 ? `E = ${num(a)} (flat)` : `[${num(a)}, ${num(b)}]`)).join(', ')}`);
  const ing = D.eig.values.map((_, i) => i).filter((i) => D.inGap[i]);
  if (!ing.length) parts.push('every eigenvalue lies inside a band');
  else {
    const groups = [];                                          // neighbours in the list that sit in the same place share one phrase
    for (const i of ing.slice(0, 6)) { const d = describeState(model, D.eig.vectors[i]), top = d.sub.indexOf(Math.max(...d.sub)), where = `${d.where}${m > 1 && d.sub[top] > 0.995 ? `, on ${SUBL[top]} sites only` : ''}`, g = groups[groups.length - 1]; if (g && g.where === where) g.E.push(D.eig.values[i]); else groups.push({ where, E: [D.eig.values[i]] }); }
    parts.push(`${count(ing.length, 'eigenvalue')} outside the bands (orange): ${groups.map((g) => `E = ${g.E.map((E) => num(E, 4)).join(', ')} ${g.where}`).join('; ')}${ing.length > 6 ? '; …' : ''}`);
  }
  return parts.join(' · ');
}
function kCaption() {
  const { m } = model, ch = D.chiral, B = D.bands, parts = [`H(k) is ${m} × ${m}: ${count(m, 'band')}`];
  if (!Object.keys(model.rules).length) return 'No coupling repeats from cell to cell yet. Pick one on the left and click an entry of H(k).';
  if (ch.chiral && ch.g1.length) {
    parts.push(`every term couples ${ch.g0.map((s) => SUBL[s]).join(', ')} to ${ch.g1.map((s) => SUBL[s]).join(', ')}: chiral symmetry, the bands are symmetric about E = 0`);
    if (ch.curve) parts.push(ch.nu === null ? `${ch.what} passes through the origin: the gap is closed and the winding number is not defined` : `${ch.what} goes around the origin ${Math.abs(ch.nu) === 1 ? 'once' : `${Math.abs(ch.nu)} times`}: winding number ν = ${num(ch.nu, 0)}${ch.nu ? `, so a chain of whole unit cells holds ${count(Math.abs(ch.nu), 'edge state')} at each end, at E ≈ 0` : ', so a chain of whole unit cells has no edge state at E ≈ 0'}`);
  } else if (ch.chiral) parts.push('every coupling of the unit cell is zero: the bands are flat');
  else parts.push(m === 1 ? 'one site per cell: H(k) is the band E(k) itself' : ch.why === 'loop' ? 'the couplings close a loop over an odd number of sublattices, so the sublattices do not split into two groups: no chiral symmetry, no winding number' : 'on-site energies or couplings inside one sublattice put terms on the diagonal of H(k): no chiral symmetry, no winding number');
  const z = B.zak.filter((g) => g !== null);
  if (z.length && m > 1) parts.push(`Zak phases of the bands: ${B.zak.map((g) => (g === null ? '—' : inPi(g))).join(', ')}${ch.chiral && ch.nu !== null && Math.abs(ch.nu) > 1 ? ' (the Zak phase is π·ν only modulo 2π: it cannot tell ν = 2 from ν = 0)' : ''}`);
  return parts.join(' · ');
}

// ---------- changing the model ----------
function refresh({ resel = false } = {}) {
  normalize(model);
  D = solve(model);
  const ing = D.inGap.indexOf(true);
  if (resel || sel < 0 || sel >= model.N) sel = ing >= 0 ? ing : 0;
  hoverN = -1; if (armed >= model.N) armed = -1;
  matPrev = act === 0 && matPanel.hover && matPanel.hover.i < model.N && matPanel.hover.j < model.N ? previewFor(matPanel.hover.i, matPanel.hover.j) : null; chainPrev = null;
  saved = JSON.stringify(model);
  try { localStorage.setItem(STORE, saved); } catch (e) { /* storage may be unavailable */ }
  syncPalette(); syncControls(); render();
}
function edit(change, say, opts) { undoStack.push(saved); if (undoStack.length > 100) undoStack.shift(); change(); if (say !== undefined) status = say; refresh(opts); }
function undo() { if (!undoStack.length) return; model = reviveModel(JSON.parse(undoStack.pop())); armed = -1; status = 'Undone.'; refresh(); }
const hints = { diag: 'A coupling connects two different sites, so it belongs off the diagonal. The diagonal takes an on-site energy (ε₁, ε₂).', offdiag: 'An on-site energy belongs on the diagonal: row i, column i.' };
function plug(i, j) {
  const before = saved, res = paint(model, i, j, brush, mode), B = bondOf(model, i, j), name = brush === ERASE ? '' : brushOf(brush).name;
  if (changes(res)) {
    undoStack.push(before);
    if (res === 'unpatched') status = `Entry (${i + 1}, ${j + 1}) follows the unit cell again.`;
    else if (mode === 'cell') status = res === 'set' ? `${name} plugged in: ${bondWords(B)}, in every unit cell.` : `Taken out: ${bondWords(B)}.`;
    else status = brush === ERASE ? `Entry (${i + 1}, ${j + 1}) and its mirror image set to 0.` : `${name} plugged into entry (${i + 1}, ${j + 1}) and its mirror image only: a defect.`;
    refresh();
  } else { status = hints[res] || (brush === ERASE ? 'Nothing to erase there.' : `${name} is already there.`); syncPalette(); }
}
function plugK(i, j) {
  const kind = brush === ERASE ? null : brushOf(brush).kind, B = bondKey(j, i, kind === 'site' ? 0 : -factor), before = saved, name = kind ? brushOf(brush).name : '';
  if (kind === 'site' && i !== j) { status = hints.offdiag; syncPalette(); return; }
  const res = paintRule(model, B, brush);
  if (res === 'set' || res === 'removed') { undoStack.push(before); status = res === 'set' ? `${name} plugged into H(k): ${bondWords(B)}.` : `Taken out of H(k): ${bondWords(B)}.`; refresh(); }
  else { status = res === 'diag' ? 'On the diagonal a coupling needs a factor e^(±ik) or e^(±2ik): it then connects a sublattice to itself in another cell.' : hints[res] || (brush === ERASE ? 'No term with this factor there. Click a term to take it out.' : `${name} is already there.`); syncPalette(); }
}
function loadPreset(id) { const p = PRESETS.find((x) => x.id === id); edit(() => { model = p.make(); armed = -1; }, p.note, { resel: true }); }

// ---------- views ----------
const acts = [
  {
    id: 'matrix', tab: '1 · real space', heading: 'Build a Hamiltonian: plug couplings into the matrix',
    lead: 'Pick a coupling, then click an entry of H or two sites of the chain. One click sets the bond in every unit cell, or in one entry only. Eigenvalues and eigenvectors follow every change.',
    panes: ['pal', 'mat', 'chain', 'eig', 'vec'], caption: realCaption,
    render() { drawMatrix(); drawChain(); drawEig(); drawVec(); },
  },
  {
    id: 'hk', tab: '2 · k-space', heading: 'The same model in k-space: H(k), bands, winding number',
    lead: 'A Bloch state ψ(α, n) = u_α·e^(ikn) reduces H to one small matrix H(k): one row and one column per site of the unit cell, one term per bond. Click an entry to plug a coupling in, or a term to take it out.',
    panes: ['pal', 'hk', 'chain', 'band', 'plane'], caption: kCaption,
    render() { hkDom(); drawChain(); drawBand(); drawPlane(); },
  },
];
const captionEl = $('caption'), ctl = $('controls');
function render() { const a = acts[act]; if (!D) return; a.render(); captionEl.textContent = a.caption(); }
function showAct(i) {
  act = Math.max(0, Math.min(acts.length - 1, i));
  const a = acts[act];
  $('stage').dataset.act = a.id; $('stage').dataset.plane = '0';
  for (const [key, p] of Object.entries(panes)) p.hidden = !a.panes.includes(key);
  $('heading').textContent = a.heading; $('lead').textContent = a.lead;
  document.querySelectorAll('.acts a').forEach((x, n) => x.classList.toggle('active', n === act));
  armed = -1; matPrev = null; chainPrev = null; hoverN = -1;
  render();
  location.hash = a.id;
}

// ---------- controls ----------
const group = (label, btns) => el('div', { class: 'group' }, [el('span', { class: 'group-label', text: label }), ...btns]);
const ctlRefs = {};
function buildControls() {
  ctl.innerHTML = '';
  ctlRefs.preset = el('select', { class: 'sel', id: 'preset', 'aria-label': 'start from a known model', onchange: (e) => { const id = e.target.value; e.target.value = ''; if (id) loadPreset(id); } },
    [el('option', { value: '', text: 'choose a model …' }), ...PRESETS.map((p) => el('option', { value: p.id, text: p.label }))]);
  ctlRefs.N = slider({ id: 'N', label: 'sites <i>N</i>', min: 2, max: N_MAX, step: 1, value: model.N, format: (v) => String(v), onInput: (v) => { beginDrag(); model.N = v; refresh(); } });
  ctlRefs.N.input.addEventListener('change', () => { dragging = false; });
  ctlRefs.m = [1, 2, 3, 4].map((v) => button(String(v), () => edit(() => { model.m = v; }, `${count(v, 'site')} per unit cell: ${SUBL.slice(0, v).join(', ')}.`, { resel: true })));
  ctlRefs.open = button('open', () => edit(() => { model.ring = false; }, 'Open ends: the chain stops at site 1 and at site N.', { resel: true }));
  ctlRefs.ring = button('ring', () => edit(() => { model.ring = true; }, 'A ring of whole unit cells: the last cell couples to the first. There are no ends and no edge states.', { resel: true }));
  ctlRefs.defects = button('remove defects', () => edit(() => { model.patches = {}; }, 'Every entry follows the unit cell again.'), { title: 'Take out every entry that was set by hand' });
  ctl.append(group('start from', [ctlRefs.preset]), ctlRefs.N.root, group('sites per unit cell', ctlRefs.m), group('ends', [ctlRefs.open, ctlRefs.ring]),
    button('clear', () => edit(() => { model.rules = {}; model.patches = {}; }, 'Empty matrix. Pick a coupling and click an entry.', { resel: true }), { title: 'Take every coupling out' }), ctlRefs.defects,
    button('Python', showCode, { title: 'The same matrix as a short numpy script' }));
  ctlRefs.zig = el('button', { type: 'button', class: 'pane-btn', 'aria-pressed': 'false', title: 'Draw the chain as a zigzag: odd sites in the upper row, even sites in the lower row. Only the drawing changes.', onclick: () => edit(() => { model.layout = model.layout === 'zigzag' ? 'line' : 'zigzag'; }) }, 'zigzag');
  panes.chain.append(ctlRefs.zig);
}
function syncControls() {
  if (document.activeElement !== ctlRefs.N.input) ctlRefs.N.set(model.N); else ctlRefs.N.root.querySelector('output').textContent = String(model.N);
  ctlRefs.N.input.step = model.ring ? model.m : 1;
  ctlRefs.m.forEach((b, i) => b.setAttribute('aria-pressed', String(model.m === i + 1)));
  ctlRefs.open.setAttribute('aria-pressed', String(!model.ring)); ctlRefs.ring.setAttribute('aria-pressed', String(model.ring));
  ctlRefs.zig.setAttribute('aria-pressed', String(model.layout === 'zigzag'));
  ctlRefs.defects.hidden = !Object.keys(model.patches).length;
}
const dialog = $('code-dialog');
function showCode() { $('code-text').textContent = toPython(model); $('code-copy').textContent = 'Copy'; if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); }
$('code-close').addEventListener('click', () => dialog.close());
$('code-copy').addEventListener('click', async () => {
  const text = $('code-text').textContent;
  try { await navigator.clipboard.writeText(text); $('code-copy').textContent = 'Copied'; } catch (e) {
    const sel2 = window.getSelection(), range = document.createRange(); range.selectNodeContents($('code-text')); sel2.removeAllRanges(); sel2.addRange(range);
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* selection stays for a manual copy */ }
    $('code-copy').textContent = ok ? 'Copied' : 'Selected: press Ctrl+C';
  }
});

// ---------- wiring ----------
matPanel.onHoverCell = (cell) => { matPrev = cell ? previewFor(cell.i, cell.j) : null; drawMatrix(); };
matPanel.onCell = (i, j) => plug(i, j);
chainPanel.onHoverSite = (s) => {
  const kind = brush === ERASE ? null : brushOf(brush).kind;
  chainPrev = s < 0 ? null : armed >= 0 && armed !== s ? previewFor(s, armed) : armed < 0 && kind === 'site' ? previewFor(s, s) : null;
  drawChain();
};
chainPanel.onSite = (s) => {
  const kind = brush === ERASE ? null : brushOf(brush).kind;
  if (s < 0) { if (armed >= 0) { armed = -1; status = ''; syncPalette(); drawChain(); } return; }
  if (kind === 'site') { plug(s, s); return; }
  if (armed < 0) { armed = s; status = brush === ERASE ? `Site ${s + 1} chosen. Click a second site to erase the bond between them, or the same site again to erase its on-site energy.` : `Site ${s + 1} chosen. Click a second site to connect the two with ${brushOf(brush).name}.`; syncPalette(); drawChain(); return; }
  const from = armed; armed = -1; chainPrev = null;
  plug(s, from); drawChain();
};
eigPlot.onClick = (n) => { sel = n; hoverN = -1; render(); };
eigPlot.onHover = (n) => { const v = n === null || n === undefined ? -1 : n; if (v !== hoverN) { hoverN = v; drawChain(); drawVec(); } };
vecPlot.onClick = (d) => { sel = d[1]; hoverN = -1; render(); };
vecPlot.onHover = (d) => { const v = d ? d[1] : -1; if (v !== hoverN) { hoverN = v; drawChain(); drawEig(); } };
[matPanel, chainPanel, planePanel, eigPlot, vecPlot, bandPlot].forEach((p) => { p.onRedraw = () => render(); });

acts.forEach((a, i) => $('acts').append(el('a', { href: '#' + a.id, text: a.tab, onclick: (e) => { e.preventDefault(); showAct(i); } })));
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey || dialog.open || e.target.matches('input, textarea, select')) return;
  if (e.key >= '1' && e.key <= String(BRUSHES.length)) pickBrush(BRUSHES[+e.key - 1].id);
  else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') pickBrush(ERASE);
  else if (e.key === 'Escape' && armed >= 0) { armed = -1; status = ''; syncPalette(); drawChain(); }
  else if (e.key === 'ArrowRight') showAct(act + 1);
  else if (e.key === 'ArrowLeft') showAct(act - 1);
});

// theme
const root = document.documentElement;
try { const th = localStorage.getItem('qsl-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('qsl-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  invalidateTheme(); kc = null; render();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) { invalidateTheme(); kc = null; render(); } });

buildPalette(); buildControls();
status = 'Pick a coupling below, then click an entry of the matrix or two sites of the chain. A second click takes it out again.';
const startId = (location.hash || '#matrix').slice(1);
act = Math.max(0, acts.findIndex((a) => a.id === startId));
refresh({ resel: true });
showAct(act);
window.addEventListener('hashchange', () => { const i = acts.findIndex((a) => a.id === location.hash.slice(1)); if (i >= 0 && i !== act) showAct(i); });
