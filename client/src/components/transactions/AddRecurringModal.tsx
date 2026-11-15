import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, X, Repeat, Calendar, AlertCircle } from 'lucide-react';
import type { RecurringTransaction, UserSettings } from '../../types/index.ts';
import {
  fetchAccounts,
  fetchCategories,
  postRecurringTransaction,
  patchRecurringTransaction,
} from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface Props {
  onClose: () => void;
  settings: UserSettings;
  onSuccess?: () => void;
  initialData?: RecurringTransaction;
}

interface FormState {
  title: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId: number | '';
  accountId: number | '';
  frequency: 'weekly' | 'monthly' | 'yearly';
  firstPaymentDate: string;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fieldCls =
  'w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] pl-3 pr-8 py-2.5 outline-none focus:border-accent transition-colors appearance-none';

const labelCls = 'text-xs font-bold text-text-muted mb-1.5 block';

export default function AddRecurringModal({
  onClose,
  settings,
  onSuccess,
  initialData,
}: Props) {
  const { user } = useAuth();
  const isEdit = initialData !== undefined;
  const queryClient = useQueryClient();

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const [form, setForm] = useState<FormState>(() =>
    initialData
      ? {
          title: initialData.title,
          amount: String(initialData.amount),
          type: initialData.type,
          categoryId: '',
          accountId: initialData.accountId,
          frequency: initialData.frequency,
          firstPaymentDate: initialData.nextDueDate,
        }
      : {
          title: '',
          amount: '',
          type: 'expense',
          categoryId: '',
          accountId: '',
          frequency: 'monthly',
          firstPaymentDate: localToday(),
        },
  );

  // If editing and categories load, select existing category
  useEffect(() => {
    if (initialData && allCategories.length > 0 && form.categoryId === '') {
      const match = allCategories.find(
        (c) => c.name.toLowerCase() === initialData.category.toLowerCase(),
      );
      if (match) {
        setForm((prev) => ({ ...prev, categoryId: match.id }));
      }
    }
  }, [initialData, allCategories, form.categoryId]);

  const switchType = (t: 'income' | 'expense') =>
    setForm((prev) => ({ ...prev, type: t, categoryId: '' }));

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (payload: Omit<RecurringTransaction, 'id' | 'userId'> & { userId?: string }) =>
      isEdit
        ? patchRecurringTransaction(initialData.id, payload, user?.id)
        : postRecurringTransaction(payload, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onSuccess?.();
      onClose();
    },
  });

  const filteredCategories = allCategories.filter((c) => c.type === form.type);

  const canSubmit =
    form.title.trim() !== '' &&
    form.amount !== '' &&
    Number(form.amount) > 0 &&
    form.categoryId !== '' &&
    form.accountId !== '' &&
    form.firstPaymentDate !== '';

  const handleSubmit = () => {
    if (!canSubmit || isPending) return;

    const selectedCategory = allCategories.find((c) => c.id === form.categoryId);
    const categoryName = selectedCategory ? selectedCategory.name : 'General';

    mutate({
      title: form.title.trim(),
      amount: Math.abs(Number(form.amount)),
      type: form.type,
      category: categoryName,
      accountId: Number(form.accountId),
      frequency: form.frequency,
      nextDueDate: form.firstPaymentDate,
      active: initialData ? initialData.active : true,
      userId: user?.id,
    });
  };

  const { currency_symbol: sym, unit_position: pos } = settings;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,46,0.4)] p-4 flex items-center justify-center backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-surface rounded-3xl shadow-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <Repeat size={16} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight">
                {isEdit ? 'Edit Recurring Item' : 'Add Recurring Item'}
              </h2>
              <p className="text-[11px] text-text-muted">
                {isEdit ? 'Modify scheduled payment parameters' : 'Automate repeated income or expenses'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close recurring modal"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-border border-0 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Type Toggle */}
          <div className="flex gap-1 bg-border rounded-[13px] p-1">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchType(t)}
                className={[
                  'flex-1 py-2 rounded-[10px] text-sm font-bold border-0 cursor-pointer transition-all duration-150',
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-surface text-expense shadow-sm'
                      : 'bg-surface text-income shadow-sm'
                    : 'bg-transparent text-text-muted hover:text-text-primary',
                ].join(' ')}
              >
                {t === 'expense' ? 'Recurring Expense' : 'Recurring Income'}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Title</label>
            <input
              type="text"
              placeholder={form.type === 'expense' ? 'e.g. Netflix Subscription, House Rent' : 'e.g. Monthly Salary, Retainer Payout'}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] px-3.5 py-2.5 outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Amount</label>
            <div className="relative">
              {pos === 'prefix' && (
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-text-muted select-none">
                  {sym}
                </span>
              )}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className={[
                  'w-full text-xl font-extrabold text-text-primary bg-bg border border-border rounded-[11px] py-3 outline-none focus:border-accent transition-colors tabular-nums',
                  pos === 'prefix' ? 'pl-10 pr-4' : 'pl-4 pr-10',
                ].join(' ')}
              />
              {pos === 'suffix' && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-text-muted select-none">
                  {sym}
                </span>
              )}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className={labelCls}>Frequency</label>
            <div className="grid grid-cols-3 gap-2">
              {(['weekly', 'monthly', 'yearly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, frequency: freq }))}
                  className={[
                    'py-2 px-2 rounded-[11px] text-xs font-bold border transition-all cursor-pointer capitalize text-center',
                    form.frequency === freq
                      ? 'bg-accent-soft border-accent text-accent'
                      : 'bg-bg border-border text-text-muted hover:border-accent/40',
                  ].join(' ')}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <div className="relative">
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                className={fieldCls}
              >
                <option value="">Select category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
            </div>
          </div>

          {/* Account */}
          <div>
            <label className={labelCls}>Account</label>
            <div className="relative">
              <select
                value={form.accountId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    accountId: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                className={fieldCls}
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
            </div>
          </div>

          {/* First Payment Date / Next Due Date */}
          <div>
            <label className={labelCls}>{isEdit ? 'Next Due Date' : 'First Payment Date'}</label>
            <div className="relative">
              <input
                type="date"
                value={form.firstPaymentDate}
                onChange={(e) => setForm((prev) => ({ ...prev, firstPaymentDate: e.target.value }))}
                className={fieldCls}
              />
              <Calendar
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
            </div>
            <p className="text-[11px] text-text-subtle mt-1">
              Future payments will automatically advance based on your chosen {form.frequency} frequency.
            </p>
          </div>

          {isError && (
            <div className="flex items-start gap-2 p-3 rounded-[12px] bg-red-50 border border-red-200 text-xs text-expense">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error instanceof Error ? error.message : 'Could not save recurring item.'}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              className="flex-1 py-3 px-5 rounded-[13px] bg-accent text-white text-sm font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-[0_8px_20px_color-mix(in_srgb,#2563eb_34%,transparent)]"
            >
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Set Up Recurring'}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-[13px] bg-bg text-text-muted text-sm font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
