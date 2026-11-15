import { Router } from 'express';
import { z } from 'zod';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactions.controller.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const txQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const txSchema = z.object({
  account_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  amount: z.number(),
  note: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  tx_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tx_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
});

router.get('/', validateQuery(txQuerySchema), getTransactions);
router.post('/', validate(txSchema), createTransaction);
router.patch('/:id', validateParams(idParamSchema), validate(txSchema.partial()), updateTransaction);
router.delete('/:id', validateParams(idParamSchema), deleteTransaction);

export default router;
