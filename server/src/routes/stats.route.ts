import { Router } from 'express';
import { getMonthlySummaries, getCategoryBreakdown } from '../controllers/stats.controller.js';

const router = Router();

router.get('/monthly', getMonthlySummaries);
router.get('/categories', getCategoryBreakdown);

export default router;
