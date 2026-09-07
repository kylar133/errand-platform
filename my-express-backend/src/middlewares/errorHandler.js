import { AppError } from '../utils/AppError.js';
import { errorCodes } from '../constants/errorCodes.js';
import { config } from '../config/config.js';

export function errorHandler(err, req, res, next) {
  let code = 5000;
  let message = errorCodes[5000].message;

  if (err instanceof AppError) {
    code = err.code;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose schema 校驗失敗
    code = 1001;
    message = config.nodeEnv === 'development' ? err.message : errorCodes[1001].message;
  } else if (err.name === 'CastError') {
    code = 1001;
    message = 'Invalid Parameters';
  } else if (err.code === 11000) {

    const keys = Object.keys(err.keyPattern ?? {}).sort().join('+');
    if (keys === 'email') {
      code = 1004;
      message = errorCodes[1004].message;
    } else {
      code = 5000;
      message = errorCodes[5000].message;
    }
  } else if (err.type === 'entity.parse.failed') {
    // Request body 唔係合法 JSON
    code = 1001;
    message = 'Invalid JSON body';
  }

  const httpStatus = errorCodes[code]?.httpStatus ?? 500;

  if (config.nodeEnv === 'development') {
    if (code === 4040) {
      // 4040 係「未上線 / 唔存在」嘅正常訊號，
      console.log(`[4040] ${req.method} ${req.originalUrl}`);
    } else {
      console.error(`[${code}]`, err.stack ?? err);
    }
  } else if (httpStatus >= 500) {
    console.error(`[${code}]`, err.stack ?? err);
  }

  res.status(httpStatus).json({
    header: {
      traceId: res.locals?.traceId,
      module: res.locals?.module,
      timespend: res.locals?.startedAt ? Date.now() - res.locals.startedAt : 0,
      code,
      msg: message,
    },
    body: null,
  });
}
