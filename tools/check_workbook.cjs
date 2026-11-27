// Browser test of the workbook (app/workbook.html) in headless Chromium.
// Run from the repository root:   node tools/check_workbook.cjs [folder for screenshots]
// It serves app/ on port 8771 for the time of the test. Exit code 1 if any check fails.
//
// At 1280 x 820 and at 390 x 844 (a phone), for each of the three parts:
//   every question in its order: the picture is drawn, a wrong answer shows "Not yet." and the hint, the second wrong
//   answer offers "Show me how" (for a question with code: Python and MATLAB), the right answer shows "Right." and
//   moves on with Next or with Enter; no console error; the page never scrolls sideways.
// Then: the progress after a reload, the ticks of finished parts, the address of a part (#pump), never landing behind
// an open question, Back, "Start this part again", the dark theme, a browser that blocks the storage, 320 px width,
// the old address steps.html, and the other pages of the app with their link to the workbook.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..', 'app'), PORT = 8771, BASE = `http://localhost:${PORT}`, SHOTS = process.argv[2] || null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.py': 'text/plain', '.m': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end('not found'); } else { res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data); } });
});
let passed = 0, failed = 0;
const report = (ok, label, detail = '') => { if (ok) passed++; else failed++; if (!ok || process.env.VERBOSE) console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? '   ' + detail : ''}`); };
const PARTS = ['zak', 'pump', 'chern'];

// the questions of one part, read from the modules of the page: what to type, what is wrong, the hint
const plan = (page, part) => page.evaluate(async (id) => {
  const mod = await import(`/js/workbook/${id}.js`), val = (x) => (typeof x === 'function' ? x() : x);
  return mod[id].steps.filter((s) => s.type !== 'info').map((s) => {
    if (s.type === 'choice') return { type: s.type, right: s.ref, wrong: s.options.find((o) => o !== s.ref), hint: s.hint, code: false };
    if (s.type === 'complex') return { type: s.type, right: [String(s.ref.re), String(s.ref.im)], wrong: [String(s.ref.re + 1), String(s.ref.im)], hint: s.hint, code: false };
    const ref = val(s.ref), d = Math.max(0, Math.ceil(-Math.log10(s.tol)) + 1);
    return { type: s.type, right: [ref.toFixed(d)], wrong: [(ref + 20 * s.tol + 0.37).toFixed(d)], hint: s.hint, code: typeof s.how === 'object' };
  });
}, part);
const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
const inked = (page) => page.evaluate(() => { const c = document.getElementById('pic'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
async function answer(page, q, what) {
  const a = q[what];
  if (q.type === 'choice') return page.click(`.step-choice button[data-v="${a}"]`);
  await page.fill('#f0', a[0]); if (a[1] !== undefined) await page.fill('#f1', a[1]);
  return page.click('#check');
}

async function walk(browser, width, height, label) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url())) errors.push(`request failed: ${r.url()}`); });
  await page.goto(`${BASE}/workbook.html`); await page.waitForSelector('#next');
  report((await text(page, '#parts')).includes('1 · Zak phase') && (await text(page, '#parts')).includes('3 · Chern number'), `${label}: the three parts are in the header`);
  for (const part of PARTS) {
    await page.goto(`${BASE}/workbook.html#${part}`); await page.waitForFunction((id) => document.querySelector('#parts a.active')?.getAttribute('href') === `#${id}`, part);
    const qs = await plan(page, part);
    report(await page.$('#next') !== null && await inked(page) > 500, `${label} ${part}: the first card with a picture`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part}_0.png`), fullPage: width < 600 });
    await page.click('#next');
    for (let n = 0; n < qs.length; n++) {
      const q = qs[n], name = `${label} ${part} ${n + 1}`;
      if (await page.$('.step-count') === null) { report(await inked(page) > 500, `${name}: a card to read stands before it, with a picture`); await page.click('#next'); }
      report((await text(page, '.step-count')) === `Question ${n + 1} of ${qs.length}`, `${name}: "Question ${n + 1} of ${qs.length}"`);
      report(await inked(page) > 500, `${name}: the picture is drawn`);
      report(await overflow(page) <= 0, `${name}: no sideways scroll`, String(await overflow(page)));
      await answer(page, q, 'wrong');
      const m1 = await text(page, '#msg');
      report(m1.startsWith('Not yet.') && m1.includes(strip(q.hint).slice(0, 25)), `${name}: a wrong answer shows the hint`, m1.slice(0, 80));
      if (q.type !== 'choice') {
        report(await page.$('#showhow') === null, `${name}: no "Show me how" after one wrong try`);
        await page.click('#check');
        report(await page.$('#showhow') !== null, `${name}: "Show me how" after two wrong tries`);
        await page.click('#showhow');
        if (q.code) {
          const py = await text(page, '#how pre'); await page.click('.step-lang button[data-lang="m"]'); const m = await text(page, '#how pre');
          report(py.length > 20 && m.length > 20 && py !== m && /np\.|print/.test(py) && /disp|;/.test(m), `${name}: the code in Python and in MATLAB`);
          await page.click('.step-lang button[data-lang="py"]');
        } else report((await text(page, '#how')).length > 5, `${name}: the worked answer`);
      }
      if (SHOTS && part !== 'zak') await page.screenshot({ path: path.join(SHOTS, `${label}_${part}_${n + 1}a.png`), fullPage: width < 600 });
      if (q.type === 'choice') await page.click(`.step-choice button[data-v="${q.right}"]`);
      else { await page.fill('#f0', q.right[0]); if (q.right[1] !== undefined) await page.fill('#f1', q.right[1]); await page.press('#f0', 'Enter'); }
      const m2 = await text(page, '#msg');
      report(m2.startsWith('Right.') && m2.length > 12, `${name}: the right answer`, m2.slice(0, 80));
      report(await inked(page) > 500 && await overflow(page) <= 0, `${name}: picture and width after the answer`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part}_${n + 1}b.png`), fullPage: width < 600 });
      if (n % 2 && q.type !== 'choice') await page.press('#f0', 'Enter'); else await page.click('#next');
    }
    report(await page.$('#again') !== null, `${label} ${part}: the last card`);
    report((await text(page, '#parts a.active')).includes('✓'), `${label} ${part}: the finished part has a tick`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part}_end.png`), fullPage: width < 600 });
    if (part !== 'chern') { await page.click('#nextpart'); report(page.url().endsWith(`#${PARTS[PARTS.indexOf(part) + 1]}`), `${label} ${part}: "Next part" opens the next part`); }
  }
  report(errors.length === 0, `${label}: no console error`, errors.join(' | '));
  return { ctx, page, errors };
}

(async () => {
  await new Promise((res) => server.listen(PORT, res));
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const { page } = await walk(browser, 1280, 820, 'desktop');

  // after a reload everything is still solved; Back shows a solved question; the address of a part
  await page.goto(`${BASE}/workbook.html#pump`); await page.reload(); await page.waitForSelector('#again');
  report((await text(page, '#parts')).split('✓').length === 4, 'reload: all three parts keep their tick');
  await page.click('#back');
  report((await text(page, '#msg')).startsWith('Right.') && await page.$('#check') === null && await page.$('#next') !== null, 'Back: a solved question shows its answer and Next');
  await page.goto(`${BASE}/workbook.html#chern`); await page.waitForFunction(() => document.querySelector('#parts a.active')?.getAttribute('href') === '#chern');
  report((await text(page, 'h2')) === 'Done', 'the address #chern opens part 3 where it was left');
  // "Start this part again" empties this part only
  await page.click('#again');
  const marks = await text(page, '#parts');
  report(marks.includes('Thouless pump ✓') && !marks.includes('Chern number ✓') && (await text(page, 'h2')).includes('Chern number'), '"Start this part again" empties part 3 only');
  // never behind an open question: the stored place is beyond the first open question
  await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('qsl-workbook-v2')); o.pos.chern = 5; localStorage.setItem('qsl-workbook-v2', JSON.stringify(o)); });
  await page.reload(); await page.waitForSelector('.step-count');
  report(/^Question 1 of \d+$/.test(await text(page, '.step-count')) && await page.$('#check') !== null, 'a stored place behind an open question is not used: the first open question is shown');
  // unreadable storage
  await page.evaluate(() => localStorage.setItem('qsl-workbook-v2', '{"part":"nowhere","pos":7,"solved":[1,2]'));
  await page.goto(`${BASE}/workbook.html`); await page.reload(); await page.waitForSelector('#next');
  report((await text(page, '#parts a.active')).startsWith('1 · Zak phase'), 'an unreadable storage: the page starts at part 1');
  // dark theme
  await page.click('#theme-btn');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  report(await inked(page) > 500 && bg !== 'rgb(255, 255, 255)', 'the dark theme draws the picture', bg);
  await page.click('#theme-btn');

  const phone = await walk(browser, 390, 844, 'phone');
  await phone.page.setViewportSize({ width: 320, height: 640 });
  for (const part of PARTS) { await phone.page.goto(`${BASE}/workbook.html#${part}`); await phone.page.waitForTimeout(120); const o = await overflow(phone.page); report(o <= 0, `320 px ${part}: no sideways scroll`, String(o)); }

  // a browser that blocks the storage
  const blocked = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const bp = await blocked.newPage(), be = []; bp.on('pageerror', (e) => be.push(String(e)));
  await bp.goto(`${BASE}/workbook.html`); await bp.waitForSelector('#next'); await bp.click('#next'); await bp.fill('#f0', '3'); await bp.fill('#f1', '0'); await bp.click('#check');
  report((await text(bp, '#msg')).startsWith('Right.') && be.length === 0, 'with a blocked storage the page works', be.join(' | '));

  // the old address and the other pages
  const op = await browser.newPage(), oe = []; op.on('pageerror', (e) => oe.push(String(e))); op.on('console', (m) => { if (m.type() === 'error') oe.push(m.text()); });
  await op.goto(`${BASE}/steps.html`); await op.waitForURL(/workbook\.html/); await op.waitForSelector('#next');
  report(true, 'steps.html leads to the workbook');
  for (const name of ['index.html', 'exercise2.html', 'exercise3.html', 'builder.html']) {
    await op.goto(`${BASE}/${name}`); await op.waitForTimeout(400);
    report(await op.$('a[href="workbook.html"]') !== null, `${name}: has the link to the workbook`);
  }
  report(oe.length === 0, 'the other pages load without an error', oe.join(' | '));

  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
  await browser.close(); server.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
