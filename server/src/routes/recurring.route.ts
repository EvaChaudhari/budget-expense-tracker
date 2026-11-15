import { Router } from 'express';
import { z } from 'zod';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  processDueRecurring,
} from '../controllers/recurring.controller.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const recurringQuerySchema = z.object({
  userId: z.string().optional(),
});

const recurringSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1).max(150),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1).max(100),
  accountId: z.number().int().positive(),
  frequency: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  active: z.boolean().optional(),
  paidForMemberId: z.string().nullable().optional(),
});

router.get('/', validateQuery(recurringQuerySchema), getRecurring);
router.post('/process', processDueRecurring);
router.post('/', validate(recurringSchema), createRecurring);
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validate(recurringSchema.partial()),
  updateRecurring,
);
router.delete('/:id', validateParams(idParamSchema), deleteRecurring);

export default router;
