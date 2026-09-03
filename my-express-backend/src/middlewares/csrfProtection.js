import { AppError } from '../utils/AppError.js';

// CSRF 防護：session cookie 會自動跟住跨站請求走，所以改動型方法
// （POST / PATCH / DELETE）帶咗 Origin 就一定要係自己個 host。
// 冇 Origin 嘅（curl、同源 GET）照放行。
export function csrfProtection(req, res, next) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return next(new AppError(4003, 'Cross-origin request blocked'));
  }
  if (originHost !== req.headers.host) {
    return next(new AppError(4003, 'Cross-origin request blocked'));
  }
  next();
}
