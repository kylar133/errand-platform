import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { scope } from '../middlewares/response.js';
import { authController } from '../controllers/authController.js';

const router = Router();
//全域權限
router.use(scope('auth_api'));

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
