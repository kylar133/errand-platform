import { authService } from '../services/authService.js';
import { ok } from '../middlewares/response.js';

export const authController = {
  async register(req, res) {
    const result = await authService.register(req.body);
    ok(res, result, 201);
  },

  async login(req, res) {
    const result = await authService.login(req.body);
    ok(res, result);
  },

  async me(req, res) {
    const result = await authService.getProfile(req.user.id);
    ok(res, result);
  },
};
