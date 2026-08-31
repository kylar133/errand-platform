import { AppError } from '../utils/AppError.js';


export function notFound(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`404: ${req.method} ${req.originalUrl}`);
  }
  next(new AppError(4040));
}
