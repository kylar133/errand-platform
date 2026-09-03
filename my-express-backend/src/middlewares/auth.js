import { AppError } from '../utils/AppError.js';

// 一定要登入嘅 API：router.get('/me', requireAuth, handler)
export function requireAuth(req, res, next) {
  if (!req.session?.userId) return next(new AppError(4001));
  req.user = { id: req.session.userId, name: req.session.name };
  next();
}

// 可帶可不帶登入嘅 API（任務列表 / 詳情）：有 session 就解出 req.user
export function optionalAuth(req, res, next) {
  if (req.session?.userId) {
    req.user = { id: req.session.userId, name: req.session.name };
  }
  next();
}
