// Step by step: one small question on the screen at a time, one picture next to it.
// Part "zak": the Zak phase of the SSH chain from h(k) = J₁ + J₂e^{ik} at four values of k.
import { Canvas2D, arrow } from '../lecture1/panels.js';
import { colors, invalidateTheme } from '../theme.js';
import { parse } from '../workbook/answers.js';

const $ = (id) => document.getElementById(id);
const TAU = 2 * Math.PI, STORE = 'qsl-steps-v1';
const KS = [0, Math.PI / 2, Math.PI, 1.5 * Math.PI];
const hOf = (k, J1, J2) => ({ re: J1 + J2 * Math.cos(k), im: J2 * Math.sin(k) });
const SETS = { A: { J1: 1, J2: 2 }, B: { J1: 2, J2: 1 } };
const points = (set) => KS.map((k) => hOf(k, SETS[set].J1, SETS[set].J2));
const phi2 = (Math.atan2(2, 1) * 180) / Math.PI;                    // angle of 1 + 2i in degrees

// ---------- the questions ----------
// type: info | complex | number | choice. pic(solved) says what the picture shows.
const pic = (o) => () => o;
const STEPS = [
  { type: 'info', title: 'The Zak phase in ten small questions', button: 'Start',
    html: `<p class="step-text">The SSH chain has two waveguides in every unit cell, A and B. The coupling J₁ = 1 acts inside the cell, the coupling J₂ = 2 between one cell and the next.</p>
      <p class="step-text">For every wavenumber k, one complex number describes the chain:</p>
      <div class="step-formula">h(k) = J₁ + J₂·e<sup>ik</sup> = 1 + 2·e<sup>ik</sup></div>
      <p class="step-text">You calculate h at four values of k. From these four numbers you read the Zak phase γ.</p>`,
    pic: pic({ set: 'A', n: 0 }) },
  { type: 'complex', text: 'Start with k = 0.', formula: 'h = 1 + 2·e<sup>i·0</sup>', ref: { re: 3, im: 0 },
    hint: 'e<sup>i·0</sup> = 1.', how: 'h = 1 + 2·1 = 3. The real part is 3, the imaginary part is 0.',
    after: 'h = 3 is the first point in the picture.', pic: (ok) => ({ set: 'A', n: ok ? 1 : 0 }) },
  { type: 'complex', text: 'Now k = π/2.', formula: 'h = 1 + 2·e<sup>iπ/2</sup>', ref: { re: 1, im: 2 },
    hint: 'e<sup>iπ/2</sup> = i.', how: 'h = 1 + 2·i. The real part is 1, the imaginary part is 2.',
    after: 'The second point.', pic: (ok) => ({ set: 'A', n: ok ? 2 : 1 }) },
  { type: 'complex', text: 'Now k = π.', formula: 'h = 1 + 2·e<sup>iπ</sup>', ref: { re: -1, im: 0 },
    hint: 'e<sup>iπ</sup> = −1.', how: 'h = 1 + 2·(−1) = −1. The real part is −1, the imaginary part is 0.',
    after: 'The third point lies left of the origin.', pic: (ok) => ({ set: 'A', n: ok ? 3 : 2 }) },
  { type: 'complex', text: 'Now k = 3π/2.', formula: 'h = 1 + 2·e<sup>i·3π/2</sup>', ref: { re: 1, im: -2 },
    hint: 'e<sup>i·3π/2</sup> = −i.', how: 'h = 1 + 2·(−i) = 1 − 2i. The real part is 1, the imaginary part is −2.',
    after: 'Four points. At k = 2π, h is back at 3. All values of h lie on a circle with centre J₁ = 1 and radius J₂ = 2.',
    pic: (ok) => ({ set: 'A', n: ok ? 4 : 3, circle: ok }) },
  { type: 'choice', text: 'k runs once from 0 to 2π. Follow h in the picture: 1 → 2 → 3 → 4 → 1.',
    ask: 'How many times does h go around the origin (the ring)?', options: ['0', '1', '2'], ref: '1',
    hint: 'The ring marks the origin. Does the path of h enclose it?',
    after: 'Once. This number is called the winding number of h.', pic: pic({ set: 'A', n: 4, circle: true }) },
  { type: 'number', text: 'Every complex number has an angle φ, counted from the positive real axis. Take the second point, h = 1 + 2i.',
    formula: 'tan φ = Im h / Re h = 2 / 1', label: 'φ =', unit: '°', ref: phi2, tol: 0.06,
    hint: 'φ = arctan 2. Set your calculator to degrees.', how: 'φ = arctan 2 = 63.43°.',
    after: 'The four angles are 0°, 63.43°, 180° and 296.57°.',
    pic: (ok) => ({ set: 'A', n: 4, circle: true, rays: ok ? [0, 1, 2, 3] : [1], arc: true }) },
  { type: 'number', text: 'From each point to the next the angle φ grows by a step: 63.43°, then 116.57°, then 116.57°, then 63.43°. The last step leads back to the first point.',
    label: 'sum of the four steps =', unit: '°', ref: 360, tol: 0.06,
    hint: '63.43 + 116.57 + 116.57 + 63.43.', how: '63.43° + 116.57° + 116.57° + 63.43° = 360°.',
    after: '360°: one full turn, because h goes around the origin once.',
    pic: pic({ set: 'A', n: 4, circle: true, rays: [0, 1, 2, 3], steps: true }) },
  { type: 'number', text: 'The Zak phase is half of this turn. The reason: the formula of the lecture, γ = −arg(⟨u₁|u₂⟩⟨u₂|u₃⟩⟨u₃|u₄⟩⟨u₄|u₁⟩), takes from every pair of neighbours half of its step of φ.',
    formula: 'γ = ½ · 360°', label: 'γ =', unit: '°', ref: 180, tol: 0.06,
    hint: 'Half of 360°.', how: 'γ = 360°/2 = 180°.',
    after: 'γ = 180° = π. The chain with J₂ &gt; J₁ has the Zak phase π.',
    pic: pic({ set: 'A', n: 4, circle: true, rays: [0, 1, 2, 3], steps: true }) },
  { type: 'choice', text: 'Now exchange the two couplings: J₁ = 2, J₂ = 1. The picture shows the four new points. The circle has its centre at 2 and the radius 1.',
    ask: 'How many times does h go around the origin now?', options: ['0', '1', '2'], ref: '0',
    hint: 'Is the ring inside the new circle?',
    after: 'Not at all. The four steps of φ now add up to 0°.', pic: pic({ set: 'B', n: 4, circle: true }) },
  { type: 'choice', text: 'The Zak phase is half of the total turn of φ.', ask: 'So the Zak phase of this chain is', options: ['0', 'π'], ref: '0',
    hint: 'The total turn of φ is 0°.',
    after: 'γ = 0. The rule: if h goes around the origin once, γ = π (J₂ &gt; J₁). If it does not, γ = 0 (J₁ &gt; J₂).',
    pic: pic({ set: 'B', n: 4, circle: true, rays: [0, 1, 2, 3] }) },
  { type: 'info', title: 'Done', end: true,
    html: `<p class="step-text">You have calculated both Zak phases of task 8: π for J₁ = 1, J₂ = 2 and 0 for J₁ = 2, J₂ = 1.</p>
      <p class="step-text">Next: let your code do the same with the overlap formula.</p>
      <p class="step-text step-end"><a href="code/zak_chern.py" download>zak_chern.py</a> with <a href="code/zak_chern_check.py" download>zak_chern_check.py</a> ·
      <a href="code/zak_chern.m" download>zak_chern.m</a> with <a href="code/zak_chern_check.m" download>zak_chern_check.m</a></p>`,
    pic: pic({ set: 'A', n: 4, circle: true, both: true }) },
];
const NQ = STEPS.filter((s) => s.type !== 'info').length;

// ---------- state ----------
let i = 0, tries = 0, howShown = false;
let solved = {};                                    // step index -> the typed values (array of strings)
function load() { try { const o = JSON.parse(localStorage.getItem(STORE) || '{}'); if (o && o.solved) { solved = o.solved; i = Math.min(STEPS.length - 1, Math.max(0, o.i | 0)); } } catch (e) { /* no storage */ } }
function save() { try { localStorage.setItem(STORE, JSON.stringify({ i, solved })); } catch (e) { /* no storage */ } }
const isSolved = (n) => STEPS[n].type === 'info' || Object.prototype.hasOwnProperty.call(solved, n);

// ---------- the picture ----------
const panel = new Canvas2D($('pic'));
function drawPic() {
  const c = colors(), ctx = panel.ctx, w = panel.w, h = panel.h, st = STEPS[i].pic(isSolved(i) && STEPS[i].type !== 'info');
  ctx.clearRect(0, 0, w, h);
  if (w < 80 || h < 80) return;
  const x0 = -1.9, x1 = 3.9, yr = 2.7, s = Math.min((w - 20) / (x1 - x0), (h - 20) / (2 * yr));
  const ox = (w - s * (x1 - x0)) / 2 - s * x0, oy = h / 2, X = (re) => ox + s * re, Y = (im) => oy - s * im;
  const font = (px, wt = 500) => `${wt} ${px}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-ui') || 'sans-serif'}`;
  // axes
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(x0), oy); ctx.lineTo(X(x1), oy); ctx.moveTo(ox, Y(-yr)); ctx.lineTo(ox, Y(yr)); ctx.stroke();
  ctx.fillStyle = c['fg-2']; ctx.font = font(12, 400); ctx.textBaseline = 'top';
  const cen = SETS[st.both ? 'A' : st.set];       // a tick label where the circle crosses the axis stands outside the circle
  for (const v of [-1, 1, 2, 3]) {
    const cross = !st.both && Math.abs(Math.abs(v - cen.J1) - cen.J2) < 1e-9, side = cross ? Math.sign(v - cen.J1) : 0;
    ctx.beginPath(); ctx.moveTo(X(v), oy - 3); ctx.lineTo(X(v), oy + 3); ctx.stroke();
    ctx.textAlign = side < 0 ? 'right' : side > 0 ? 'left' : 'center'; ctx.fillText(String(v).replace('-', '−'), X(v) + 5 * side, oy + 9);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const v of [-2, -1, 1, 2]) { ctx.beginPath(); ctx.moveTo(ox - 3, Y(v)); ctx.lineTo(ox + 3, Y(v)); ctx.stroke(); ctx.fillText(String(v).replace('-', '−'), ox - 7, Y(v)); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('Re h', X(x1), oy - 6); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Im h', ox + 8, Y(yr) + 2);
  const drawSet = (set, { n, circle, rays, arc, steps, faint }) => {
    const { J1, J2 } = SETS[set], P = points(set), col = set === 'A' ? c.psi : c.v2;
    if (circle) {
      ctx.save(); ctx.globalAlpha = faint ? 0.55 : 1; ctx.strokeStyle = col; ctx.lineWidth = 2.2; if (faint) ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(X(J1), oy, s * J2, 0, TAU); ctx.stroke(); ctx.restore();
      const a = Math.PI / 4, b = a + 0.16;         // a small arrow head: k grows counter-clockwise
      arrow(ctx, X(J1 + J2 * Math.cos(a)), Y(J2 * Math.sin(a)), X(J1 + J2 * Math.cos(b)), Y(J2 * Math.sin(b)), col, 2.2, 9);
    }
    if (rays) for (const m of rays) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.hpsi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(X(P[m].re), Y(P[m].im)); ctx.stroke(); ctx.restore(); }
    if (arc) { const a = Math.atan2(P[1].im, P[1].re); ctx.strokeStyle = c.hpsi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 30, 0, -a, true); ctx.stroke(); ctx.fillStyle = c.hpsi; ctx.font = font(15, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('φ', ox + 36 * Math.cos(a / 2), oy - 36 * Math.sin(a / 2)); }
    if (steps) {                                    // the four steps of φ, written between neighbouring rays
      const txt = ['63.43°', '116.57°', '116.57°', '63.43°'], mid = [0.553, 2.124, -2.124, -0.553], rad = [0.95, 0.62, 0.62, 0.95];
      ctx.font = font(s < 60 ? 11.5 : 12.5, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      txt.forEach((t, m) => {
        const x = ox + rad[m] * s * Math.cos(mid[m]), y = oy - rad[m] * s * Math.sin(mid[m]), tw = ctx.measureText(t).width;
        ctx.fillStyle = c.surface; ctx.fillRect(x - tw / 2 - 2, y - 8, tw + 4, 16); ctx.fillStyle = c.hpsi; ctx.fillText(t, x, y);
      });
    }
    for (let m = 0; m < n; m++) {
      const p = P[m], dx = p.re - J1, dy = p.im, L = Math.hypot(dx, dy) || 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p.re), Y(p.im), 6, 0, TAU); ctx.fill();
      if (!faint) { ctx.fillStyle = c.fg; ctx.font = font(14, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(m + 1), X(p.re) + (18 * dx) / L, Y(p.im) - (18 * dy) / L); }
    }
  };
  if (st.both) { drawSet('B', { n: 4, circle: true, faint: true }); drawSet('A', { n: 4, circle: true }); } else drawSet(st.set, st);
  // the origin: a ring
  ctx.fillStyle = c.surface; ctx.strokeStyle = c.fg; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(ox, oy, 7, 0, TAU); ctx.fill(); ctx.stroke();
  $('pic-cap').textContent = st.both ? 'Solid: J₁ = 1, J₂ = 2, around the origin once, γ = π. Dashed: J₁ = 2, J₂ = 1, not around the origin, γ = 0.'
    : `h(k) in the complex plane for J₁ = ${SETS[st.set].J1}, J₂ = ${SETS[st.set].J2}. The ring is the origin.${st.n ? ' The numbers count the points in the order of k.' : ''}`;
}
panel.onRedraw = drawPic;

// ---------- the card ----------
const card = $('card');
const qNumber = (n) => STEPS.slice(0, n + 1).filter((s) => s.type !== 'info').length;
function dots() { return `<div class="step-dots">${STEPS.map((s, n) => (s.type === 'info' ? '' : `<i class="${isSolved(n) ? 'done' : n === i ? 'now' : ''}"></i>`)).join('')}</div>`; }
function show(n) {
  i = Math.max(0, Math.min(STEPS.length - 1, n)); tries = 0; howShown = false; save();
  const s = STEPS[i], done = isSolved(i), vals = solved[i] || [];
  let html = '';
  if (s.type === 'info') {
    html += `<h2>${s.title}</h2>${s.html}<div class="step-nav">${i > 0 ? '<button class="btn link" id="back" type="button">← Back</button>' : ''}<span class="grow"></span>`;
    html += s.end ? '<button class="btn" id="again" type="button">Start again</button>' : `<button class="btn primary" id="next" type="button">${s.button || 'Next'} →</button>`;
    html += '</div>';
  } else {
    html += `<div class="step-count">Question ${qNumber(i)} of ${NQ}</div>${dots()}<p class="step-text">${s.text}</p>`;
    if (s.formula) html += `<div class="step-formula">${s.formula}</div>`;
    if (s.type === 'complex') html += `<div class="step-ask"><span>h =</span><input id="f0" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="real part of h" value="${vals[0] || ''}"><span>+</span><input id="f1" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="imaginary part of h" value="${vals[1] || ''}"><span>· i</span></div>`;
    if (s.type === 'number') html += `<div class="step-ask"><span>${s.label}</span><input id="f0" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${s.label}" value="${vals[0] || ''}"><span>${s.unit || ''}</span></div>`;
    if (s.type === 'choice') html += `<p class="step-text"><b>${s.ask}</b></p><div class="step-choice">${s.options.map((o) => `<button type="button" data-v="${o}" class="${done && o === s.ref ? 'ok' : ''}">${o}</button>`).join('')}</div>`;
    html += `<p class="step-msg${done ? ' ok' : ''}" id="msg">${done ? `<b>Right.</b> ${s.after}` : ''}</p><div id="how"></div>`;
    html += `<div class="step-nav"><button class="btn link" id="back" type="button">← Back</button><span class="grow"></span>`;
    if (s.type !== 'choice' && !done) html += '<button class="btn primary" id="check" type="button">Check</button>';
    if (done) html += '<button class="btn primary" id="next" type="button">Next →</button>';
    html += '</div>';
  }
  card.innerHTML = html;
  const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };
  on('back', () => show(i - 1)); on('next', () => show(i + 1)); on('check', check);
  on('again', () => { solved = {}; show(0); });
  card.querySelectorAll('.step-ask input').forEach((inp) => { if (done) { inp.classList.add('ok'); inp.readOnly = true; } inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (isSolved(i)) show(i + 1); else check(); } }); });
  card.querySelectorAll('.step-choice button').forEach((b) => b.addEventListener('click', () => choose(b)));
  const first = card.querySelector(done || s.type === 'info' ? '#next' : '.step-ask input, .step-choice button');
  if (first && s.type !== 'choice') first.focus({ preventScroll: true });
  drawPic();
}
function wrong(text) {
  const s = STEPS[i], msg = $('msg'); tries++;
  msg.className = 'step-msg no'; msg.innerHTML = `<b>Not yet.</b> ${text || s.hint}`;
  if (tries >= 2 && s.how && !howShown) { $('how').innerHTML = '<button class="btn" id="showhow" type="button">Show me how</button>'; $('showhow').addEventListener('click', () => { howShown = true; $('how').innerHTML = `<div class="step-how">${s.how}</div>`; }); }
}
function right(values) { solved[i] = values; show(i); }
const read = (id) => parse($(id).value, 'real');
function check() {
  const s = STEPS[i];
  if (s.type === 'complex') {
    const a = read('f0'), b = read('f1');
    if (a.state === 'empty' || b.state === 'empty') return wrong('Fill in both fields: the real part and the imaginary part. A part can be 0.');
    if (a.state !== 'ok' || b.state !== 'ok') return wrong('Type plain numbers, for example 2 or −1.');
    const ok = Math.abs(a.value - s.ref.re) <= 0.011 && Math.abs(b.value - s.ref.im) <= 0.011;
    if (ok) return right([$('f0').value, $('f1').value]);
    if (Math.abs(a.value - s.ref.im) <= 0.011 && Math.abs(b.value - s.ref.re) <= 0.011) return wrong('The two parts are exchanged: the real part comes first.');
    if (Math.abs(Math.abs(a.value) - Math.abs(s.ref.re)) <= 0.011 && Math.abs(Math.abs(b.value) - Math.abs(s.ref.im)) <= 0.011) return wrong(`Check the signs. ${s.hint}`);
    return wrong();
  }
  if (s.type === 'number') {
    const a = read('f0');
    if (a.state === 'empty') return wrong('Type your number into the field.');
    if (a.state !== 'ok') return wrong('Type a plain number, for example 63.4.');
    if (Math.abs(a.value - s.ref) <= s.tol) return right([$('f0').value]);
    if (s.unit === '°' && Math.abs((a.value * 180) / Math.PI - s.ref) <= 0.6) return wrong('This is the angle in radians. The field asks for degrees.');
    return wrong();
  }
}
function choose(btn) {
  const s = STEPS[i]; if (isSolved(i)) return;
  if (btn.dataset.v === s.ref) return right([s.ref]);
  btn.classList.add('no'); wrong();
}

// ---------- header: the part and the theme ----------
$('parts').innerHTML = '<a class="active" href="steps.html">Zak phase</a>';
const root = document.documentElement;
try { const th = localStorage.getItem('qsl-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
$('theme-btn').addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('qsl-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  invalidateTheme(); drawPic();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) { invalidateTheme(); drawPic(); } });

load();
while (i > 0 && !isSolved(i - 1)) i--;              // never land behind an open question
show(i);
