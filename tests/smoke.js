// construction-cost-bd -- headless-Chrome smoke test via raw CDP (no puppeteer).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9355;
const BASE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/ccbd-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const nav = async (url) => { await send('Page.navigate', { url }); await wait(1400); };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };
  const clickTab = async (name) => ev(`document.querySelector('[data-tab="${name}"]').click()`);
  const BN_TITLE = '\u09a8\u09bf\u09b0\u09cd\u09ae\u09be\u09a3 \u0996\u09b0\u099a \u09ac\u09bf\u09a1\u09bf';
  const BN_TOTAL = '\u09f3\u09eb\u09eb,\u09ee\u09ed,\u09e8\u09e6\u09e6.\u09e6\u09e6';

  // ---- Load: defaults ----
  await nav(BASE);
  check('page title mentions Construction Cost', (await ev('document.title'))?.includes('Construction Cost'));
  check('subtitle present', (await ev(`document.getElementById('subtitle').textContent`)).length > 40);
  check('area defaults to 1200', (await ev(`document.getElementById('areaInput').value`)) === '1200');
  check('floors default to 2', (await ev(`document.getElementById('floorsInput').value`)) === '2');
  check('tier defaults to standard', (await ev(`document.getElementById('tierSelect').value`)) === 'standard');
  check('5 extras listed', (await ev(`document.querySelectorAll('#extrasList input[type="checkbox"]').length`)) === 5);
  check('results hidden before calculate', (await ev(`document.getElementById('results').hidden`)) === true);

  // ---- Calculate: 1200 x 2, standard, no extras ----
  await ev(`document.getElementById('calcBtn').click()`);
  check('results shown after calculate', (await ev(`document.getElementById('results').hidden`)) === false);
  check('grand total is \u09f355,87,200.00', (await ev(`document.getElementById('grandValue').textContent`)) === '\u09f355,87,200.00');
  check('base equals grand (no extras)', (await ev(`document.getElementById('baseValue').textContent`)) === '\u09f355,87,200.00');
  check('meta shows 2,400 sq ft', (await ev(`document.getElementById('resultMeta').textContent`)).includes('2,400'));
  check('6 category rows', (await ev(`document.querySelectorAll('#catBody tr').length`)) === 6);
  check('structure row \u09f319,55,520.00', (await ev(`document.querySelector('#catBody tr').textContent`)).includes('\u09f319,55,520.00'));
  check('5 phase rows', (await ev(`document.querySelectorAll('#phaseBody tr').length`)) === 5);
  check('foundation phase \u09f38,38,080.00', (await ev(`document.querySelector('#phaseBody tr').textContent`)).includes('\u09f38,38,080.00'));
  check('5 material rows', (await ev(`document.querySelectorAll('#matBody tr').length`)) === 5);
  check('cement row 960 bag / \u09f35,28,000.00', (await ev(`document.querySelector('#matBody tr').textContent`)).includes('960') && (await ev(`document.querySelector('#matBody tr').textContent`)).includes('\u09f35,28,000.00'));
  check('material subtotal \u09f322,44,600.00', (await ev(`document.getElementById('matTotalValue').textContent`)) === '\u09f322,44,600.00');
  check('multi-floor note shown', (await ev(`document.getElementById('factorNote').hidden`)) === false);

  // ---- Extras: boundary + gate -> grand \u09f357,97,200.00 ----
  await ev(`document.querySelector('input[data-extra="boundary"]').click(); document.querySelector('input[data-extra="gate"]').click(); document.getElementById('calcBtn').click()`);
  check('extras total \u09f32,10,000.00', (await ev(`document.getElementById('extrasValue').textContent`)) === '\u09f32,10,000.00');
  check('grand with extras \u09f357,97,200.00', (await ev(`document.getElementById('grandValue').textContent`)) === '\u09f357,97,200.00');

  // ---- Validation: area 0 rejected ----
  await ev(`document.getElementById('areaInput').value='0'; document.getElementById('calcBtn').click()`);
  check('area 0 shows inline error', (await ev(`document.getElementById('estError').hidden`)) === false);
  check('area 0 hides results', (await ev(`document.getElementById('results').hidden`)) === true);
  await ev(`document.getElementById('areaInput').value='1000'; document.getElementById('floorsInput').value='1'; document.getElementById('tierSelect').value='basic'; document.querySelector('input[data-extra="boundary"]').click(); document.querySelector('input[data-extra="gate"]').click(); document.getElementById('calcBtn').click()`);
  check('basic 1000x1 = \u09f318,00,000.00', (await ev(`document.getElementById('grandValue').textContent`)) === '\u09f318,00,000.00');
  check('single floor hides factor note', (await ev(`document.getElementById('factorNote').hidden`)) === true);

  // ---- Save estimate ----
  await ev(`document.getElementById('saveName').value='Mirpur house'; document.getElementById('saveBtn').click()`);
  check('save success message shows', (await ev(`document.getElementById('saveOk').hidden`)) === false);
  await clickTab('saved');
  check('saved list has 1 item', (await ev(`document.querySelectorAll('#savedList li').length`)) === 1);
  check('saved name shown', (await ev(`document.querySelector('#savedList li').textContent`)).includes('Mirpur house'));
  check('saved total \u09f318,00,000.00', (await ev(`document.getElementById('savedTotalValue').textContent`)) === '\u09f318,00,000.00');

  // ---- Persistence across reload ----
  await nav(BASE);
  await clickTab('saved');
  check('saved estimate persists after reload', (await ev(`document.querySelectorAll('#savedList li').length`)) === 1);

  // ---- Load saved into calculator ----
  await ev(`document.querySelector('#savedList .btn.mini').click()`);
  check('load switches to estimate tab', (await ev(`document.getElementById('panel-estimate').hidden`)) === false);
  check('loaded area is 1000', (await ev(`document.getElementById('areaInput').value`)) === '1000');
  check('loaded grand is \u09f318,00,000.00', (await ev(`document.getElementById('grandValue').textContent`)) === '\u09f318,00,000.00');

  // ---- Rates: edit standard rate 2400 -> 3000, verify, reset ----
  await clickTab('rates');
  await ev(`document.getElementById('rate-tier-standard').value='3000'; document.getElementById('saveRatesBtn').click()`);
  check('rates saved message shows', (await ev(`document.getElementById('ratesOk').hidden`)) === false);
  await clickTab('estimate');
  await ev(`document.getElementById('areaInput').value='1200'; document.getElementById('floorsInput').value='2'; document.getElementById('tierSelect').value='standard'; document.getElementById('calcBtn').click()`);
  check('edited rate: 1200x2 standard @3000 = \u09f369,84,000.00', (await ev(`document.getElementById('grandValue').textContent`)) === '\u09f369,84,000.00');
  await clickTab('rates');
  await ev(`document.getElementById('resetRatesBtn').click()`);
  check('reset shows saved message', (await ev(`document.getElementById('ratesOk').hidden`)) === false);
  await clickTab('estimate');
  await ev(`document.getElementById('calcBtn').click()`);
  check('after reset: back to \u09f355,87,200.00', (await ev(`document.getElementById('grandValue').textContent`)) === '\u09f355,87,200.00');

  // ---- Rates validation: split sum != 100 rejected ----
  await clickTab('rates');
  await ev(`document.getElementById('split-standard-structure').value='34'; document.getElementById('saveRatesBtn').click()`);
  check('bad split sum shows error', (await ev(`document.getElementById('ratesError').hidden`)) === false);
  await ev(`document.getElementById('split-standard-structure').value='35'; document.getElementById('saveRatesBtn').click()`);
  check('fixed split saves ok', (await ev(`document.getElementById('ratesOk').hidden`)) === false);

  // ---- Export / erase / import round-trip via test hooks ----
  const payload = await ev(`window.__ccbd.exportPayload()`);
  check('export payload is construction-cost-bd v1', payload.includes('"app": "construction-cost-bd"') && payload.includes('"version": 1'), payload.slice(0, 120));
  check('export carries Mirpur house', payload.includes('Mirpur house'));
  await ev(`window.__ccbd.eraseAll()`);
  check('eraseAll empties saved', (await ev(`window.__ccbd.exportPayload()`)).includes('"saved": []'));
  const imp = await ev(`JSON.stringify(window.__ccbd.importPayload(${JSON.stringify(payload)}))`);
  check('import valid payload ok', imp.includes('"ok":true'), imp);
  check('import restores saved record', (await ev(`window.__ccbd.exportPayload()`)).includes('Mirpur house'));
  const badImp = await ev(`JSON.stringify(window.__ccbd.importPayload('{"app":"land-tax-bd","version":1,"saved":[]}'))`);
  check('import wrong app rejected', badImp.includes('"ok":false'));
  check('invalid import leaves data intact', (await ev(`window.__ccbd.exportPayload()`)).includes('Mirpur house'));

  // ---- Bad import via UI textarea shows visible error; good import succeeds ----
  await clickTab('data');
  await ev(`document.getElementById('importText').value='{not json'; document.getElementById('importBtn').click()`);
  check('bad UI import shows error', (await ev(`document.getElementById('importFail').hidden`)) === false);
  await ev(`document.getElementById('importText').value=${JSON.stringify(payload)}; document.getElementById('importBtn').click()`);
  check('good UI import succeeds', (await ev(`document.getElementById('importOk').hidden`)) === false);

  // ---- Typed-DELETE erase via UI; wrong word rejected ----
  await ev(`document.getElementById('eraseInput').value='delete'; document.getElementById('eraseBtn').click();`);
  check('wrong erase word rejected', (await ev(`document.getElementById('eraseWrong').hidden`)) === false);
  check('wrong erase keeps data', (await ev(`window.__ccbd.exportPayload()`)).includes('Mirpur house'));
  await ev(`document.getElementById('eraseInput').value='DELETE'; document.getElementById('eraseBtn').click();`);
  check('DELETE erases data', (await ev(`window.__ccbd.exportPayload()`)).includes('"saved": []'));
  check('erase success message shows', (await ev(`document.getElementById('erasedMsg').hidden`)) === false);

  // ---- Re-save for language checks, then BN toggle ----
  await clickTab('estimate');
  await ev(`document.getElementById('areaInput').value='1200'; document.getElementById('floorsInput').value='2'; document.getElementById('tierSelect').value='standard'; document.getElementById('calcBtn').click()`);
  await ev(`document.getElementById('langBtn').click()`);
  check('BN toggle: title in Bengali', (await ev(`document.getElementById('title').textContent`)) === BN_TITLE);
  check('BN toggle: grand total in Bengali digits', (await ev(`document.getElementById('grandValue').textContent`)) === BN_TOTAL);
  check('BN toggle: tab label in Bengali', (await ev(`document.getElementById('tab-estimate').textContent`)) === '\u09b9\u09bf\u09b8\u09be\u09ac');
  await nav(BASE);
  check('BN toggle persists after reload', (await ev(`window.__ccbd.state.lang`)) === 'bn');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN', (await ev(`window.__ccbd.state.lang`)) === 'en');

  // ---- Mobile 390px: no horizontal overflow on any tab ----
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await nav(BASE);
  await ev(`document.getElementById('calcBtn').click()`);
  for (const tab of ['estimate', 'rates', 'saved', 'data']) {
    await clickTab(tab);
    await wait(300);
    const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    check('390px no overflow on ' + tab + ' tab', overflow <= 0, 'overflow=' + overflow);
  }

  // ---- Zero network requests: app is fully offline (only file:// loads) ----
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
