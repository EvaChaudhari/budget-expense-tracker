import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
  Wallet,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
} from 'lucide-react';
import type { PaymentMethod } from '../../types/index.ts';
import {
  fetchPaymentMethods,
  postPaymentMethod,
  patchPaymentMethod,
  deletePaymentMethod,
} from '../../lib/api.ts';
import SettingCard from '../ui/SettingCard.tsx';

const methodIcons = {
  cash: Banknote,
  card: CreditCard,
  bank: Building2,
  wallet: Smartphone,
};

export default function PaymentMethodsSection() {
  const queryClient = useQueryClient();

  const {
    data: methods = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: fetchPaymentMethods,
  });

  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['payment-methods'] });

  const addMutation = useMutation({
    mutationFn: (name: string) =>
      postPaymentMethod({ name, icon: 'wallet' }),
    onSuccess: async () => {
      await invalidate();
      setNewName('');
      setShowAdd(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      method,
      name,
    }: {
      id: number;
      method: PaymentMethod;
      name: string;
    }) => patchPaymentMethod(id, { name, icon: method.icon }),
    onSuccess: async () => {
      await invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePaymentMethod(id),
    onSuccess: async () => {
      await invalidate();
      setDeleteId(null);
    },
  });

  const addMethod = () => {
    const name = newName.trim();
    if (!name || addMutation.isPending) return;
    addMutation.mutate(name);
  };

  const startEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setEditName(method.name);
  };

  const saveEdit = () => {
    const name = editName.trim();

    if (!name || editingId === null || updateMutation.isPending) return;

    const method = methods.find((item) => item.id === editingId);

    if (method) {
      updateMutation.mutate({
        id: editingId,
        method,
        name,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteId === null || deleteMutation.isPending) return;
    deleteMutation.mutate(deleteId);
  };

  return (
    <>
      <SettingCard title="Payment Methods" count={methods.length}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
            How you pay
          </span>

          {!showAdd && (
            <button
              onClick={() => {
                setNewName('');
                setShowAdd(true);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-accent border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity p-0"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {isLoading && (
          <p className="text-xs text-text-muted py-3">
            Loading payment methods...
          </p>
        )}

        {isError && (
          <div className="py-3">
            <p className="text-xs text-expense mb-2">
              Could not load payment methods. Check that your backend is
              running and the payment-methods endpoint is available.
            </p>
            <button
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ['payment-methods'],
                })
              }
              className="text-xs font-bold text-accent bg-transparent border-0 cursor-pointer p-0"
            >
              Try again
            </button>
          </div>
        )}

        {showAdd && (
          <div className="flex flex-col gap-3 mb-3 pb-3 border-b border-bg">
            <input
              autoFocus
              placeholder="Payment method name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addMethod();
                if (event.key === 'Escape') setShowAdd(false);
              }}
              className="w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] px-3 py-2 outline-none focus:border-accent"
            />

            {addMutation.isError && (
              <p className="text-xs text-expense">
                Could not add the payment method. Please try again.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={addMethod}
                disabled={!newName.trim() || addMutation.isPending}
                className="px-4 py-2 rounded-[11px] bg-accent text-white text-xs font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {addMutation.isPending ? 'Adding...' : 'Add Method'}
              </button>

              <button
                onClick={() => {
                  setShowAdd(false);
                  setNewName('');
                  addMutation.reset();
                }}
                className="px-4 py-2 rounded-[11px] bg-bg text-text-muted text-xs font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && methods.length === 0 && (
          <p className="text-xs text-text-muted py-3">
            No payment methods yet. Add one to get started.
          </p>
        )}

        <div className="flex flex-col">
          {!isLoading &&
            !isError &&
            methods.map((method, index) => {
              const Icon =
                methodIcons[method.icon as keyof typeof methodIcons] ?? Wallet;
              const isLast = index === methods.length - 1;
              const isEditing = editingId === method.id;

              return (
                <div
                  key={method.id}
                  className={[
                    'flex items-center gap-3 py-2.5',
                    !isLast ? 'border-b border-bg' : '',
                  ].join(' ')}
                >
                  <span className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </span>

                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveEdit();
                          if (event.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 min-w-0 text-sm font-semibold text-text-primary bg-bg border border-accent rounded-lg px-2 py-1 outline-none"
                      />

                      <button
                        onClick={saveEdit}
                        disabled={!editName.trim() || updateMutation.isPending}
                        aria-label="Save payment method"
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-accent text-white border-0 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Check size={13} />
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(null);
                          updateMutation.reset();
                        }}
                        aria-label="Cancel editing"
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-border text-text-muted border-0 cursor-pointer shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-text-primary flex-1 min-w-0">
                        {method.name}
                      </span>

                      <button
                        onClick={() => startEdit(method)}
                        aria-label={`Edit ${method.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-text-faint hover:text-accent hover:bg-accent-soft border-0 cursor-pointer transition-colors shrink-0"
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        onClick={() => setDeleteId(method.id)}
                        aria-label={`Delete ${method.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-text-faint hover:text-expense hover:bg-expense/10 border-0 cursor-pointer transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
        </div>

        {updateMutation.isError && (
          <p className="text-xs text-expense mt-2">
            Could not update the payment method. Please try again.
          </p>
        )}
      </SettingCard>

      {deleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => {
            if (!deleteMutation.isPending) setDeleteId(null);
          }}
        >
          <div
            className="bg-surface rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-text-primary">
                  Delete payment method
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {methods.find((method) => method.id === deleteId)?.name}
                </p>
              </div>

              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteMutation.isPending}
                aria-label="Close delete dialog"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-border text-text-muted border-0 cursor-pointer hover:text-text-primary transition-colors shrink-0 disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-text-muted mb-3">
              Are you sure you want to delete this payment method?
            </p>

            {deleteMutation.isError && (
              <p className="text-xs text-expense mb-3">
                Could not delete the payment method. Please try again.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteId(null);
                  deleteMutation.reset();
                }}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-[13px] bg-bg text-text-muted text-sm font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-[13px] bg-expense text-white text-sm font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
