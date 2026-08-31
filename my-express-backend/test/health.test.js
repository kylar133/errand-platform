import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer } from '../src/server.js';

// 用 Node 內建 test runner（npm test），唔使裝測試 library。
// 呢啲測試唔需要 MongoDB，因為 startServer 唔會連 DB（見 server.js 註解）。

let server;
let baseUrl;

before(async () => {
  server = await startServer({ port: 0 }); // port 0 = 系統隨機派 port
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await stopServer(server);
});

test('GET /api/health 健康檢查回 200', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Errand Platform API');
});

test('GET / 回前端 index.html', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.ok(html.includes('跑腿平台'), 'index.html 要有品牌名');
  assert.ok(html.includes('js/api.js'), 'index.html 要載入 api.js');
});

test('唔存在嘅 route 回統一 404 格式（doc §0.3）', async () => {
  const res = await fetch(`${baseUrl}/api/whatever`);
  const json = await res.json();

  assert.equal(res.status, 404);
  assert.equal(json.header.code, 4040);
  assert.equal(json.header.module, 'unknown');
  assert.equal(typeof json.header.traceId, 'string');
  assert.equal(typeof json.header.timespend, 'number');
  assert.equal(json.body, null);
});

test('GET /api/errand/regions 回統一格式同地區資料', async () => {
  const res = await fetch(`${baseUrl}/api/errand/regions`);
  const json = await res.json();

  assert.equal(json.header.code, 0);
  assert.equal(json.header.module, 'errand_api');
  assert.equal(json.header.msg, 'success');
  assert.ok(Array.isArray(json.body.regions));
});

test('JSON body 格式錯回 1001', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json',
  });
  const json = await res.json();

  assert.equal(res.status, 400);
  assert.equal(json.header.code, 1001);
  // traceId 一定要有：requestContext 排喺 body parser 之前先保證到
  assert.equal(typeof json.header.traceId, 'string');
});

test('唔帶 Token 打 /api/auth/me 回 4001', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`);
  const json = await res.json();

  assert.equal(res.status, 401);
  assert.equal(json.header.code, 4001);
  assert.equal(json.header.module, 'auth_api');
});
