import { Router } from 'express';
import { z } from 'zod';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  getFamilyMembers,
  createFamilyMember,
  deleteFamilyMember,
} from '../controllers/family_members.controller.js';

const router = Router();

const idParamSchema = z.object({
  id: z.string().min(1),
});

const familyQuerySchema = z.object({
  userId: z.string().optional(),
});

const familyMemberSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  name: z.string().min(1).max(100),
  role: z.enum(['Parent', 'Child']),
  monthlyAllowance: z.number().nonnegative().optional(),
  avatar: z.string().optional(),
  email: z.string().email().optional(),
});

router.get('/', validateQuery(familyQuerySchema), getFamilyMembers);
router.post('/', validate(familyMemberSchema), createFamilyMember);
router.delete('/:id', validateParams(idParamSchema), deleteFamilyMember);

export default router;
