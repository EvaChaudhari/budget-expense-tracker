import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import type {
  Account,
  AccountGroup,
  ApiTransaction,
  BudgetEntry,
  Category,
  MonthlySummary,
  UserSettings,
} from '../types/index.ts';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Salary', type: 'income', icon: 'briefcase' },
  { id: 2, name: 'Freelance', type: 'income', icon: 'laptop' },
  { id: 3, name: 'Investment', type: 'income', icon: 'trending-up' },
  { id: 4, name: 'Gift', type: 'income', icon: 'gift' },
  { id: 5, name: 'Refund', type: 'income', icon: 'rotate-ccw' },
  { id: 6, name: 'Food & Dining', type: 'expense', icon: 'utensils' },
  { id: 7, name: 'Transport', type: 'expense', icon: 'car' },
  { id: 8, name: 'Shopping', type: 'expense', icon: 'shopping-bag' },
  { id: 9, name: 'Groceries', type: 'expense', icon: 'shopping-cart' },
  { id: 10, name: 'Bills', type: 'expense', icon: 'receipt' },
  { id: 11, name: 'Entertainment', type: 'expense', icon: 'clapperboard' },
  { id: 12, name: 'Health', type: 'expense', icon: 'heart-pulse' },
];

export const DEFAULT_ACCOUNT_GROUPS: AccountGroup[] = [
  { id: 1, name: 'Cash', sort_order: 0 },
  { id: 2, name: 'Bank', sort_order: 1 },
  { id: 3, name: 'Card', sort_order: 2 },
  { id: 4, name: 'E-wallet', sort_order: 3 },
];

// Seed data specifically for Alex Morgan (user-1) - Personal Finances in INR
const USER1_ACCOUNTS: Account[] = [
  { id: 1, name: 'Cash in Hand', type: 'Wallet', icon: 'banknote', color: '#22c55e', balance: 12400.0, group_id: 1, userId: 'user-1' },
  { id: 2, name: 'HDFC Savings', type: 'Savings account', icon: 'piggy-bank', color: '#f59e0b', balance: 185000.0, group_id: 2, userId: 'user-1' },
  { id: 3, name: 'SBI Current', type: 'Current account', icon: 'landmark', color: '#06b6d4', balance: 43200.0, group_id: 2, userId: 'user-1' },
  { id: 4, name: 'Paytm / UPI', type: 'E-wallet', icon: 'smartphone', color: '#7b5cf0', balance: 3800.0, group_id: 4, userId: 'user-1' },
  { id: 5, name: 'ICICI Credit Card', type: 'Credit card', icon: 'credit-card', color: '#ef4444', balance: -11500.0, group_id: 3, userId: 'user-1' },
];

const USER1_SETTINGS: UserSettings = {
  week_start: 'Sunday',
  currency_country: 'India',
  currency_code: 'INR',
  currency_symbol: '₹',
  unit_position: 'prefix',
};

const USER1_BUDGETS: BudgetEntry[] = [
  { category_id: 6, default_amount: 4500, override_amount: null, userId: 'user-1' },
  { category_id: 7, default_amount: 2000, override_amount: null, userId: 'user-1' },
  { category_id: 9, default_amount: 6000, override_amount: null, userId: 'user-1' },
  { category_id: 11, default_amount: 1500, override_amount: null, userId: 'user-1' },
];

const USER1_TRANSACTIONS: ApiTransaction[] = [
  { id: 101, account_id: 2, category_id: 1, amount: 85000.0, note: 'Monthly salary — Acme Tech India', description: 'Direct NEFT deposit', tx_date: '2026-11-01', tx_time: '09:00:00', category_name: 'Salary', category_icon: 'briefcase', account_name: 'HDFC Savings', userId: 'user-1', paidForMemberId: 'member-alex' },
  { id: 102, account_id: 5, category_id: 11, amount: -649.0, note: 'Netflix India 4K subscription', description: 'Monthly auto-debit', tx_date: '2026-11-01', tx_time: '11:00:00', category_name: 'Entertainment', category_icon: 'clapperboard', account_name: 'ICICI Credit Card', userId: 'user-1', paidForMemberId: 'member-leo' },
  { id: 103, account_id: 1, category_id: 6, amount: -450.0, note: 'Lunch with colleagues', description: 'South Indian Thali', tx_date: '2026-11-02', tx_time: '13:00:00', category_name: 'Food & Dining', category_icon: 'utensils', account_name: 'Cash in Hand', userId: 'user-1', paidForMemberId: 'member-alex' },
  { id: 104, account_id: 4, category_id: 7, amount: -1200.0, note: 'HPCL Petrol Refill', description: 'Vehicle fuel via UPI', tx_date: '2026-11-02', tx_time: '17:30:00', category_name: 'Transport', category_icon: 'car', account_name: 'Paytm / UPI', userId: 'user-1', paidForMemberId: 'member-alex' },
  { id: 105, account_id: 2, category_id: 9, amount: -2850.0, note: 'Blinkit & Nature Basket Groceries', description: 'Weekly groceries', tx_date: '2026-11-02', tx_time: '19:15:00', category_name: 'Groceries', category_icon: 'shopping-cart', account_name: 'HDFC Savings', userId: 'user-1', paidForMemberId: 'member-maya' },
  { id: 106, account_id: 2, category_id: 1, amount: 85000.0, note: 'Monthly salary — Acme Tech India', description: 'Direct NEFT deposit', tx_date: '2026-10-15', tx_time: '09:00:00', category_name: 'Salary', category_icon: 'briefcase', account_name: 'HDFC Savings', userId: 'user-1', paidForMemberId: 'member-alex' },
  { id: 107, account_id: 5, category_id: 10, amount: -1950.0, note: 'Electricity bill & Jio Fiber', description: 'Utility bills', tx_date: '2026-10-18', tx_time: '10:00:00', category_name: 'Bills', category_icon: 'receipt', account_name: 'ICICI Credit Card', userId: 'user-1' },
  { id: 108, account_id: 1, category_id: 6, amount: -2100.0, note: 'Weekend family dinner', description: 'Barbeque Nation', tx_date: '2026-10-24', tx_time: '20:00:00', category_name: 'Food & Dining', category_icon: 'utensils', account_name: 'Cash in Hand', userId: 'user-1' },
];

// Seed data specifically for Sarah Chen (user-2) - Business & Freelance in INR
const USER2_ACCOUNTS: Account[] = [
  { id: 201, name: 'Axis Business Current', type: 'Checking', icon: 'landmark', color: '#2563eb', balance: 348200.0, group_id: 2, userId: 'user-2' },
  { id: 202, name: 'Razorpay Settlements', type: 'Merchant', icon: 'wallet', color: '#6366f1', balance: 84500.0, group_id: 4, userId: 'user-2' },
  { id: 203, name: 'Kotak Business Savings', type: 'Savings', icon: 'piggy-bank', color: '#10b981', balance: 550000.0, group_id: 2, userId: 'user-2' },
  { id: 204, name: 'Office Petty Cash', type: 'Cash', icon: 'banknote', color: '#84cc16', balance: 6500.0, group_id: 1, userId: 'user-2' },
  { id: 205, name: 'HDFC Corporate Card', type: 'Credit card', icon: 'credit-card', color: '#f43f5e', balance: -28400.0, group_id: 3, userId: 'user-2' },
];

const USER2_SETTINGS: UserSettings = {
  week_start: 'Monday',
  currency_country: 'India',
  currency_code: 'INR',
  currency_symbol: '₹',
  unit_position: 'prefix',
};

const USER2_BUDGETS: BudgetEntry[] = [
  { category_id: 2, default_amount: null, override_amount: null, userId: 'user-2' },
  { category_id: 6, default_amount: 12000, override_amount: null, userId: 'user-2' },
  { category_id: 7, default_amount: 8000, override_amount: null, userId: 'user-2' },
  { category_id: 8, default_amount: 15000, override_amount: null, userId: 'user-2' },
  { category_id: 10, default_amount: 18000, override_amount: null, userId: 'user-2' },
];

const USER2_TRANSACTIONS: ApiTransaction[] = [
  { id: 201, account_id: 201, category_id: 2, amount: 165000.0, note: 'Client Retainer — Fintech SaaS UX', description: 'Quarterly design contract', tx_date: '2026-11-01', tx_time: '10:00:00', category_name: 'Freelance', category_icon: 'laptop', account_name: 'Axis Business Current', userId: 'user-2' },
  { id: 202, account_id: 205, category_id: 10, amount: -14500.0, note: 'AWS India Cloud Hosting', description: 'Monthly production servers', tx_date: '2026-11-01', tx_time: '12:00:00', category_name: 'Bills', category_icon: 'receipt', account_name: 'HDFC Corporate Card', userId: 'user-2' },
  { id: 203, account_id: 205, category_id: 6, amount: -3850.0, note: 'Client Dinner meeting', description: 'Business networking dinner', tx_date: '2026-11-02', tx_time: '19:30:00', category_name: 'Food & Dining', category_icon: 'utensils', account_name: 'HDFC Corporate Card', userId: 'user-2', paidForMemberId: 'member-lucas' },
  { id: 204, account_id: 202, category_id: 2, amount: 75000.0, note: 'Brand Identity Milestone Payout', description: 'Mobile app startup project via Razorpay', tx_date: '2026-10-20', tx_time: '14:00:00', category_name: 'Freelance', category_icon: 'laptop', account_name: 'Razorpay Settlements', userId: 'user-2' },
  { id: 205, account_id: 205, category_id: 8, amount: -8900.0, note: 'Ergonomic studio accessories', description: 'Office workspace setup', tx_date: '2026-10-25', tx_time: '16:00:00', category_name: 'Shopping', category_icon: 'shopping-bag', account_name: 'HDFC Corporate Card', userId: 'user-2' },
];

export interface UserFinancialStore {
  accounts: Account[];
  transactions: ApiTransaction[];
  budgets: BudgetEntry[];
  settings: UserSettings;
}

const getStorageKey = (userId: string) => `ledgr_finances_${userId}`;

export function getUserStore(userId: string): UserFinancialStore {
  const key = getStorageKey(userId);
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      const parsed: UserFinancialStore = JSON.parse(stored);

      // Detect stale data: old MYR/USD accounts or known old Indian bank names that predate INR migration
      const hasStaleAccounts =
        parsed.accounts?.some((a) =>
          ['CIMB Current', 'Maybank Credit', 'Chase Business', 'Chase Checking', 'Maybank Savings'].includes(a.name)
        ) ?? false;

      // Detect stale salary amount: if user-1 has a salary transaction for ₹5,200 instead of ₹85,000
      const hasStaleSalaryAmount =
        userId === 'user-1' &&
        (parsed.transactions?.some((t) => t.category_id === 1 && t.amount === 5200) ?? false);

      if (hasStaleAccounts || hasStaleSalaryAmount) {
        // Force re-seed by removing stale key and letting the initialStore block below handle it
        localStorage.removeItem(key);
        // Also purge the stale recurring store so dates reset too
        localStorage.removeItem(`ledgr_recurring_${userId}`);
        // Fall through to the seed block below
      } else {
        // Ensure defaults to INR even if currency settings drifted
        if (
          !parsed.settings ||
          parsed.settings.currency_code === 'MYR' ||
          parsed.settings.currency_code === 'USD' ||
          parsed.settings.currency_code === 'IND' ||
          parsed.settings.currency_symbol === 'RM' ||
          parsed.settings.currency_symbol === '$'
        ) {
          parsed.settings = {
            ...parsed.settings,
            currency_country: 'India',
            currency_code: 'INR',
            currency_symbol: '₹',
            unit_position: 'prefix',
          };
          localStorage.setItem(key, JSON.stringify(parsed));
        }
        // Ensure seed transactions have member assignments if missing
        if (userId === 'user-1' && parsed.transactions) {
          const t102 = parsed.transactions.find((t) => t.id === 102);
          if (t102 && !t102.paidForMemberId) {
            t102.paidForMemberId = 'member-leo';
            localStorage.setItem(key, JSON.stringify(parsed));
          }
          const t105 = parsed.transactions.find((t) => t.id === 105);
          if (t105 && !t105.paidForMemberId) {
            t105.paidForMemberId = 'member-maya';
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        }
        return parsed;
      }
    } catch {
      // Fallback to seed below
    }
  }

  // Initial seed for known demo users or default starter pack for new users
  let initialStore: UserFinancialStore;
  if (userId === 'user-1') {
    initialStore = {
      accounts: USER1_ACCOUNTS,
      transactions: USER1_TRANSACTIONS,
      budgets: USER1_BUDGETS,
      settings: USER1_SETTINGS,
    };
  } else if (userId === 'user-2') {
    initialStore = {
      accounts: USER2_ACCOUNTS,
      transactions: USER2_TRANSACTIONS,
      budgets: USER2_BUDGETS,
      settings: USER2_SETTINGS,
    };
  } else {
    // New registered user gets a clean starter template in INR
    initialStore = {
      accounts: [
        { id: Date.now() + 1, name: 'Salary Account', type: 'Checking', icon: 'landmark', color: '#2563eb', balance: 50000.0, group_id: 2, userId },
        { id: Date.now() + 2, name: 'Cash in Hand', type: 'Cash', icon: 'banknote', color: '#16a34a', balance: 5000.0, group_id: 1, userId },
      ],
      transactions: [
        {
          id: Date.now() + 10,
          account_id: Date.now() + 1,
          category_id: 1,
          amount: 65000.0,
          note: 'Opening Balance / Salary',
          description: 'Starting deposit',
          tx_date: new Date().toISOString().slice(0, 10),
          tx_time: '10:00:00',
          category_name: 'Salary',
          category_icon: 'briefcase',
          account_name: 'Salary Account',
          userId,
        },
      ],
      budgets: [
        { category_id: 6, default_amount: 5000, override_amount: null, userId },
        { category_id: 9, default_amount: 8000, override_amount: null, userId },
      ],
      settings: {
        week_start: 'Sunday',
        currency_country: 'India',
        currency_code: 'INR',
        currency_symbol: '₹',
        unit_position: 'prefix',
      },
    };
  }

  localStorage.setItem(key, JSON.stringify(initialStore));
  return initialStore;
}

export function saveUserStore(userId: string, store: UserFinancialStore): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(store));
}

/**
 * React hook to retrieve and mutate finances scoped strictly to the authenticated user.
 */
export function useBudgetData(year?: number, month?: number) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [store, setStore] = useState<UserFinancialStore>(() => {
    if (!userId) {
      return {
        accounts: [],
        transactions: [],
        budgets: [],
        settings: USER1_SETTINGS,
      };
    }
    return getUserStore(userId);
  });

  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setStore(
      userId
        ? getUserStore(userId)
        : {
            accounts: [],
            transactions: [],
            budgets: [],
            settings: USER1_SETTINGS,
          },
    );
  }

  const updateStore = useCallback(
    (updater: (prev: UserFinancialStore) => UserFinancialStore) => {
      if (!userId) return;
      setStore((prev) => {
        const next = updater(prev);
        saveUserStore(userId, next);
        return next;
      });
    },
    [userId]
  );

  // Filter transactions by user ID and optional year/month
  const filteredTransactions = useMemo(() => {
    if (!userId) return [];
    return store.transactions
      .filter((t) => t.userId === userId)
      .filter((t) => {
        if (year === undefined || month === undefined) return true;
        const [y, m] = t.tx_date.split('-').map(Number);
        return y === year && m === month + 1;
      })
      .sort((a, b) => b.tx_date.localeCompare(a.tx_date) || b.tx_time.localeCompare(a.tx_time));
  }, [store.transactions, userId, year, month]);

  // Filter accounts by user ID
  const filteredAccounts = useMemo(() => {
    if (!userId) return [];
    return store.accounts.filter((a) => a.userId === userId);
  }, [store.accounts, userId]);

  // Filter budgets by user ID
  const filteredBudgets = useMemo(() => {
    if (!userId) return [];
    return store.budgets.filter((b) => b.userId === userId);
  }, [store.budgets, userId]);

  // Compute monthly stats for this user
  const monthlyStats: MonthlySummary[] = useMemo(() => {
    if (!userId) return [];
    const map = new Map<string, { year: number; month: number; income: number; expenses: number }>();
    for (const tx of store.transactions) {
      if (tx.userId !== userId) continue;
      const [y, m] = tx.tx_date.split('-').map(Number);
      const key = `${y}-${m}`;
      if (!map.has(key)) {
        map.set(key, { year: y, month: m, income: 0, expenses: 0 });
      }
      const item = map.get(key)!;
      if (tx.amount > 0) item.income += tx.amount;
      else item.expenses += Math.abs(tx.amount);
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year || a.month - b.month);
  }, [store.transactions, userId]);

  // Transaction mutations
  const addTransaction = useCallback(
    (tx: Omit<ApiTransaction, 'id' | 'userId'>) => {
      const newTx: ApiTransaction = {
        ...tx,
        id: Date.now(),
        userId,
      };
      updateStore((prev) => {
        const nextTxs = [newTx, ...prev.transactions];
        // Also update account balance
        const nextAccounts = prev.accounts.map((acc) =>
          acc.id === tx.account_id ? { ...acc, balance: acc.balance + tx.amount } : acc
        );
        return { ...prev, transactions: nextTxs, accounts: nextAccounts };
      });
      return newTx;
    },
    [userId, updateStore]
  );

  const editTransaction = useCallback(
    (id: number, updates: Partial<ApiTransaction>) => {
      updateStore((prev) => {
        const oldTx = prev.transactions.find((t) => t.id === id);
        if (!oldTx) return prev;
        const nextTxs = prev.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t));

        // Adjust balance difference if amount or account changed
        let nextAccounts = prev.accounts;
        if (updates.amount !== undefined && updates.amount !== oldTx.amount) {
          const diff = updates.amount - oldTx.amount;
          nextAccounts = nextAccounts.map((acc) =>
            acc.id === oldTx.account_id ? { ...acc, balance: acc.balance + diff } : acc
          );
        }

        return { ...prev, transactions: nextTxs, accounts: nextAccounts };
      });
    },
    [updateStore]
  );

  const deleteTransaction = useCallback(
    (id: number) => {
      updateStore((prev) => {
        const oldTx = prev.transactions.find((t) => t.id === id);
        const nextTxs = prev.transactions.filter((t) => t.id !== id);
        let nextAccounts = prev.accounts;
        if (oldTx) {
          nextAccounts = nextAccounts.map((acc) =>
            acc.id === oldTx.account_id ? { ...acc, balance: acc.balance - oldTx.amount } : acc
          );
        }
        return { ...prev, transactions: nextTxs, accounts: nextAccounts };
      });
    },
    [updateStore]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      updateStore((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...newSettings },
      }));
    },
    [updateStore]
  );

  return {
    userId,
    user,
    accounts: filteredAccounts,
    transactions: filteredTransactions,
    budgets: filteredBudgets,
    settings: store.settings,
    monthlyStats,
    addTransaction,
    editTransaction,
    deleteTransaction,
    updateSettings,
  };
}
