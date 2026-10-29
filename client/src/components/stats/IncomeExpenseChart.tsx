import { useState } from 'react';
import type { MonthlyBarData, UserSettings } from '../../types/index.ts';
import { formatMoney } from '../../lib/currency.ts';

const BAR_MAX_PX = 120;

interface Props {
  bars: MonthlyBarData[];
  settings: UserSettings;
}

export default function IncomeExpenseChart({ bars, settings }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const maxVal = Math.max(...bars.flatMap((b) => [b.income, b.expense]), 1);
  const isEmpty = bars.every((b) => b.income === 0 && b.expense === 0);
  const active = activeIdx !== null ? bars[activeIdx] : null;
  const isAnyActive = activeIdx !== null;

  return (
    <div className="bg-surface border border-border rounded-[20px] shadow-(--shadow-card) p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-extrabold text-text-primary">Income vs Expenses</h3>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-income inline-block shrink-0" />
            {active ? (
              <span className="text-income font-bold tabular-nums">
                {formatMoney(active.income, sym, pos)}
              </span>
            ) : (
              'Income'
            )}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-expense inline-block shrink-0" />
            {active ? (
              <span className="text-expense font-bold tabular-nums">
                {formatMoney(active.expense, sym, pos)}
              </span>
            ) : (
              'Expenses'
            )}
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center py-8 text-sm text-text-muted">
          No transaction data for this period
        </div>
      ) : (
        <div className="flex gap-2">
          {bars.map((bar, i) => {
            const isActive = activeIdx === i;
            const hasData = bar.income > 0 || bar.expense > 0;
            const incH = hasData
              ? Math.max(Math.round((bar.income / maxVal) * BAR_MAX_PX), bar.income > 0 ? 4 : 0)
              : 0;
            const expH = hasData
              ? Math.max(Math.round((bar.expense / maxVal) * BAR_MAX_PX), bar.expense > 0 ? 4 : 0)
              : 0;

            return (
              <div
                key={bar.month}
                onMouseEnter={() => hasData && setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                className="flex-1 flex flex-col items-center gap-1.5"
                style={{ opacity: isAnyActive && !isActive ? 0.3 : 1 }}
              >
                <div
                  className="flex items-end gap-0.5 w-full"
                  style={{ height: `${BAR_MAX_PX}px` }}
                >
                  {hasData ? (
                    <>
                      <div
                        className="flex-1 rounded-t-[3px] bg-income"
                        style={{ height: `${incH}px` }}
                      />
                      <div
                        className="flex-1 rounded-t-[3px] bg-expense"
                        style={{ height: `${expH}px` }}
                      />
                    </>
                  ) : (
                    <div
                      className="flex-1 rounded-t-[3px] bg-border/60"
                      style={{ height: '4px' }}
                    />
                  )}
                </div>
                <span
                  className={[
                    'text-[10px] font-medium',
                    isActive ? 'text-text-primary font-bold' : 'text-text-muted',
                  ].join(' ')}
                >
                  {bar.month}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
