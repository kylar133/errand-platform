import { randomUUID } from 'node:crypto';

// 每個請求生成 traceId + 計時起點。
// response.js 同 errorHandler.js 會讀 res.locals 入面嘅嘢，唔使每個 handler 自己傳。
export function requestContext(req, res, next) {
  // client 有帶 x-trace-id 就用返佢（跨端追蹤），冇先生成；
  // 長度限 64 以防亂填
  const clientId = req.headers['x-trace-id'];
  const traceId =
    typeof clientId === 'string' && clientId.length > 0 && clientId.length <= 64
      ? clientId : randomUUID();
  res.locals.traceId = traceId;
  res.locals.startedAt = Date.now();
  res.locals.module = 'unknown'; // route 會用 scope() 覆蓋
  res.setHeader('x-trace-id', traceId);
  next();
}
