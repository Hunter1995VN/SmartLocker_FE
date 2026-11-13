// Avatar upload API checks against a LOCAL backend (http://localhost:5000) with sample data.
// usage: node tests/hung/avatar-api.mjs <email> <password>
const B = process.env.API_BASE || 'http://localhost:5000';
const [email, password] = process.argv.slice(2);
if (!/localhost|127\.0\.0\.1/.test(B)) { console.log('REFUSED: local backend only'); process.exit(2); }

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); };

const login = await (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json();
const token = login.data?.accessToken;
check('login', !!token);
const auth = { Authorization: 'Bearer ' + token };
const upload = async (bytes, name, type) => {
  const f = new FormData();
  f.append('file', new Blob([bytes], { type }), name);
  const r = await fetch(B + '/api/profile/avatar', { method: 'POST', headers: auth, body: f });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

let r = await upload(PNG, 'a.png', 'image/png');
const url = r.body.data?.avatarUrl;
check('upload PNG returns 200 and a local avatar path', r.status === 200 && /^\/api\/Profile\/avatar\/[0-9a-f]{32}-[0-9a-f]{32}\.png$/.test(url ?? ''), JSON.stringify(r.body).slice(0, 160));

const img = await fetch(B + url);
check('avatar is served (public GET, image/png, nosniff)', img.status === 200 && img.headers.get('content-type') === 'image/png' && img.headers.get('x-content-type-options') === 'nosniff', `status ${img.status} ${img.headers.get('content-type')}`);
check('served bytes equal uploaded bytes', Buffer.from(await img.arrayBuffer()).equals(PNG));

r = await upload(Buffer.from('<script>alert(1)</script>'), 'evil.png', 'image/png');
check('non-image content disguised as .png is rejected (400)', r.status === 400, `status ${r.status}`);

r = await upload(Buffer.alloc(2 * 1024 * 1024 + 10, 0xff), 'big.jpg', 'image/jpeg');
check('file over 2 MB is rejected (400/413)', r.status === 400 || r.status === 413, `status ${r.status}`);

const noFile = await fetch(B + '/api/profile/avatar', { method: 'POST', headers: auth, body: new FormData() });
check('request without a file is rejected (400)', noFile.status === 400, `status ${noFile.status}`);

const anon = await fetch(B + '/api/profile/avatar', { method: 'POST', body: new FormData() });
check('upload without login is rejected (401)', anon.status === 401, `status ${anon.status}`);

const traversal = await fetch(B + '/api/Profile/avatar/..%2F..%2Fappsettings.json');
check('path traversal in avatar name is rejected (404)', traversal.status === 404, `status ${traversal.status}`);

// profile update without avatarUrl must keep the uploaded avatar
const prof = (await (await fetch(B + '/api/profile', { headers: auth })).json()).data;
const put = await (await fetch(B + '/api/profile', { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: prof.fullName, phone: prof.phone }) })).json();
check('saving name/phone without avatarUrl keeps the uploaded avatar', put.data?.avatarUrl === url, JSON.stringify(put).slice(0, 160));

const bad = await (await fetch(B + '/api/profile', { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: prof.fullName, phone: prof.phone, avatarUrl: 'javascript:alert(1)' }) })).json();
check('javascript: avatar URL is rejected', bad.success === false, JSON.stringify(bad).slice(0, 160));

// replacing deletes the old file
r = await upload(PNG, 'b.png', 'image/png');
const url2 = r.body.data?.avatarUrl;
const old = await fetch(B + url);
check('replacing the avatar removes the previous file (404)', url2 && url2 !== url && old.status === 404, `old status ${old.status}`);

const del = await fetch(B + '/api/profile/avatar', { method: 'DELETE', headers: auth });
const after = (await (await fetch(B + '/api/profile', { headers: auth })).json()).data;
check('delete clears the avatar and the file', del.status === 200 && !after.avatarUrl && (await fetch(B + url2)).status === 404, `status ${del.status}`);

console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
