import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

const settingsSchema = z.object({
  week_start: z.enum([
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]),
  currency_country: z.string().min(1),
  currency_code: z.string().min(1).max(10),
  currency_symbol: z.string().min(1).max(10),
  unit_position: z.enum(['prefix', 'suffix']),
});

router.get('/', getSettings);
router.patch('/', validate(settingsSchema.partial()), updateSettings);

export default router;
