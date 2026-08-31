import { regions } from '../constants/regions.js';
import { ok } from '../middlewares/response.js';

// GET /api/errand/regions —— 唔使登入
export const regionController = {
  listRegions(req, res) {
    ok(res, { regions });
  },
};
