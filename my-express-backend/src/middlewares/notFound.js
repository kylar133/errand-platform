import { AppError } from '../utils/AppError.js';
import { config } from '../config/config.js';

export function notFound(req, res, next) {
  if (config.nodeEnv === 'development') {
    console.error(`404: ${req.method} ${req.originalUrl}`);
  }
  next(new AppError(4040));
}
