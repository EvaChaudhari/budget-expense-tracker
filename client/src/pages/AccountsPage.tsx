import { useQuery } from '@tanstack/react-query';
import type { UserSettings } from '../types/index.ts';
import { fetchAccounts, fetchAccountGroups } from '../lib/api.ts';
import { getLucideIcon } from '../lib/icons.ts';
import { formatMoney } from '../lib/currency.ts';

interface Props {
  settings: UserSettings;
}

export default function AccountsPage({ settings }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['account-groups'],
    queryFn: fetchAccountGroups,
  });

  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

  const grouped = groups
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({ group: g, accounts: accounts.filter((a) => a.group_id === g.id) }))
    .filter((s) => s.accounts.length > 0);

  const sections = grouped;

  return (
    <div className="flex flex-col gap-4">
      {/* Net worth hero */}
      <div className="rounded-[20px] p-7 text-white bg-[linear-gradient(150deg,#2563eb,#0ea5e9)] shadow-(--shadow-card)">
        <div className="text-sm font-semibold opacity-80 mb-2">Net Worth</div>
        <div className="text-3xl font-extrabold tabular-nums mb-3">
          {formatMoney(netWorth, sym, pos)}
        </div>
        <div className="text-xs opacity-70">{accounts.length} accounts</div>
      </div>

      {/* Grouped account sections */}
      {sections.map(({ group, accounts: sectionAccounts }) => (
        <div key={group.id}>
          <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2 px-0.5">
            {group.name}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {sectionAccounts.map((account) => {
              const Icon = getLucideIcon(account.icon);
              const isNegative = account.balance < 0;
              const formattedBalance = isNegative
                ? `- ${formatMoney(Math.abs(account.balance), sym, pos)}`
                : formatMoney(account.balance, sym, pos);

              return (
                <div
                  key={account.id}
                  className="bg-surface border border-border rounded-[20px] shadow-(--shadow-card) p-5"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
                      style={{ background: `color-mix(in srgb, ${account.color} 14%, #ffffff)` }}
                    >
                      <Icon size={17} style={{ color: account.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-text-primary leading-snug">
                        {account.name}
                      </div>
                      <div className="text-xs text-text-muted">{account.type}</div>
                    </div>
                  </div>

                  <div
                    className={[
                      'text-xl font-extrabold tabular-nums',
                      isNegative ? 'text-expense' : 'text-text-primary',
                    ].join(' ')}
                  >
                    {formattedBalance}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
