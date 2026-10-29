import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TxView, UserSettings, ApiTransaction } from '../types/index.ts';
import { deleteTransaction, fetchTransactions } from '../lib/api.ts';
import { buildCalendarData, buildDailyGroups } from '../lib/txBuilders.ts';
import SummaryCards from '../components/transactions/SummaryCards.tsx';
import ViewSwitcher from '../components/transactions/ViewSwitcher.tsx';
import DailyView from '../components/transactions/DailyView.tsx';
import CalendarView from '../components/transactions/CalendarView.tsx';
import MonthlyView from '../components/transactions/MonthlyView.tsx';
import SearchModal from '../components/transactions/SearchModal.tsx';
import AddTransactionModal from '../components/transactions/AddTransactionModal.tsx';

interface Props {
  year: number;
  month: number; // 0-indexed
  settings: UserSettings;
  view: TxView;
  onViewChange: (v: TxView) => void;
  viewYear: number;
}

export default function TransactionsPage({
  year,
  month,
  settings,
  view,
  onViewChange,
  viewYear,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [editTx, setEditTx] = useState<ApiTransaction | null>(null);

  const queryClient = useQueryClient();

  const { data: txs = [] } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => fetchTransactions(year, month),
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

  const dailyGroups = buildDailyGroups(txs);
  const calendarData = buildCalendarData(txs);

  return (
    <>
      <div>
        {view !== 'monthly' && (
          <SummaryCards income={totalIncome} expenses={totalExpenses} settings={settings} />
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
    </>
  );
}
