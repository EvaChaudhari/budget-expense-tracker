import type { UnitPosition } from '../types/index.ts';
import {
  DEFAULT_CURRENCY_LOCALE,
  DEFAULT_CURRENCY_SYMBOL,
} from './constants.ts';

export const formatMoney = (
  amount: number,
  symbol: string = DEFAULT_CURRENCY_SYMBOL,
  position: UnitPosition = 'prefix',
  locale: string = DEFAULT_CURRENCY_LOCALE,
): string => {
  const abs = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return position === 'suffix' ? `${abs} ${symbol}` : `${symbol}${abs}`;
};

export const formatSigned = (
  amount: number,
  symbol: string = DEFAULT_CURRENCY_SYMBOL,
  position: UnitPosition = 'prefix',
  locale: string = DEFAULT_CURRENCY_LOCALE,
): string => {
  const sign = amount < 0 ? '- ' : '+ ';
  return sign + formatMoney(amount, symbol, position, locale);
};
