import { Router } from 'express';
import { z } from 'zod';
import { validate, validateParams } from '../middleware/validate.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categories.controller.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
});

const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
});

router.get('/', getCategories);
router.post('/', validate(categorySchema), createCategory);
router.patch('/:id', validateParams(idParamSchema), validate(categoryUpdateSchema), updateCategory);
router.delete('/:id', validateParams(idParamSchema), deleteCategory);

export default router;
