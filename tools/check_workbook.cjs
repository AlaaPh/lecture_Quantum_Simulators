// Browser test of the workbook page (app/workbook.html) in headless Chromium.
// Run from the repository root:   node tools/check_workbook.cjs [folder for the screenshots]
// It serves app/ on port 8771 for the time of the test. Exit code 1 if any check fails.
//
// For each tab, in light and dark theme, at 1280 x 800 and at 390 x 844 (a phone):
//   no console error, no page error, no horizontal overflow of the page, every visible canvas has something drawn;
//   the right value of every field is typed key by key: the field keeps the focus while typing, the tab does not
//   change, the verdict is "ok"; one catalogued wrong value gives its hint; "-0,2" and "−0.2" are read as −0.2;
//   "abc" is unreadable; a single overlap with the right length and another angle is answered as such;
//   after a reload the values are back and checked; Play on tab 3 advances the time.
// Then, with a recorder on the canvas calls (the texts, the arrow heads and the number of line points of every figure):
//   what a figure shows before its field is right (the dial, the curve gamma(t), its last dot), the two arrows of the
//   solid cycle of B8, Enter in front of a question with buttons, the unit rule of a field in units of pi, a prediction
//   after its result, the texts that the reviews asked for; the phone layout at 390 x 844 (each figure directly in front
//   of the step that needs it, Play and all five figures of tab 3 on one screen), Back and Forward, the place of each tab.
// Then: the page with a storage that is blocked or holds something unreadable, and the other pages of the app.
// The right values are taken from tools/zak_chern_numbers.json, rounded as a student would type them,
// not from the page: the test also shows that page and stored numbers agree.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.join(__dirname, '..'), PORT = 8771, BASE = `http://localhost:${PORT}/`;
const SHOTS = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'workbook_shots'));
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'zak_chern_numbers.json'), 'utf8'));
const STORE = 'qsl-workbook-v1';
const UNREADABLE = 'this is not a number. Write for example 12.5 or 3/8. A complex number goes into the two fields Re and Im.';
const OTHER_PHASE = 'right length, other angle. With the u of A1: check the signs and the star. With another phase factor on u this is not a mistake: go on, the closed product is the same and A3 checks it.';
const UNIT_PI = 'this field is in units of π: type the angle divided by π, a number between −2 and 2. For the angle 3π/4 type 0.75 or 3pi/4, not 135 and not 2.36.';
const NEAR = 'close, but not close enough: this looks like a rounding error. Calculate with four decimals and round only the number that you type.';

let passed = 0, failed = 0;
const failures = [];
function report(ok, label, detail = '') {
  if (ok) passed++; else { failed++; failures.push(label); }
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? '   ' + detail : ''}`);
}

// ---------- the right answers, as a student types them ----------
const f4 = (x) => (Math.abs(x) < 5e-5 ? 0 : x).toFixed(4);
const f2 = (x) => (Math.abs(x) < 5e-3 ? 0 : x).toFixed(2);
const c4 = (z) => [f4(z[0]), f4(z[1])];
const A = J.A.set1, A2 = J.A.set2, A7 = J.A.A7, B = J.B, gap = B.B2.t0375.ingap;
const ANSWERS = { hand: {}, code: {}, pump: {}, chern: {} };
for (let s = 2; s <= 4; s++) Object.assign(ANSWERS.hand, { [`A1-h${s}`]: c4(A.h[s - 1]), [`A1-phi${s}`]: [f2(A.phi_deg[s - 1])], [`A1-E${s}`]: [f4(A.E[s - 1])], [`A1-uA${s}`]: c4(A.uA[s - 1]) });
ANSWERS.hand['A1-wind'] = [String(A.winding)];
for (let s = 1; s <= 4; s++) Object.assign(ANSWERS.hand, { [`A2-ov${s}`]: c4(A.ov[s - 1]), [`A2-len${s}`]: [f4(A.ov_len[s - 1])], [`A2-ang${s}`]: [f2(A.ov_angle_deg[s - 1])] });
Object.assign(ANSWERS.hand, { 'A3-len': [f4(A.prod_len)], 'A3-sum': [f2(A.angle_sum_deg)], 'A3-prod': c4(A.prod), 'A3-gamma': [f4(A.gamma_over_pi)], 'A4-ov1': c4(A.A4.ov12), 'A4-ov2': c4(A.A4.ov23), 'A4-prod': c4(A.A4.prod), 'A5-wind': [String(A2.winding)] });
for (let s = 1; s <= 4; s++) ANSWERS.hand[`A5-ang${s}`] = [f2(A2.ov_angle_deg[s - 1])];
Object.assign(ANSWERS.hand, { 'A5-sum': [f2(A2.angle_sum_deg)], 'A5-gamma': [f4(A2.gamma_over_pi)] });
Object.assign(ANSWERS.code, {
  'A6-E': [f4(A.E[0])], 'A6-prod4': c4(A.prod), 'A6-prodrand': c4(A.prod), 'A6-prod100': c4(A.prod_M100), 'A6-gamma100': [f4(A.gamma_M100_over_pi)],
  'A7-exact': [f4(A7.exact.gamma_over_pi)], 'A7-wA': [f4(A7.exact.weight_A)], 'A7-s1-M4': [f4(A7.set1.M4_over_pi)], 'A7-s1-M100': [f4(A7.set1.M100_over_pi)], 'A7-s1-M400': [f4(A7.set1.M400_over_pi)], 'A7-s2-M400': [f4(A7.set2.M400_over_pi)],
});
Object.assign(ANSWERS.pump, {
  'B1-E0': [f4(B.B1.E.tq[0])], 'B1-E1': [f4(B.B1.E.tq[1])], 'B1-E2': [f4(B.B1.E.tq[2])], 'B1-gap': [f4(B.B1.gap_min)], 'B1-gapsheet': [f4(B.B1.gap_min_sheet)],
  'B2-Elow': [f4(gap[0].E)], 'B2-Eup': [f4(gap[1].E)],
  'B3-norm': [B.B3.norm_T20.toFixed(6)], 'B3-T20': [f4(B.B3.shift.T20)], 'B3-T50': [f4(B.B3.shift.T50)], 'B3-guide': [f4(B.B3.one_guide_T50)], 'B3-sheet': [f4(B.B3.sheet_T20_pair)],
  'B4-prod0': c4(B.B4.t0.prod), 'B4-g0': [f4(B.B4.t0.gamma_over_pi)], 'B4-prodh': c4(B.B4.thalf.prod), 'B4-gh': [f4(B.B4.thalf.gamma_over_pi)],
  'B5-quarter': [f4(B.B5.quarter_M400_over_pi)], 'B5-C': [String(B.B5.C)],
});
Object.assign(ANSWERS.chern, { 'B6-E': [f4(B.B6.E_kpi2_tq)], 'B6-c': [f4(B.B6.u_kpi_tq[0][0]), f4(B.B6.u_kpi_tq[1][0])], 'B6-a': [String(Math.round(B.B6.u_t0[0][0] * Math.SQRT2)), String(Math.round(B.B6.u_t0[1][0] * Math.SQRT2))] });
for (let i = 0; i < 4; i++) { ANSWERS.chern[`B6-ov${i + 1}`] = c4(B.B6.ov[i]); }
Object.assign(ANSWERS.chern, { 'B6-prod': c4(B.B6.prod), 'B6-F': [f4(B.B6.F_over_pi)] });
for (let j = 0; j < 4; j++) ANSWERS.chern[`B7-col${j + 1}`] = [f4(B.B7.col_sums_over_pi[j])];
Object.assign(ANSWERS.chern, { 'B7-total': [f4(B.B7.total_over_pi)], 'B7-C': [String(B.B7.C)], 'B7-C24': [String(B.B7.C_24)],
  'B8-c1': [String(B.B8.upper_band)], 'B8-c2': [String(B.B8.reversed_cycle)], 'B8-c3': [String(B.B8.not_enclosing)], 'B8-c4': [String(B.B8.sheet)] });
// the predictions (made first: they open the result fields) and the choices that are checked
const PREDICTIONS = { hand: { 'A3-pred': String(A.gamma_over_pi) }, code: {}, pump: { 'B5-pred': String(2 * B.B5.C) },
  chern: { 'B8-p1': String(B.B8.upper_band), 'B8-p2': String(B.B8.reversed_cycle), 'B8-p3': String(B.B8.not_enclosing), 'B8-p4': String(B.B8.sheet) } };
const CHOICES = { hand: {}, code: {}, pump: { 'B2-end': gap[1].end, 'B2-guide': gap[1].weight_A > 0.5 ? 'A' : 'B' }, chern: { 'B8-cross': String(gap.filter((g) => g.end === 'left').length) } };
// one catalogued wrong value per tab: [field, typed strings, a piece of the hint]
const i2 = [A.ov[1][1], A.ov[1][0]];                             // i·⟨u2|u3⟩: the right length, another angle, and not the conjugate
const WRONG = {
  hand: [['A3-prod', c4(A.open_prod), 'the loop is not closed'], ['A1-E2', [f4(-A.E[1])], 'this is the upper band'], ['A2-ov2', c4([A.ov[1][0], -A.ov[1][1]]), 'this is the complex conjugate of the overlap'], ['A3-gamma', ['0'], '0 and π are swapped']],
  code: [['A7-s1-M400', [f4(-A7.set1.M400_over_pi)], 'right size, wrong sign. One of: +arg in place of −arg; the upper band; e^(−ik) in h; −Δ on guide A.'], ['A7-s1-M400', [f4(A7.set1.M4_over_pi)], 'this is the value for four k points'], ['A6-prod4', c4(A.open_prod), 'the loop is not closed']],
  pump: [['B5-C', [String(B.B5.C_without_unwrap)], 'Use unwrap before you take γ(T) − γ(0)'], ['B3-T50', [f4(B.B3.one_guide_T50)], 'this is one guide alone as input']],
  chern: [['B7-total', ['0'], 'you took arg of the total product, or you added both bands'], ['B7-C', ['0'], 'you took arg of the total product'], ['B6-F', [f4(-B.B6.F_over_pi)], 'the square is walked the other way round']],
};
const OTHER = { hand: ['A2-ov2', c4(i2)] };                    // only where the phase of u is free: in A4 and B6 the vectors are fixed
const MINUS = { field: 'A3-prod', variants: ['-0,2', '−0.2'], im: '0' };       // −0.2 with a decimal comma, and with the minus sign U+2212
const TABS = ['hand', 'code', 'pump', 'chern'];
const PANE = { hand: 'wa', code: 'wb', pump: 'wc', chern: 'wd' };          // the pane that holds the steps of a tab
const inputId = (field, n, i, kind) => `f-${field}${n === 1 ? '' : kind === 'vector' ? `-${i}` : i === 0 ? '-re' : '-im'}`;

// ---------- the server ----------
function waitForServer(tries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get(BASE + 'workbook.html', (res) => { res.resume(); if (res.statusCode === 200) resolve(); else reject(new Error(`server answers ${res.statusCode}`)); });
      req.on('error', () => (n > 0 ? setTimeout(() => attempt(n - 1), 100) : reject(new Error(`no server on port ${PORT}`))));
    };
    attempt(tries);
  });
}

// ---------- helpers that run in the page ----------
// The recorder: every canvas keeps what was drawn on it since it was last cleared. texts: { t, x, y } in CSS pixels of the
// canvas; heads: the arrow heads (a filled triangle: its tip and the direction it points to); lines: number of lineTo calls.
const RECORDER = () => {
  const P = CanvasRenderingContext2D.prototype;
  const log = (ctx) => ctx.canvas.__log || (ctx.canvas.__log = { texts: [], heads: [], lines: 0, path: [] });
  const wrap = (name, fn) => { const orig = P[name]; P[name] = function (...a) { fn(this, a); return orig.apply(this, a); }; };
  const at = (ctx, x, y) => { const m = ctx.getTransform(), k = ctx.canvas.width / (ctx.canvas.clientWidth || ctx.canvas.width); return [(m.a * x + m.c * y + m.e) / k, (m.b * x + m.d * y + m.f) / k]; };
  wrap('clearRect', (ctx, [x, y, w]) => { if (x === 0 && y === 0 && w >= ctx.canvas.clientWidth - 1) { const l = log(ctx); l.texts = []; l.heads = []; l.lines = 0; l.path = []; } });
  wrap('fillText', (ctx, [t, x, y]) => { const [X, Y] = at(ctx, x, y); log(ctx).texts.push({ t: String(t), x: X, y: Y }); });
  wrap('beginPath', (ctx) => { log(ctx).path = []; });
  wrap('moveTo', (ctx, [x, y]) => { log(ctx).path.push(['M', ...at(ctx, x, y)]); });
  wrap('lineTo', (ctx, [x, y]) => { const l = log(ctx); l.path.push(['L', ...at(ctx, x, y)]); l.lines++; });
  wrap('closePath', (ctx) => { log(ctx).path.push(['Z']); });
  wrap('fill', (ctx) => { const l = log(ctx), q = l.path; if (q.length === 4 && q[0][0] === 'M' && q[1][0] === 'L' && q[2][0] === 'L' && q[3][0] === 'Z') l.heads.push({ x: q[0][1], y: q[0][2], dx: q[0][1] - (q[1][1] + q[2][1]) / 2, dy: q[0][2] - (q[1][2] + q[2][2]) / 2 }); });
};
const drawn = (page, pane) => page.evaluate((id) => { const cv = document.querySelector(`#${id} canvas`), l = cv.__log || { texts: [], heads: [], lines: 0 }; return { texts: l.texts, heads: l.heads, lines: l.lines, w: cv.clientWidth, h: cv.clientHeight }; }, pane);
const textsOf = async (page, pane) => (await drawn(page, pane)).texts.map((x) => x.t);
const rectOf = (page, sel) => page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width }; }, sel);
const stateOf = (page, field) => page.evaluate((id) => { const e = document.querySelector(`[data-field="${id}"]`); return e ? { state: e.dataset.state, msg: e.querySelector('.wb-msg').textContent, kind: [...e.classList].find((c) => /^wb-(real|value|angle|integer|complex|vector|choice)$/.test(c)).slice(3) } : null; }, field);
const activeId = (page) => page.evaluate(() => document.activeElement && document.activeElement.id);
const overflow = (page) => page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
// every visible canvas has pixels that are not transparent
const emptyCanvases = (page) => page.evaluate(() => [...document.querySelectorAll('.pane:not([hidden]) canvas')].filter((cv) => {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
  return n < 200;
}).map((cv) => cv.parentElement.id));

async function typeField(page, tab, field, strings, { perKey }) {
  const st = await stateOf(page, field);
  if (!st) return { ok: false, why: 'no such field on the page' };
  let focusKept = true, tabKept = true;
  for (let i = 0; i < strings.length; i++) {
    const id = inputId(field, strings.length, i, st.kind), box = page.locator(`#${id}`);
    await box.click();
    await box.fill('');
    if (perKey) {
      for (const ch of strings[i]) {
        await box.pressSequentially(ch);
        const now = await page.evaluate(() => [document.activeElement && document.activeElement.id, location.hash]);
        if (now[0] !== id) focusKept = false;
        if (now[1] !== '#' + tab) tabKept = false;
      }
    } else {
      await box.pressSequentially(strings[i]);
      if ((await activeId(page)) !== id) focusKept = false;
    }
    if ((await box.inputValue()) !== strings[i]) return { ok: false, why: `the field holds "${await box.inputValue()}" after typing "${strings[i]}"` };
    await box.press('Enter');
  }
  if ((await page.evaluate(() => location.hash)) !== '#' + tab) tabKept = false;
  const after = await stateOf(page, field);
  return { ok: focusKept && tabKept, state: after.state, msg: after.msg, focusKept, tabKept };
}
const choose = (page, field, value) => page.locator(`[data-field="${field}"] button[data-value="${value}"]`).click();

// ---------- one pass: a theme and a window size ----------
async function pass(browser, theme, width, height, { first, shots }) {
  const name = `${theme}, ${width} x ${height}`;
  console.log(`\n${name}`);
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('requestfailed', (r) => { if (!/favicon/.test(r.url())) errors.push(`request failed: ${r.url()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`status ${r.status()}: ${r.url()}`); });

  for (const tab of TABS) {
    await page.goto(`${BASE}workbook.html#${tab}`);
    await page.waitForSelector(`#pane-${PANE[tab]} .wb-step`);
    await page.waitForTimeout(250);
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const [sw, iw] = await overflow(page);
    report(sw <= iw, `${name}, tab ${tab}: no horizontal overflow`, `scrollWidth ${sw}, innerWidth ${iw}, background ${dark}`);
    const row = await page.evaluate(() => { const n = document.getElementById('acts'); return [n.scrollWidth, n.clientWidth, [...n.children].every((a) => a.getBoundingClientRect().right <= window.innerWidth)]; });
    if (tab === 'hand') report(row[0] <= row[1] && row[2], `${name}: all four tabs are visible in the header`, `the tab row needs ${row[0]} px and has ${row[1]} px`);
    const blank = await emptyCanvases(page);
    report(blank.length === 0, `${name}, tab ${tab}: every figure has something drawn`, blank.length ? `empty: ${blank.join(', ')}` : '');

    // the fields of the page and the fields of the table are the same
    const onPage = await page.evaluate((pane) => [...document.querySelectorAll(`#${pane} [data-field]`)].map((e) => e.dataset.field), `pane-${PANE[tab]}`);
    const inTable = [...Object.keys(ANSWERS[tab]), ...Object.keys(PREDICTIONS[tab]), ...Object.keys(CHOICES[tab])];
    const missing = onPage.filter((f) => !inTable.includes(f)), extra = inTable.filter((f) => !onPage.includes(f));
    report(missing.length === 0 && extra.length === 0, `${name}, tab ${tab}: the test knows every field of the tab`, `${onPage.length} fields${missing.length ? `, not in the test: ${missing.join(' ')}` : ''}${extra.length ? `, not on the page: ${extra.join(' ')}` : ''}`);

    // every field: a text input without help from the browser, 16 px on a phone (below that iOS zooms into the field)
    const boxes = await page.evaluate((pane) => [...document.querySelectorAll(`#${pane} input`)].map((e) => ({ id: e.id, ok: e.type === 'text' && e.getAttribute('autocomplete') === 'off' && e.getAttribute('autocapitalize') === 'off' && e.getAttribute('spellcheck') === 'false' && !!e.getAttribute('aria-label'), size: parseFloat(getComputedStyle(e).fontSize) })), `pane-${PANE[tab]}`);
    const badBoxes = boxes.filter((b) => !b.ok || (width <= 980 && b.size < 16));
    report(boxes.length > 0 && badBoxes.length === 0, `${name}, tab ${tab}: ${boxes.length} inputs of type text, autocomplete, autocapitalize and spellcheck off${width <= 980 ? ', font size 16 px' : ''}`, badBoxes.length ? badBoxes.map((b) => `${b.id} ${b.size}px`).join(' ') : `font size ${boxes[0].size} px`);
    // predictions first: the result fields behind them are closed until then
    for (const [pred, value] of Object.entries(PREDICTIONS[tab])) {
      const gated = { 'A3-pred': 'f-A3-len', 'B5-pred': 'f-B5-quarter', 'B8-p1': 'f-B8-c1', 'B8-p2': 'f-B8-c2', 'B8-p3': 'f-B8-c3', 'B8-p4': 'f-B8-c4' }[pred];
      const before = await page.locator(`#${gated}`).isVisible();
      await choose(page, pred, value);
      const after = await page.locator(`#${gated}`).isVisible();
      report(!before && after, `${name}, tab ${tab}: ${pred} opens its result field`, `visible before ${before}, after ${after}`);
    }
    // every field, key by key
    const bad = [];
    let count = 0, keys = 0;
    for (const [field, strings] of Object.entries(ANSWERS[tab])) {
      const r = await typeField(page, tab, field, strings, { perKey: first });
      count++; keys += strings.join('').length;
      if (!r.ok || r.state !== 'ok') bad.push(`${field} "${strings.join(' | ')}": ${r.why || `state ${r.state}${r.focusKept === false ? ', focus lost' : ''}${r.tabKept === false ? ', tab changed' : ''}${r.msg ? `, "${r.msg}"` : ''}`}`);
    }
    report(bad.length === 0, `${name}, tab ${tab}: ${count} fields typed ${first ? 'key by key' : 'and entered'}, all right, focus and tab kept`, bad.length ? bad.join('; ') : `${keys} keys`);
    for (const [field, value] of Object.entries(CHOICES[tab])) {
      await choose(page, field, value);
      const st = await stateOf(page, field);
      report(st.state === 'ok', `${name}, tab ${tab}: choice ${field} = ${value}`, `state ${st.state}`);
    }
    const progress = await page.locator('#progress').innerText();
    const total = Object.keys(ANSWERS[tab]).length + Object.keys(CHOICES[tab]).length;
    report(progress === `right: ${total} of ${total}`, `${name}, tab ${tab}: counter`, `"${progress}"`);
    const [sw2, iw2] = await overflow(page);
    report(sw2 <= iw2, `${name}, tab ${tab}: no horizontal overflow with all fields filled`, `scrollWidth ${sw2}, innerWidth ${iw2}`);
    const blank2 = await emptyCanvases(page);
    report(blank2.length === 0, `${name}, tab ${tab}: every figure has something drawn with all fields right`, blank2.length ? `empty: ${blank2.join(', ')}` : '');
    if (shots.includes(tab)) {
      await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); document.querySelectorAll('.wb-steps').forEach((e) => { e.scrollTop = 0; }); });
      await page.waitForTimeout(150);
      const file = path.join(SHOTS, `workbook_${tab}_${width}_${theme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`        screenshot ${file}`);
    }

    // a redraw does not rebuild a field: a mark on the input node survives a theme switch and a new window size
    const probe = inputId(Object.keys(ANSWERS[tab])[0], ANSWERS[tab][Object.keys(ANSWERS[tab])[0]].length, 0, 'x');
    await page.evaluate((id) => { document.getElementById(id).dataset.probe = 'kept'; }, probe);
    await page.click('#theme-btn'); await page.waitForTimeout(80);
    const themeNow = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.setViewportSize({ width: width - 20, height }); await page.waitForTimeout(120);
    await page.setViewportSize({ width, height }); await page.waitForTimeout(120);
    await page.click('#theme-btn'); await page.waitForTimeout(80);
    const kept = await page.evaluate((id) => document.getElementById(id).dataset.probe, probe);
    report(kept === 'kept' && themeNow === (theme === 'dark' ? 'light' : 'dark'), `${name}, tab ${tab}: fields survive redraws (theme button, new window size)`, `theme after one click: ${themeNow}`);
    await page.evaluate(() => { try { localStorage.removeItem('qsl-theme'); } catch (e) { /* ignore */ } document.documentElement.removeAttribute('data-theme'); });

    // the formula of the first step opens and holds no field
    const step = await page.evaluate((pane) => document.querySelector(`#${pane} .wb-formula-btn`).id.slice(5), `pane-${PANE[tab]}`);
    await page.click(`#show-${step}`);
    const formula = await page.evaluate((s) => { const b = document.getElementById(`formula-${s}`); return { hidden: b.hidden, lines: b.querySelectorAll('code').length, inputs: b.querySelectorAll('input').length }; }, step);
    await page.click(`#show-${step}`);
    report(!formula.hidden && formula.lines > 0 && formula.inputs === 0, `${name}, tab ${tab}: "show the formula" of ${step}`, `${formula.lines} lines`);

    // wrong values with their hints, unreadable text, another phase, the two ways to write −0.2
    for (const [field, strings, piece] of WRONG[tab]) {
      const r = await typeField(page, tab, field, strings, { perKey: false });
      report(r.state === 'wrong' && r.msg.includes(piece), `${name}, tab ${tab}: wrong value ${strings.join(' | ')} in ${field} gives its hint`, `state ${r.state}, "${r.msg}"`);
      const back = await typeField(page, tab, field, ANSWERS[tab][field], { perKey: false });
      if (back.state !== 'ok') report(false, `${name}, tab ${tab}: ${field} right again`, `state ${back.state}`);
    }
    const firstField = Object.keys(ANSWERS[tab])[0];
    const abc = await typeField(page, tab, firstField, ANSWERS[tab][firstField].map((s, i) => (i === 0 ? 'abc' : s)), { perKey: false });
    report(abc.state === 'unreadable' && abc.msg === UNREADABLE, `${name}, tab ${tab}: "abc" in ${firstField} is unreadable, not wrong`, `state ${abc.state}, "${abc.msg}"`);
    await typeField(page, tab, firstField, ANSWERS[tab][firstField], { perKey: false });
    if (OTHER[tab]) {
      const [field, strings] = OTHER[tab];
      const r = await typeField(page, tab, field, strings, { perKey: false });
      report(r.state === 'other-phase' && r.msg === OTHER_PHASE, `${name}, tab ${tab}: ${strings.join(' | ')} in ${field} has the right length and another angle`, `state ${r.state}, "${r.msg}"`);
      await typeField(page, tab, field, ANSWERS[tab][field], { perKey: false });
    }
    if (tab === 'hand') {
      for (const v of MINUS.variants) {
        const r = await typeField(page, tab, MINUS.field, [v, MINUS.im], { perKey: first });
        report(r.ok && r.state === 'ok', `${name}, tab ${tab}: "${v}" is read as −0.2 in ${MINUS.field}`, `state ${r.state}`);
      }
      await typeField(page, tab, MINUS.field, ANSWERS.hand[MINUS.field], { perKey: false });
      // an empty field is not a wrong try, and a field is not checked while a key is typed
      const box = page.locator('#f-A1-wind');
      await box.click(); await box.fill(''); await box.press('Enter');
      const empty = await stateOf(page, 'A1-wind');
      await box.pressSequentially('7');
      const typing = await stateOf(page, 'A1-wind');
      await box.press('Enter');
      const entered = await stateOf(page, 'A1-wind');
      report(empty.state === 'empty' && empty.msg === '' && typing.state === 'editing' && entered.state === 'wrong', `${name}, tab ${tab}: empty is not wrong; no verdict before Enter`, `empty: ${empty.state}, while typing: ${typing.state}, after Enter: ${entered.state}`);
      await typeField(page, tab, 'A1-wind', ANSWERS.hand['A1-wind'], { perKey: false });
      // keys in a field do not reach the page: arrows and space type, they do not change the tab
      await box.click(); await box.press('ArrowRight'); await box.press('ArrowLeft'); await box.press('Space'); await box.press('Backspace');
      const hashField = await page.evaluate(() => location.hash);
      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press('ArrowRight');
      const hashBody = await page.evaluate(() => location.hash);
      await page.keyboard.press('ArrowLeft');
      const hashBack = await page.evaluate(() => location.hash);
      report(hashField === '#hand' && hashBody === '#code' && hashBack === '#hand', `${name}: arrow keys change the tab only outside a field`, `in a field ${hashField}, outside ${hashBody}, back ${hashBack}`);
      await typeField(page, tab, 'A1-wind', ANSWERS.hand['A1-wind'], { perKey: false });
    }
    if (tab === 'pump') {
      const t0 = Number(await page.locator('#ts').inputValue());
      await page.click('#play'); await page.waitForTimeout(700);
      const t1 = Number(await page.locator('#ts').inputValue()), label = await page.locator('#play').innerText(), clock = await page.locator('#time').innerText();
      await page.click('#play');
      const t2 = Number(await page.locator('#ts').inputValue()); await page.waitForTimeout(250);
      const t3 = Number(await page.locator('#ts').inputValue());
      report(t1 > t0 + 0.01 && label === 'Pause' && t3 === t2, `${name}, tab pump: Play advances the time, Pause stops it`, `t/T ${t0} -> ${t1.toFixed(3)} in 0.7 s, "${clock}", then ${t2.toFixed(3)} and ${t3.toFixed(3)}`);
      // the space bar plays, but not while a field has the focus
      const e0 = page.locator('#f-B1-E0');
      await e0.click(); await e0.press('End'); await e0.press('Space');
      const inField = [await page.locator('#play').innerText(), await e0.inputValue()];
      await e0.press('Backspace'); await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press('Space'); const outside = await page.locator('#play').innerText();
      await page.keyboard.press('Space'); const again = await page.locator('#play').innerText();
      report(inField[0] === 'Play' && inField[1] === ANSWERS.pump['B1-E0'][0] + ' ' && outside === 'Pause' && again === 'Play', `${name}, tab pump: the space bar plays only outside a field`, `in the field: button "${inField[0]}", text "${inField[1]}"; outside: "${outside}", then "${again}"`);
      const e0state = await stateOf(page, 'B1-E0');
      if (e0state.state !== 'ok') report(false, `${name}, tab pump: B1-E0 right again after the space test`, e0state.state);
      // every setting of the pump draws without an error
      const before = errors.length;
      for (const T of [1, 2, 0]) for (const input of ['in-guide', 'in-pair']) for (const sheet of [true, false]) {
        await page.evaluate((v) => { const e = document.getElementById('T'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, T);
        await page.click(`#${input}`);
        if ((await page.locator('#sheet').getAttribute('aria-pressed')) !== String(sheet)) await page.click('#sheet');
        await page.evaluate((v) => { const e = document.getElementById('ts'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, 0.6);
      }
      const blankPump = await emptyCanvases(page);
      report(errors.length === before && blankPump.length === 0, `${name}, tab pump: T = 20, 50, 100, both inputs, both sets of numbers`, `caption: ${(await page.locator('#caption').innerText()).slice(0, 96)} …`);
      await page.click('#restart');
    }
  }

  // reload: the typed values are back and are checked again, on all four tabs
  await page.goto(`${BASE}workbook.html#hand`); await page.reload(); await page.waitForTimeout(300);
  const lost = [];
  for (const tab of TABS) {
    await page.click(`#acts a[href="#${tab}"]`); await page.waitForTimeout(120);
    const got = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pane:not([hidden]) [data-field]')].map((e) => [e.dataset.field, { state: e.dataset.state, values: [...e.querySelectorAll('input')].map((i) => i.value), pressed: [...e.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.value) }])));
    for (const [field, strings] of Object.entries(ANSWERS[tab])) if (!got[field] || got[field].state !== 'ok' || got[field].values.join('|') !== strings.join('|')) lost.push(`${field}: ${JSON.stringify(got[field])}`);
    for (const [field, value] of Object.entries(CHOICES[tab])) if (!got[field] || got[field].state !== 'ok' || got[field].pressed[0] !== value) lost.push(`${field}: ${JSON.stringify(got[field])}`);
    for (const [field, value] of Object.entries(PREDICTIONS[tab])) if (!got[field] || got[field].state !== 'chosen' || got[field].pressed[0] !== value) lost.push(`${field}: ${JSON.stringify(got[field])}`);
  }
  const stored = await page.evaluate((key) => { const o = JSON.parse(localStorage.getItem(key)); return [Object.keys(o.text).length, Object.keys(o.choice).length]; }, STORE);
  report(lost.length === 0, `${name}: after a reload all values are back and right again`, lost.length ? lost.slice(0, 6).join('; ') : `stored under ${STORE}: ${stored[0]} strings, ${stored[1]} choices`);

  // reset asks once: "cancel" keeps everything, "ok" clears everything
  await page.click('#acts a[href="#hand"]');
  let asked = 0;
  page.once('dialog', (d) => { asked++; d.dismiss(); });
  await page.click('#reset');
  const kept = await page.locator('#f-A3-gamma').inputValue();
  page.once('dialog', (d) => { asked++; d.accept(); });
  await page.click('#reset');
  const cleared = await page.evaluate((key) => ({ value: document.getElementById('f-A3-gamma').value, states: [...document.querySelectorAll('[data-field]')].filter((e) => e.dataset.state !== 'empty').length, store: localStorage.getItem(key), gate: document.getElementById('f-A3-len').offsetParent === null }), STORE);
  report(asked === 2 && kept === ANSWERS.hand['A3-gamma'][0] && cleared.value === '' && cleared.states === 0 && cleared.store === null && cleared.gate, `${name}: reset asks once; cancel keeps the values, ok clears them`, `after cancel "${kept}", after ok "${cleared.value}", fields with a verdict ${cleared.states}, result fields of A3 closed again: ${cleared.gate}`);

  report(errors.length === 0, `${name}: no console error, no page error, no failed request`, errors.slice(0, 5).join(' | '));
  await context.close();
}

// ---------- the findings of the reviews: one check for each ----------
// the title of every visible figure fits into its canvas (titles are drawn at the top, in 600 12px)
const cutTitles = (page) => page.evaluate(() => [...document.querySelectorAll('.pane:not([hidden]) canvas')].flatMap((cv) => {
  const ctx = cv.getContext('2d'), font = `600 12px ${getComputedStyle(document.documentElement).getPropertyValue('--font-ui') || 'sans-serif'}`;
  return ((cv.__log || { texts: [] }).texts).filter((x) => x.y < 10 && /[a-z]/.test(x.t)).map((x) => { ctx.save(); ctx.font = font; const w = ctx.measureText(x.t).width; ctx.restore(); return x.x + w > cv.clientWidth + 0.5 ? `${cv.parentElement.id}: "${x.t}" needs ${Math.round(x.x + w)} px of ${cv.clientWidth}` : null; }).filter(Boolean);
}));

async function findings(browser) {
  console.log('\nreview findings at 1280 x 800: what a figure shows and when, Enter, units, rounding, predictions, texts');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
  await context.addInitScript(RECORDER);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  const open = async (tab) => { await page.click(`#acts a[href="#${tab}"]`); await page.waitForSelector(`#pane-${PANE[tab]} .wb-step`); await page.waitForTimeout(200); };
  const type = (tab, field, strings = ANSWERS[tab][field]) => typeField(page, tab, field, strings, { perKey: false });
  const caption = () => page.locator('#caption').innerText();
  const inPane = async (sel, tab) => { const r = await rectOf(page, sel), q = await rectOf(page, `#pane-${PANE[tab]}`); return !!r && r.height > 0 && r.top >= q.top - 1 && r.bottom <= q.bottom + 1; };
  const paneText = (tab) => page.locator(`#pane-${PANE[tab]}`).innerText();
  const titles = [];

  // ----- tab 1 -----
  await page.goto(`${BASE}workbook.html#hand`); await page.waitForSelector('#pane-wa .wb-step'); await page.waitForTimeout(250);
  const bad = await type('hand', 'A1-h2', ['1+2i', '0']);
  report(bad.state === 'unreadable' && bad.msg === UNREADABLE && !/0\.7236|1\/4/.test(bad.msg), 'unreadable input "1+2i": the message says where a complex number goes, and its example numbers are no results', `"${bad.msg}"`);
  for (const f of Object.keys(ANSWERS.hand).filter((x) => /^A[12]-/.test(x) && x !== 'A2-ang4')) await type('hand', f);
  const last = await type('hand', 'A2-ang4');
  const focus1 = await activeId(page), predSeen = await inPane('[data-field="A3-pred"]', 'hand');
  const dial1 = await textsOf(page, 'pane-wturn'), cap1 = await caption();
  report(last.state === 'ok' && focus1 === 'f-A2-ang4' && predSeen, 'Enter on the last field of A2: the focus does not jump over the prediction of A3, and the question is in view', `focus in ${focus1}, buttons of A3-pred in view: ${predSeen}`);
  report(dial1.includes('3 of 4 turns') && !dial1.some((t) => /180\.00|4 of 4|γ =/.test(t)) && /3 of 4 turns for J₁ = 1/.test(cap1) && /it appears when your sum of the four −arg is right/.test(cap1),
    'dial with all four angles of A2 right and no sum typed: three turns, no sum of the angles, no gamma', `texts under the dials: ${dial1.filter((t) => /turn/.test(t)).join(' | ')}`);
  await choose(page, 'A3-pred', '0');
  await page.keyboard.press('ArrowRight');
  const hashKey = await page.evaluate(() => location.hash);
  report(hashKey === '#hand', 'an arrow key after a click on a prediction does not change the tab', `address ${hashKey}`);
  await page.locator('#f-A2-ang4').click(); await page.locator('#f-A2-ang4').press('Enter');
  const focus2 = await activeId(page);
  report(focus2 === 'f-A3-len', 'with the prediction made, Enter goes on to the next field', `focus in ${focus2}`);
  // rounding: numbers that follow from two typed decimals are right; a value a little further away is a rounding error
  const r1 = await type('hand', 'A2-ov1', ['0.73', '-0.45']), r2 = await type('hand', 'A2-ang1', ['32.01']), r3 = await type('hand', 'A2-ov1', ['0.76', '-0.45']);
  report(r1.state === 'ok' && r2.state === 'ok' && r3.state === 'wrong' && r3.msg === NEAR, 'A2 with numbers from two typed decimals: 0.73 − 0.45i and 32.01° are right; 0.76 − 0.45i is called a rounding error, not another phase', `${r1.state}, ${r2.state}, ${r3.state}: "${r3.msg}"`);
  await type('hand', 'A2-ov1'); await type('hand', 'A2-ang1');
  await type('hand', 'A3-len');
  const u1 = await type('hand', 'A3-gamma', ['180']), u2 = await type('hand', 'A3-gamma', ['3.14']), u3 = await type('hand', 'A3-gamma', ['-1']);
  report(u1.state === 'wrong' && u1.msg === UNIT_PI && u2.state === 'wrong' && u2.msg === UNIT_PI && u3.state === 'ok', 'gamma of A3 in units of pi: 180 and 3.14 are wrong with the message about the unit, −1 is right', `180: ${u1.state}, 3.14: ${u2.state}, −1: ${u3.state}; "${u1.msg}"`);
  const dial2 = await textsOf(page, 'pane-wturn');
  await type('hand', 'A3-sum');
  const dial3 = await textsOf(page, 'pane-wturn');
  await type('hand', 'A3-prod'); await type('hand', 'A3-gamma');
  const dial4 = await textsOf(page, 'pane-wturn');
  report(dial2.includes('3 of 4 turns') && !dial2.some((t) => /180\.00|γ =/.test(t)) && dial3.includes('4 of 4 turns: 180.00° → γ = π') && dial4.includes('4 of 4 turns: 180.00° → γ = π'),
    'dial: the fourth turn and the sum appear when the sum of A3 is right (gamma was typed before)', `before the sum: ${dial2.filter((t) => /turn/.test(t))[0]}; after: ${dial3.filter((t) => /turn/.test(t))[0]}`);
  const pred = await page.evaluate(() => { const root = document.querySelector('[data-field="A3-pred"]'); root.querySelector('button[data-value="1"]').click(); return { pressed: [...root.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.value).join(), disabled: root.querySelectorAll('button:disabled').length, note: root.closest('.wb-row').querySelector('.wb-pred').textContent }; });
  report(pred.pressed === '0' && pred.disabled === 2 && /You predicted γ = 0/.test(pred.note), 'a prediction cannot be changed after the result is right', `pressed "${pred.pressed}", ${pred.disabled} buttons disabled, "${pred.note}"`);
  for (const f of ['A5-wind', 'A5-ang1', 'A5-ang2', 'A5-ang3', 'A5-ang4']) await type('hand', f);
  const dial5 = await textsOf(page, 'pane-wturn');
  const g5a = await type('hand', 'A5-gamma', ['180']), g5b = await type('hand', 'A5-gamma', ['2']), g5c = await type('hand', 'A5-gamma', ['0']);
  const dial6 = await textsOf(page, 'pane-wturn');
  await type('hand', 'A5-sum');
  const dial7 = await textsOf(page, 'pane-wturn');
  report(dial5.filter((t) => t === '3 of 4 turns').length === 1 && !dial6.some((t) => /^4 of 4 turns: 0\.00/.test(t)) && dial7.includes('4 of 4 turns: 0.00° → γ = 0') && g5a.state === 'wrong' && g5a.msg === UNIT_PI && g5b.state === 'ok' && g5c.state === 'ok',
    'A5: the second dial waits for its sum in the same way; 180 where gamma = 0 is wrong (unit), 2 and 0 are right', `180: ${g5a.state}, 2: ${g5b.state}, 0: ${g5c.state}; ${dial7.filter((t) => /turn/.test(t)).join(' | ')}`);
  const t1 = await paneText('hand'), conv = await page.locator('#pane-wa .wb-conv').evaluate((e) => e.textContent), lead1 = await page.locator('#lead').innerHTML();
  report(/φ₄ − φ₃, φ₁ − φ₄\. Add or subtract 360° until the step lies between −180° and 180°/.test(t1) && /Add the four values of −arg/.test(t1) && /its length √\(Re² \+ Im²\) and −arg: minus the angle/.test(t1) && !/The angle is −arg/.test(t1) && /H\(k\) = \[\[0, h\*\], \[h, 0\]\]/.test(t1) && /φ goes back and forth/.test(t1),
    'tab 1, texts: the step of phi between −180° and 180°, "−arg" in place of a second meaning of "angle", H(k) written out in the check of A1', '');
  report(/calculate with four decimals, type two or more/.test(conv) && /a fraction such as 3\/8/.test(conv) && /a number between −2 and 2/.test(conv) && !/wo decimals are enough/.test(conv + t1) && /\(A \+ B\)\/√2 in place of \(A − B\)\/√2/.test(conv) && /<sub>A<\/sub>/.test(lead1) && !/u_A|e\^\(/.test(lead1),
    'conventions: four decimals by hand, the rule of the fields in units of pi, 3/8 as the example of a fraction; the lead is set with real indices', '');
  titles.push(...await cutTitles(page));

  // ----- tab 2 -----
  await open('code');
  const t2 = await paneText('code');
  report(/\(a\) test, M = 400/.test(t2) && /\(c\) Δ = 0\.5/.test(t2) && (t2.match(/\(b\) Δ = 0\.5/g) || []).length === 1 && !/Use M = 400/.test(t2), 'A7: the rows are (a), (b), (c), and M stands where it is used', '');
  titles.push(...await cutTitles(page));

  // ----- tab 3 -----
  await open('pump');
  const t3 = await paneText('pump'), lead3 = await page.locator('#lead').innerText();
  report(/Guide 1 \(an A\) is the left end, guide 80 \(a B\) the right end/.test(t3) && /one guide A alone as input, T = 50 on 60 cells/.test(t3) && /task sheet has J₁ = 1 \+ 0\.5·cos\(2πt\/T\), J₂ = 1 − 0\.5·cos\(2πt\/T\), Δ = 0\.2·sin\(2πt\/T\)/.test(t3.replace(/\s+/g, ' '))
    && /Calculate E by hand at t = T\/4 for k = 0, π\/2 and π/.test(t3) && /At t = 0 and at t = T\/2 the on-site term is zero/.test(t3) && /guides\) A, B, A, B, … from left to right/.test(t3) && /how many times γ grows by 2π/.test(lead3),
    'tab 3, texts: the ends of the chain, the number of cells of every propagation, the cycle of the sheet with its argument', '');
  await page.evaluate(() => { const e = document.getElementById('ts'); e.value = 0.375; e.dispatchEvent(new Event('input', { bubbles: true })); });
  const out = await page.locator('output[for="ts"]').innerText(), cap3 = await caption();
  report(out === '0.375' && cap3.startsWith('t/T = 0.375:'), 'the time 3T/8 of B2 is shown as 0.375 by the slider and in the caption', `slider "${out}", caption "${cap3.slice(0, 40)} …"`);
  await type('pump', 'B2-Elow'); await type('pump', 'B2-Eup');
  const focus3 = await activeId(page), seen3 = [await inPane('[data-field="B2-end"]', 'pump'), await inPane('[data-field="B2-guide"]', 'pump')];
  for (const [field, value] of Object.entries(CHOICES.pump)) await choose(page, field, value);
  await page.locator('#f-B2-Eup').click(); await page.locator('#f-B2-Eup').press('Enter');
  const focus4 = await activeId(page);
  report(focus3 === 'f-B2-Eup' && seen3.every(Boolean) && focus4 === 'f-B3-norm', 'Enter on the upper eigenvalue of B2: the focus stays in front of the two questions with buttons; with both answered it goes on to B3', `focus in ${focus3}, questions in view: ${seen3.join(', ')}; afterwards focus in ${focus4}`);
  const lev1 = await drawn(page, 'pane-wlevels');
  await page.click('#sheet'); await page.waitForTimeout(150);
  const lev2 = await drawn(page, 'pane-wlevels'), cyc2 = await textsOf(page, 'pane-wcycle');
  await page.click('#sheet'); await page.waitForTimeout(150);
  const cyc1 = await textsOf(page, 'pane-wcycle');
  const between = (d) => { const a = d.texts.find((x) => x.t === 'left end'), b = d.texts.find((x) => x.t === 'right end'); return a && b ? b.y - a.y : NaN; };
  report(between(lev1) > 40 && between(lev2) > 15 && between(lev2) < 0.62 * between(lev1) && cyc1.includes('(0, 0)') && !cyc2.includes('(0, 0)') && cyc2.includes('t = 0'),
    'figure c: the names of the two ends follow the gap of the numbers of the sheet; figure a: "(0, 0)" is written only where the cycle leaves room', `distance of the two names ${Math.round(between(lev1))} px, with the numbers of the sheet ${Math.round(between(lev2))} px`);
  await type('pump', 'B3-guide'); await type('pump', 'B3-sheet');
  const n1 = await paneText('pump');
  await type('pump', 'B1-gap'); await type('pump', 'B1-gapsheet');
  const n2 = await paneText('pump');
  report(/One guide alone excites both bands/.test(n1) && /With the numbers of the sheet the gap is smaller\. The cycle must then be slower/.test(n1) && /the gap is smaller \(0\.4 in place of 1\)/.test(n2), 'B3: the shift for one guide alone and for the numbers of the sheet each get their sentence; the two gaps are printed only when they are typed', '');
  await choose(page, 'B5-pred', '0'); await type('pump', 'B5-quarter');
  const e1 = await textsOf(page, 'pane-wshift');
  report(e1.includes('e · position X(t) of the light') && !e1.some((t) => /γ/.test(t)), 'figure e with gamma(T/4) right and C empty: no curve gamma(t)/2pi', `title "${e1.find((t) => /^e · /.test(t))}"`);
  titles.push(...await cutTitles(page));

  // ----- tab 4, while C of B5 is still empty -----
  await open('chern');
  const g1 = await drawn(page, 'pane-wgamma');
  for (let j = 1; j <= 4; j++) await type('chern', `B7-col${j}`);
  const g2 = await drawn(page, 'pane-wgamma'), cap4 = await caption();
  await type('chern', 'B7-total');
  const g3 = await drawn(page, 'pane-wgamma');
  const stepsIn = (d) => d.texts.filter((x) => /^\+.*π$/.test(x.t)).length;
  report(g1.lines < 50 && g2.lines < 50 && stepsIn(g2) === 3 && /3 of 4 dots/.test(cap4) && g3.lines > 60 && stepsIn(g3) === 4,
    'gamma(t) of tab 4: no line while C and the sum of all plaquettes are empty; with four column sums three dots, the fourth and the line with the sum of all 16', `points of lines: ${g1.lines}, ${g2.lines}, ${g3.lines}; steps written: ${stepsIn(g2)}, then ${stepsIn(g3)}`);
  const loops = await drawn(page, 'pane-wloops');
  const la = loops.texts.find((x) => x.t === '(a)'), lb = loops.texts.find((x) => x.t === '(b) backwards'), mid = la && lb ? (la.y + lb.y) / 2 : NaN;
  const low = loops.heads.filter((hd) => hd.y > mid + 15), high = loops.heads.filter((hd) => hd.y < mid - 5);
  report(!!la && !!lb && la.y < lb.y && loops.heads.length === 4 && low.length === 1 && low[0].dx < 0 && Math.abs(low[0].dy) < Math.abs(low[0].dx) && high.length === 3 && high.every((hd) => hd.dx < 0) && /upper arrow is \(a\), the lower one \(b\)/.test(cap4) && loops.texts.some((x) => /✕ is the point \(0, 0\)/.test(x.t)),
    'the cycles of B8: (a) and (b) each have their own arrow and name: (a) on the upper half, (b) on the lower half pointing the other way round', `${loops.heads.length} arrow heads: ${loops.heads.map((hd) => `${hd.y > mid ? 'below' : 'above'} the axis, pointing ${hd.dx < 0 ? 'left' : 'right'}`).join('; ')}`);
  await type('chern', 'B6-c');
  const aNeg = await type('chern', 'B6-a', ['1', '-1']), ovNeg = await type('chern', 'B6-ov1', c4([-B.B6.ov[0][0], -B.B6.ov[0][1]])), ovPos = await type('chern', 'B6-ov1', c4(B.B6.ov[0]));
  await page.click('#show-B6');
  const formulaA = await page.locator('#formula-B6').innerText();
  const aLen = await type('chern', 'B6-a', [f4(B.B6.u_t0[0][0]), f4(B.B6.u_t0[1][0])]), cLen = await type('chern', 'B6-c', ['0', '5']);
  await type('chern', 'B6-a'); await type('chern', 'B6-c');
  const ovBack = await stateOf(page, 'B6-ov1');
  report(aNeg.state === 'ok' && ovNeg.state === 'ok' && ovPos.state === 'wrong' && /as you typed them/.test(ovPos.msg) && /a = \(1, −1\)\/√2/.test(formulaA) && aLen.state === 'wrong' && /printed behind the field/.test(aLen.msg) && cLen.state === 'wrong' && /length 1/.test(cLen.msg) && ovBack.state === 'ok',
    'B6: a = (1, −1) is right and the overlap is checked for it (the formula shows a as typed); a typed with its factor 1/√2 and c = (0, 5) have the wrong length', `a = (1, −1): ${aNeg.state}, its overlap: ${ovNeg.state}, the overlap of (−1, 1): ${ovPos.state}; "${aLen.msg}"; after a = (−1, 1) the stored overlap is ${ovBack.state}`);
  const e6 = await type('chern', 'B6-E', ['1.5']);
  await choose(page, 'B8-p1', '1');
  const c8 = await type('chern', 'B8-c1', ['1']);
  const t4 = (await paneText('chern')).replace(/\s+/g, ' ');
  report(e6.state === 'wrong' && /row by row/.test(e6.msg) && !/eigh|\|h\|/.test(e6.msg) && c8.state === 'wrong' && /C is an integer/.test(c8.msg) && !/four decimals/.test(c8.msg) && /Δ = 0\.2·sin\(2πt\/T\)/.test(t4) && /with m, j = 0 … 3/.test(t4) && /with length 1/.test(t4),
    'tab 4: +1.5 for H·b = …·b is answered for this step; a wrong integer is not asked for decimals; the dotted cycle is printed with its argument', `"${e6.msg}" | "${c8.msg}"`);
  titles.push(...await cutTitles(page));

  // ----- back on tab 3: C -----
  await open('pump');
  await type('pump', 'B5-C');
  const e2 = await textsOf(page, 'pane-wshift'), n5 = await paneText('pump');
  report(e2.includes('e · X(t) and γ(t)/2π') && e2.includes('γ(t)/2π') && /Set T = 100: the two curves lie on each other/.test(n5) && !/the light follows the Zak phase/.test(n5), 'figure e with C right: the curve gamma(t)/2pi is drawn, and the note names T = 100 for the comparison', `title "${e2.find((t) => /^e · /.test(t))}"`);
  report(titles.length === 0, 'no title of a figure is cut at 1280 px', titles.join('; '));

  // ----- Back and Forward of the browser -----
  await page.click('#acts a[href="#hand"]'); await page.click('#acts a[href="#code"]'); await page.click('#acts a[href="#chern"]');
  const where = () => page.evaluate(() => `${location.hash} ${document.getElementById('stage').dataset.act}`);
  await page.goBack(); await page.waitForTimeout(150); const back1 = await where();
  await page.goBack(); await page.waitForTimeout(150); const back2 = await where();
  await page.goForward(); await page.waitForTimeout(150); const fwd = await where();
  report(back1 === '#code code' && back2 === '#hand hand' && fwd === '#code code', 'Back returns to the tab before, Forward goes on again', `back: ${back1}; back: ${back2}; forward: ${fwd}`);
  report(errors.length === 0, 'review findings: no console error, no page error', errors.slice(0, 5).join(' | '));
  await context.close();
}

// ---------- the phone layout, 390 x 844 ----------
async function phone(browser, theme) {
  console.log(`\nphone, ${theme}, 390 x 844`);
  const H = 844;
  const context = await browser.newContext({ viewport: { width: 390, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: theme });
  await context.addInitScript(RECORDER);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  const open = async (tab) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.click(`#acts a[href="#${tab}"]`); await page.waitForSelector(`#pane-${PANE[tab]} .wb-step`); await page.waitForTimeout(250); };
  const toTop = async (sel) => { await page.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - 6); }, sel); await page.waitForTimeout(200); };
  const onScreen = async (sel) => { const r = await rectOf(page, sel); return r.height > 0 && r.top >= 0 && r.bottom <= H; };
  const shot = async (name) => { const file = path.join(SHOTS, name); await page.screenshot({ path: file }); console.log(`        screenshot ${file}`); };
  const titles = [];

  // tab 3: Play and the sliders directly above the five figures; all of it on one screen
  await page.goto(`${BASE}workbook.html#pump`); await page.waitForSelector('#pane-wc .wb-step'); await page.waitForTimeout(300);
  const figs = ['wcycle', 'wbands', 'wlevels', 'wshift', 'wlight'].map((k) => `#pane-${k}`);
  const ctl = await rectOf(page, '#controls'), boxes = [];
  for (const f of figs) boxes.push(await rectOf(page, f));
  const b1 = await rectOf(page, '#step-B1'), figTop = Math.min(...boxes.map((b) => b.top)), figBottom = Math.max(...boxes.map((b) => b.bottom));
  report(ctl.bottom <= figTop + 1 && figTop - ctl.bottom <= 16 && figBottom <= b1.top + 1 && figBottom - ctl.top <= H && boxes[0].width < 200 && boxes[4].width > 300,
    `${theme}, tab 3: the controls stand directly above the five figures (two beside each other, d over the full width), the steps follow`, `controls and figures together ${Math.round(figBottom - ctl.top)} px of ${H}; a figure is ${Math.round(boxes[0].width)} px wide, figure d ${Math.round(boxes[4].width)} px`);
  await toTop('#controls');
  const vis = [];
  for (const sel of ['#play', '#ts', '#T', ...figs]) vis.push(await onScreen(sel));
  await page.click('#play'); await page.waitForTimeout(700);
  const tPlay = Number(await page.locator('#ts').inputValue()), visPlay = [];
  for (const sel of ['#play', ...figs]) visPlay.push(await onScreen(sel));
  await shot(`workbook_pump_390_${theme}_view.png`);
  await page.click('#play');
  report(vis.every(Boolean) && visPlay.every(Boolean) && tPlay > 0.01, `${theme}, tab 3: with the controls at the top of the screen, Play, both sliders and all five figures are on the screen, also while it plays`, `on the screen: ${vis.filter(Boolean).length} of ${vis.length}; while playing (t/T = ${tPlay.toFixed(3)}): ${visPlay.filter(Boolean).length} of ${visPlay.length}`);
  const short = [await textsOf(page, 'pane-wbands'), await textsOf(page, 'pane-wlevels'), await textsOf(page, 'pane-wshift')];
  report(short[0].includes('b · the two bands') && short[1].includes('c · open chain') && short[2].includes('e · position X(t)'), `${theme}, tab 3: the narrow figures have short titles`, '');
  titles.push(...await cutTitles(page));
  const [sw3, iw3] = await overflow(page);

  // the other tabs: the text about the figures first, then each figure directly in front of the step that needs it
  const ORDER = { hand: [['#pane-wcircle', '#step-A1'], ['#pane-wturn', '#step-A2']], code: [['#pane-wconv', '#step-A6'], ['#pane-wpos', '#step-A7']], chern: [['#pane-wmap', '#step-B6'], ['#pane-wgamma', '#step-B7'], ['#pane-wloops', '#step-B8']] };
  const wide = [`pump ${sw3}/${iw3}`];
  for (const [tab, pairs] of Object.entries(ORDER)) {
    await open(tab);
    const gaps = [];
    for (const [fig, step] of pairs) { const a = await rectOf(page, fig), b = await rectOf(page, step); gaps.push(Math.round(b.top - a.bottom)); }
    const cap = await rectOf(page, '#caption'), first = await rectOf(page, pairs[0][0]), ctlBox = await rectOf(page, '#controls'), lastStep = await rectOf(page, `#pane-${PANE[tab]} .wb-step:last-of-type`);
    report(gaps.every((g) => g >= 0 && g <= 16) && cap.bottom <= first.top && ctlBox.top >= lastStep.bottom, `${theme}, tab ${tab}: each figure stands directly in front of the step that needs it; the caption comes before the figures`, `${pairs.map(([fig, step], i) => `${fig.slice(6)} → ${step.slice(6)}: ${gaps[i]} px`).join(', ')}`);
    titles.push(...await cutTitles(page));
    const [sw, iw] = await overflow(page); wide.push(`${tab} ${sw}/${iw}`);
    if (tab === 'hand') { await toTop('#pane-wcircle'); await shot(`workbook_hand_390_${theme}_view.png`); }
    if (tab === 'chern') { await toTop('#pane-wloops'); await shot(`workbook_chern_390_${theme}_view.png`); }
  }
  report(titles.length === 0 && wide.every((x) => { const [a, b] = x.split(' ')[1].split('/').map(Number); return a <= b; }), `${theme}: no title of a figure is cut, and no tab is wider than the screen`, titles.join('; ') || wide.join(', '));

  // coming back to a tab: the page shows the field that was used last there, not the top
  await open('hand');
  await page.locator('#f-A1-wind').click(); await page.locator('#f-A1-wind').fill('1'); await page.locator('#f-A1-wind').press('Enter');
  const yWork = await page.evaluate(() => window.scrollY);
  await open('code'); await open('hand');
  const yBack = await page.evaluate(() => window.scrollY), fieldSeen = await onScreen('#f-A1-wind');
  report(yWork > 300 && fieldSeen && yBack > 300, `${theme}: back on a tab, the page shows the field that was used last`, `the page was at ${Math.round(yWork)} px, after tab 2 and back it is at ${Math.round(yBack)} px, the field is on the screen: ${fieldSeen}`);
  report(errors.length === 0, `${theme}, phone: no console error, no page error`, errors.slice(0, 5).join(' | '));
  await context.close();
}

// ---------- the storage of the browser is off, or holds something else ----------
async function storageCases(browser) {
  console.log('\nstorage that is blocked or unreadable');
  const cases = [
    ['localStorage throws on every call', () => { const stop = () => { throw new Error('storage is off'); }; Storage.prototype.getItem = stop; Storage.prototype.setItem = stop; Storage.prototype.removeItem = stop; }],
    ['the stored text is not JSON', () => { localStorage.setItem('qsl-workbook-v1', '{"text": {"A1-wind": "1"'); }],
    ['the stored object has other types', () => { localStorage.setItem('qsl-workbook-v1', JSON.stringify({ v: 9, text: { 'A1-wind': 1, 'A1-phi2': ['63.43'], 'A3-gamma': 'x'.repeat(500) }, choice: 'left' })); }],
    ['a stored choice that no button has', () => { localStorage.setItem('qsl-workbook-v1', JSON.stringify({ v: 1, text: { 'A1-wind': ' 1 ' }, choice: { 'A3-pred': '7', 'B2-end': 'middle' } })); }],
  ];
  for (const [name, init] of cases) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(init);
    let states = '';
    for (const tab of TABS) {
      await page.goto(`${BASE}workbook.html#${tab}`); await page.waitForSelector(`#pane-${PANE[tab]} .wb-step`); await page.waitForTimeout(150);
      if (tab === 'hand') {
        const r = await typeField(page, tab, 'A1-E2', ANSWERS.hand['A1-E2'], { perKey: false });
        states = `A1-E2 typed: ${r.state}, A1-wind: ${(await stateOf(page, 'A1-wind')).state}, A3-pred: ${(await stateOf(page, 'A3-pred')).state}, result fields of A3 closed: ${!(await page.locator('#f-A3-len').isVisible())}`;
      }
    }
    report(errors.length === 0 && states.startsWith('A1-E2 typed: ok') && states.endsWith('closed: true'), `storage: ${name}`, `${states}${errors.length ? ' | ' + errors.slice(0, 3).join(' | ') : ''}`);
    await context.close();
  }
}

// ---------- the other pages: header and shared files were changed ----------
async function otherPages(browser) {
  console.log('\nthe other pages (new header link, shared CSS and plots.js)');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
  const page = await context.newPage();
  // with the tabs that draw a heatmap (plots.js was changed): Exercise 1 task 1, Exercise 2 step and SSH, the builder
  for (const [file, hashes] of [['index.html', ['#task1', '']], ['exercise2.html', ['#step', '#ssh', '']], ['exercise3.html', ['#task3', '']], ['builder.html', ['#hk', '']]]) {
    const errors = [];
    const onConsole = (m) => { if (m.type() === 'error') errors.push(m.text()); }, onError = (e) => errors.push(e.message);
    page.on('console', onConsole); page.on('pageerror', onError);
    let info = null;
    const seen = [];
    for (const hash of hashes) {
      await page.goto(BASE + file + hash); await page.reload(); await page.waitForTimeout(500);
      info = await page.evaluate(() => { const a = document.querySelector('.top a[href="workbook.html"]'), n = document.getElementById('acts'); return { link: a && a.textContent, title: a && a.title, doc: [document.documentElement.scrollWidth, innerWidth], tabs: [n.scrollWidth, n.clientWidth], act: document.getElementById('stage').dataset.act }; });
      seen.push(info.act);
    }
    page.off('console', onConsole); page.off('pageerror', onError);
    report(errors.length === 0 && info.link === 'workbook' && info.doc[0] <= info.doc[1], `${file}: no console error, link "workbook" in the header`, `${errors.join(' | ')}tabs opened: ${seen.join(', ')}; the tab row needs ${info.tabs[0]} px and has ${info.tabs[1]} px at 1280`);
  }
  await page.goto(BASE + 'exercise3.html'); await page.click('.top a[href="workbook.html"]'); await page.waitForSelector('#pane-wa .wb-step');
  report((await page.title()) === 'Quantum Simulators Workbook: Zak phase and Thouless pump', 'the link of Exercise 3 opens the workbook', `title "${await page.title()}"`);
  // the downloads exist
  await page.goto(BASE + 'workbook.html#code'); await page.waitForSelector('#pane-wb .wb-downloads a');
  const links = await page.evaluate(() => [...document.querySelectorAll('#pane-wb .wb-downloads a')].map((a) => [a.getAttribute('href'), a.hasAttribute('download')]));
  const status = [];
  for (const [href] of links) status.push(`${href} ${(await page.request.get(BASE + href)).status()}`);
  report(links.length === 5 && links.every(([, d]) => d) && status.every((s) => s.endsWith(' 200')), 'tab 2: five download links, every file is there', status.join(', '));
  await context.close();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', path.join(ROOT, 'app')], { stdio: 'ignore' });
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch();
    console.log(`workbook page, ${BASE}workbook.html, Chromium ${browser.version()}`);
    await pass(browser, 'light', 1280, 800, { first: true, shots: TABS });
    await pass(browser, 'light', 390, 844, { first: false, shots: ['hand', 'pump'] });
    await pass(browser, 'dark', 1280, 800, { first: false, shots: [] });
    await pass(browser, 'dark', 390, 844, { first: false, shots: [] });
    await findings(browser);
    await phone(browser, 'light');
    await phone(browser, 'dark');
    await storageCases(browser);
    await otherPages(browser);
  } catch (e) {
    report(false, 'the test ran to its end', e.stack || String(e));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
  if (failed) console.log('failed:\n  ' + failures.join('\n  '));
  process.exit(failed ? 1 : 0);
})();
