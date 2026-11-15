import { Router } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate.js';
import { getMonthlySummaries, getCategoryBreakdown } from '../controllers/stats.controller.js';

const router = Router();

const categoryBreakdownQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

router.get('/monthly', getMonthlySummaries);
router.get('/categories', validateQuery(categoryBreakdownQuerySchema), getCategoryBreakdown);

export default router;
