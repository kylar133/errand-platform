export function requestLogger(req, res, next) {
  res.on('finish', () => {
    console.log(
      `${req.method} [${req.originalUrl}] code:[${res.statusCode}] ` +
      `time:[${Date.now() - res.locals.startedAt}ms] trace:[${res.locals.traceId}]`
    );
  });
  next();
}
