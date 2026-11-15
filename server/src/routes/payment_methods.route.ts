import { Router } from 'express';
import { z } from 'zod';
import { validate, validateParams } from '../middleware/validate.js';
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from '../controllers/payment_methods.controller.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const paymentMethodSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(50).optional(),
});

router.get('/', getPaymentMethods);
router.post('/', validate(paymentMethodSchema), createPaymentMethod);
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validate(paymentMethodSchema.partial()),
  updatePaymentMethod,
);
router.delete('/:id', validateParams(idParamSchema), deletePaymentMethod);

export default router;
