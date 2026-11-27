// Browser test of the workbook (app/workbook.html) in headless Chromium.
// Run from the repository root:   node tools/check_workbook.cjs [folder for screenshots] [--only=id,id]
// It serves app/ on port 8771 for the time of the test. Exit code 1 if any check fails.
// --only=three,chain walks these parts only (for work on one part); without it every part of parts.js is walked.
//
// At 1280 x 820 and at 390 x 844 (a phone), for every part:
//   every question in its order: the picture is drawn, a wrong answer shows "Not yet." and the hint, the second wrong
//   answer offers "Show me how" (for a question with code: Python and MATLAB, below Check, without sideways scroll),
//   the right answer shows "Right." and moves on with Next or with Enter; a new card starts at its top; the picture of
//   a question that is answered from it stands inside the card on a narrow screen; no console error; the page never
//   scrolls sideways.
// At 320 x 640 every card once more with the right answers only: the picture and no sideways scroll.
// Then: the contents with what is done, the progress after a reload, the address of a part, never landing behind an
// open question, Back, "Start this part again", stored answers that are no longer right, the dark theme, a browser
// that blocks the storage, the old address steps.html, and the other pages of the app with their link to the workbook.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..', 'app'), PORT = 8771, BASE = `http://localhost:${PORT}`;
const args = process.argv.slice(2), SHOTS = args.find((a) => !a.startsWith('--')) || null;
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end('not found'); } else { res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data); } });
});
let passed = 0, failed = 0;
const report = (ok, label, detail = '') => { if (ok) passed++; else failed++; if (!ok || process.env.VERBOSE) console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? '   ' + detail : ''}`); };

// the parts and their questions, read from the modules of the page: what to type, what is wrong, the hint
const registry = (page) => page.evaluate(async () => {
  const { GROUPS, PARTS } = await import('/js/workbook/parts.js'), val = (x) => (typeof x === 'function' ? x() : x);
  return PARTS.map((p) => ({ id: p.id, title: p.title, group: GROUPS.find((g) => g.parts.includes(p)).title, steps: p.steps.filter((s) => s.type !== 'info').map((s) => {
    if (s.type === 'choice') return { type: s.type, right: s.ref, wrong: s.options.find((o) => o !== s.ref), hint: s.hint, code: false, look: Boolean(s.look) };
    if (s.type === 'complex') { const r = val(s.ref), d = Math.max(0, Math.ceil(-Math.log10(s.tol ?? 0.011)) + 1); return { type: s.type, right: [r.re.toFixed(d), r.im.toFixed(d)], wrong: [(r.re + 1).toFixed(d), r.im.toFixed(d)], hint: s.hint, code: false, look: Boolean(s.look) }; }
    const ref = val(s.ref), d = Math.max(0, Math.ceil(-Math.log10(s.tol)) + 1);
    return { type: s.type, right: [ref.toFixed(d)], wrong: [(ref + 20 * s.tol + 0.37).toFixed(d)], hint: s.hint, code: typeof s.how === 'object', look: Boolean(s.look) };
  }) }));
});
const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
const inked = (page) => page.evaluate(() => { const c = document.getElementById('pic'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const openPart = async (page, id) => { await page.goto(`${BASE}/workbook.html#${id}`); await page.waitForFunction((x) => document.querySelector('#parts a.active')?.getAttribute('href') === `#${x}`, id); };
const toEnd = async (page) => { for (let n = 0; n < 40 && await page.$('#again') === null; n++) await page.click('#next'); };      // through solved cards to the last one
async function answer(page, q, what) {
  const a = q[what];
  if (q.type === 'choice') return page.click(`.step-choice button[data-v="${a}"]`);
  await page.fill('#f0', a[0]); if (a[1] !== undefined) await page.fill('#f1', a[1]);
  return page.click('#check');
}

// full: also the wrong answers, the hints and the worked answers; else only the right answers
async function walk(browser, PARTS, width, height, label, full) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url())) errors.push(`request failed: ${r.url()}`); });
  await page.goto(`${BASE}/workbook.html`); await page.waitForSelector('.toc-part');
  report(await page.evaluate((n) => document.querySelectorAll('.toc-part').length === n, (await registry(page)).length) && await overflow(page) <= 0, `${label}: the contents list every part`);
  for (const part of PARTS) {
    await openPart(page, part.id);
    const qs = part.steps, tag = `${label} ${part.id}`;
    report(await page.$('#next') !== null && await inked(page) > 500, `${tag}: the first card with a picture`);
    { const cut = await page.evaluate(() => [...document.querySelectorAll('.step-formula, .step-eq')].map((e) => e.scrollWidth - e.clientWidth).filter((d) => d > 1)); report(cut.length === 0, `${tag}: every formula of the first card fits into its box`, cut.join(', ')); }
    report((await text(page, '#parts')).includes(part.group) && (await text(page, '#parts a.active')).includes(part.title), `${tag}: the header names the exercise and the part`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part.id}_0.png`), fullPage: width < 600 });
    await page.click('#next');
    for (let n = 0; n < qs.length; n++) {
      const q = qs[n], name = `${tag} ${n + 1}`;
      if (await page.$('.step-count') === null) { report(await inked(page) > 500, `${name}: a card to read stands before it, with a picture`); if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part.id}_${n + 1}i.png`), fullPage: width < 600 }); await page.click('#next'); }
      report((await text(page, '.step-count')) === `Question ${n + 1} of ${qs.length}`, `${name}: "Question ${n + 1} of ${qs.length}"`);
      report(await inked(page) > 500, `${name}: the picture is drawn`);
      if (q.look) report((await page.evaluate(() => document.querySelector('.step-card .step-pic') !== null)) === (width <= 1080), `${name}: answered from the picture, so on a narrow screen the picture stands inside the card`);
      else report(await page.evaluate(() => document.querySelector('.step-card .step-pic') === null), `${name}: the picture stands outside the card`);
      report(await page.evaluate(() => window.scrollY) === 0, `${name}: the new card starts at its top`);
      report(await overflow(page) <= 0, `${name}: no sideways scroll`, String(await overflow(page)));
      { const cut = await page.evaluate(() => [...document.querySelectorAll('.step-formula, .step-eq')].map((e) => e.scrollWidth - e.clientWidth).filter((d) => d > 1)); report(cut.length === 0, `${name}: every formula fits into its box`, cut.join(', ')); }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part.id}_${n + 1}q.png`), fullPage: width < 600 });
      if (full) {
        await answer(page, q, 'wrong');
        const m1 = await text(page, '#msg');
        report(m1.startsWith('Not yet.') && m1.includes(strip(q.hint).slice(0, 25)), `${name}: a wrong answer shows the hint`, m1.slice(0, 80));
        if (q.type !== 'choice') {
          report(await page.$('#showhow') === null, `${name}: no "Show me how" after one wrong try`);
          await page.click('#check');
          report(await page.$('#showhow') !== null, `${name}: "Show me how" after two wrong tries`);
          await page.click('#showhow');
          if (q.code) {
            const py = await text(page, '#howbox pre'); await page.click('.step-lang button[data-lang="m"]'); const m = await text(page, '#howbox pre');
            report(py.length > 20 && m.length > 20 && py !== m && /np\.|print/.test(py) && /disp|;/.test(m), `${name}: the code in Python and in MATLAB`);
            report(await page.evaluate(() => { const pre = document.querySelector('#howbox pre'); return pre.scrollWidth <= pre.clientWidth + 1; }) || width < 380, `${name}: the code needs no sideways scroll`);
            report(await page.evaluate(() => document.querySelector('#howbox').compareDocumentPosition(document.querySelector('#check')) & Node.DOCUMENT_POSITION_PRECEDING) > 0, `${name}: the code stands below Check`);
            await page.click('.step-lang button[data-lang="py"]');
          } else report((await text(page, '#howbox')).length > 5, `${name}: the worked answer`);
          report(await page.evaluate(() => document.querySelector('#f0').classList.contains('no')), `${name}: the field is marked after a wrong check`);
        }
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part.id}_${n + 1}a.png`), fullPage: width < 600 });
      }
      if (q.type === 'choice') await page.click(`.step-choice button[data-v="${q.right}"]`);
      else { await page.fill('#f0', q.right[0]); if (q.right[1] !== undefined) await page.fill('#f1', q.right[1]); await page.press('#f0', 'Enter'); }
      const m2 = await text(page, '#msg');
      report(m2.startsWith('Right.') && m2.length > 12, `${name}: the right answer`, m2.slice(0, 80));
      report(await inked(page) > 500 && await overflow(page) <= 0, `${name}: picture and width after the answer`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part.id}_${n + 1}b.png`), fullPage: width < 600 });
      if (n % 2 && q.type !== 'choice') await page.press('#f0', 'Enter'); else await page.click('#next');
    }
    if (await page.$('#again') === null && await page.$('#next') !== null) await page.click('#next');      // a card to read before the end
    report(await page.$('#again') !== null, `${tag}: the last card`);
    report((await text(page, '#parts a.active')).includes('✓'), `${tag}: the finished part has a tick`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}_${part.id}_end.png`), fullPage: width < 600 });
  }
  report(errors.length === 0, `${label}: no console error`, errors.join(' | '));
  return { ctx, page, errors };
}

(async () => {
  await new Promise((res) => server.listen(PORT, res));
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const probe = await browser.newPage(); await probe.goto(`${BASE}/workbook.html`);
  const ALL = await registry(probe), PARTS = ONLY.length ? ALL.filter((p) => ONLY.includes(p.id)) : ALL; await probe.close();
  report(PARTS.length > 0 && (!ONLY.length || PARTS.length === ONLY.length), 'the parts to walk exist', ONLY.join(','));
  const { page } = await walk(browser, PARTS, 1280, 820, 'desktop', true);
  const first = PARTS[0], last = PARTS[PARTS.length - 1], nq = (p) => p.steps.length;

  // the contents show what is done; "Next part" and the last card
  await page.goto(`${BASE}/workbook.html#contents`); await page.waitForSelector('.toc-part');
  report(await page.evaluate((ids) => ids.every((id) => document.querySelector(`.toc-part[href="#${id}"]`).classList.contains('done')), PARTS.map((p) => p.id)), 'contents: every walked part is marked as done');
  await openPart(page, first.id); await toEnd(page); await page.click('#nextpart');
  const after = ALL[ALL.findIndex((p) => p.id === first.id) + 1];
  report(after ? page.url().endsWith(`#${after.id}`) : await page.$('.toc-part') !== null, '"Next part" opens the part that follows, or the contents after the last part');
  // after a reload everything is still solved; Back shows a solved question
  await openPart(page, last.id); await toEnd(page); await page.reload(); await page.waitForSelector('#again');
  report((await text(page, '#parts a.active')).includes('✓'), 'reload: the part keeps its tick');
  await page.click('#back');
  if (await page.$('.step-count') === null) await page.click('#back');
  report((await text(page, '#msg')).startsWith('Right.') && await page.$('#check') === null && await page.$('#next') !== null, 'Back: a solved question shows its answer and Next');
  // "Start this part again" empties this part only
  await openPart(page, last.id); await toEnd(page); await page.click('#again');
  await page.goto(`${BASE}/workbook.html#contents`); await page.waitForSelector('.toc-part');
  report(await page.evaluate(([ids, lastId]) => ids.every((id) => document.querySelector(`.toc-part[href="#${id}"]`).classList.contains('done') === (id !== lastId)), [PARTS.map((p) => p.id), last.id]), '"Start this part again" empties this part only');
  // a stored answer that is not the right answer of the question at its place is not taken over
  await page.evaluate((id) => { const o = JSON.parse(localStorage.getItem('qsl-workbook-v2')); const keys = Object.keys(o.solved[id]); o.solved[id][keys[0]] = ['999', '999']; localStorage.setItem('qsl-workbook-v2', JSON.stringify(o)); }, first.id);
  await page.reload(); await page.waitForSelector('.toc-part');          // read the storage first: a change of the part would write the old state back
  report(await page.evaluate((id) => !document.querySelector(`.toc-part[href="#${id}"]`).classList.contains('done'), first.id), 'a stored wrong answer is not shown as right: the part is open again');
  await openPart(page, first.id); await page.waitForSelector('.step-count');
  report((await text(page, '.step-count')) === `Question 1 of ${nq(first)}` && (await page.$('#check') !== null || await page.$('.step-choice') !== null), 'the part opens at the first open question, not behind it');
  // never behind an open question: the stored place is beyond the first open question
  await page.evaluate((id) => { const o = JSON.parse(localStorage.getItem('qsl-workbook-v2')); o.pos[id] = 5; localStorage.setItem('qsl-workbook-v2', JSON.stringify(o)); }, last.id);
  await page.reload(); await page.waitForSelector('#card'); await openPart(page, last.id); await page.waitForSelector('.step-count');
  report((await text(page, '.step-count')) === `Question 1 of ${nq(last)}`, 'a stored place behind an open question is not used: the first open question is shown');
  // unreadable storage
  await page.evaluate(() => localStorage.setItem('qsl-workbook-v2', '{"part":"nowhere","pos":7,"solved":[1,2]'));
  await page.goto(`${BASE}/workbook.html`); await page.reload(); await page.waitForSelector('.toc-part');
  report(await page.evaluate(() => document.querySelectorAll('.toc-part.done').length === 0), 'an unreadable storage: nothing is marked as done and the page works');
  // an unknown address leads to the contents
  await page.goto(`${BASE}/workbook.html#nowhere`); await page.waitForSelector('.toc-part');
  report((await text(page, '#parts a.active')) === 'Contents', 'an unknown address shows the contents');
  // dark theme
  await openPart(page, first.id);
  const bg0 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#theme-btn');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  report(await inked(page) > 500 && bg !== bg0, 'the Theme button changes the theme and the picture is drawn again', `${bg0} -> ${bg}`);
  await page.click('#theme-btn');

  await walk(browser, PARTS, 390, 844, 'phone', true);
  await walk(browser, PARTS, 320, 640, 'narrow', false);          // every card again at the smallest width

  // a browser that blocks the storage
  const blocked = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const bp = await blocked.newPage(), be = []; bp.on('pageerror', (e) => be.push(String(e)));
  await bp.goto(`${BASE}/workbook.html#${first.id}`); await bp.waitForSelector('#next'); await bp.click('#next');
  const q0 = first.steps[0];
  if (q0.type === 'choice') await bp.click(`.step-choice button[data-v="${q0.right}"]`); else { await bp.fill('#f0', q0.right[0]); if (q0.right[1] !== undefined) await bp.fill('#f1', q0.right[1]); await bp.click('#check'); }
  report((await text(bp, '#msg')).startsWith('Right.') && be.length === 0, 'with a blocked storage the page works', be.join(' | '));

  // the old address and the other pages
  const op = await browser.newPage(), oe = []; op.on('pageerror', (e) => oe.push(String(e))); op.on('console', (m) => { if (m.type() === 'error') oe.push(m.text()); });
  await op.goto(`${BASE}/steps.html`); await op.waitForURL(/workbook\.html/); await op.waitForSelector('.toc-part');
  report(true, 'steps.html leads to the workbook');
  for (const name of ['index.html', 'exercise2.html', 'exercise3.html', 'builder.html']) {
    await op.goto(`${BASE}/${name}`); await op.waitForTimeout(400);
    report(await op.$('a[href^="workbook.html"]') !== null, `${name}: has the link to the workbook`);
  }
  report(oe.length === 0, 'the other pages load without an error', oe.join(' | '));

  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
  await browser.close(); server.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
