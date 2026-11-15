import axios from 'axios';
import type {
  Account,
  AccountGroup,
  ApiTransaction,
  BudgetEntry,
  Category,
  ChildBudgetLimit,
  ChildBudgetStore,
  FamilyMember,
  MonthlySummary,
  PaymentMethod,
  RecurringTransaction,
  UserSettings,
  UserSession,
} from '../types/index.ts';
import {
  getUserStore,
  saveUserStore,
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNT_GROUPS,
} from '../hooks/useBudgetData.ts';

// Helper to determine the current logged-in user from AuthContext storage
export function getActiveUserId(): string {
  try {
    const raw = localStorage.getItem('ledgr_current_user');
    if (raw) {
      const u: UserSession = JSON.parse(raw);
      if (u?.id) return u.id;
    }
  } catch {
    // ignore
  }
  return '';
}

/* =========================================================================
 * Child Budget Limits (per-member, stored in localStorage)
 * ========================================================================= */

const getChildBudgetKey = (userId: string) => `ledgr_child_budgets_${userId}`;

function getChildBudgetStore(userId: string): ChildBudgetStore {
  try {
    const raw = localStorage.getItem(getChildBudgetKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return { limits: [] };
}

function saveChildBudgetStore(userId: string, store: ChildBudgetStore) {
  localStorage.setItem(getChildBudgetKey(userId), JSON.stringify(store));
}

/** Fetch all personal category budget limits for a child member */
export const fetchChildBudgetLimits = async (
  userId: string,
  memberId: string,
): Promise<ChildBudgetLimit[]> => {
  const store = getChildBudgetStore(userId);
  return store.limits.filter((l) => l.memberId === memberId);
};

/** Set (upsert) a personal category budget limit for a child member */
export const setChildBudgetLimit = async (
  userId: string,
  memberId: string,
  categoryId: number,
  amount: number,
): Promise<ChildBudgetLimit> => {
  const store = getChildBudgetStore(userId);
  const idx = store.limits.findIndex(
    (l) => l.memberId === memberId && l.categoryId === categoryId,
  );
  const updated: ChildBudgetLimit = { memberId, categoryId, amount };
  if (idx >= 0) {
    store.limits[idx] = updated;
  } else {
    store.limits.push(updated);
  }
  saveChildBudgetStore(userId, store);
  return updated;
};

/** Remove a personal category budget limit for a child member */
export const removeChildBudgetLimit = async (
  userId: string,
  memberId: string,
  categoryId: number,
): Promise<void> => {
  const store = getChildBudgetStore(userId);
  store.limits = store.limits.filter(
    (l) => !(l.memberId === memberId && l.categoryId === categoryId),
  );
  saveChildBudgetStore(userId, store);
};

// Helper to retrieve the current active family member from AuthContext storage
export function getActiveMemberFromStorage(): FamilyMember | null {
  try {
    const userId = getActiveUserId();
    const raw =
      (userId ? localStorage.getItem(`ledgr_active_member_${userId}`) : null) ||
      localStorage.getItem('ledgr_active_member');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

const defaultPaymentMethods: PaymentMethod[] = [
  { id: 1, name: 'Cash', icon: 'banknote' },
  { id: 2, name: 'Credit / Debit Card', icon: 'credit-card' },
  { id: 3, name: 'Bank Transfer', icon: 'landmark' },
  { id: 4, name: 'E-Wallet', icon: 'smartphone' },
];

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

export const fetchSettings = async (): Promise<UserSettings> => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  return store.settings;
};

export const patchSettings = async (settings: Partial<UserSettings>): Promise<UserSettings> => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  store.settings = { ...store.settings, ...settings };
  saveUserStore(userId, store);
  return store.settings;
};

export const fetchCategories = async (): Promise<Category[]> => {
  return DEFAULT_CATEGORIES;
};

export const postCategory = async (body: { name: string; type: 'income' | 'expense'; icon: string }): Promise<Category> => {
  const newCat: Category = {
    id: Date.now(),
    name: body.name,
    type: body.type,
    icon: body.icon,
  };
  return newCat;
};

export const patchCategory = async (id: number, body: { name: string; icon: string }): Promise<Category> => {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === id);
  return {
    id,
    name: body.name,
    icon: body.icon,
    type: found?.type || 'expense',
  };
};

export const deleteCategory = async (_id: number, _reassignTo?: number) => {
  return { success: true };
};

export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  return defaultPaymentMethods;
};

export const postPaymentMethod = async (body: { name: string; icon: string }): Promise<PaymentMethod> => {
  return { id: Date.now(), ...body };
};

export const patchPaymentMethod = async (id: number, body: { name: string; icon: string }): Promise<PaymentMethod> => {
  return { id, ...body };
};

export const deletePaymentMethod = async (_id: number) => {
  return { success: true };
};

/**
 * Fetch accounts strictly filtered by the active user's userId
 */
export const fetchAccounts = async (): Promise<Account[]> => {
  const userId = getActiveUserId();
  if (!userId) return [];
  const store = getUserStore(userId);
  return store.accounts.filter((a) => a.userId === userId);
};

export const fetchAccountGroups = async (): Promise<AccountGroup[]> => {
  return DEFAULT_ACCOUNT_GROUPS;
};

export const postAccountGroup = async (name: string): Promise<AccountGroup> => {
  return { id: Date.now(), name, sort_order: 99 };
};

export const patchAccountGroup = async (id: number, name: string): Promise<AccountGroup> => {
  return { id, name, sort_order: 1 };
};

export const deleteAccountGroup = async (_id: number) => {
  return { success: true };
};

export const patchAccount = async (
  id: number,
  body: Partial<Pick<Account, 'name' | 'type' | 'icon' | 'color' | 'balance' | 'group_id'>>,
): Promise<Account> => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  let updatedAccount: Account | undefined;
  store.accounts = store.accounts.map((acc) => {
    if (acc.id === id) {
      updatedAccount = { ...acc, ...body, userId };
      return updatedAccount;
    }
    return acc;
  });
  saveUserStore(userId, store);
  return updatedAccount || { id, name: '', type: '', icon: 'wallet', color: '#2563eb', balance: 0, group_id: 1, userId };
};

export const postAccount = async (body: {
  name: string;
  type: string;
  icon?: string;
  color?: string;
  balance?: number;
  group_id?: number | null;
  userId?: string;
}): Promise<Account> => {
  const activeUserId = getActiveUserId();
  const userId = body.userId || activeUserId || 'user-1';
  const store = getUserStore(userId);
  const newAcc: Account = {
    id: Date.now(),
    name: body.name,
    type: body.type,
    icon: body.icon || 'wallet',
    color: body.color || '#2563eb',
    balance: body.balance ?? 0,
    group_id: body.group_id ?? 1,
    userId,
  };
  store.accounts.push(newAcc);
  saveUserStore(userId, store);
  return newAcc;
};

/**
 * Fetch transactions scoped by active userId and active family member role:
 * - If isChild is true, return ONLY transactions where paidForMemberId === activeMember.id
 * - If isChild is false (Parent view), return all household transactions
 */
export const getTransactions = async (
  userIdOrYear?: string | number,
  activeMemberOrMonth?: FamilyMember | null | number,
  optYear?: number,
  optMonth?: number,
): Promise<ApiTransaction[]> => {
  let userId: string;
  let activeMember: FamilyMember | null = null;
  let year: number | undefined = undefined;
  let month: number | undefined = undefined;

  if (typeof userIdOrYear === 'number') {
    // Called like getTransactions(year, month)
    year = userIdOrYear;
    month = typeof activeMemberOrMonth === 'number' ? activeMemberOrMonth : undefined;
    userId = getActiveUserId() || 'user-1';
    activeMember = getActiveMemberFromStorage();
  } else {
    // Called like getTransactions(userId, activeMember, year?, month?)
    userId = (typeof userIdOrYear === 'string' && userIdOrYear ? userIdOrYear : getActiveUserId()) || 'user-1';
    activeMember =
      activeMemberOrMonth && typeof activeMemberOrMonth === 'object'
        ? activeMemberOrMonth
        : getActiveMemberFromStorage();
    year = optYear;
    month = optMonth;
  }

  if (!userId) return [];
  const store = getUserStore(userId);
  const isChild = activeMember?.role === 'Child';

  return store.transactions
    .filter((tx) => !tx.userId || tx.userId === userId)
    .filter((tx) => {
      // If isChild is true, return ONLY transactions where paidForMemberId === activeMember.id
      if (isChild && activeMember?.id) {
        return tx.paidForMemberId === activeMember.id;
      }
      // If isChild is false (Parent view), return all household transactions
      return true;
    })
    .filter((tx) => {
      if (year === undefined || month === undefined) return true;
      const [y, m] = tx.tx_date.split('-').map(Number);
      return y === year && m === month + 1;
    })
    .sort((a, b) => b.tx_date.localeCompare(a.tx_date) || b.tx_time.localeCompare(a.tx_time));
};

/**
 * Fetch transactions strictly filtered by the active user and member view
 */
export const fetchTransactions = async (
  year?: number,
  month?: number,
  activeMember?: FamilyMember | null,
): Promise<ApiTransaction[]> => {
  const userId = getActiveUserId();
  const member = activeMember !== undefined ? activeMember : getActiveMemberFromStorage();
  return getTransactions(userId, member, year, month);
};

/**
 * Create a new transaction with the active user's userId and paidForMemberId attached
 */
export const postTransaction = async (body: {
  account_id: number;
  category_id: number;
  amount: number;
  note: string;
  description?: string;
  tx_date: string;
  tx_time: string;
  payment_method_id?: number | null;
  userId?: string;
  paidForMemberId?: string | null;
}): Promise<ApiTransaction> => {
  const activeUserId = getActiveUserId();
  const userId = body.userId || activeUserId || 'user-1';
  const store = getUserStore(userId);
  const cat = DEFAULT_CATEGORIES.find((c) => c.id === body.category_id);
  const acc = store.accounts.find((a) => a.id === body.account_id);

  const newTx: ApiTransaction = {
    id: Date.now(),
    account_id: body.account_id,
    category_id: body.category_id,
    amount: Number(body.amount),
    note: body.note || '',
    description: body.description || null,
    tx_date: body.tx_date,
    tx_time: body.tx_time || '12:00:00',
    category_name: cat?.name || 'General',
    category_icon: cat?.icon || 'tag',
    account_name: acc?.name || 'Account',
    payment_method_id: body.payment_method_id,
    userId, // explicitly attached to the logged-in user
    paidForMemberId: body.paidForMemberId || null,
  };

  // Update account balance
  store.accounts = store.accounts.map((a) =>
    a.id === body.account_id ? { ...a, balance: a.balance + Number(body.amount) } : a
  );
  store.transactions = [newTx, ...store.transactions];
  saveUserStore(userId, store);
  return newTx;
};

/**
 * Update a transaction, keeping it scoped to the active user's userId
 */
export const patchTransaction = async (
  id: number,
  body: {
    account_id: number;
    category_id: number;
    amount: number;
    note: string;
    description?: string;
    tx_date: string;
    tx_time: string;
    payment_method_id?: number | null;
    userId?: string;
    paidForMemberId?: string | null;
  },
): Promise<ApiTransaction> => {
  const activeUserId = getActiveUserId();
  const userId = body.userId || activeUserId || 'user-1';
  const store = getUserStore(userId);
  const oldTx = store.transactions.find((t) => t.id === id);
  const cat = DEFAULT_CATEGORIES.find((c) => c.id === body.category_id);
  const acc = store.accounts.find((a) => a.id === body.account_id);

  const updated: ApiTransaction = {
    ...(oldTx || ({} as ApiTransaction)),
    ...body,
    id,
    category_name: cat?.name || oldTx?.category_name || 'General',
    category_icon: cat?.icon || oldTx?.category_icon || 'tag',
    account_name: acc?.name || oldTx?.account_name || 'Account',
    userId,
    paidForMemberId:
      body.paidForMemberId !== undefined
        ? body.paidForMemberId
        : oldTx?.paidForMemberId || null,
  };

  if (oldTx) {
    // Revert old tx on old account
    store.accounts = store.accounts.map((a) =>
      a.id === oldTx.account_id ? { ...a, balance: a.balance - oldTx.amount } : a
    );
    // Apply new tx on new account
    store.accounts = store.accounts.map((a) =>
      a.id === body.account_id ? { ...a, balance: a.balance + body.amount } : a
    );
  }

  store.transactions = store.transactions.map((t) => (t.id === id ? updated : t));
  saveUserStore(userId, store);
  return updated;
};

export const deleteTransaction = async (id: number): Promise<{ success: boolean }> => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  const oldTx = store.transactions.find((t) => t.id === id);
  if (oldTx) {
    store.accounts = store.accounts.map((a) =>
      a.id === oldTx.account_id ? { ...a, balance: a.balance - oldTx.amount } : a
    );
    store.transactions = store.transactions.filter((t) => t.id !== id);
    saveUserStore(userId, store);
  }
  return { success: true };
};

/**
 * Fetch monthly statistics strictly filtered by the active user's userId
 */
export const fetchMonthlyStats = async (): Promise<MonthlySummary[]> => {
  const userId = getActiveUserId();
  if (!userId) return [];
  const store = getUserStore(userId);
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
};

/**
 * Fetch category statistics strictly filtered by the active user's userId
 */
export const fetchCategoryStats = async (
  year: number,
  month?: number,
): Promise<{ id: number; name: string; icon: string; color: string; type: 'income' | 'expense'; total: number }[]> => {
  const userId = getActiveUserId();
  if (!userId) return [];
  const store = getUserStore(userId);
  const totals = new Map<number, number>();

  for (const tx of store.transactions) {
    if (tx.userId !== userId) continue;
    const [y, m] = tx.tx_date.split('-').map(Number);
    if (y !== year) continue;
    if (month !== undefined && m !== month + 1) continue;

    const current = totals.get(tx.category_id) || 0;
    totals.set(tx.category_id, current + Math.abs(tx.amount));
  }

  return DEFAULT_CATEGORIES.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: '#2563eb',
    type: cat.type,
    total: totals.get(cat.id) || 0,
  })).filter((c) => c.total > 0);
};

/**
 * Fetch budgets strictly filtered by the active user's userId
 */
export const fetchBudgets = async (_year: number, _month: number): Promise<BudgetEntry[]> => {
  const userId = getActiveUserId();
  if (!userId) return [];
  const store = getUserStore(userId);
  return store.budgets.filter((b) => b.userId === userId);
};

export const putBudgetDefault = async (
  categoryId: number,
  _year: number,
  _month: number,
  amount: number,
) => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  const foundIndex = store.budgets.findIndex((b) => b.category_id === categoryId && b.userId === userId);
  if (foundIndex >= 0) {
    store.budgets[foundIndex].default_amount = amount;
  } else {
    store.budgets.push({ category_id: categoryId, default_amount: amount, override_amount: null, userId });
  }
  saveUserStore(userId, store);
  return { success: true };
};

export const deleteAllBudgets = async (categoryId: number) => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  store.budgets = store.budgets.filter((b) => b.category_id !== categoryId);
  saveUserStore(userId, store);
  return { success: true };
};

export const putBudgetOverride = async (
  categoryId: number,
  _year: number,
  _month: number,
  amount: number,
) => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  const foundIndex = store.budgets.findIndex((b) => b.category_id === categoryId && b.userId === userId);
  if (foundIndex >= 0) {
    store.budgets[foundIndex].override_amount = amount;
  } else {
    store.budgets.push({ category_id: categoryId, default_amount: null, override_amount: amount, userId });
  }
  saveUserStore(userId, store);
  return { success: true };
};

export const deleteBudgetOverride = async (categoryId: number, _year: number, _month: number) => {
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  const foundIndex = store.budgets.findIndex((b) => b.category_id === categoryId && b.userId === userId);
  if (foundIndex >= 0) {
    store.budgets[foundIndex].override_amount = null;
    saveUserStore(userId, store);
  }
  return { success: true };
};

/* =========================================================================
 * Recurring Transactions (Scoped strictly to user.id via localStorage)
 * ========================================================================= */

const getRecurringKey = (userId: string) => `ledgr_recurring_${userId}`;

// Initial demo seed recurring transactions
// nextDueDate is set to a past date so processDueRecurringTransactions fires on first login
const DEFAULT_USER1_RECURRING: RecurringTransaction[] = [
  {
    id: 1001,
    userId: 'user-1',
    title: 'Monthly Salary',
    amount: 85000,
    type: 'income',
    category: 'Salary',
    accountId: 2, // HDFC Savings
    frequency: 'monthly',
    nextDueDate: '2026-11-01',
    active: true,
  },
  {
    id: 1002,
    userId: 'user-1',
    title: 'Netflix 4K Subscription',
    amount: 649,
    type: 'expense',
    category: 'Entertainment',
    accountId: 5, // ICICI Credit Card
    frequency: 'monthly',
    nextDueDate: '2026-11-01',
    active: true,
    paidForMemberId: 'member-leo',
    memberId: 'member-leo',
  },
  {
    id: 1003,
    userId: 'user-1',
    title: 'Electricity & Jio Fiber Internet',
    amount: 1950,
    type: 'expense',
    category: 'Bills',
    accountId: 5, // ICICI Credit Card
    frequency: 'monthly',
    nextDueDate: '2026-11-18',
    active: true,
  },
];

const DEFAULT_USER2_RECURRING: RecurringTransaction[] = [
  {
    id: 2001,
    userId: 'user-2',
    title: 'Client UX Retainer Payout',
    amount: 165000,
    type: 'income',
    category: 'Freelance',
    accountId: 201, // Axis Business Current
    frequency: 'monthly',
    nextDueDate: '2026-11-01',
    active: true,
  },
  {
    id: 2002,
    userId: 'user-2',
    title: 'AWS India Cloud Infrastructure',
    amount: 14500,
    type: 'expense',
    category: 'Bills',
    accountId: 205, // HDFC Corporate Card
    frequency: 'monthly',
    nextDueDate: '2026-11-01',
    active: true,
  },
];

function getStoredRecurring(userId: string): RecurringTransaction[] {
  const key = getRecurringKey(userId);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed: RecurringTransaction[] = JSON.parse(raw);
      const filtered = parsed.filter((r) => r.userId === userId);

      // Detect stale seed data: if ALL due dates are in the far future ('2026-12-01')
      // and none of them have been modified (i.e. still match the old default seed),
      // force a reseed so the corrected past dates take effect.
      const isStaleDefaults =
        (userId === 'user-1' || userId === 'user-2') &&
        filtered.length > 0 &&
        filtered.every((r) => r.nextDueDate >= '2026-12-01') &&
        // All ids match the original seed ids exactly
        filtered.every((r) =>
          (userId === 'user-1' ? [1001, 1002, 1003] : [2001, 2002]).includes(Number(r.id))
        );

      if (!isStaleDefaults) {
        if (userId === 'user-1') {
          const item1002 = filtered.find((r) => Number(r.id) === 1002);
          if (item1002 && !item1002.paidForMemberId) {
            item1002.paidForMemberId = 'member-leo';
            item1002.memberId = 'member-leo';
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
        return filtered;
      }

      // Stale seed detected — fall through to reseed below
      localStorage.removeItem(key);
    } catch {
      // fallback to seed below
    }
  }

  let defaults: RecurringTransaction[] = [];
  if (userId === 'user-1') {
    defaults = DEFAULT_USER1_RECURRING;
  } else if (userId === 'user-2') {
    defaults = DEFAULT_USER2_RECURRING;
  }
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function saveStoredRecurring(userId: string, items: RecurringTransaction[]) {
  localStorage.setItem(getRecurringKey(userId), JSON.stringify(items));
}

/**
 * Calculate next due date according to frequency (weekly, monthly, yearly)
 */
export function advanceDueDate(dateStr: string, frequency: 'weekly' | 'monthly' | 'yearly'): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }

  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

/**
 * Get all recurring transactions scoped to userId
 */
export const fetchRecurringTransactions = async (userId?: string): Promise<RecurringTransaction[]> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  return getStoredRecurring(targetUserId);
};

export const getRecurringTransactions = fetchRecurringTransactions;

/**
 * Add a recurring transaction scoped to userId
 */
export const postRecurringTransaction = async (
  item: Omit<RecurringTransaction, 'id' | 'userId'> & { userId?: string },
  userId?: string,
): Promise<RecurringTransaction> => {
  const targetUserId = item.userId || userId || getActiveUserId() || 'user-1';
  const list = getStoredRecurring(targetUserId);

  const newItem: RecurringTransaction = {
    ...item,
    id: Date.now(),
    userId: targetUserId,
    active: item.active !== undefined ? item.active : true,
  };

  list.push(newItem);
  saveStoredRecurring(targetUserId, list);
  return newItem;
};

export const addRecurringTransaction = postRecurringTransaction;

/**
 * Edit an existing recurring transaction scoped to userId
 */
export const patchRecurringTransaction = async (
  id: number | string,
  updates: Partial<RecurringTransaction>,
  userId?: string,
): Promise<RecurringTransaction> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  const list = getStoredRecurring(targetUserId);
  const index = list.findIndex((r) => String(r.id) === String(id));

  if (index === -1) {
    throw new Error(`Recurring transaction ${id} not found.`);
  }

  const updated: RecurringTransaction = {
    ...list[index],
    ...updates,
    id: list[index].id,
    userId: targetUserId,
  };

  list[index] = updated;
  saveStoredRecurring(targetUserId, list);
  return updated;
};

export const editRecurringTransaction = patchRecurringTransaction;

/**
 * Toggle active status of a recurring transaction
 */
export const toggleRecurringTransaction = async (
  id: number | string,
  userId?: string,
): Promise<RecurringTransaction> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  const list = getStoredRecurring(targetUserId);
  const found = list.find((r) => String(r.id) === String(id));

  if (!found) {
    throw new Error(`Recurring transaction ${id} not found.`);
  }

  return patchRecurringTransaction(id, { active: !found.active }, targetUserId);
};

/**
 * Delete a recurring transaction scoped to userId
 */
export const deleteRecurringTransaction = async (
  id: number | string,
  userId?: string,
): Promise<{ success: boolean }> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  const list = getStoredRecurring(targetUserId);
  const nextList = list.filter((r) => String(r.id) !== String(id));
  saveStoredRecurring(targetUserId, nextList);
  return { success: true };
};

/**
 * Check if any active recurring items have nextDueDate <= today.
 * If so, creates real transaction entries, pushes them to user's main transaction list,
 * updates account balance, and advances nextDueDate according to frequency.
 */
export const processDueRecurringTransactions = async (
  userId?: string,
): Promise<{ processed: number; transactions: ApiTransaction[] }> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  const recurringList = getStoredRecurring(targetUserId);
  const store = getUserStore(targetUserId);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const createdTransactions: ApiTransaction[] = [];
  let updatedRecurring = false;

  for (let i = 0; i < recurringList.length; i++) {
    const item = recurringList[i];

    if (!item.active || !item.nextDueDate) continue;

    // Check if nextDueDate <= today
    if (item.nextDueDate <= todayStr) {
      const rawAmt = Math.abs(item.amount);
      const signedAmt = item.type === 'expense' ? -rawAmt : rawAmt;

      // Find category matching item.category
      const cat = DEFAULT_CATEGORIES.find(
        (c) => c.name.toLowerCase() === (item.category || '').toLowerCase(),
      );
      const catId = cat ? cat.id : (item.type === 'expense' ? 10 : 1);
      const catName = cat ? cat.name : (item.category || (item.type === 'expense' ? 'Bills' : 'Salary'));
      const catIcon = cat ? cat.icon : (item.type === 'expense' ? 'receipt' : 'briefcase');

      // Find account
      const acc = store.accounts.find((a) => a.id === item.accountId) || store.accounts[0];
      const accountId = acc ? acc.id : item.accountId;
      const accountName = acc ? acc.name : 'Account';

      // Create the real transaction
      const newTx: ApiTransaction = {
        id: Date.now() + Math.floor(Math.random() * 1000) + createdTransactions.length,
        account_id: accountId,
        category_id: catId,
        amount: signedAmt,
        note: item.title,
        description: `Automated recurring ${item.frequency} transaction`,
        tx_date: item.nextDueDate,
        tx_time: '09:00:00',
        category_name: catName,
        category_icon: catIcon,
        account_name: accountName,
        userId: targetUserId,
      };

      // Adjust account balance
      if (acc) {
        acc.balance += signedAmt;
      }

      store.transactions = [newTx, ...store.transactions];
      createdTransactions.push(newTx);

      // Advance nextDueDate
      let nextDate = advanceDueDate(item.nextDueDate, item.frequency);
      // Ensure nextDueDate moves into the future if several periods elapsed
      while (nextDate <= todayStr) {
        nextDate = advanceDueDate(nextDate, item.frequency);
      }
      item.nextDueDate = nextDate;
      updatedRecurring = true;
    }
  }

  if (createdTransactions.length > 0) {
    saveUserStore(targetUserId, store);
  }

  if (updatedRecurring) {
    saveStoredRecurring(targetUserId, recurringList);
  }

  return {
    processed: createdTransactions.length,
    transactions: createdTransactions,
  };
};
