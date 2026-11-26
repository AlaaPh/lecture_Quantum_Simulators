// Browser test of the workbook page (app/workbook.html) in headless Chromium.
// Run from the repository root:   node tools/check_workbook.cjs [folder for the screenshots]
// It serves app/ on port 8771 for the time of the test. Exit code 1 if any check fails.
//
// For each tab, in light and dark theme, at 1280 x 800 and at 400 x 800:
//   no console error, no page error, no horizontal overflow of the page, every visible canvas has something drawn;
//   the right value of every field is typed key by key: the field keeps the focus while typing, the tab does not
//   change, the verdict is "ok"; one catalogued wrong value gives its hint; "-0,2" and "−0.2" are read as −0.2;
//   "abc" is unreadable; a single overlap with the right length and another angle is answered as such;
//   after a reload the values are back and checked; Play on tab 3 advances the time.
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
const UNREADABLE = 'not a number I can read: write 0.7236 or -1/4';
const OTHER_PHASE = 'right length, other angle: your eigenvector has another phase; only the product is fixed';

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
Object.assign(ANSWERS.chern, { 'B6-E': [f4(B.B6.E_kpi2_tq)], 'B6-c': [f4(B.B6.u_kpi_tq[0][0]), f4(B.B6.u_kpi_tq[1][0])], 'B6-a': [f4(B.B6.u_t0[0][0]), f4(B.B6.u_t0[1][0])] });
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
const OTHER = { hand: ['A2-ov2', c4(i2)], chern: ['B6-ov1', c4([B.B6.ov[0][1], B.B6.ov[0][0]])] };
const MINUS = { field: 'A3-prod', variants: ['-0,2', '−0.2'], im: '0' };       // −0.2 with a decimal comma, and with the minus sign U+2212
const TABS = ['hand', 'code', 'pump', 'chern'];
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
    await page.waitForSelector(`#pane-${{ hand: 'wa', code: 'wb', pump: 'wc', chern: 'wd' }[tab]} .wb-step`);
    await page.waitForTimeout(250);
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const [sw, iw] = await overflow(page);
    report(sw <= iw, `${name}, tab ${tab}: no horizontal overflow`, `scrollWidth ${sw}, innerWidth ${iw}, background ${dark}`);
    const row = await page.evaluate(() => { const n = document.getElementById('acts'); return [n.scrollWidth, n.clientWidth, [...n.children].every((a) => a.getBoundingClientRect().right <= window.innerWidth)]; });
    if (tab === 'hand') report(row[0] <= row[1] && row[2], `${name}: all four tabs are visible in the header`, `the tab row needs ${row[0]} px and has ${row[1]} px`);
    const blank = await emptyCanvases(page);
    report(blank.length === 0, `${name}, tab ${tab}: every figure has something drawn`, blank.length ? `empty: ${blank.join(', ')}` : '');

    // the fields of the page and the fields of the table are the same
    const onPage = await page.evaluate((pane) => [...document.querySelectorAll(`#${pane} [data-field]`)].map((e) => e.dataset.field), `pane-${{ hand: 'wa', code: 'wb', pump: 'wc', chern: 'wd' }[tab]}`);
    const inTable = [...Object.keys(ANSWERS[tab]), ...Object.keys(PREDICTIONS[tab]), ...Object.keys(CHOICES[tab])];
    const missing = onPage.filter((f) => !inTable.includes(f)), extra = inTable.filter((f) => !onPage.includes(f));
    report(missing.length === 0 && extra.length === 0, `${name}, tab ${tab}: the test knows every field of the tab`, `${onPage.length} fields${missing.length ? `, not in the test: ${missing.join(' ')}` : ''}${extra.length ? `, not on the page: ${extra.join(' ')}` : ''}`);

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
    const step = await page.evaluate((pane) => document.querySelector(`#${pane} .wb-formula-btn`).id.slice(5), `pane-${{ hand: 'wa', code: 'wb', pump: 'wc', chern: 'wd' }[tab]}`);
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

// ---------- the other pages: header and shared files were changed ----------
async function otherPages(browser) {
  console.log('\nthe other pages (new header link, shared CSS and plots.js)');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
  const page = await context.newPage();
  for (const [file, hashes] of [['index.html', ['']], ['exercise2.html', ['']], ['exercise3.html', ['', '#task3']], ['builder.html', ['', '#hk']]]) {
    const errors = [];
    const onConsole = (m) => { if (m.type() === 'error') errors.push(m.text()); }, onError = (e) => errors.push(e.message);
    page.on('console', onConsole); page.on('pageerror', onError);
    let info = null;
    for (const hash of hashes) {
      await page.goto(BASE + file + hash); await page.waitForTimeout(500);
      info = await page.evaluate(() => { const a = document.querySelector('.top a[href="workbook.html"]'), n = document.getElementById('acts'); return { link: a && a.textContent, title: a && a.title, doc: [document.documentElement.scrollWidth, innerWidth], tabs: [n.scrollWidth, n.clientWidth] }; });
    }
    page.off('console', onConsole); page.off('pageerror', onError);
    report(errors.length === 0 && info.link === 'workbook' && info.doc[0] <= info.doc[1], `${file}: no console error, link "workbook" in the header`, `${errors.join(' | ')}tab row needs ${info.tabs[0]} px and has ${info.tabs[1]} px at 1280`);
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
    await pass(browser, 'light', 400, 800, { first: false, shots: ['hand', 'pump'] });
    await pass(browser, 'dark', 1280, 800, { first: false, shots: [] });
    await pass(browser, 'dark', 400, 800, { first: false, shots: [] });
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
