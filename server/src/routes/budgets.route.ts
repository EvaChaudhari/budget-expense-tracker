import { Router } from 'express';
import { z } from 'zod';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  getBudgets,
  upsertDefault,
  removeAllBudgets,
  upsertOverride,
  deleteOverride,
} from '../controllers/budgets.controller.js';

const router = Router();

const budgetQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const categoryParamSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});

const overrideParamSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const budgetDefaultSchema = z.object({
  year: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  amount: z.number().positive(),
});

const budgetOverrideSchema = z.object({
  amount: z.number().positive(),
});

router.get('/', validateQuery(budgetQuerySchema), getBudgets);
router.put('/:categoryId/default', validateParams(categoryParamSchema), validate(budgetDefaultSchema), upsertDefault);
router.delete('/:categoryId', validateParams(categoryParamSchema), removeAllBudgets);
router.put('/:categoryId/override/:year/:month', validateParams(overrideParamSchema), validate(budgetOverrideSchema), upsertOverride);
router.delete('/:categoryId/override/:year/:month', validateParams(overrideParamSchema), deleteOverride);

export default router;
