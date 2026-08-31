import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

// JWT 驗證 middleware。
// 一定要登入嘅 API：router.get('/me', requireAuth, handler)
export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return next(new AppError(4001));
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError(4001));
  }
}

// 可帶可不帶 Token 嘅 API（例如任務列表 / 詳情）：
// 帶咗合法 Token 就解出 req.user，冇帶或者 Token 錯都當未登入照行。
export function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return next();
  try {
    req.user = verifyToken(token);
  } catch {
    // 有帶 Token 但唔合法 → 當未登入處理
  }
  next();
}

function verifyToken(token) {
  const payload = jwt.verify(token, jwtSecret());
  return { id: payload.id, name: payload.name };
}

// 每次 call 先讀 env，避免 module load 順序問題（dotenv 未 load 就讀會係 undefined）
function jwtSecret() {
  return process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-production';
}

function getBearerToken(req) {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}
