// 統一回應格式
//   { "header": { "traceId", "module", "timespend", "code", "msg" }, "body": {...} }

export function ok(res, body = null, statusCode = 200) {
  res.status(statusCode).json({
    header: {
      traceId: res.locals.traceId,
      module: res.locals.module,
      timespend: Date.now() - res.locals.startedAt,
      code: 0,
      msg: 'success',
    },
    body,
  });
}

// route 設定 module
// router.use(scope('auth_api'));
export function scope(module) {
  return (req, res, next) => {
    res.locals.module = module;
    next();
  };
}
