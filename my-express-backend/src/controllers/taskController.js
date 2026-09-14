import { taskService } from '../services/taskService.js';
import { ok } from '../middlewares/response.js';

export const taskController = {
  // POST /api/errand/tasks —— 發佈任務
  async createTask(req, res) {
    const result = await taskService.createTask({ ...req.body, user: req.user });
    ok(res, result, 201);
  },

  // GET /api/errand/tasks —— 任務列表（大廳 / 我發佈 / 我接咗）
  async listTasks(req, res) {
    const result = await taskService.listTasks({ query: req.query, user: req.user });
    ok(res, result);
  },
};
