import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import Sidebar from './components/Sidebar.tsx';
import BottomNav from './components/BottomNav.tsx';
import Header from './components/Header.tsx';
import TransactionsPage from './pages/TransactionsPage.tsx';
import StatsPage from './pages/StatsPage.tsx';
import AccountsPage from './pages/AccountsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import AddTransactionModal from './components/transactions/AddTransactionModal.tsx';
import type { Tab, TxView, StatsView } from './types/index.ts';
import { useSettings } from './hooks/useSettings.ts';
import { useMonth } from './hooks/useMonth.ts';
import { fetchTransactions, fetchBudgets, fetchMonthlyStats } from './lib/api.ts';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
});

function AppShell() {
  const [tab, setTab] = useState<Tab>('transactions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [txView, setTxView] = useState<TxView>('daily');
  const [statsView, setStatsView] = useState<StatsView>('monthly');
  const { settings, update } = useSettings();
  const { year, month, label: monthLabel, prev, next } = useMonth();
  const [viewYear, setViewYear] = useState(year);
  const [statsYear, setStatsYear] = useState(year);

  // Same query keys as TransactionsPage/MonthlyView — React Query serves cached data.
  const { data: txs = [] } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => fetchTransactions(year, month),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', year, month + 1],
    queryFn: () => fetchBudgets(year, month + 1),
  });

  const { data: monthlySummaries = [] } = useQuery({
    queryKey: ['stats/monthly'],
    queryFn: fetchMonthlyStats,
  });

  const minYear =
    monthlySummaries.length > 0 ? Math.min(...monthlySummaries.map((s) => s.year)) : year;

  // Only include categories that have a budget set for this month.
  // Categories without limits are excluded from both spent and total.
  const budgetedEntries = budgets.filter((b) => (b.override_amount ?? b.default_amount) !== null);
  const budgetTotal = budgetedEntries.reduce(
    (s, b) => s + (b.override_amount ?? b.default_amount)!,
    0,
  );
  const budgetedIds = new Set(budgetedEntries.map((b) => b.category_id));
  const budgetSpent = txs
    .filter((tx) => tx.amount < 0 && budgetedIds.has(tx.category_id))
    .reduce((s, tx) => s + Math.abs(tx.amount), 0);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text-primary">
      <Sidebar
        activeTab={tab}
        onTabChange={setTab}
        settings={settings}
        year={year}
        month={month}
        budgetSpent={budgetSpent}
        budgetTotal={budgetTotal}
      />

      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          tab={tab}
          monthLabel={monthLabel}
          onPrevMonth={prev}
          onNextMonth={next}
          onAddTransaction={() => setShowAddModal(true)}
          txView={txView}
          statsView={statsView}
          viewYear={tab === 'stats' ? statsYear : viewYear}
          minYear={minYear}
          onPrevYear={
            tab === 'stats' ? () => setStatsYear((y) => y - 1) : () => setViewYear((y) => y - 1)
          }
          onNextYear={
            tab === 'stats' ? () => setStatsYear((y) => y + 1) : () => setViewYear((y) => y + 1)
          }
        />

        <div className="flex-1 overflow-auto px-4 md:px-8.5 pt-2.5 pb-28 md:pb-11">
          {tab === 'transactions' && (
            <TransactionsPage
              year={year}
              month={month}
              settings={settings}
              view={txView}
              onViewChange={setTxView}
              viewYear={viewYear}
            />
          )}
          {tab === 'stats' && (
            <StatsPage
              year={year}
              month={month}
              settings={settings}
              view={statsView}
              onViewChange={setStatsView}
              annualYear={statsYear}
            />
          )}
          {tab === 'accounts' && <AccountsPage settings={settings} />}
          {tab === 'settings' && (
            <SettingsPage year={year} month={month} settings={settings} onUpdate={update} />
          )}
        </div>
      </main>

      <BottomNav activeTab={tab} onTabChange={setTab} />

      {showAddModal && (
        <AddTransactionModal onClose={() => setShowAddModal(false)} settings={settings} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
