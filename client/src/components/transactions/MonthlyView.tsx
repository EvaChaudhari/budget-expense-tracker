import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ApiTransaction, UserSettings } from '../../types/index.ts';
import { fetchMonthlyStats, fetchTransactions } from '../../lib/api.ts';
import { formatMoney, formatSigned } from '../../lib/currency.ts';
import { MONTH_LONG } from '../../lib/constants.ts';
import { buildFullDateLabel } from '../../lib/txBuilders.ts';

interface Props {
  year: number;
  settings: UserSettings;
  onEdit: (tx: ApiTransaction) => void;
}

function MonthTransactions({
  year,
  month,
  settings,
  onEdit,
}: {
  year: number;
  month: number; // 0-indexed
  settings: UserSettings;
  onEdit: (tx: ApiTransaction) => void;
}) {
  const { currency_symbol: sym, unit_position: pos } = settings;

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => fetchTransactions(year, month),
  });

  if (isLoading) {
    return (
      <div className="border-t border-bg py-5 text-center text-xs text-text-muted">Loading…</div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="border-t border-bg py-5 text-center text-xs text-text-muted">
        No transactions this month
      </div>
    );
  }

  const sorted = [...txs].sort((a, b) => {
    const d = b.tx_date.localeCompare(a.tx_date);
    return d !== 0 ? d : b.tx_time.localeCompare(a.tx_time);
  });

  return (
    <div className="border-t border-bg">
      {sorted.map((tx, i) => {
        const isLast = i === sorted.length - 1;
        return (
          <div
            key={tx.id}
            onClick={() => onEdit(tx)}
            className={[
              'flex items-center gap-3.5 py-3.5 px-4.5 cursor-pointer hover:bg-bg/60 transition-colors',
              !isLast ? 'border-b border-bg' : '',
            ].join(' ')}
          >
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px]">{tx.category_name}</div>
              <div className="text-[13px] text-text-subtle truncate">{tx.note}</div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={[
                  'font-bold text-[15px] tabular-nums whitespace-nowrap',
                  tx.amount < 0 ? 'text-expense' : 'text-income',
                ].join(' ')}
              >
                {formatSigned(tx.amount, sym, pos)}
              </div>
              <div className="text-xs text-text-faint mt-0.5 whitespace-nowrap">
                {buildFullDateLabel(tx.tx_date)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MonthlyView({ year, settings, onEdit }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null); // 0-indexed

  const { data: summaries = [] } = useQuery({
    queryKey: ['stats/monthly'],
    queryFn: fetchMonthlyStats,
  });

  const getSummary = (m: number) => summaries.find((s) => s.year === year && s.month === m + 1);

  const toggleMonth = (m: number) => setExpandedMonth((prev) => (prev === m ? null : m));

  return (
    <div className="flex flex-col gap-4">
      {/* Month rows */}
      <div className="bg-surface border border-border rounded-[20px] shadow-(--shadow-card) overflow-hidden">
        {Array.from({ length: 12 }, (_, i) => {
          const summary = getSummary(i);
          const income = Number(summary?.income ?? 0);
          const expenses = Number(summary?.expenses ?? 0);
          const hasData = income > 0 || expenses > 0;
          const isExpanded = expandedMonth === i;

          return (
            <div key={i} className={i > 0 ? 'border-t border-bg' : ''}>
              <button
                onClick={() => hasData && toggleMonth(i)}
                disabled={!hasData}
                className={[
                  'w-full flex items-center gap-3 px-4.5 py-3.5 transition-colors text-left',
                  hasData ? 'hover:bg-bg/60 cursor-pointer' : 'cursor-default opacity-40',
                  isExpanded ? 'bg-bg/40' : '',
                ].join(' ')}
              >
                <span className="text-sm font-semibold text-text-primary w-24 shrink-0">
                  {MONTH_LONG[i]}
                </span>

                {hasData ? (
                  <>
                    <div className="flex-1 flex items-center gap-3 justify-end">
                      <span className="text-xs font-semibold text-income tabular-nums">
                        +{formatMoney(income, sym, pos)}
                      </span>
                      <span className="text-xs font-semibold text-expense tabular-nums">
                        −{formatMoney(expenses, sym, pos)}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-text-muted shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-text-muted shrink-0" />
                    )}
                  </>
                ) : (
                  <span className="text-xs text-text-faint ml-auto">No data</span>
                )}
              </button>

              {isExpanded && (
                <MonthTransactions year={year} month={i} settings={settings} onEdit={onEdit} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
