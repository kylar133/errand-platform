import { errorCodes } from '../constants/errorCodes.js';

export class AppError extends Error {
  constructor(code, message) {
    const known = Object.hasOwn(errorCodes, code);
    const resolvedCode = known ? code : 5000;
    super(message ?? errorCodes[resolvedCode].message);
    this.name = 'AppError';
    this.code = resolvedCode;
    this.httpStatus = errorCodes[resolvedCode].httpStatus;
    this.isOperational = true;
  }
}
