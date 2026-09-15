// 參數校驗
import { AppError } from './AppError.js';

// 檢查
export function checkFields(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(1001, 'Request body must be a JSON object');
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new AppError(1001, `Unknown field: ${key}`);
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw new AppError(1001, `Missing field: ${key}`);
  }
}

// 非空字串（trim）
export function readText(value, maximum = 120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new AppError(1001, `Field must be a non-empty string (max ${maximum})`);
  }
  return value.trim();
}

// 列舉值
export function readChoice(value, choices) {
  if (typeof value !== 'string' || !choices.includes(value)) {
    throw new AppError(1001, `Field must be one of: ${choices.join(', ')}`);
  }
  return value;
}

// 整數範圍
export function readInteger(value, { min, max } = {}, code = 1001) {
  if (
    !Number.isInteger(value) ||
    (min !== undefined && value < min) ||
    (max !== undefined && value > max)
  ) {
    throw new AppError(code, 'Field must be an integer in range');
  }
  return value;
}

// ISO 日期時間字串
export function readIsoDate(value) {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw new AppError(1001, 'Field must be an ISO datetime string');
  }
  return value;
}
