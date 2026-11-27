// Browser test of the step-by-step page (app/steps.html) in headless Chromium.
// Run from the repository root:   node tools/check_steps.cjs
// It serves app/ on port 8790 for the time of the test. Exit code 1 if any check fails.
// Checked: the ten questions with their right answers, one wrong answer and its hint, "Show me how" after two wrong
// tries, an angle typed in radians, the place after a reload, Back, no console error, no sideways scroll on a phone.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'app');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.py': 'text/plain', '.m': 'text/plain', '.pdf': 'application/pdf' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((res) => srv.listen(8790, res));
  const b = await chromium.launch(); let fail = 0; const errs = [];
  const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push(String(e)));
  p.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) errs.push('reqfail ' + r.url()); });
  await p.goto('http://localhost:8790/steps.html'); await p.waitForSelector('#next');
  await p.click('#next');
  const txt = () => p.textContent('#card');
  ok((await txt()).includes('Question 1 of 10'), 'q1 count');
  // wrong tries
  await p.click('#check'); ok((await p.textContent('#msg')).includes('Fill in both'), 'empty msg');
  await p.fill('#f0', '2'); await p.fill('#f1', '0'); await p.click('#check'); ok((await p.textContent('#msg')).includes('Not yet'), 'wrong');
  await p.click('#check'); ok(await p.$('#showhow'), 'show how button after two tries');
  await p.click('#showhow'); ok((await p.textContent('#how')).includes('h = 1 + 2·1 = 3'), 'how text');
  const answers = [['3', '0'], ['1', '2'], ['-1', '0'], ['1', '−2'], 'c1', ['63.43'], ['360'], ['180'], 'c0', 'c0'];
  for (let q = 0; q < answers.length; q++) {
    ok((await txt()).includes(`Question ${q + 1} of 10`), 'count ' + (q + 1));
    const a = answers[q];
    if (typeof a === 'string') { if (q === 4) { await p.click('.step-choice button[data-v="2"]'); ok((await p.textContent('#msg')).includes('Not yet'), 'wrong choice'); } await p.click(`.step-choice button[data-v="${a.slice(1)}"]`); }
    else { await p.fill('#f0', a[0]); if (a[1] !== undefined) await p.fill('#f1', a[1]); if (q === 6) { await p.fill('#f0', '6.2832'); await p.click('#check'); ok((await p.textContent('#msg')).includes('radians'), 'radians hint'); await p.fill('#f0', a[0]); } await p.press('#f0', 'Enter'); }
    ok((await p.textContent('#msg')).includes('Right.'), 'right ' + (q + 1) + ': ' + (await p.textContent('#msg')));
    await p.click('#next');
  }
  ok((await txt()).includes('Done'), 'end');
  // reload keeps the place
  await p.reload(); await p.waitForSelector('#again'); ok((await txt()).includes('Done'), 'reload keeps end');
  await p.click('#back'); ok((await txt()).includes('Question 10 of 10') && (await p.textContent('#msg')).includes('Right.'), 'back shows solved');
  // dark
  await p.click('#theme-btn'); await p.click('#theme-btn');
  // phone
  const ph = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 }); const q = await ph.newPage();
  q.on('pageerror', (e) => errs.push(String(e)));
  await q.goto('http://localhost:8790/steps.html'); await q.waitForSelector('#next'); await q.click('#next');
  await q.fill('#f0', '3'); await q.fill('#f1', '0'); await q.click('#check');
  const over = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(over <= 0, 'phone overflow ' + over);
  ok(errs.length === 0, 'console: ' + errs.join(' | '));
  console.log(fail ? `${fail} FAILED` : 'all ok');
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
