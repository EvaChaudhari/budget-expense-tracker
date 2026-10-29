import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import type { Category } from '../../types/index.ts';
import { fetchCategories, postCategory, patchCategory, deleteCategory } from '../../lib/api.ts';
import SettingCard from '../ui/SettingCard.tsx';

export default function CategoriesSection() {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  // ── Inline edit ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ id, cat }: { id: number; cat: Category }) =>
      patchCategory(id, { name: editName.trim(), icon: cat.icon }),
    onSuccess: invalidate,
  });

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };
  const saveEdit = () => {
    if (!editName.trim() || editingId === null) return;
    const cat = categories.find((c) => c.id === editingId);
    if (cat) updateMutation.mutate({ id: editingId, cat });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  // ── Add form ─────────────────────────────────────────────────────────────────
  const [showAddType, setShowAddType] = useState<'income' | 'expense' | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const addMutation = useMutation({
    mutationFn: (body: { name: string; type: 'income' | 'expense'; icon: string }) =>
      postCategory(body),
    onSuccess: invalidate,
  });

  const openAddForm = (type: 'income' | 'expense') => {
    setShowAddType(type);
    setNewCatName('');
  };
  const addCategory = () => {
    if (!newCatName.trim() || !showAddType) return;
    addMutation.mutate({ name: newCatName.trim(), type: showAddType, icon: 'tag' });
    setShowAddType(null);
  };

  // ── Delete modal ─────────────────────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState<{
    cat: Category;
    reassignTo: number | null;
    error: string | null;
  } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: ({ id, reassignTo }: { id: number; reassignTo?: number }) =>
      deleteCategory(id, reassignTo),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDeleteModal(null);
    },
    onError: (err: unknown) => {
      const response = (
        err as { response?: { status: number; data?: { transactionCount: number } } }
      )?.response;
      const count = response?.data?.transactionCount;
      const errorMsg =
        response?.status === 409
          ? `This category has ${count} transaction${count === 1 ? '' : 's'}. Select a category to reassign them to.`
          : 'Failed to delete category. Please try again.';
      setDeleteModal((prev) => (prev ? { ...prev, error: errorMsg } : prev));
    },
  });

  return (
    <>
      <SettingCard title="Categories" count={categories.length}>
        {(['expense', 'income'] as const).map((sectionType, si) => {
          const sectionCats = categories.filter((c) => c.type === sectionType);
          const isAddingHere = showAddType === sectionType;
          return (
            <div key={sectionType} className={si > 0 ? 'mt-5 pt-5 border-t border-border' : ''}>
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: sectionType === 'income' ? '#16a34a' : '#ef4444' }}
                >
                  {sectionType}
                </span>
                {!isAddingHere && (
                  <button
                    onClick={() => openAddForm(sectionType)}
                    className="flex items-center gap-1 text-[11px] font-bold text-accent border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity p-0"
                  >
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>

              {isAddingHere && (
                <div
                  className={[
                    'flex flex-col gap-3',
                    sectionCats.length > 0 ? 'mb-3 pb-3 border-b border-bg' : '',
                  ].join(' ')}
                >
                  <input
                    autoFocus
                    placeholder="Category name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCategory();
                      if (e.key === 'Escape') setShowAddType(null);
                    }}
                    className="w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] px-3 py-2 outline-none focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addCategory}
                      disabled={!newCatName.trim()}
                      className="px-4 py-2 rounded-[11px] bg-accent text-white text-xs font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      Add Category
                    </button>
                    <button
                      onClick={() => setShowAddType(null)}
                      className="px-4 py-2 rounded-[11px] bg-bg text-text-muted text-xs font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                {sectionCats.map((cat, i) => {
                  const isLast = i === sectionCats.length - 1;
                  const isEditing = editingId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={[
                        'flex items-center gap-3 py-2.5',
                        !isLast ? 'border-b border-bg' : '',
                      ].join(' ')}
                    >
                      {isEditing ? (
                        <>
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="flex-1 text-sm font-semibold text-text-primary bg-bg border border-accent rounded-lg px-2 py-1 outline-none"
                          />
                          <button
                            onClick={saveEdit}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-accent text-white border-0 cursor-pointer shrink-0"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-border text-text-muted border-0 cursor-pointer shrink-0"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-text-primary flex-1">
                            {cat.name}
                          </span>
                          <button
                            onClick={() => startEdit(cat)}
                            className="w-6 h-6 flex items-center justify-center rounded-md text-text-faint hover:text-accent hover:bg-accent-soft border-0 cursor-pointer transition-colors shrink-0"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ cat, reassignTo: null, error: null })}
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
            </div>
          );
        })}
      </SettingCard>

      {/* Delete modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteModal(null)}
        >
          <div
            className="bg-surface rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-text-primary">Delete category</h3>
                <p className="text-xs text-text-muted mt-0.5">{deleteModal.cat.name}</p>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-border text-text-muted border-0 cursor-pointer hover:text-text-primary transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-text-muted mb-3">
              Reassign existing transactions to another category (required if any exist):
            </p>

            <div className="relative mb-3">
              <select
                value={deleteModal.reassignTo ?? ''}
                onChange={(e) =>
                  setDeleteModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          reassignTo: e.target.value ? Number(e.target.value) : null,
                          error: null,
                        }
                      : prev,
                  )
                }
                className="w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] pl-3 pr-8 py-2.5 outline-none focus:border-accent cursor-pointer appearance-none"
              >
                <option value="">No reassignment (only if no transactions)</option>
                {categories
                  .filter((c) => c.type === deleteModal.cat.type && c.id !== deleteModal.cat.id)
                  .map((c) => (
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

            {deleteModal.error && <p className="text-xs text-expense mb-3">{deleteModal.error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2.5 rounded-[13px] bg-bg text-text-muted text-sm font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteMutation.mutate({
                    id: deleteModal.cat.id,
                    reassignTo: deleteModal.reassignTo ?? undefined,
                  })
                }
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-[13px] bg-expense text-white text-sm font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
