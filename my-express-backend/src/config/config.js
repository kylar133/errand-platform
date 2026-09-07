
const NODE_ENVS = new Set(['development', 'test', 'production']);

function requireString(env, key) {
  const value = env[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} 缺失或唔係字串`);
  }
  return value;
}

export function loadConfig({ env = process.env } = {}) {
  const nodeEnv = env.NODE_ENV || 'development';
  if (!NODE_ENVS.has(nodeEnv)) {
    throw new Error('NODE_ENV 只接受 development / test / production');
  }
  const isProduction = nodeEnv === 'production';

  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 必須係 1 至 65535 嘅整數');
  }

  // production 一定要自己設 MONGODB_URI；dev/test 用本機預設
  let mongoUri;
  if (isProduction) {
    mongoUri = requireString(env, 'MONGODB_URI');
  } else {
    mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/errand';
  }
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI 只接受 mongodb:// 或 mongodb+srv:// 開頭');
  }

  // production 一定要有夠長嘅 SESSION_SECRET；dev/test 有預設
  let sessionSecret;
  if (isProduction) {
    sessionSecret = requireString(env, 'SESSION_SECRET');
    if (sessionSecret.length < 16) {
      throw new Error('SESSION_SECRET 最少要 16 個字元');
    }
  } else {
    sessionSecret = env.SESSION_SECRET || 'dev-secret-do-not-use-in-production';
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    mongoUri,
    sessionSecret,
  });
}

export const config = loadConfig();
