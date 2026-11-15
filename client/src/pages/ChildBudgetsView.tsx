import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, X, Sparkles, AlertTriangle } from 'lucide-react';
import type { UserSettings, ChildBudgetLimit, Category } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  fetchCategories,
  fetchTransactions,
  fetchChildBudgetLimits,
  setChildBudgetLimit,
  removeChildBudgetLimit,
} from '../lib/api.ts';
import { formatMoney } from '../lib/currency.ts';
import { useMonth } from '../hooks/useMonth.ts';

interface Props {
  settings: UserSettings;
  year?: number;
  month?: number;
}

export default function ChildBudgetsView({ settings }: Props) {
  const { year, month } = useMonth();
  const { user, activeMember } = useAuth();
  const queryClient = useQueryClient();

  const sym = settings.currency_symbol;
  const pos = settings.unit_position;
  const fmt = (n: number) => formatMoney(Math.abs(n), sym, pos);

  const memberId = activeMember?.id ?? '';
  const userId = user?.id ?? '';
  const allowanceCap = activeMember?.monthlyAllowance ?? 0;

  // Modal state
  const [modalCatId, setModalCatId] = useState<number | null>(null);
  const [modalAmount, setModalAmount] = useState('');
  const [modalEdit, setModalEdit] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const { data: txs = [] } = useQuery({
    queryKey: ['transactions', year, month, memberId],
    queryFn: () => fetchTransactions(year, month, activeMember),
    enabled: !!memberId,
  });

  const { data: limits = [] } = useQuery<ChildBudgetLimit[]>({
    queryKey: ['child-budget-limits', userId, memberId],
    queryFn: () => fetchChildBudgetLimits(userId, memberId),
    enabled: !!userId && !!memberId,
  });

  // ── Derived data ─────────────────────────────────────────────────────────────
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );

  /** Spent per category from this child's transactions this month */
  const spentByCat = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const tx of txs) {
      if (tx.amount < 0) {
        const id = tx.category_id;
        map[id] = (map[id] ?? 0) + Math.abs(tx.amount);
      }
    }
    return map;
  }, [txs]);

  const totalSpent = useMemo(
    () => Object.values(spentByCat).reduce((s, v) => s + v, 0),
    [spentByCat],
  );

  const limitMap = useMemo<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const l of limits) m[l.categoryId] = l.amount;
    return m;
  }, [limits]);

  const totalLimitSet = useMemo(
    () => Object.values(limitMap).reduce((s, v) => s + v, 0),
    [limitMap],
  );

  const allowanceRemaining = Math.max(0, allowanceCap - totalSpent);
  const overallPct = allowanceCap > 0 ? Math.min(Math.round((totalSpent / allowanceCap) * 100), 100) : 0;
  const isOverBudget = totalSpent > allowanceCap;

  const catsWithLimits = expenseCategories.filter((c) => limitMap[c.id] !== undefined);
  const catsWithoutLimits = expenseCategories.filter((c) => limitMap[c.id] === undefined);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const setLimitMut = useMutation({
    mutationFn: (limit: ChildBudgetLimit) =>
      setChildBudgetLimit(userId, limit.memberId, limit.categoryId, limit.amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['child-budget-limits'] }),
  });

  const removeLimitMut = useMutation({
    mutationFn: (catId: number) => removeChildBudgetLimit(userId, memberId, catId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['child-budget-limits'] }),
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openModal(catId: number, existingLimit?: number) {
    setModalCatId(catId);
    setModalAmount(existingLimit !== undefined ? String(existingLimit) : '');
    setModalEdit(existingLimit !== undefined);
  }

  function closeModal() {
    setModalCatId(null);
    setModalAmount('');
    setModalEdit(false);
  }

  const modalAmountNum = parseFloat(modalAmount) || 0;
  const modalCat = expenseCategories.find((c) => c.id === modalCatId);
  const otherLimitsTotal = modalCatId !== null
    ? Object.entries(limitMap)
        .filter(([id]) => Number(id) !== modalCatId)
        .reduce((s, [, v]) => s + v, 0)
    : 0;
  const wouldExceedCap = modalAmountNum > 0 && otherLimitsTotal + modalAmountNum > allowanceCap;

  function handleSaveLimit() {
    if (!modalCatId || modalAmountNum <= 0) return;
    setLimitMut.mutate({ memberId, categoryId: modalCatId, amount: modalAmountNum });
    closeModal();
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* ── Allowance overview card ─────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-surface border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-accent shrink-0" />
          <span className="text-sm font-bold text-text-primary">My Allowance — {monthName}</span>
        </div>
        <div className="flex items-end justify-between mt-3 mb-2">
          <div>
            <div className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Spent</div>
            <div className={`text-2xl font-extrabold tracking-tight ${isOverBudget ? 'text-expense' : 'text-text-primary'}`}>
              {fmt(totalSpent)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Remaining</div>
            <div className={`text-2xl font-extrabold tracking-tight ${isOverBudget ? 'text-expense' : 'text-income'}`}>
              {isOverBudget ? `−${fmt(totalSpent - allowanceCap)}` : fmt(allowanceRemaining)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-expense' : overallPct >= 80 ? 'bg-amber-400' : 'bg-accent'}`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-text-muted">{overallPct}% used</span>
          <span className="text-[11px] text-text-muted">Budget: {fmt(allowanceCap)}</span>
        </div>

        {/* Category limits summary */}
        {totalLimitSet > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-muted">Category limits set</span>
            <span className="text-xs font-bold text-text-primary">
              {fmt(totalLimitSet)} / {fmt(allowanceCap)}
            </span>
          </div>
        )}
      </div>

      {/* ── Categories WITH limits ───────────────────────────────────────────── */}
      {catsWithLimits.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-text-muted uppercase tracking-wider mb-3">
            Category Limits
          </div>
          <div className="flex flex-col gap-3">
            {catsWithLimits.map((cat) => {
              const limit = limitMap[cat.id]!;
              const spent = spentByCat[cat.id] ?? 0;
              const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
              const over = spent > limit;
              return (
                <div key={cat.id} className="rounded-[16px] bg-surface border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-semibold text-sm text-text-primary truncate">{cat.name}</span>
                      {over && <AlertTriangle size={13} className="text-expense shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openModal(cat.id, limit)}
                        className="p-1.5 rounded-[10px] border-0 bg-transparent text-text-muted hover:text-accent hover:bg-accent/8 cursor-pointer transition-colors"
                        aria-label={`Edit ${cat.name} limit`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => removeLimitMut.mutate(cat.id)}
                        className="p-1.5 rounded-[10px] border-0 bg-transparent text-text-muted hover:text-expense hover:bg-expense/8 cursor-pointer transition-colors"
                        aria-label={`Remove ${cat.name} limit`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full bg-border overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${over ? 'bg-expense' : pct >= 80 ? 'bg-amber-400' : 'bg-accent'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-text-muted">{fmt(spent)} spent</span>
                    <span className={`text-[11px] font-semibold ${over ? 'text-expense' : 'text-text-muted'}`}>
                      {over ? `${fmt(spent - limit)} over` : `${fmt(limit - spent)} left`} of {fmt(limit)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Categories WITHOUT limits ────────────────────────────────────────── */}
      {catsWithoutLimits.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-text-muted uppercase tracking-wider mb-3">
            {catsWithLimits.length > 0 ? 'Add More Limits' : 'Set Category Limits'}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {catsWithoutLimits.map((cat) => {
              const spent = spentByCat[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => openModal(cat.id)}
                  className="flex flex-col items-start gap-1.5 p-3.5 rounded-[16px] border border-dashed border-border bg-transparent text-left cursor-pointer hover:border-accent/50 hover:bg-accent/4 transition-colors group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{cat.icon}</span>
                    <Plus size={14} className="text-text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-xs font-semibold text-text-primary truncate w-full">{cat.name}</span>
                  {spent > 0 && (
                    <span className="text-[10px] text-text-muted">{fmt(spent)} spent</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {expenseCategories.length === 0 && (
        <div className="rounded-[20px] bg-surface border border-border p-8 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <div className="font-bold text-text-primary mb-1">No categories yet</div>
          <div className="text-sm text-text-muted">Ask a parent to add spending categories.</div>
        </div>
      )}

      {/* ── Set / Edit Limit Modal ─────────────────────────────────────────────── */}
      {modalCatId !== null && modalCat && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-[24px] bg-surface border border-border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{modalCat.icon}</span>
              <div>
                <div className="font-bold text-text-primary">{modalEdit ? 'Edit' : 'Set'} Limit</div>
                <div className="text-sm text-text-muted">{modalCat.name}</div>
              </div>
              <button
                onClick={closeModal}
                className="ml-auto p-1.5 rounded-[10px] border-0 bg-transparent text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Allowance cap reminder */}
            <div className="rounded-[12px] bg-bg border border-border p-3 mb-4">
              <div className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-1">Monthly Allowance Cap</div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total allowance</span>
                <span className="font-bold text-text-primary">{fmt(allowanceCap)}</span>
              </div>
              <div className="flex justify-between text-sm mt-0.5">
                <span className="text-text-muted">Other category limits</span>
                <span className="font-semibold text-text-primary">{fmt(otherLimitsTotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-0.5 pt-1.5 border-t border-border">
                <span className="text-text-muted">Available to allocate</span>
                <span className={`font-bold ${allowanceCap - otherLimitsTotal <= 0 ? 'text-expense' : 'text-income'}`}>
                  {fmt(Math.max(0, allowanceCap - otherLimitsTotal))}
                </span>
              </div>
            </div>

            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              Monthly limit ({sym})
            </label>
            <input
              type="number"
              min="1"
              max={allowanceCap}
              value={modalAmount}
              onChange={(e) => setModalAmount(e.target.value)}
              placeholder={`e.g. ${Math.round((allowanceCap - otherLimitsTotal) / 2)}`}
              className="w-full rounded-[12px] border border-border bg-bg px-3.5 py-2.5 text-sm font-semibold text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              autoFocus
            />

            {wouldExceedCap && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle size={12} />
                This would exceed your allowance cap ({fmt(allowanceCap)}).
              </div>
            )}

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-[12px] border border-border bg-transparent text-sm font-semibold text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimit}
                disabled={modalAmountNum <= 0 || wouldExceedCap}
                className="flex-1 py-2.5 rounded-[12px] bg-accent text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {modalEdit ? 'Update' : 'Set'} Limit
              </button>
            </div>

            {modalEdit && (
              <button
                onClick={() => { removeLimitMut.mutate(modalCatId); closeModal(); }}
                className="mt-2 w-full py-2 rounded-[12px] border-0 bg-transparent text-xs font-semibold text-expense hover:bg-expense/8 cursor-pointer transition-colors"
              >
                Remove this limit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

