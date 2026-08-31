// 全域錯誤碼表

export const errorCodes = {
  0:    { httpStatus: 200, message: 'Success' },
  1001: { httpStatus: 400, message: 'Invalid Parameters' },
  1002: { httpStatus: 400, message: 'Fee Below Minimum (Min: 50)' },
  1003: { httpStatus: 400, message: 'Invalid Region' },
  1004: { httpStatus: 409, message: 'Email Already Registered' },
  2001: { httpStatus: 404, message: 'Task Not Found' },
  2002: { httpStatus: 409, message: 'Task Already Accepted' },
  2003: { httpStatus: 403, message: 'Cannot Accept Own Task' },
  2004: { httpStatus: 400, message: 'Max Active Tasks Exceeded (Limit:3)' },
  2005: { httpStatus: 400, message: 'Invalid Status Transition' },
  2006: { httpStatus: 400, message: 'Task Expired (Deadline passed)' },
  4001: { httpStatus: 401, message: 'Unauthorized / Token Expired' },
  4003: { httpStatus: 403, message: 'Forbidden' },
  5000: { httpStatus: 500, message: 'Internal Server Error' },
  // 以下自訂
  4040: { httpStatus: 404, message: 'Route Not Found' },
};
