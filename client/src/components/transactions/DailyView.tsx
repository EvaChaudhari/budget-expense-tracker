import { formatSigned } from '../../lib/currency.ts';
import type { RawDayGroup } from '../../types/index.ts';
import type { UserSettings } from '../../types/index.ts';

interface Props {
  groups: RawDayGroup[];
  settings: UserSettings;
  onEdit: (id: number) => void;
}

export default function DailyView({ groups, settings, onEdit }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <p className="text-sm font-medium">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const groupTotal = group.items.reduce((s, t) => s + t.amt, 0);

        return (
          <div key={group.dateKey}>
            {/* Day header */}
            <div className="flex items-baseline gap-2.5 mx-1.5 mb-2.5">
              <span className="font-extrabold text-base">{group.label}</span>
              {group.label !== group.date && (
                <span className="text-[13px] text-text-subtle">{group.date}</span>
              )}
              <span
                className={[
                  'ml-auto font-bold text-sm tabular-nums whitespace-nowrap',
                  groupTotal < 0 ? 'text-expense' : 'text-income',
                ].join(' ')}
              >
                {formatSigned(groupTotal, sym, pos)}
              </span>
            </div>

            {/* Transaction list */}
            <div className="bg-surface border border-border rounded-[20px] overflow-hidden shadow-(--shadow-card)">
              {group.items.map((tx, i) => {
                const isLast = i === group.items.length - 1;

                return (
                  <div
                    key={tx.id}
                    onClick={() => onEdit(tx.id)}
                    className={[
                      'flex items-center gap-3.5 py-3.5 px-4.5 cursor-pointer hover:bg-bg/60 transition-colors',
                      !isLast && 'border-b border-bg',
                    ].join(' ')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px]">{tx.cat}</div>
                      <div className="text-[13px] text-text-subtle truncate">{tx.note}</div>
                      {tx.description && (
                        <div className="text-[12px] text-text-faint truncate mt-0.5">
                          {tx.description}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={[
                          'font-bold text-[15px] tabular-nums whitespace-nowrap',
                          tx.amt < 0 ? 'text-expense' : 'text-income',
                        ].join(' ')}
                      >
                        {formatSigned(tx.amt, sym, pos)}
                      </div>
                      <div className="text-xs text-text-faint mt-0.5 whitespace-nowrap">
                        {tx.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
