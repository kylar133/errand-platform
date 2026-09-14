import { Router } from 'express';
import { scope } from '../middlewares/response.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import { taskController } from '../controllers/taskController.js';

//   POST   /tasks                 B：發佈任務（requireAuth）✅ M1
//   GET    /tasks                 B：列表（optionalAuth；scope/status/地區/分頁/排序）✅ M1
//   GET    /tasks/:taskId         B：詳情（optionalAuth + 動態脫敏）—— M2
//   POST   /tasks/:taskId/accept  C：搶單（requireAuth + findOneAndUpdate）—— M3
//   PATCH  /tasks/:taskId/status  C：cancel / deliver / confirm —— M3

//   - 獎金rewardFee < 50 → throw new AppError(1002)；
//     地區用 constants/regions.js 嘅 isValidRegion() 校驗，唔啱 throw new AppError(1003)。
//   - _id 由 Mongo 自動生成 ObjectId，唔使自己設（idGenerator 已刪除）

//   - 詳情脫敏：非發單人 / 非跑腿者，addressDetail / contactName /contactPhone / destAddress 
//     要回「*** (接單後可見)」或部分打碼；前端原樣顯示。
//   - 接單要用 findOneAndUpdate({_id, status: 'pending', deadline: {$gt: new Date()}}, ...)
//     原子更新，避免兩個人同時搶到同一單。

const router = Router();
//設置res.locals.module
router.use(scope('errand_api'));

router.post('/tasks', requireAuth, taskController.createTask);
router.get('/tasks', optionalAuth, taskController.listTasks);

export default router;
