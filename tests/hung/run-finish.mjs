// Kiểm tra trình duyệt cho UC-T15 (khách vãng lai), UC-T16 (ủy quyền) và UC-T23 (kiosk đa ngôn ngữ + giọng nói).
// Mức kiểm chứng: component React thật chạy trong Edge headless, API và Web Speech được giả lập ở tầng mạng/trình duyệt.
// KHÔNG dùng thanh toán thật, MQTT, ESP32 hay SQL Server — kết quả này không thay thế kiểm thử trên hệ thống thật.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const packages = process.env.HUNG_NODE_PACKAGES || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node';
const require = createRequire(packages + '/index.js');
const { chromium } = require('playwright');
const ORIGIN = process.env.HUNG_ORIGIN || 'http://127.0.0.1:5186';
const PAGE = ORIGIN + '/tests/hung/finish.html';
const STATION_ID = '22222222-2222-2222-2222-222222222222';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const future = (ms) => new Date(Date.now() + ms).toISOString();
const json = (body) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(body) });

const stationDetail = {
  id: STATION_ID, name: 'Test station', address: 'Test address', latitude: 10.77, longitude: 106.7, status: 'ACTIVE',
  opensAt: '00:00', closesAt: '23:59', totalS: 1, totalM: 1, totalL: 0, availableS: 1, availableM: 1, availableL: 0,
  sizePricing: [{ size: 'S', pricePerBlock: 15000, blockHours: 1, minHours: 1, maxHours: 72 }, { size: 'M', pricePerBlock: 25000, blockHours: 1, minHours: 1, maxHours: 72 }],
};

async function run(name, fn, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (options.init) await context.addInitScript(options.init);
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const calls = []; const state = { grants: [], walkin: options.walkin || {}, delegation: options.delegation };
  await context.route('**/*', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname.toLowerCase();
    if (url.pathname.startsWith('/api/')) {
      const body = request.postData();
      calls.push({ path: url.pathname, method: request.method(), body });
      const walk = state.walkin;
      if (path === '/api/kiosk/walk-in' && request.method() === 'POST')
        return route.fulfill(json({ id: 'sess-1', secret: 'a'.repeat(64), expiresAt: walk.expiresAt ? walk.expiresAt() : future(45 * 60000),
          payment: { bookingId: 'b1', bookingCode: 'BK-WALK', amount: 15000, qrCode: '00020101021238570010A000000727' } }));
      if (path === '/api/kiosk/walk-in/sess-1/status') return route.fulfill(json(walk.status ? walk.status() : { id: 'b1', bookingCode: 'BK-WALK', status: 'PENDING_PAYMENT' }));
      if (path === '/api/kiosk/walk-in/sess-1/cancel') return route.fulfill(json({ status: 'CANCELLED' }));
      if (path === '/api/stations/' + STATION_ID) return route.fulfill(json({ success: true, data: stationDetail }));
      if (path === '/api/bookings/booking-test/support/delegations' && request.method() === 'POST') {
        const grant = { id: 'g1', contact: JSON.parse(body).contact, expiresAt: future(3600000) };
        state.grants = [grant];
        return route.fulfill(json({ delegations: state.grants, id: 'g1', pin: '01234567', expiresAt: grant.expiresAt, ...(state.delegation ? { delivery: state.delegation } : {}) }));
      }
      if (path === '/api/bookings/booking-test/support') return route.fulfill(json({ delegations: state.grants, lostReports: [], review: null }));
      if (path === '/api/stations') return route.fulfill(json({ success: true, data: [{ id: STATION_ID, name: 'Test station', address: 'Test address' }] }));
      if (path.includes('/status')) return route.fulfill(json({ success: true, data: { stationId: STATION_ID, stationName: 'Test station', lockers: [] } }));
      return route.fulfill(json({ success: true, data: {} }));
    }
    if (url.origin === ORIGIN) return route.continue();
    return route.abort();
  });
  try { await fn(page, calls); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: 'FAIL', error: error.message, errors, body: (await page.locator('body').innerText()).slice(-1500) }); }
  finally { await context.close(); console.log(JSON.stringify(results.at(-1))); }
}
const text = (page, lang, key) => page.evaluate(([l, k]) => window.__t(l, k), [lang, key]);

// ───────────── UC-T16 ─────────────
const delegationCase = (label, delivery, expected, extra = async () => {}) => run(`T16 ${label}`, async (page, calls) => {
  await page.goto(PAGE + '?view=delegation');
  await page.getByLabel('Người nhận ủy quyền').fill(delivery?.channel === 'MANUAL' ? '0901234567' : 'friend@example.com');
  await page.getByRole('button', { name: 'Tạo mã 8 số dùng một lần' }).click();
  await page.getByRole('status').filter({ hasText: expected }).waitFor();
  await page.getByText('0123 4567').waitFor();                       // chủ đơn luôn thấy mã
  assert.equal(calls.filter((c) => c.method === 'POST' && c.path.endsWith('/delegations')).length, 1);
  await extra(page);
}, { delegation: delivery });
await delegationCase('email sent: tells the owner the PIN was emailed and still shows it', { channel: 'EMAIL', sent: true }, 'Đã gửi mã tới friend@example.com');
await delegationCase('email not sent: shows reason and asks owner to share the PIN', { channel: 'EMAIL', sent: false, reason: 'SMTP_NOT_CONFIGURED' }, 'Chưa gửi được email tới người nhận (máy chủ chưa cấu hình email)');
await delegationCase('email send failure: generic reason, PIN still available', { channel: 'EMAIL', sent: false, reason: 'SEND_FAILED' }, 'gửi thư thất bại');
await delegationCase('phone: explains there is no SMS channel', { channel: 'MANUAL', sent: false, reason: 'NO_SMS_PROVIDER' }, 'chưa có kênh gửi tự động');
await delegationCase('older backend without delivery field still works', undefined, 'Mã chỉ hiển thị lần này');

// ───────────── UC-T15 (giao diện khách vãng lai) ─────────────
async function startWalkIn(page, lang) {
  await page.goto(PAGE + '?view=walkin&lang=' + lang);
  await page.getByLabel(await text(page, lang, 'phone')).fill('0901234567');
  await page.getByRole('button', { name: await text(page, lang, 'create') }).click();
}
await run('T15 unpaid session can be cancelled once and the kiosk says so', async (page, calls) => {
  await startWalkIn(page, 'EN');
  await page.getByText('BK-WALK', { exact: false }).waitFor();
  const cancel = await text(page, 'EN', 'cancelUnpaid');
  await page.getByRole('button', { name: cancel }).click();
  await page.getByText(await text(page, 'EN', 'cancelled')).waitFor();
  const posts = calls.filter((c) => c.path.endsWith('/sess-1/cancel'));
  assert.equal(posts.length, 1); assert.ok(JSON.parse(posts[0].body).secret.length === 64);
  assert.equal(await page.getByRole('button', { name: cancel }).count(), 0);
});
await run('T15 paid ticket shows the PIN and hands off only after the customer taps ready', async (page) => {
  await startWalkIn(page, 'EN');
  await page.getByText('0123 4567').waitFor();
  assert.deepEqual(await page.evaluate(() => window.__ready), []);
  await page.getByRole('button', { name: await text(page, 'EN', 'ready') }).click();
  await page.waitForFunction(() => window.__ready.length === 1);
  assert.deepEqual(await page.evaluate(() => window.__ready), ['01234567']);
}, { walkin: { status: () => ({ id: 'b1', bookingCode: 'BK-WALK', status: 'CONFIRMED', accessCode: '01234567' }) } });
await run('T15 paid but PIN unreadable asks to contact staff and never offers handoff', async (page) => {
  await startWalkIn(page, 'EN');
  await page.getByRole('alert').filter({ hasText: await text(page, 'EN', 'paidMissingPin') }).waitFor();
  assert.equal(await page.getByRole('button', { name: await text(page, 'EN', 'ready') }).count(), 0);
}, { walkin: { status: () => ({ id: 'b1', bookingCode: 'BK-WALK', status: 'CONFIRMED', accessCode: null }) } });
await run('T15 expired session shows the notice and hides cancel', async (page) => {
  await startWalkIn(page, 'EN');
  await page.getByRole('alert').filter({ hasText: await text(page, 'EN', 'sessionExpired') }).waitFor();
  assert.equal(await page.getByRole('button', { name: await text(page, 'EN', 'cancelUnpaid') }).count(), 0);
}, { walkin: { expiresAt: () => future(-1000) } });
await run('T15 walk-in screen translates in five languages', async (page) => {
  for (const lang of ['VI', 'EN', 'JA', 'KO', 'ZH']) {
    await page.goto(PAGE + '?view=walkin&lang=' + lang);
    await page.getByText(await text(page, lang, 'walkTitle'), { exact: true }).waitFor();
    await page.getByRole('button', { name: await text(page, lang, 'create') }).waitFor();
  }
});

// ───────────── UC-T23 ─────────────
const fakeSpeech = (locales) => `(() => {
  window.__spoken = []; window.__cancelled = 0;
  const voices = ${JSON.stringify(locales)}.map((lang) => ({ lang, name: 'V-' + lang }));
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices,
    speak: (u) => window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.name }),
    cancel: () => { window.__cancelled++; }, addEventListener() {}, removeEventListener() {} } });
})();`;
const ALL = ['vi-VN', 'en-US', 'ja-JP', 'ko-KR', 'zh-CN'];
const scripts = { VI: /[ăâđêôơưàảãáạ]/i, EN: /^Self-service/, JA: /[\u3040-\u30ff]/, KO: /[\uac00-\ud7af]/, ZH: /[\u4e00-\u9fff]/ };
await run('T23 each language speaks the welcome instruction with its own voice', async (page) => {
  for (const [lang, locale] of [['VI', 'vi-VN'], ['EN', 'en-US'], ['JA', 'ja-JP'], ['KO', 'ko-KR'], ['ZH', 'zh-CN']]) {
    await page.goto(PAGE);
    await page.locator(`nav button[lang="${lang.toLowerCase()}"]`).click();
    await page.waitForFunction(() => window.__spoken.length > 0);
    const spoken = (await page.evaluate(() => window.__spoken)).at(-1);
    assert.equal(spoken.lang, locale, `${lang} locale`); assert.equal(spoken.voice, 'V-' + locale);
    assert.match(spoken.text, scripts[lang], `${lang} text`);
    assert.equal(await page.getByText(await text(page, lang, 'voiceUnavailable')).count(), 0);
  }
}, { init: fakeSpeech(ALL) });
await run('T23 missing voice for the chosen language shows a written notice instead of failing', async (page) => {
  await page.goto(PAGE);
  await page.locator('nav button[lang="ja"]').click();
  await page.getByText(await text(page, 'JA', 'voiceUnavailable')).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__spoken), []);
}, { init: fakeSpeech(['en-US']) });
await run('T23 turning sound off stops speech and does not speak again', async (page) => {
  await page.goto(PAGE);
  await page.locator('nav button[lang="en"]').click();
  await page.waitForFunction(() => window.__spoken.length === 1);
  const before = await page.evaluate(() => window.__cancelled);
  await page.locator('button', { hasText: '🔊' }).click();
  await page.waitForFunction((n) => window.__cancelled > n, before);
  assert.equal((await page.evaluate(() => window.__spoken)).length, 1);
}, { init: fakeSpeech(ALL) });
await run('T23 browser without Web Speech still works and shows the notice', async (page) => {
  await page.goto(PAGE);
  await page.locator('nav button[lang="ko"]').click();
  await page.getByText(await text(page, 'KO', 'voiceUnavailable')).waitFor();
}, { init: `delete window.speechSynthesis; Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); delete window.speechSynthesis;` });
await run('T23 offline pickup button is translated in all languages (no hard-coded Vietnamese)', async (page) => {
  const source = await fs.readFile('src/pages/kiosk/KioskPage.tsx', 'utf8');
  assert.ok(!source.includes('Xác nhận đã lấy hành lý (Ngoại tuyến)'));
  for (const lang of ['VI', 'EN', 'JA', 'KO', 'ZH']) {
    await page.goto(PAGE);
    const label = await text(page, lang, 'confirmPickupOffline');
    assert.ok(label && label.length > 3);
    if (lang !== 'VI') assert.notEqual(label, await text(page, 'VI', 'confirmPickupOffline'));
  }
});

await browser.close();
await fs.mkdir('docs/hung-results', { recursive: true });
await fs.writeFile('docs/hung-results/finish-browser.json', JSON.stringify({
  level: 'Production React components in Edge headless; API and Web Speech mocked; no real payment, email, MQTT or hardware',
  ranAt: new Date().toISOString(), results,
}, null, 2));
console.log(`${results.filter((r) => r.status === 'PASS').length}/${results.length} PASS`);
if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
