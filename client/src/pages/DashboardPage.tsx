import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  Repeat,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Plus,
} from 'lucide-react';
import type { UserSettings, ApiTransaction, RecurringTransaction, Account } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  fetchAccounts,
  fetchTransactions,
  fetchRecurringTransactions,
} from '../lib/api.ts';
import { formatMoney } from '../lib/currency.ts';
import { useMonth } from '../hooks/useMonth.ts';
import { useSettings } from '../hooks/useSettings.ts';

export interface DashboardPageProps {
  year?: number;
  month?: number; // 0-indexed
  settings?: UserSettings;
  onAddTransaction?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function DashboardPage(props: DashboardPageProps) {
  const { user, activeMember, isChild } = useAuth();
  const monthHook = useMonth();
  const settingsHook = useSettings();

  const year = props.year ?? monthHook.year;
  const month = props.month ?? monthHook.month;
  const settings = props.settings ?? settingsHook.settings;

  const sym = '₹'; // Default currency formatted in ₹
  const pos = settings?.unit_position ?? 'prefix';

  // 1. Accounts query
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts', user?.id],
    queryFn: fetchAccounts,
    enabled: !!user?.id,
  });

  // 2. Transactions query (scoped automatically by activeMember / isChild)
  const { data: txs = [] } = useQuery<ApiTransaction[]>({
    queryKey: ['transactions', year, month, activeMember?.id],
    queryFn: () => fetchTransactions(year, month, activeMember),
    enabled: !!user?.id,
  });

  // 3. Recurring transactions query
  const { data: recurringList = [] } = useQuery<RecurringTransaction[]>({
    queryKey: ['recurring-transactions', user?.id],
    queryFn: () => fetchRecurringTransactions(user?.id),
    enabled: !!user?.id,
  });

  // ==========================================
  // Calculations for Parent View (Household)
  // ==========================================
  const totalNetWorth = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  }, [accounts]);

  const householdIncome = useMemo(() => {
    return txs
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [txs]);

  const householdExpenses = useMemo(() => {
    return txs
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [txs]);

  const netSavings = householdIncome - householdExpenses;
  const savingsRate = householdIncome > 0 ? Math.max(0, (netSavings / householdIncome) * 100) : 0;

  // ==========================================
  // Calculations for Child View
  // ==========================================
  const parentAllowance = activeMember?.monthlyAllowance ?? 0;

  // Personal spent this month: only child's own expenses
  const personalSpent = useMemo(() => {
    const personalTxs = txs.filter((t) => {
      if (t.amount >= 0) return false;
      if (isChild) return true; // getTransactions already filtered to child
      return t.paidForMemberId === activeMember?.id;
    });
    return personalTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [txs, isChild, activeMember?.id]);

  const allowanceRemaining = parentAllowance - personalSpent;
  const allowanceSpentPct =
    parentAllowance > 0
      ? Math.min(100, Math.round((personalSpent / parentAllowance) * 100))
      : 0;

  // Child's recent transactions (top 8)
  const memberId = activeMember?.id;
  const childRecentTransactions = useMemo(() => {
    const list = isChild
      ? txs
      : txs.filter((t) => t.paidForMemberId === memberId);
    return list.slice(0, 8);
  }, [txs, isChild, memberId]);

  // Filter recurring bills:
  // Hide household recurring bills from the child dashboard unless explicitly tagged with their member ID
  const visibleRecurringBills = useMemo(() => {
    return recurringList.filter((bill) => {
      if (isChild && memberId) {
        return (
          bill.paidForMemberId === memberId ||
          bill.memberId === memberId
        );
      }
      return !isChild; // Show all household bills for Parent view
    });
  }, [recurringList, isChild, memberId]);

  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-8">
      {/* Profile Header Banner */}
      <div
        className={`p-5 rounded-[22px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
          isChild
            ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-surface border-amber-500/25'
            : 'bg-surface border-border shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
              isChild ? 'bg-amber-500' : 'bg-accent'
            }`}
          >
            {isChild ? <Sparkles size={22} /> : <PiggyBank size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight">
                {isChild
                  ? `${activeMember?.name?.replace(/\s*\(Child\)$/i, '') || 'Child'}'s Dashboard`
                  : 'Household Dashboard'}
              </h1>
              <span
                className={`text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  isChild
                    ? 'bg-amber-500 text-white'
                    : 'bg-accent/15 text-accent'
                }`}
              >
                {isChild ? 'Child View' : 'Parent View'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {isChild
                ? `Track personal allowance and expenses for ${monthName} ${year}`
                : `Complete household overview for ${monthName} ${year}`}
            </p>
          </div>
        </div>

        {props.onAddTransaction && (
          <button
            onClick={props.onAddTransaction}
            className="flex items-center gap-2 bg-accent text-white border-0 rounded-[14px] px-3.5 py-2 text-xs font-bold cursor-pointer hover:opacity-90 shadow-xs transition-opacity"
          >
            <Plus size={16} />
            <span>{isChild ? 'Log Expense' : 'Add Transaction'}</span>
          </button>
        )}
      </div>

      {/* =========================================================
       * 1. CHILD VIEW DASHBOARD
       * - Total Net Worth, Household Income & family savings stats HIDDEN
       * - Allowance Remaining (formatted in ₹)
       * - Personal Spent This Month (formatted in ₹)
       * - My Recent Transactions
       * ========================================================= */}
      {isChild ? (
        <div className="flex flex-col gap-6">
          {/* Child Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Allowance Remaining */}
            <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Allowance Remaining
                </span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    allowanceRemaining >= 0
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  {allowanceRemaining >= 0 ? 'On Track' : 'Over Limit'}
                </span>
              </div>

              <div className="mb-3">
                <div
                  className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
                    allowanceRemaining >= 0 ? 'text-text-primary' : 'text-expense'
                  }`}
                >
                  {formatMoney(allowanceRemaining, sym, pos)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Monthly parent allowance: {formatMoney(parentAllowance, sym, pos)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="pt-2 border-t border-border/70">
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted mb-1.5">
                  <span>Spent: {allowanceSpentPct}%</span>
                  <span>
                    {formatMoney(personalSpent, sym, pos)} of {formatMoney(parentAllowance, sym, pos)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-bg rounded-full overflow-hidden border border-border/40">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      allowanceSpentPct >= 90
                        ? 'bg-expense'
                        : allowanceSpentPct >= 65
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(allowanceSpentPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Personal Spent This Month */}
            <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Personal Spent This Month
                </span>
                <div className="w-8 h-8 rounded-xl bg-expense/10 text-expense flex items-center justify-center">
                  <TrendingDown size={17} />
                </div>
              </div>

              <div className="mb-3">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary tabular-nums">
                  {formatMoney(personalSpent, sym, pos)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Logged in {monthName} {year}
                </div>
              </div>

              <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs text-text-muted">
                <span>Total transactions:</span>
                <span className="font-bold text-text-primary tabular-nums">
                  {childRecentTransactions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Tagged Recurring Bills for Child (if any) */}
          {visibleRecurringBills.length > 0 && (
            <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Repeat size={17} className="text-accent" />
                  <h2 className="text-sm font-extrabold text-text-primary">
                    My Subscriptions & Recurring Bills
                  </h2>
                </div>
                <span className="text-xs text-text-muted">
                  {visibleRecurringBills.length} active
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleRecurringBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3.5 rounded-[14px] bg-bg border border-border/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-text-primary">
                        {bill.title}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
                        <Calendar size={12} />
                        <span>Due {bill.nextDueDate} ({bill.frequency})</span>
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-expense tabular-nums">
                      -{formatMoney(bill.amount, sym, pos)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: My Recent Transactions */}
          <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-text-primary">
                My Recent Transactions
              </h2>
              <span className="text-xs text-text-muted">
                {childRecentTransactions.length} item{childRecentTransactions.length === 1 ? '' : 's'}
              </span>
            </div>

            {childRecentTransactions.length === 0 ? (
              <div className="p-8 text-center rounded-[16px] bg-bg border border-dashed border-border">
                <p className="text-xs font-semibold text-text-muted">
                  No personal transactions recorded for {monthName} {year}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {childRecentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8.5 h-8.5 rounded-[11px] bg-expense/10 text-expense flex items-center justify-center shrink-0">
                        <ArrowDownLeft size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-text-primary truncate">
                          {tx.note || tx.category_name}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {tx.category_name} • {tx.tx_date}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-extrabold text-expense tabular-nums shrink-0">
                      -{formatMoney(Math.abs(tx.amount), sym, pos)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================
         * 2. PARENT VIEW DASHBOARD (Household)
         * - Shows "Total Net Worth"
         * - Shows "Household Income"
         * - Shows family-wide savings stats
         * - Shows household recurring bills
         * - Shows recent household transactions
         * ========================================================= */
        <div className="flex flex-col gap-6">
          {/* Parent Household Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Stat 1: Total Net Worth */}
            <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Total Net Worth
                </span>
                <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Wallet size={17} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-text-primary tabular-nums">
                {formatMoney(totalNetWorth, sym, pos)}
              </div>
              <p className="text-xs text-text-muted mt-1">Across all linked accounts</p>
            </div>

            {/* Stat 2: Household Income */}
            <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Household Income
                </span>
                <div className="w-8 h-8 rounded-xl bg-income/10 text-income flex items-center justify-center">
                  <TrendingUp size={17} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-income tabular-nums">
                +{formatMoney(householdIncome, sym, pos)}
              </div>
              <p className="text-xs text-text-muted mt-1">Total income this month</p>
            </div>

            {/* Stat 3: Family-wide Savings Stats */}
            <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Net Savings
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <PiggyBank size={17} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-text-primary tabular-nums">
                {formatMoney(netSavings, sym, pos)}
              </div>
              <p className="text-xs text-text-muted mt-1">
                Savings rate: <span className="font-bold text-emerald-600">{savingsRate.toFixed(1)}%</span>
              </p>
            </div>
          </div>

          {/* Household Recurring Bills */}
          <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Repeat size={17} className="text-accent" />
                <h2 className="text-sm font-extrabold text-text-primary">
                  Household Recurring Bills
                </h2>
              </div>
              <span className="text-xs text-text-muted">
                {visibleRecurringBills.length} active
              </span>
            </div>

            {visibleRecurringBills.length === 0 ? (
              <p className="text-xs text-text-muted py-3">No recurring bills scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleRecurringBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3.5 rounded-[14px] bg-bg border border-border/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-text-primary">
                        {bill.title}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
                        <Calendar size={12} />
                        <span>Due {bill.nextDueDate}</span>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-extrabold tabular-nums ${
                        bill.type === 'income' ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {bill.type === 'income' ? '+' : '-'}
                      {formatMoney(bill.amount, sym, pos)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Household Recent Transactions */}
          <div className="bg-surface border border-border rounded-[20px] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-text-primary">
                Recent Transactions
              </h2>
              <span className="text-xs text-text-muted">
                {txs.length} total this month
              </span>
            </div>

            {txs.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                No household transactions recorded this month.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {txs.slice(0, 8).map((tx) => (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8.5 h-8.5 rounded-[11px] flex items-center justify-center shrink-0 ${
                          tx.amount > 0
                            ? 'bg-income/10 text-income'
                            : 'bg-expense/10 text-expense'
                        }`}
                      >
                        {tx.amount > 0 ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownLeft size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-text-primary truncate">
                          {tx.note || tx.category_name}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {tx.category_name} • {tx.tx_date}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-extrabold tabular-nums shrink-0 ${
                        tx.amount > 0 ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : '-'}
                      {formatMoney(Math.abs(tx.amount), sym, pos)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

