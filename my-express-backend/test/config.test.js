import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/config.js';

// loadConfig 接受自訂 env，測試唔使掂真嘅 .env / 環境變數

test('dev 預設值：NODE_ENV 冇設 → development + 本機預設', () => {
  const c = loadConfig({ env: {} });
  assert.equal(c.nodeEnv, 'development');
  assert.equal(c.isProduction, false);
  assert.equal(c.port, 3000);
  assert.equal(c.mongoUri, 'mongodb://127.0.0.1:27017/errand');
  assert.equal(c.sessionSecret, 'dev-secret-do-not-use-in-production');
});

test('自訂值照讀入', () => {
  const c = loadConfig({
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/mydb',
      SESSION_SECRET: 'abcdefghijklmnop',
    },
  });
  assert.equal(c.nodeEnv, 'test');
  assert.equal(c.port, 4000);
  assert.equal(c.mongoUri, 'mongodb://127.0.0.1:27017/mydb');
  assert.equal(c.sessionSecret, 'abcdefghijklmnop');
});

test('NODE_ENV 亂寫 → throw', () => {
  assert.throws(() => loadConfig({ env: { NODE_ENV: 'staging' } }), /NODE_ENV/);
});

test('PORT 唔係 1-65535 整數 → throw', () => {
  assert.throws(() => loadConfig({ env: { PORT: 'abc' } }), /PORT/);
  assert.throws(() => loadConfig({ env: { PORT: '0' } }), /PORT/);
  assert.throws(() => loadConfig({ env: { PORT: '99999' } }), /PORT/);
});

test('MONGODB_URI 唔係 mongodb 開頭 → throw', () => {
  assert.throws(() => loadConfig({ env: { MONGODB_URI: 'http://example.com' } }), /MONGODB_URI/);
});

test('production 冇 MONGODB_URI → throw（fail-fast）', () => {
  assert.throws(
    () => loadConfig({ env: { NODE_ENV: 'production', SESSION_SECRET: 'abcdefghijklmnop' } }),
    /MONGODB_URI/
  );
});

test('production 冇 SESSION_SECRET 或者太短 → throw（fail-fast）', () => {
  assert.throws(
    () => loadConfig({ env: { NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:27017/errand' } }),
    /SESSION_SECRET/
  );
  assert.throws(
    () => loadConfig({
      env: { NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:27017/errand', SESSION_SECRET: 'short' },
    }),
    /SESSION_SECRET/
  );
});

test('production 齊料 → isProduction true', () => {
  const c = loadConfig({
    env: {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/errand',
      SESSION_SECRET: 'abcdefghijklmnop',
    },
  });
  assert.equal(c.isProduction, true);
});

test('回傳嘅 config 係 frozen（唔可以改）', () => {
  const c = loadConfig({ env: {} });
  assert.ok(Object.isFrozen(c));
});
