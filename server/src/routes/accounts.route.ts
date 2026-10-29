import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/accounts.controller.js';

const router = Router();

const accountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  icon: z.string().optional(),
  color: z.string().optional(),
  balance: z.number().optional(),
  group_id: z.number().int().positive().nullable().optional(),
});

router.get('/', getAccounts);
router.post('/', validate(accountSchema), createAccount);
router.patch('/:id', validate(accountSchema.partial()), updateAccount);
router.delete('/:id', deleteAccount);

export default router;
