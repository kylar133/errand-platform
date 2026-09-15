import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { checkFields, readText } from '../utils/validation.js';

const SALT_ROUNDS = 10;
const REGISTER_FIELDS = ['email', 'password', 'name', 'phone'];

export const authService = {
  // POST /api/auth/register
  async register(body) {
    const { email, password, name, phone } = validateRegisterInput(body);

    // Email 重複
    const exists = await User.findOne({ email }).lean();
    if (exists) throw new AppError(1004);
    // 密碼加密
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // _id 由 Mongo 自動生成 ObjectId
    const user = await User.create({ email, password: passwordHash, name, phone });
    return { userId: user._id, registeredAt: user.createdAt };
  },

  // POST /api/auth/login —— 只驗帳密，session 由 controller 設
  async login(body) {
    const { email, password } = validateLoginInput(body);

    const user = await User.findOne({ email }).select('+password').lean();
    // 帳號或密碼錯
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(4001);
    }

    return { userId: user._id, name: user.name, email: user.email };
  },

  // GET /api/auth/me —— 前端登入後要知自己User
  async getProfile(userId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError(4001);
    return { userId: user._id, name: user.name, email: user.email, phone: user.phone };
  },
};

// 參數校驗：白名單 + 必填先過一次，再做格式校驗
// password 唔 trim（課程版都係咁做，避免改動用戶原本設定嘅密碼）
function validateRegisterInput(body) {
  checkFields(body, REGISTER_FIELDS, REGISTER_FIELDS);
  const email = readText(body.email, 120);
  const password = body.password;
  const name = readText(body.name, 20);
  const phone = readText(body.phone, 8);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(1001, 'Email format invalid');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 20 ||
      !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AppError(1001, 'Password must be 8-20 chars with letters and digits');
  }
  if (name.length < 2) {
    throw new AppError(1001, 'Name must be 2-20 characters');
  }
  // 香港手機格式：8 位數字，首位 4-9
  if (!/^[456789]\d{7}$/.test(phone)) {
    throw new AppError(1001, 'Phone must be 8-digit HK mobile (e.g. 91234567)');
  }
  return { email, password, name, phone };
}

function validateLoginInput(body) {
  checkFields(body, ['email', 'password'], ['email', 'password']);
  const email = readText(body.email, 120);
  // 同 register 一致：8–20；超過 20 一定唔係有效密碼，早啲擋慳返 bcrypt
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 20) {
    throw new AppError(1001, 'Password must be 8-20 characters');
  }
  return { email, password: body.password };
}
