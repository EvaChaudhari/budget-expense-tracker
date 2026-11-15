import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Pencil,
  Trash2,
  Play,
  Pause,
  Plus,
  Repeat,
  RefreshCw,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import type { RecurringTransaction, UserSettings } from '../../types/index.ts';
import {
  fetchRecurringTransactions,
  toggleRecurringTransaction,
  deleteRecurringTransaction,
  processDueRecurringTransactions,
  fetchAccounts,
} from '../../lib/api.ts';
import { formatMoney } from '../../lib/currency.ts';

interface Props {
  settings: UserSettings;
  onAddNew: () => void;
  onEdit: (item: RecurringTransaction) => void;
}

export default function RecurringList({ settings, onAddNew, onEdit }: Props) {
  const queryClient = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);
  const [processMsg, setProcessMsg] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['recurring-transactions'],
    queryFn: () => fetchRecurringTransactions(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number | string) => toggleRecurringTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteRecurringTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      setDeleteConfirmId(null);
    },
  });

  const processMutation = useMutation({
    mutationFn: () => processDueRecurringTransactions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      if (data.processed > 0) {
        setProcessMsg(`Auto-processed ${data.processed} due recurring payment(s)!`);
      } else {
        setProcessMsg('All recurring payments are up to date.');
      }
      setTimeout(() => setProcessMsg(null), 3500);
    },
  });

  const getAccountName = (accId: number) => {
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'Account';
  };

  const activeItems = items.filter((i) => i.active);
  const totalMonthlyOutgoing = activeItems
    .filter((i) => i.type === 'expense')
    .reduce((sum, item) => {
      let multiplier = 1;
      if (item.frequency === 'weekly') multiplier = 4.33;
      if (item.frequency === 'yearly') multiplier = 1 / 12;
      return sum + item.amount * multiplier;
    }, 0);

  const totalMonthlyIncoming = activeItems
    .filter((i) => i.type === 'income')
    .reduce((sum, item) => {
      let multiplier = 1;
      if (item.frequency === 'weekly') multiplier = 4.33;
      if (item.frequency === 'yearly') multiplier = 1 / 12;
      return sum + item.amount * multiplier;
    }, 0);

  const sym = settings.currency_symbol || '₹';
  const pos = settings.unit_position || 'prefix';

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner / Summary */}
      <div className="bg-surface border border-border rounded-[20px] p-5 shadow-(--shadow-card)">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <Repeat size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-text-primary">
                Recurring Payments & Subscriptions
              </h3>
              <p className="text-xs text-text-muted">
                {activeItems.length} active of {items.length} total scheduled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2.25 rounded-[12px] bg-bg border border-border text-xs font-bold text-text-muted hover:text-text-primary hover:border-accent/40 transition-all cursor-pointer disabled:opacity-50"
              title="Process any recurring items due on or before today"
            >
              <RefreshCw
                size={14}
                className={processMutation.isPending ? 'animate-spin text-accent' : ''}
              />
              <span className="hidden sm:inline">Check Due Now</span>
            </button>

            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-4 py-2.25 rounded-[12px] bg-accent text-white text-xs font-bold transition-all hover:opacity-95 cursor-pointer shadow-[0_4px_14px_color-mix(in_srgb,#2563eb_30%,transparent)]"
            >
              <Plus size={15} />
              <span>Add Recurring</span>
            </button>
          </div>
        </div>

        {/* Quick totals row */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-bg">
          <div className="p-3 rounded-[13px] bg-bg/50 border border-border/60">
            <div className="text-[11px] font-semibold text-text-muted">Est. Monthly Outgoing</div>
            <div className="text-base font-extrabold text-expense tabular-nums mt-0.5">
              - {formatMoney(totalMonthlyOutgoing, sym, pos)}
            </div>
          </div>
          <div className="p-3 rounded-[13px] bg-bg/50 border border-border/60">
            <div className="text-[11px] font-semibold text-text-muted">Est. Monthly Incoming</div>
            <div className="text-base font-extrabold text-income tabular-nums mt-0.5">
              + {formatMoney(totalMonthlyIncoming, sym, pos)}
            </div>
          </div>
        </div>

        {processMsg && (
          <div className="mt-3 p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{processMsg}</span>
          </div>
        )}
      </div>

      {/* List of items */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-text-muted">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-2" />
          <span className="text-xs font-semibold">Loading recurring items...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface border border-border rounded-[20px] p-10 text-center flex flex-col items-center justify-center shadow-(--shadow-card)">
          <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-3">
            <Repeat size={24} />
          </div>
          <h4 className="text-sm font-bold text-text-primary">No recurring payments yet</h4>
          <p className="text-xs text-text-muted max-w-xs mt-1 mb-4">
            Set up automatic schedules for your monthly salary, rent, bills, or subscription plans.
          </p>
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-accent text-white text-xs font-bold transition-all hover:opacity-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add First Recurring Payment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {items.map((item) => {
            const isExpense = item.type === 'expense';
            const formattedAmount = formatMoney(item.amount, sym, pos);
            const isDeleting = deleteConfirmId === item.id;

            return (
              <div
                key={item.id}
                className={[
                  'bg-surface border rounded-[18px] p-4.5 transition-all shadow-(--shadow-card)',
                  item.active
                    ? 'border-border'
                    : 'border-border/60 opacity-75 bg-surface/80',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={[
                          'inline-flex items-center px-2 py-0.5 rounded-[7px] text-[10.5px] font-bold uppercase tracking-wider',
                          item.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200',
                        ].join(' ')}
                      >
                        {item.active ? 'Active' : 'Paused'}
                      </span>

                      <span className="inline-flex items-center px-2 py-0.5 rounded-[7px] text-[10.5px] font-semibold bg-accent-soft text-accent capitalize">
                        {item.frequency}
                      </span>

                      <span className="text-[11px] text-text-muted font-medium">
                        {item.category}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-text-primary truncate">
                      {item.title}
                    </h4>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={[
                        'text-base font-extrabold tabular-nums',
                        isExpense ? 'text-expense' : 'text-income',
                      ].join(' ')}
                    >
                      {isExpense ? `- ${formattedAmount}` : `+ ${formattedAmount}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted pt-3 border-t border-bg gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="Account">
                      <Wallet size={13} className="text-text-subtle" />
                      <span className="font-semibold text-text-primary">
                        {getAccountName(item.accountId)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" title="Next Payment Due Date">
                      <Calendar size={13} className="text-text-subtle" />
                      <span>Due: <strong className="text-text-primary">{item.nextDueDate}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Toggle pause/resume */}
                    <button
                      onClick={() => toggleMutation.mutate(item.id)}
                      disabled={toggleMutation.isPending}
                      title={item.active ? 'Pause recurring payment' : 'Activate recurring payment'}
                      className={[
                        'w-7.5 h-7.5 rounded-[9px] border flex items-center justify-center transition-colors cursor-pointer',
                        item.active
                          ? 'bg-bg border-border text-text-muted hover:text-amber-600 hover:border-amber-300'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
                      ].join(' ')}
                    >
                      {item.active ? <Pause size={13} /> : <Play size={13} />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => onEdit(item)}
                      title="Edit recurring item"
                      className="w-7.5 h-7.5 rounded-[9px] border border-border bg-bg text-text-muted hover:text-accent hover:border-accent/40 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>

                    {/* Delete */}
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                          className="px-2 py-1 rounded-[8px] bg-expense text-white text-[11px] font-bold border-0 cursor-pointer hover:opacity-90"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-[8px] bg-bg text-text-muted text-[11px] font-semibold border border-border cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        title="Delete recurring payment"
                        className="w-7.5 h-7.5 rounded-[9px] border border-border bg-bg text-text-muted hover:text-expense hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

