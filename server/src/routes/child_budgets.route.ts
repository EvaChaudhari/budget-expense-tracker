import { Router } from 'express';
import { z } from 'zod';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  getChildBudgets,
  upsertChildBudget,
  deleteChildBudget,
} from '../controllers/child_budgets.controller.js';

const router = Router();

const paramsSchema = z.object({
  memberId: z.string().min(1),
  categoryId: z.coerce.number().int().positive(),
});

const querySchema = z.object({
  userId: z.string().optional(),
  memberId: z.string().optional(),
});

const bodySchema = z.object({
  amount: z.number().nonnegative(),
  userId: z.string().optional(),
});

router.get('/', validateQuery(querySchema), getChildBudgets);
router.put('/:memberId/:categoryId', validateParams(paramsSchema), validate(bodySchema), upsertChildBudget);
router.delete('/:memberId/:categoryId', validateParams(paramsSchema), deleteChildBudget);

export default router;
