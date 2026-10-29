import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  getAccountGroups,
  createAccountGroup,
  updateAccountGroup,
  deleteAccountGroup,
} from '../controllers/account_groups.controller.js';

const router = Router();

const groupSchema = z.object({ name: z.string().min(1).max(50) });

router.get('/', getAccountGroups);
router.post('/', validate(groupSchema), createAccountGroup);
router.patch('/:id', validate(groupSchema), updateAccountGroup);
router.delete('/:id', deleteAccountGroup);

export default router;
