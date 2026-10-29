import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search, X } from 'lucide-react';
import { fetchTransactions } from '../../lib/api.ts';
import { buildFullDateLabel } from '../../lib/txBuilders.ts';
import { formatSigned } from '../../lib/currency.ts';
import { categoryColor } from '../../lib/constants.ts';
import type { ApiTransaction, UserSettings } from '../../types/index.ts';

interface Props {
  onClose: () => void;
  settings: UserSettings;
  onEdit: (tx: ApiTransaction) => void;
}

export default function SearchModal({ onClose, settings, onEdit }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: allTxs = [] } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => fetchTransactions(),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const availableCategories = useMemo(() => {
    const seen = new Map<number, { id: number; name: string }>();
    for (const tx of allTxs) {
      if (!seen.has(tx.category_id)) {
        seen.set(tx.category_id, {
          id: tx.category_id,
          name: tx.category_name,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allTxs]);

  const filteredTxs = useMemo(() => {
    return allTxs.filter((tx) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matches =
          tx.note.toLowerCase().includes(q) ||
          tx.category_name.toLowerCase().includes(q) ||
          (tx.description?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      if (type === 'income' && tx.amount <= 0) return false;
      if (type === 'expense' && tx.amount >= 0) return false;
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(tx.category_id))
        return false;
      const abs = Math.abs(tx.amount);
      if (amountMin !== '' && abs < Number(amountMin)) return false;
      if (amountMax !== '' && abs > Number(amountMax)) return false;
      return true;
    });
  }, [allTxs, debouncedSearch, type, selectedCategoryIds, amountMin, amountMax]);

  const toggleCategory = (id: number) =>
    setSelectedCategoryIds((ids) =>
      ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id],
    );

  const activeFilterCount =
    (type !== 'all' ? 1 : 0) +
    selectedCategoryIds.length +
    (amountMin !== '' ? 1 : 0) +
    (amountMax !== '' ? 1 : 0);

  const hasQuery =
    search !== '' ||
    type !== 'all' ||
    selectedCategoryIds.length > 0 ||
    amountMin !== '' ||
    amountMax !== '';

  const totalIncome = filteredTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filteredTxs
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-start justify-center md:pt-[8vh] md:px-4 md:pb-8"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-lg bg-bg rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: '90vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search all transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-surface border border-border rounded-[13px] text-sm font-medium text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((o) => !o)}
              className={[
                'flex items-center gap-1.5 px-3.5 py-2.5 rounded-[13px] border text-sm font-semibold transition-colors cursor-pointer shrink-0',
                showFilters || activeFilterCount > 0
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-surface border-border text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              <Filter size={14} />
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-[13px] bg-surface border border-border text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 flex flex-col gap-3">
              {/* Type */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide w-16 shrink-0">
                  Type
                </span>
                <div className="flex gap-1.5">
                  {(['all', 'income', 'expense'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={[
                        'px-3.5 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer transition-colors border-0',
                        type === t
                          ? t === 'income'
                            ? 'bg-income/15 text-income'
                            : t === 'expense'
                              ? 'bg-expense/15 text-expense'
                              : 'bg-accent/15 text-accent'
                          : 'bg-surface text-text-muted hover:text-text-primary',
                      ].join(' ')}
                    >
                      {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {availableCategories.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide w-16 shrink-0 mt-1.5">
                    Category
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCategories.map((cat) => {
                      const active = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          style={active ? { background: categoryColor(cat.id) } : undefined}
                          className={[
                            'px-3 py-1.5 rounded-[9px] text-xs font-semibold border cursor-pointer transition-colors',
                            active
                              ? 'border-transparent text-white'
                              : 'bg-surface border-border text-text-muted hover:text-text-primary',
                          ].join(' ')}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount range */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide w-16 shrink-0">
                  Amount
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted pointer-events-none">
                      {sym}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={amountMin}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setAmountMin(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-[9px] text-sm font-semibold text-text-primary outline-none focus:border-accent transition-colors tabular-nums"
                    />
                  </div>
                  <span className="text-xs text-text-muted shrink-0">to</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted pointer-events-none">
                      {sym}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={amountMax}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setAmountMax(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-[9px] text-sm font-semibold text-text-primary outline-none focus:border-accent transition-colors tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Clear */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setType('all');
                    setSelectedCategoryIds([]);
                    setAmountMin('');
                    setAmountMax('');
                  }}
                  className="self-start text-xs font-semibold text-expense hover:opacity-70 transition-opacity cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!hasQuery ? (
            <p className="text-center text-sm text-text-muted py-10">
              Type to search across all your transactions
            </p>
          ) : filteredTxs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <p className="text-sm font-medium">No transactions found</p>
              <p className="text-xs mt-1">Try a different search term or filter</p>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
                <span className="text-xs text-text-muted font-medium">
                  {filteredTxs.length} result{filteredTxs.length !== 1 ? 's' : ''}
                </span>
                <div className="ml-auto flex items-center gap-4">
                  {totalIncome > 0 && (
                    <span className="text-xs font-bold text-income tabular-nums">
                      +{formatSigned(totalIncome, sym, pos).replace(/^[+-]/, '')}
                    </span>
                  )}
                  {totalExpenses > 0 && (
                    <span className="text-xs font-bold text-expense tabular-nums">
                      −{formatSigned(totalExpenses, sym, pos).replace(/^[+-]/, '')}
                    </span>
                  )}
                </div>
              </div>

              {/* Flat transaction list */}
              <div className="bg-surface mx-4 my-4 rounded-[20px] border border-border overflow-hidden shadow-(--shadow-card)">
                {filteredTxs.map((tx, i) => {
                  const isLast = i === filteredTxs.length - 1;
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onEdit(tx)}
                      className={[
                        'flex items-center gap-3.5 py-3.5 px-4.5 cursor-pointer hover:bg-bg/60 transition-colors',
                        !isLast && 'border-b border-bg',
                      ].join(' ')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px]">{tx.category_name}</div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
