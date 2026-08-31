import { AppError } from '../utils/AppError.js';
import { errorCodes } from '../constants/errorCodes.js';

export function errorHandler(err, req, res, next) {
  let code = 5000;
  let message = errorCodes[5000].message;

  if (err instanceof AppError) {
    code = err.code;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose schema 校驗失敗
    code = 1001;
    message = process.env.NODE_ENV === 'development' ? err.message : errorCodes[1001].message;
  } else if (err.name === 'CastError') {
    code = 1001;
    message = 'Invalid Parameters';
  } else if (err.code === 11000) {
    // MongoDB unique index 撞咗，要分開邊個 index：
    // User.email → 1004「Email Already Registered」；
    // 其他 unique 撞（例如 Task 第日加咗 unique 欄）→ 5000
    if (err.keyValue && Object.prototype.hasOwnProperty.call(err.keyValue, 'email')) {
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
  } else if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
    code = 4001;
    message = errorCodes[4001].message;
  }

  const httpStatus = errorCodes[code]?.httpStatus ?? 500;

  if (process.env.NODE_ENV === 'development') {
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
