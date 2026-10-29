import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import type { Category, UserSettings } from '../../types/index.ts';
import {
  fetchCategories,
  fetchBudgets,
  putBudgetDefault,
  deleteAllBudgets,
  putBudgetOverride,
  deleteBudgetOverride,
} from '../../lib/api.ts';
import { formatMoney } from '../../lib/currency.ts';
import { MONTH_LONG, MONTH_SHORT } from '../../lib/constants.ts';
import SettingCard from '../ui/SettingCard.tsx';

interface Props {
  year: number;
  month: number; // 0-indexed
  settings: UserSettings;
}

export default function BudgetsSection({ year, month, settings }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // ── Independent month navigation ─────────────────────────────────────────────
  const [budgetYear, setBudgetYear] = useState(year);
  const [budgetMonth, setBudgetMonth] = useState(month); // 0-indexed
  const budgetApiMonth = budgetMonth + 1;

  const goPrev = () => {
    setBudgetModal(null);
    if (budgetMonth === 0) {
      setBudgetYear((y) => y - 1);
      setBudgetMonth(11);
    } else setBudgetMonth((m) => m - 1);
  };
  const goNext = () => {
    setBudgetModal(null);
    if (budgetMonth === 11) {
      setBudgetYear((y) => y + 1);
      setBudgetMonth(0);
    } else setBudgetMonth((m) => m + 1);
  };

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', budgetYear, budgetApiMonth],
    queryFn: () => fetchBudgets(budgetYear, budgetApiMonth),
  });

  const currentMonthLabel = `${MONTH_SHORT[budgetMonth]} ${budgetYear}`;

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['budgets'] });
  const invalidateMonth = () =>
    queryClient.invalidateQueries({ queryKey: ['budgets', budgetYear, budgetApiMonth] });

  const upsertDefaultMutation = useMutation({
    mutationFn: (v: {
      categoryId: number;
      startYear: number;
      startMonth: number;
      amount: number;
    }) => putBudgetDefault(v.categoryId, v.startYear, v.startMonth, v.amount),
    onSuccess: invalidateAll,
  });
  const removeAllMutation = useMutation({
    mutationFn: (categoryId: number) => deleteAllBudgets(categoryId),
    onSuccess: invalidateAll,
  });
  const upsertOverrideMutation = useMutation({
    mutationFn: (v: { categoryId: number; amount: number }) =>
      putBudgetOverride(v.categoryId, budgetYear, budgetApiMonth, v.amount),
    onSuccess: invalidateMonth,
  });
  const deleteOverrideMutation = useMutation({
    mutationFn: (categoryId: number) =>
      deleteBudgetOverride(categoryId, budgetYear, budgetApiMonth),
    onSuccess: invalidateMonth,
  });

  const getBudgetEntry = (categoryId: number) => budgets.find((b) => b.category_id === categoryId);

  // ── Budget modal ──────────────────────────────────────────────────────────────
  const [budgetModal, setBudgetModal] = useState<{ cat: Category } | null>(null);
  const [modalAmount, setModalAmount] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<'override' | 'all' | null>(null);

  const openBudgetModal = (cat: Category) => {
    const entry = getBudgetEntry(cat.id);
    const prefill = entry?.override_amount ?? entry?.default_amount;
    setModalAmount(prefill != null ? String(prefill) : '');
    setConfirmDelete(null);
    setBudgetModal({ cat });
  };

  const modalEntry = budgetModal ? getBudgetEntry(budgetModal.cat.id) : null;
  const modalHasDefault = (modalEntry?.default_amount ?? null) !== null;
  const modalHasOverride = (modalEntry?.override_amount ?? null) !== null;
  const modalAmountValid = parseFloat(modalAmount) > 0 && !isNaN(parseFloat(modalAmount));

  const handleSetDefault = (startYear: number, startMonth: number) => {
    if (!budgetModal || !modalAmountValid) return;
    upsertDefaultMutation.mutate({
      categoryId: budgetModal.cat.id,
      startYear,
      startMonth,
      amount: parseFloat(modalAmount),
    });
    setBudgetModal(null);
  };
  const handleOverrideMonth = () => {
    if (!budgetModal || !modalAmountValid) return;
    upsertOverrideMutation.mutate({
      categoryId: budgetModal.cat.id,
      amount: parseFloat(modalAmount),
    });
    setBudgetModal(null);
  };
  const handleRemoveOverride = () => {
    if (!budgetModal) return;
    deleteOverrideMutation.mutate(budgetModal.cat.id);
    setBudgetModal(null);
  };
  const handleRemoveAll = () => {
    if (!budgetModal) return;
    removeAllMutation.mutate(budgetModal.cat.id);
    setBudgetModal(null);
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const monthNav = (
    <div className="flex items-center gap-1">
      <button
        onClick={goPrev}
        className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-border border-0 cursor-pointer transition-colors"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs font-semibold text-text-muted w-20 text-center tabular-nums">
        {MONTH_LONG[budgetMonth]} {budgetYear}
      </span>
      <button
        onClick={goNext}
        className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-border border-0 cursor-pointer transition-colors"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );

  return (
    <>
      <SettingCard
        title="Budgets"
        subtitle="Set a default monthly limit per expense category. Override specific months as needed."
        headerRight={monthNav}
      >
        <div className="flex flex-col">
          {expenseCategories.map((cat, i) => {
            const entry = getBudgetEntry(cat.id);
            const effectiveAmount = entry ? (entry.override_amount ?? entry.default_amount) : null;
            const hasOverride = (entry?.override_amount ?? null) !== null;
            const isLast = i === expenseCategories.length - 1;
            return (
              <div
                key={cat.id}
                className={[
                  'flex items-center gap-3 py-3',
                  !isLast ? 'border-b border-bg' : '',
                ].join(' ')}
              >
                <span className="text-sm font-semibold text-text-primary flex-1 min-w-0 truncate">
                  {cat.name}
                </span>
                {effectiveAmount != null ? (
                  <div className="flex items-center gap-2 shrink-0">
                    {hasOverride && (
                      <span className="text-[10px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded-md leading-none">
                        Override
                      </span>
                    )}
                    <span className="text-sm font-bold text-text-primary tabular-nums">
                      {formatMoney(effectiveAmount, sym, pos)}/mo
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-text-faint shrink-0">No limit</span>
                )}
                <button
                  onClick={() => openBudgetModal(cat)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-text-faint hover:text-accent hover:bg-accent-soft border-0 cursor-pointer transition-colors shrink-0"
                >
                  <Pencil size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </SettingCard>

      {/* Budget modal */}
      {budgetModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
          onClick={() => setBudgetModal(null)}
        >
          <div
            className="bg-surface rounded-t-3xl sm:rounded-3xl shadow-xl p-6 w-full sm:max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-text-primary">
                  {budgetModal.cat.name}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Monthly budget · {currentMonthLabel}
                </p>
              </div>
              <button
                onClick={() => setBudgetModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-border text-text-muted border-0 cursor-pointer hover:text-text-primary transition-colors shrink-0 mt-0.5"
              >
                <X size={14} />
              </button>
            </div>

            {modalHasDefault && (
              <div className="bg-bg rounded-[13px] p-3 mb-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Default</span>
                  <span className="text-xs font-bold text-text-primary tabular-nums">
                    {formatMoney(modalEntry!.default_amount!, sym, pos)}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{currentMonthLabel}</span>
                  <span
                    className={[
                      'text-xs font-bold tabular-nums',
                      modalHasOverride ? 'text-accent' : 'text-text-muted',
                    ].join(' ')}
                  >
                    {modalHasOverride
                      ? `${formatMoney(modalEntry!.override_amount!, sym, pos)}/mo (override)`
                      : 'Using default'}
                  </span>
                </div>
              </div>
            )}

            <label className="text-xs font-semibold text-text-muted block mb-1.5">
              {modalHasDefault ? 'New amount' : 'Monthly amount'}
            </label>
            <div className="relative mb-4">
              {settings.unit_position === 'prefix' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted select-none">
                  {settings.currency_symbol}
                </span>
              )}
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={modalAmount}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setModalAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setBudgetModal(null);
                }}
                className={[
                  'w-full text-base font-bold text-text-primary bg-bg border-2 border-border rounded-[13px] py-3 outline-none focus:border-accent tabular-nums transition-colors',
                  settings.unit_position === 'prefix' ? 'pl-10 pr-4' : 'pl-4 pr-10',
                ].join(' ')}
              />
              {settings.unit_position === 'suffix' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted select-none">
                  {settings.currency_symbol}
                </span>
              )}
            </div>

            {!modalHasDefault ? (
              <button
                onClick={() => handleSetDefault(budgetYear, budgetApiMonth)}
                disabled={!modalAmountValid}
                className="w-full py-3 rounded-[13px] bg-accent text-white text-sm font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Set from {currentMonthLabel} onwards
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSetDefault(budgetYear, budgetApiMonth)}
                  disabled={!modalAmountValid}
                  className="w-full py-3 rounded-[13px] bg-accent text-white text-sm font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  Update default from {currentMonthLabel} onwards
                </button>
                <button
                  onClick={handleOverrideMonth}
                  disabled={!modalAmountValid}
                  className="w-full py-3 rounded-[13px] border-2 border-accent text-accent text-sm font-bold bg-transparent cursor-pointer hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {currentMonthLabel} only
                </button>
              </div>
            )}

            <div className="flex flex-col gap-0 mt-3">
              {modalHasOverride &&
                (confirmDelete === 'override' ? (
                  <div className="flex items-center gap-2 py-1.5">
                    <span className="text-xs text-text-muted flex-1">
                      Remove {currentMonthLabel} override?
                    </span>
                    <button
                      onClick={handleRemoveOverride}
                      className="px-3 py-1 text-xs font-bold text-white bg-expense rounded-lg border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-3 py-1 text-xs font-semibold text-text-muted bg-surface rounded-lg border border-border cursor-pointer hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete('override')}
                    className="w-full py-2 text-xs font-semibold text-text-muted border-0 bg-transparent cursor-pointer hover:text-text-primary transition-colors"
                  >
                    Remove {currentMonthLabel} override
                  </button>
                ))}
              {modalHasDefault &&
                (confirmDelete === 'all' ? (
                  <div className="flex items-center gap-2 py-1.5">
                    <span className="text-xs text-text-muted flex-1">
                      Remove all budgets for this category?
                    </span>
                    <button
                      onClick={handleRemoveAll}
                      className="px-3 py-1 text-xs font-bold text-white bg-expense rounded-lg border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-3 py-1 text-xs font-semibold text-text-muted bg-surface rounded-lg border border-border cursor-pointer hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete('all')}
                    className="w-full py-2 text-xs font-semibold text-expense border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    Remove all budgets for this category
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
