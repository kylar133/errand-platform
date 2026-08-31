import { Router } from 'express';
import { scope } from '../middlewares/response.js';
import { regionController } from '../controllers/regionController.js';

const router = Router();

router.use(scope('errand_api'));

router.get('/regions', regionController.listRegions);

export default router;
