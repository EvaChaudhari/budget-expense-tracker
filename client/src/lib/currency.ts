import type { UnitPosition } from '../types/index.ts';

export const formatMoney = (amount: number, symbol: string, position: UnitPosition): string => {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return position === 'suffix' ? `${abs} ${symbol}` : `${symbol} ${abs}`;
};

export const formatSigned = (amount: number, symbol: string, position: UnitPosition): string => {
  const sign = amount < 0 ? '- ' : '+ ';
  return sign + formatMoney(amount, symbol, position);
};
