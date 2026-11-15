import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, X } from 'lucide-react';
import type { ApiTransaction, UserSettings } from '../../types/index.ts';
import {
  fetchAccounts,
  fetchCategories,
  fetchPaymentMethods,
  patchTransaction,
  postTransaction,
} from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface Props {
  onClose: () => void;
  settings: UserSettings;
  transaction?: ApiTransaction;
  onDelete?: () => void;
  currentYear?: number;
  currentMonth?: number; // 0-indexed
  onSuccess?: (savedTx: ApiTransaction) => void;
}

interface FormState {
  type: 'income' | 'expense';
  amount: string;
  categoryId: number | '';
  accountId: number | '';
  paymentMethodId: number | '';
  date: string;
  note: string;
  description: string;
  paidForMemberId: string;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fieldCls =
  'w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] pl-3 pr-8 py-2.5 outline-none focus:border-accent transition-colors appearance-none';

const labelCls = 'text-xs font-bold text-text-muted mb-1.5 block';

export default function AddTransactionModal({
  onClose,
  settings,
  transaction,
  onDelete,
  currentYear,
  currentMonth,
  onSuccess,
}: Props) {
  const { user, activeMember, isChild, familyMembers } = useAuth();
  const isEdit = transaction !== undefined;
  const queryClient = useQueryClient();

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Automatically lock paidForMemberId to child's own ID when in Child view
  const initialPaidForMemberId = isChild && activeMember
    ? activeMember.id
    : (transaction?.paidForMemberId ?? '');

  const resolveInitialDate = () => {
    if (transaction?.tx_date) return transaction.tx_date;
    const now = new Date();
    if (
      currentYear !== undefined &&
      currentMonth !== undefined &&
      (now.getFullYear() !== currentYear || now.getMonth() !== currentMonth)
    ) {
      const y = currentYear;
      const m = String(currentMonth + 1).padStart(2, '0');
      const d = String(Math.min(now.getDate(), 28)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return localToday();
  };

  const [form, setForm] = useState<FormState>(() =>
    isEdit
      ? {
          type: isChild ? 'expense' : (transaction.amount > 0 ? 'income' : 'expense'),
          amount: String(Math.abs(transaction.amount)),
          categoryId: transaction.category_id,
          accountId: transaction.account_id,
          paymentMethodId: transaction.payment_method_id ?? '',
          date: transaction.tx_date,
          note: transaction.note,
          description: transaction.description ?? '',
          paidForMemberId: initialPaidForMemberId,
        }
      : {
          type: 'expense',
          amount: '',
          categoryId: '',
          accountId: '',
          paymentMethodId: '',
          date: resolveInitialDate(),
          note: '',
          description: '',
          paidForMemberId: initialPaidForMemberId,
        },
  );

  const switchType = (t: 'income' | 'expense') => {
    // Restrict transaction type selection for child profiles primarily to 'Expense'
    if (isChild && t !== 'expense') return;
    setForm((prev) => ({ ...prev, type: t, categoryId: '' }));
  };

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const {
    data: paymentMethods = [],
    isLoading: paymentMethodsLoading,
    isError: paymentMethodsError,
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: fetchPaymentMethods,
  });

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (body: Parameters<typeof postTransaction>[0]) =>
      isEdit ? patchTransaction(transaction!.id, body) : postTransaction(body),
    onSuccess: (savedTx) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      if (onSuccess && savedTx) {
        onSuccess(savedTx);
      }
      onClose();
    },
  });

  const filteredCategories = allCategories.filter((c) => c.type === form.type);

  const canSubmit =
    form.amount !== '' &&
    Number(form.amount) > 0 &&
    form.categoryId !== '' &&
    form.accountId !== '' &&
    form.note.trim() !== '';

  const handleSubmit = () => {
    if (!canSubmit || isPending) return;

    const now = new Date();
    const txTime = isEdit
      ? transaction!.tx_time
      : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    const rawAmt = Math.abs(Number(form.amount));

    // For child profiles, automatically lock paidForMemberId to child's ID
    const resolvedPaidForMemberId = isChild
      ? (activeMember?.id || null)
      : (form.paidForMemberId || null);

    mutate({
      account_id: form.accountId as number,
      category_id: form.categoryId as number,
      amount: form.type === 'expense' ? -rawAmt : rawAmt,
      note: form.note.trim(),
      description: form.description.trim() || undefined,
      tx_date: form.date,
      tx_time: txTime,
      payment_method_id:
        form.paymentMethodId === '' ? null : form.paymentMethodId,
      userId: user?.id,
      paidForMemberId: resolvedPaidForMemberId,
    });
  };

  const { currency_symbol: sym, unit_position: pos } = settings;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,46,0.4)] p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-surface rounded-3xl shadow-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-extrabold text-text-primary">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close transaction form"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-border border-0 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Type toggle */}
          {isChild ? (
            <div className="flex bg-border rounded-[13px] p-1">
              <div className="flex-1 py-2 rounded-[10px] text-sm font-bold bg-surface text-expense shadow-sm text-center flex items-center justify-center gap-1.5">
                <span>Expense</span>
                <span className="text-[10.5px] font-semibold text-text-muted">
                  (Child view restricted)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex gap-1 bg-border rounded-[13px] p-1">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
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
                  {t === 'expense' ? 'Expense' : 'Income'}
                </button>
              ))}
            </div>
          )}

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
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className={[
                  'w-full text-xl font-extrabold text-text-primary bg-bg border border-border rounded-[11px] py-3 outline-none focus:border-accent transition-colors tabular-nums',
                  pos === 'prefix' ? 'pl-12 pr-4' : 'pl-4 pr-12',
                ].join(' ')}
              />
              {pos === 'suffix' && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-text-muted select-none">
                  {sym}
                </span>
              )}
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

          {/* Payment Method */}
          <div>
            <label className={labelCls}>Payment Method (optional)</label>
            <div className="relative">
              <select
                value={form.paymentMethodId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethodId:
                      e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                className={fieldCls}
              >
                <option value="">Select payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
            </div>

            {paymentMethodsLoading && (
              <p className="text-xs text-text-muted mt-1">
                Loading payment methods...
              </p>
            )}

            {paymentMethodsError && (
              <p className="text-xs text-expense mt-1">
                Payment methods couldn't be loaded. You can leave this field empty.
              </p>
            )}
          </div>

          {/* Family Member (Who is this for?) - Locked & hidden if isChild is true, shown for Parent */}
          {!isChild && familyMembers && familyMembers.length > 0 && (
            <div>
              <label className={labelCls}>Paid for Family Member</label>
              <div className="relative">
                <select
                  value={form.paidForMemberId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paidForMemberId: e.target.value,
                    }))
                  }
                  className={fieldCls}
                  aria-label="Paid for family member"
                >
                  <option value="">Household / Shared</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className={fieldCls}
            />
          </div>

          {/* Note */}
          <div>
            <label className={labelCls}>Note</label>
            <input
              type="text"
              placeholder="e.g. Netflix subscription"
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
              className={fieldCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>
              Description <span className="font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Add more details..."
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className={`${fieldCls} resize-none`}
            />
          </div>

          {isError && (
            <p className="text-xs text-expense">
              The transaction could not be saved. Check your API and try again.
              {error instanceof Error ? ` ${error.message}` : ''}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {isEdit &&
              onDelete &&
              (confirmDelete ? (
                <>
                  <span className="text-xs font-semibold text-text-muted mr-1">
                    Delete?
                  </span>
                  <button
                    onClick={onDelete}
                    className="px-3 py-2.5 rounded-[13px] bg-expense text-white text-sm font-bold border-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2.5 rounded-[13px] bg-bg text-text-muted text-sm font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
                  >
                    No
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2.5 rounded-[13px] text-expense text-sm font-semibold border border-expense/40 bg-transparent cursor-pointer hover:bg-expense/10 transition-colors"
                >
                  Delete
                </button>
              ))}

            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isPending}
                className="py-2.5 px-5 rounded-[13px] bg-accent text-white text-sm font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {isPending
                  ? 'Saving...'
                  : isEdit
                    ? 'Save Changes'
                    : 'Add Transaction'}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-[13px] bg-bg text-text-muted text-sm font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
