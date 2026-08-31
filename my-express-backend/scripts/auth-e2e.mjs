// Auth 流程一鍵驗證（register → login → me，含錯誤路徑）
// 用法：先喺另一個 terminal 起 server（npm run dev），再行 `npm run test:e2e`
// 每次都用新 email，重複跑都唔會撞「Email 已註冊」
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000/api';
const EMAIL = `e2e-${Date.now()}@example.com`;
const PASSWORD = 'Passw0rd123';

let passed = 0;
let failed = 0;
let accessToken = '';

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

function expect(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`✔ ${name}`);
  } else {
    failed += 1;
    console.log(`✘ ${name}  ${detail}`);
  }
}

try {
  // 1. register 正常
  const r1 = await request('POST', '/auth/register', {
    body: { email: EMAIL, password: PASSWORD, name: 'E2E測試', phone: '91234567' },
  });
  expect('register 正常 → 201 / code 0', r1.status === 201 && r1.json.header?.code === 0, JSON.stringify(r1.json));
  expect('userId 係 ObjectId 格式（24 位 hex）', /^[0-9a-f]{24}$/.test(r1.json.body?.userId ?? ''), r1.json.body?.userId);

  // 2. email 重複
  const r2 = await request('POST', '/auth/register', {
    body: { email: EMAIL, password: PASSWORD, name: 'E2E測試', phone: '91234567' },
  });
  expect('register 重複 email → 409 / 1004', r2.status === 409 && r2.json.header?.code === 1004, JSON.stringify(r2.json));

  // 3. password 唔合格
  const r3 = await request('POST', '/auth/register', {
    body: { email: `x-${EMAIL}`, password: 'passwordonly', name: 'E2E測試', phone: '91234567' },
  });
  expect('password 得英文 → 400 / 1001', r3.status === 400 && r3.json.header?.code === 1001, JSON.stringify(r3.json));

  // 4. 電話格式錯（香港要 8 位，呢個得 5 位）
  const r4 = await request('POST', '/auth/register', {
    body: { email: `x-${EMAIL}`, password: PASSWORD, name: 'E2E測試', phone: '12345' },
  });
  expect('電話格式錯 → 400 / 1001', r4.status === 400 && r4.json.header?.code === 1001, JSON.stringify(r4.json));

  // 5. login 正確
  const r5 = await request('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  accessToken = r5.json.body?.accessToken ?? '';
  expect('login 正確 → 200 / code 0', r5.status === 200 && r5.json.header?.code === 0, JSON.stringify(r5.json));
  expect('有回 accessToken + refreshToken', Boolean(accessToken && r5.json.body?.refreshToken));

  // 6. login 密碼錯
  const r6 = await request('POST', '/auth/login', { body: { email: EMAIL, password: 'WrongPass123' } });
  expect('login 密碼錯 → 401 / 4001', r6.status === 401 && r6.json.header?.code === 4001, JSON.stringify(r6.json));

  // 7. /me 帶 Token
  const r7 = await request('GET', '/auth/me', { token: accessToken });
  expect('GET /me 帶 Token → 200', r7.status === 200 && r7.json.header?.code === 0, JSON.stringify(r7.json));
  expect('回返自己嘅 email', r7.json.body?.email === EMAIL, r7.json.body?.email);

  // 8. /me Token 亂寫
  const r8 = await request('GET', '/auth/me', { token: 'garbage.token.here' });
  expect('GET /me Token 亂寫 → 401 / 4001', r8.status === 401 && r8.json.header?.code === 4001, JSON.stringify(r8.json));
} catch (err) {
  console.error('\n連唔到 server！請先喺另一個 terminal 行：npm run dev');
  console.error(`（原因：${err.message}）`);
  process.exit(1);
}

console.log(`\n結果：${passed} 過 / ${failed} 失敗`);
process.exit(failed > 0 ? 1 : 0);
