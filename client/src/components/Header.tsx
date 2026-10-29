import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Tab, TxView, StatsView } from '../types/index.ts';

const PAGE_META: Record<Tab, { title: string; subtitle: string }> = {
  transactions: { title: 'Transactions', subtitle: 'Track your daily money flow' },
  stats: { title: 'Statistics', subtitle: 'Understand your spending patterns' },
  accounts: { title: 'Accounts', subtitle: 'All your balances in one place' },
  settings: { title: 'Settings', subtitle: 'Manage your preferences' },
};

interface Props {
  tab: Tab;
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddTransaction: () => void;
  txView?: TxView;
  statsView?: StatsView;
  viewYear?: number;
  minYear?: number;
  onPrevYear?: () => void;
  onNextYear?: () => void;
}

export default function Header({
  tab,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onAddTransaction,
  txView,
  statsView,
  viewYear,
  minYear,
  onPrevYear,
  onNextYear,
}: Props) {
  const { title, subtitle } = PAGE_META[tab];
  const showAdd = tab === 'transactions';

  const showYearNav =
    (tab === 'transactions' && txView === 'monthly') || (tab === 'stats' && statsView === 'annual');
  const showMonthNav =
    (tab === 'transactions' && txView !== 'monthly') || (tab === 'stats' && statsView !== 'annual');

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-4 md:px-8.5 pt-5 md:pt-6.5 pb-4">
      <div className="min-w-0">
        <div className="text-[19px] sm:text-[21px] md:text-[25px] font-extrabold tracking-[-0.02em] truncate">
          {title}
        </div>
        <div className="hidden md:block text-sm text-text-muted mt-0.75">{subtitle}</div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {showMonthNav && (
          <div className="flex items-center gap-0.5 bg-surface border border-border rounded-[14px] p-1.25">
            <button
              onClick={onPrevMonth}
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-sm px-2">{monthLabel}</span>
            <button
              onClick={onNextMonth}
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {showYearNav && viewYear !== undefined && (
          <div className="flex items-center gap-0.5 bg-surface border border-border rounded-[14px] p-1.25">
            <button
              onClick={onPrevYear}
              disabled={minYear !== undefined && viewYear <= minYear}
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-sm px-2 tabular-nums">{viewYear}</span>
            <button
              onClick={onNextYear}
              disabled={viewYear >= new Date().getFullYear()}
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {showAdd && (
          <button
            onClick={onAddTransaction}
            className="flex items-center gap-2 bg-accent text-white border-0 rounded-[14px] px-3 md:px-4.5 py-2.75 font-bold text-sm cursor-pointer shadow-[0_8px_20px_color-mix(in_srgb,#2563eb_34%,transparent)] hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span className="hidden lg:inline">Add transaction</span>
          </button>
        )}
      </div>
    </header>
  );
}
