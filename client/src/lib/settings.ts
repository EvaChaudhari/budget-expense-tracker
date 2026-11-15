import type { UserSettings } from '../types/index.ts';
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_COUNTRY,
  DEFAULT_CURRENCY_SYMBOL,
} from './constants.ts';

export const DEFAULT_SETTINGS: UserSettings = {
  week_start: 'Sunday',
  currency_country: DEFAULT_CURRENCY_COUNTRY,
  currency_code: DEFAULT_CURRENCY_CODE,
  currency_symbol: DEFAULT_CURRENCY_SYMBOL,
  unit_position: 'prefix',
};
