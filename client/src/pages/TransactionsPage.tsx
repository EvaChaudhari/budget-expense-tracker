import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Repeat, ArrowLeftRight, Plus } from 'lucide-react';
import type { TxView, UserSettings, ApiTransaction, RecurringTransaction } from '../types/index.ts';
import {
  deleteTransaction,
  fetchTransactions,
  processDueRecurringTransactions,
} from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { buildCalendarData, buildDailyGroups } from '../lib/txBuilders.ts';
import SummaryCards from '../components/transactions/SummaryCards.tsx';
import ViewSwitcher from '../components/transactions/ViewSwitcher.tsx';
import DailyView from '../components/transactions/DailyView.tsx';
import CalendarView from '../components/transactions/CalendarView.tsx';
import MonthlyView from '../components/transactions/MonthlyView.tsx';
import SearchModal from '../components/transactions/SearchModal.tsx';
import AddTransactionModal from '../components/transactions/AddTransactionModal.tsx';
import RecurringList from '../components/transactions/RecurringList.tsx';
import AddRecurringModal from '../components/transactions/AddRecurringModal.tsx';

interface Props {
  year: number;
  month: number; // 0-indexed
  settings: UserSettings;
  view: TxView;
  onViewChange: (v: TxView) => void;
  viewYear: number;
}

type TransactionsMode = 'all' | 'recurring';

export default function TransactionsPage({
  year,
  month,
  settings,
  view,
  onViewChange,
  viewYear,
}: Props) {
  const [mode, setMode] = useState<TransactionsMode>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [editTx, setEditTx] = useState<ApiTransaction | null>(null);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editRecurring, setEditRecurring] = useState<RecurringTransaction | null>(null);

  const { activeMember } = useAuth();
  const queryClient = useQueryClient();

  // Automatically check and process any due recurring items when page loads
  useEffect(() => {
    processDueRecurringTransactions().then((res) => {
      if (res.processed > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['stats/monthly'] });
        queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      }
    });
  }, [queryClient]);

  const { data: txs = [] } = useQuery({
    queryKey: ['transactions', year, month, activeMember?.id],
    queryFn: () => fetchTransactions(year, month, activeMember),
  });
  const previousDate = new Date(year, month - 1, 1);
  const previousYear = previousDate.getFullYear();
  const previousMonth = previousDate.getMonth();

  const { data: previousTxs = [] } = useQuery({
    queryKey: ['transactions', previousYear, previousMonth, activeMember?.id],
    queryFn: () => fetchTransactions(previousYear, previousMonth, activeMember),
  });

  const { mutate: deleteTx } = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const handleEdit = (id: number) => {
    const tx = txs.find((t) => t.id === id);
    if (tx) setEditTx(tx);
  };

  const totalIncome = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const previousIncome = previousTxs
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const previousExpenses = previousTxs
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const dailyGroups = buildDailyGroups(txs);
  const calendarData = buildCalendarData(txs);

  return (
    <>
      <div className="flex flex-col gap-3.5">
        {/* Main View Mode Switcher: All Transactions vs Recurring Payments */}
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="inline-flex gap-1 bg-border rounded-[15px] p-1.25">
            <button
              onClick={() => setMode('all')}
              className={[
                'flex items-center gap-2 px-3.5 sm:px-4.5 py-2 rounded-[11px] text-xs sm:text-[13px] font-bold border-0 cursor-pointer transition-all duration-150',
                mode === 'all'
                  ? 'bg-surface text-text-primary shadow-[0_2px_8px_rgba(37,99,235,0.12)]'
                  : 'bg-transparent text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              <ArrowLeftRight size={14} />
              <span>All Transactions</span>
            </button>
            <button
              onClick={() => setMode('recurring')}
              className={[
                'flex items-center gap-2 px-3.5 sm:px-4.5 py-2 rounded-[11px] text-xs sm:text-[13px] font-bold border-0 cursor-pointer transition-all duration-150',
                mode === 'recurring'
                  ? 'bg-surface text-accent shadow-[0_2px_8px_rgba(37,99,235,0.12)]'
                  : 'bg-transparent text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              <Repeat size={14} />
              <span>Recurring Payments</span>
            </button>
          </div>

          {mode === 'recurring' && (
            <button
              onClick={() => setShowAddRecurring(true)}
              className="flex items-center gap-1.5 bg-accent text-white border-0 rounded-[12px] px-3.5 py-2 text-xs font-bold cursor-pointer hover:opacity-90 shadow-xs transition-opacity ml-auto"
            >
              <Plus size={15} />
              <span>Add Recurring Payment</span>
            </button>
          )}
        </div>

        {/* Content based on Mode */}
        {mode === 'all' ? (
          <div>
            {view !== 'monthly' && (
              <SummaryCards
                income={totalIncome}
                expenses={totalExpenses}
                previousIncome={previousIncome}
                previousExpenses={previousExpenses}
                settings={settings}
              />
            )}
            <ViewSwitcher
              active={view}
              onChange={onViewChange}
              onSearchOpen={() => setSearchOpen(true)}
            />

            {view === 'daily' && (
              <DailyView groups={dailyGroups} settings={settings} onEdit={handleEdit} />
            )}
            {view === 'calendar' && (
              <CalendarView
                key={`${year}-${month}`}
                year={year}
                month={month}
                settings={settings}
                calendarData={calendarData}
              />
            )}
            {view === 'monthly' && (
              <MonthlyView
                key={viewYear}
                year={viewYear}
                settings={settings}
                onEdit={(tx) => setEditTx(tx)}
              />
            )}
          </div>
        ) : (
          <RecurringList
            settings={settings}
            onAddNew={() => setShowAddRecurring(true)}
            onEdit={(item) => setEditRecurring(item)}
          />
        )}
      </div>

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          settings={settings}
          onEdit={(tx) => setEditTx(tx)}
        />
      )}

      {editTx && (
        <AddTransactionModal
          transaction={editTx}
          settings={settings}
          onClose={() => setEditTx(null)}
          onDelete={() => {
            deleteTx(editTx.id);
            setEditTx(null);
          }}
        />
      )}

      {showAddRecurring && (
        <AddRecurringModal
          settings={settings}
          onClose={() => setShowAddRecurring(false)}
        />
      )}

      {editRecurring && (
        <AddRecurringModal
          initialData={editRecurring}
          settings={settings}
          onClose={() => setEditRecurring(null)}
        />
      )}
    </>
  );
}
