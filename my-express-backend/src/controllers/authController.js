import { authService } from '../services/authService.js';
import { ok } from '../middlewares/response.js';

export const authController = {
  async register(req, res) {
    const result = await authService.register(req.body);
    // 註冊成功即自動登入
    req.session.userId = String(result.userId);
    req.session.name = req.body.name;
    ok(res, result, 201);
  },

  async login(req, res) {
    const result = await authService.login(req.body);
    // 先 regenerate 防 session fixation：就算有人預先塞咗 cookie 都冇用
    await new Promise((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve()))
    );
    req.session.userId = String(result.userId);
    req.session.name = result.name;
    ok(res, result);
  },

  async logout(req, res, next) {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('sid');
      ok(res, null);
    });
  },

  async me(req, res) {
    const result = await authService.getProfile(req.user.id);
    ok(res, result);
  },
};
