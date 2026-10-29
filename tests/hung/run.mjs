import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require = createRequire(process.env.HUNG_NODE_PACKAGES + '/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const station = { id: '22222222-2222-2222-2222-222222222222', name: 'Test station', address: 'Test address' };
async function run(name, fn) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const calls = []; let ticketReads = 0; let reviewed = false;
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      calls.push({ path: url.pathname, method: request.method(), body: request.postData() });
      let data = { success: true, data: {} };
      if (url.pathname.endsWith('/support')) data = { delegations: [], lostReports: [], review: reviewed ? { stars: 5, comment: 'Good' } : null };
      else if (url.pathname.endsWith('/support/review')) { reviewed = true; data = {}; }
      else if (url.pathname.endsWith('/support/delegations')) data = { pin: '01234567', expiresAt: new Date(Date.now()+3600000).toISOString() };
      else if (url.pathname === '/api/stations') data = { success: true, data: [station] };
      else if (url.pathname.includes('/status')) data = { success: true, data: { stationId: station.id, stationName: station.name, lockers: [] } };
      else if (url.pathname.toLowerCase() === '/api/bookings/booking-test') {
        ticketReads++;
        data = { success: true, data: { id: 'booking-test', bookingCode: 'BK-TEST', status: 'CONFIRMED', stationName: station.name, stationAddress: station.address, size: 'S', baseAmount: 10000, startAt: new Date().toISOString(), endAt: new Date(Date.now()+3600000).toISOString(), accessCode: '01234567', payments: [], qrPayload: Buffer.from(JSON.stringify({ expiresAt: new Date(Date.now() + (ticketReads === 1 ? -1000 : 60000)).toISOString(), nonce: String(ticketReads) })).toString('base64') } };
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(data) });
    }
    if (url.origin === 'http://127.0.0.1:5186') return route.continue();
    return route.abort();
  });
  try { await fn(page, calls, () => ticketReads); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: 'FAIL', error: error.message, errors, body: (await page.locator('body').innerText()).slice(-5000) }); }
  finally { await context.close(); console.log(JSON.stringify(results.at(-1))); }
}
await run('T23 five languages preserve active screen and translate Walk-in', async page => {
  await page.goto('http://127.0.0.1:5186/tests/hung/harness.html');
  for (const [code, title, book, hours] of [['EN','Welcome to SmartLocker','Book a locker','Hours'],['JA',null,'ロッカーを予約','時間'],['KO',null,'보관함 예약','시간'],['ZH',null,'预订储物柜','小时'],['VI',null,'Đặt tủ ngay','Số giờ']]) {
    await page.locator('header select').nth(1).selectOption(code);
    if (title) await page.getByText(title, { exact: true }).waitFor();
    await page.getByRole('button', { name: book, exact: true }).click();
    await page.getByText(hours, { exact: false }).first().waitFor();
    await page.locator('main section > button').last().click();
  }
});
await run('T09 expired QR refreshes without reloading page', async (page, calls, reads) => {
  await page.goto('http://127.0.0.1:5186/tests/hung/harness.html?view=ticket');
  await page.getByText('0123 4567', { exact: true }).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('strong')].some(node => /^\d+s$/.test(node.textContent || '') && parseInt(node.textContent) > 0));
  assert.ok(reads() >= 2);
});
await run('T21 submitted review cannot be submitted twice', async (page, calls) => {
  await page.goto('http://127.0.0.1:5186/tests/hung/harness.html?view=support');
  await page.getByRole('button', { name: 'Gửi đánh giá' }).click();
  await page.getByText('Đánh giá đã gửi:', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Gửi đánh giá' }).count(), 0);
  assert.equal(calls.filter(call => call.path.endsWith('/review')).length, 1);
});
await run('T16 delegate PIN comes from server and supports leading zero', async page => {
  await page.goto('http://127.0.0.1:5186/tests/hung/harness.html?view=support&status=STORED');
  await page.getByLabel('Số điện thoại hoặc email người nhận').fill('friend@example.invalid');
  await page.getByRole('button', { name: 'Tạo mã dùng một lần' }).click();
  await page.getByText('PIN người nhận: 01234567').waitFor();
});
await browser.close();
await fs.mkdir('docs/hung-results', { recursive: true });
await fs.writeFile('docs/hung-results/browser.json', JSON.stringify({ level: 'Production React components, mocked API; no real payment or hardware', results }, null, 2));
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
