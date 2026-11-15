import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Repeat, X } from 'lucide-react';
import Sidebar from './components/Sidebar.tsx';
import BottomNav from './components/BottomNav.tsx';
import Header from './components/Header.tsx';
import TransactionsPage from './pages/TransactionsPage.tsx';
import StatsPage from './pages/StatsPage.tsx';
import AccountsPage from './pages/AccountsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import BudgetsPage from './pages/BudgetsPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import AddTransactionModal from './components/transactions/AddTransactionModal.tsx';
import type { Tab, TxView, StatsView } from './types/index.ts';
import { useSettings } from './hooks/useSettings.ts';
import { useMonth } from './hooks/useMonth.ts';
import {
  fetchTransactions,
  fetchBudgets,
  fetchMonthlyStats,
  processDueRecurringTransactions,
} from './lib/api.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
});

function Dashboard() {
  const [tab, setTab] = useState<Tab>('transactions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [txView, setTxView] = useState<TxView>('daily');
  const [statsView, setStatsView] = useState<StatsView>('monthly');
  const { settings, update } = useSettings();
  const { year, month, label: monthLabel, prev, next } = useMonth();
  const [viewYear, setViewYear] = useState(year);
  const [statsYear, setStatsYear] = useState(year);
  const { activeMember } = useAuth();

  // Same query keys as TransactionsPage/MonthlyView — React Query serves cached data.
  const { data: txs = [] } = useQuery({
    queryKey: ['transactions', year, month, activeMember?.id],
    queryFn: () => fetchTransactions(year, month, activeMember),
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

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2.5 pb-28 md:px-8.5 md:pb-11">
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
          {tab === 'budgets' && (
            <BudgetsPage year={year} month={month} settings={settings} />
          )}
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

function MainContent() {
  const { user, isLoading, activeMember } = useAuth();
  const qc = useQueryClient();
  const [recurringToast, setRecurringToast] = useState<{ message: string; count: number } | null>(null);

  useEffect(() => {
    // When user logs in, logs out, or switches accounts/family members, clear query cache
    qc.clear();
  }, [user?.id, activeMember?.id, qc]);

  // Check and process due recurring transactions when authenticated user session is active
  useEffect(() => {
    if (!user?.id) return;

    processDueRecurringTransactions(user.id)
      .then((res) => {
        if (res.processed > 0) {
          // Refresh all dashboard queries so summaries and accounts reflect the updated balances immediately
          qc.invalidateQueries({ queryKey: ['transactions'] });
          qc.invalidateQueries({ queryKey: ['accounts'] });
          qc.invalidateQueries({ queryKey: ['stats'] });
          qc.invalidateQueries({ queryKey: ['budgets'] });
          qc.invalidateQueries({ queryKey: ['recurring-transactions'] });

          // Trigger a toast notification
          setRecurringToast({
            message: `Automatically logged ${res.processed} scheduled recurring payment${res.processed > 1 ? 's' : ''} into your transactions.`,
            count: res.processed,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to auto-process recurring transactions:', err);
      });
  }, [user?.id, qc]);

  // Auto-dismiss the toast notification after 6 seconds
  useEffect(() => {
    if (!recurringToast) return;
    const timer = setTimeout(() => {
      setRecurringToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [recurringToast]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-text-muted">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <Dashboard />

      {/* Auto-processed recurring payments toast notification */}
      {recurringToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm flex items-start gap-3 p-4 rounded-[18px] bg-surface border border-accent/25 shadow-2xl text-text-primary animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-8.5 h-8.5 rounded-[12px] bg-accent text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Repeat size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-accent uppercase tracking-wider">
              Recurring Payment Processed
            </div>
            <p className="text-xs text-text-muted mt-0.5 leading-snug">
              {recurringToast.message}
            </p>
          </div>
          <button
            onClick={() => setRecurringToast(null)}
            aria-label="Dismiss notification"
            className="text-text-muted hover:text-text-primary p-1 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
