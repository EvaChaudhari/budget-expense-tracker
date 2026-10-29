import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  getBudgets,
  upsertDefault,
  removeAllBudgets,
  upsertOverride,
  deleteOverride,
} from '../controllers/budgets.controller.js';

const router = Router();

const budgetDefaultSchema = z.object({
  year: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  amount: z.number().positive(),
});

const budgetOverrideSchema = z.object({
  amount: z.number().positive(),
});

router.get('/', getBudgets);
router.put('/:categoryId/default', validate(budgetDefaultSchema), upsertDefault);
router.delete('/:categoryId', removeAllBudgets);
router.put('/:categoryId/override/:year/:month', validate(budgetOverrideSchema), upsertOverride);
router.delete('/:categoryId/override/:year/:month', deleteOverride);

export default router;
