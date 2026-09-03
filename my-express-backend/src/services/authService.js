import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 10;

export const authService = {
  // POST /api/auth/register
  async register({ email, password, name, phone }) {
    validateRegisterInput({ email, password, name, phone });

    // Email 重複
    const exists = await User.findOne({ email });
    if (exists) throw new AppError(1004);
    // 密碼加密
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // _id 由 Mongo 自動生成 ObjectId
    const user = await User.create({ email, password: passwordHash, name, phone });
    return { userId: user._id, registeredAt: user.createdAt };
  },

  // POST /api/auth/login —— 只驗帳密，session 由 controller 設
  async login({ email, password }) {
    if (!email || !password) throw new AppError(1001);

    const user = await User.findOne({ email });
    // 帳號或密碼錯
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(4001);
    }

    return { userId: user._id, name: user.name, email: user.email };
  },

  // GET /api/auth/me —— 前端登入後要知自己User
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError(4001);
    return { userId: user._id, name: user.name, email: user.email, phone: user.phone };
  },
};

// 參數校驗
function validateRegisterInput({ email, password, name, phone }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) {
    throw new AppError(1001, 'Email format invalid');
  }
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AppError(1001, 'Password must be >= 8 chars with letters and digits');
  }
  if (!name || name.length < 2 || name.length > 20) {
    throw new AppError(1001, 'Name must be 2-20 characters');
  }
  // 香港手機格式：8 位數字，首位 4-9
  if (!/^[456789]\d{7}$/.test(phone ?? '')) {
    throw new AppError(1001, 'Phone must be 8-digit HK mobile (e.g. 91234567)');
  }
}
