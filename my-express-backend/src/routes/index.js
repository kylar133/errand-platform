import { Router } from 'express';
import authRoutes from './authRoutes.js';
import regionRoutes from './regionRoutes.js';
import taskRoutes from './taskRoutes.js';

const router = Router();

router.use('/auth', authRoutes);   // /api/auth/...
router.use('/errand', regionRoutes); // /api/errand/regions
router.use('/errand', taskRoutes);   // /api/errand/tasks...（B / C 實作）

export default router;
