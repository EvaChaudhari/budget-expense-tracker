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
 * Child Budget Limits
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

export const fetchChildBudgetLimits = async (
  userId: string,
  memberId: string,
): Promise<ChildBudgetLimit[]> => {
  try {
    const res = await api.get<ChildBudgetLimit[]>('/child-budgets', {
      params: { userId, memberId },
    });
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }
  const store = getChildBudgetStore(userId);
  return store.limits.filter((l) => l.memberId === memberId);
};

export const setChildBudgetLimit = async (
  userId: string,
  memberId: string,
  categoryId: number,
  amount: number,
): Promise<ChildBudgetLimit> => {
  try {
    const res = await api.put<ChildBudgetLimit>(`/child-budgets/${memberId}/${categoryId}`, {
      amount,
      userId,
    });
    return res.data;
  } catch {
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
  }
};

export const removeChildBudgetLimit = async (
  userId: string,
  memberId: string,
  categoryId: number,
): Promise<void> => {
  try {
    await api.delete(`/child-budgets/${memberId}/${categoryId}`);
  } catch {
    const store = getChildBudgetStore(userId);
    store.limits = store.limits.filter(
      (l) => !(l.memberId === memberId && l.categoryId === categoryId),
    );
    saveChildBudgetStore(userId, store);
  }
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
  try {
    const res = await api.get<UserSettings>('/settings');
    if (res.data) return res.data;
  } catch {
    // fallback
  }
  const userId = getActiveUserId() || 'user-1';
  const store = getUserStore(userId);
  return store.settings;
};

export const patchSettings = async (settings: Partial<UserSettings>): Promise<UserSettings> => {
  try {
    const res = await api.patch<UserSettings>('/settings', settings);
    return res.data;
  } catch {
    const userId = getActiveUserId() || 'user-1';
    const store = getUserStore(userId);
    store.settings = { ...store.settings, ...settings };
    saveUserStore(userId, store);
    return store.settings;
  }
};

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const res = await api.get<Category[]>('/categories');
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }
  return DEFAULT_CATEGORIES;
};

export const postCategory = async (body: {
  name: string;
  type: 'income' | 'expense';
  icon: string;
}): Promise<Category> => {
  try {
    const res = await api.post<Category>('/categories', body);
    return res.data;
  } catch {
    return { id: Date.now(), ...body };
  }
};

export const patchCategory = async (
  id: number,
  body: { name: string; icon: string },
): Promise<Category> => {
  try {
    const res = await api.patch<Category>(`/categories/${id}`, body);
    return res.data;
  } catch {
    const found = DEFAULT_CATEGORIES.find((c) => c.id === id);
    return {
      id,
      name: body.name,
      icon: body.icon,
      type: found?.type || 'expense',
    };
  }
};

export const deleteCategory = async (id: number, reassignTo?: number) => {
  try {
    await api.delete(
      `/categories/${id}`,
      reassignTo !== undefined ? { data: { reassignTo } } : undefined,
    );
  } catch {
    // fallback
  }
  return { success: true };
};

export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const res = await api.get<PaymentMethod[]>('/payment-methods');
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }
  return defaultPaymentMethods;
};

export const postPaymentMethod = async (body: {
  name: string;
  icon: string;
}): Promise<PaymentMethod> => {
  try {
    const res = await api.post<PaymentMethod>('/payment-methods', body);
    return res.data;
  } catch {
    return { id: Date.now(), ...body };
  }
};

export const patchPaymentMethod = async (
  id: number,
  body: { name: string; icon: string },
): Promise<PaymentMethod> => {
  try {
    const res = await api.patch<PaymentMethod>(`/payment-methods/${id}`, body);
    return res.data;
  } catch {
    return { id, ...body };
  }
};

export const deletePaymentMethod = async (id: number) => {
  try {
    await api.delete(`/payment-methods/${id}`);
  } catch {
    // fallback
  }
  return { success: true };
};

export const fetchAccounts = async (): Promise<Account[]> => {
  const userId = getActiveUserId() || 'user-1';
  try {
    const res = await api.get<Account[]>('/accounts', { params: { userId } });
    if (res.data && res.data.length > 0) {
      try {
        const store = getUserStore(userId);
        store.accounts = res.data;
        saveUserStore(userId, store);
      } catch {
        // ignore
      }
      return res.data;
    }
  } catch {
    // fallback
  }
  const store = getUserStore(userId);
  return store.accounts.filter((a) => !a.userId || a.userId === userId);
};

export const fetchAccountGroups = async (): Promise<AccountGroup[]> => {
  try {
    const res = await api.get<AccountGroup[]>('/account-groups');
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }
  return DEFAULT_ACCOUNT_GROUPS;
};

export const postAccountGroup = async (name: string): Promise<AccountGroup> => {
  try {
    const res = await api.post<AccountGroup>('/account-groups', { name });
    return res.data;
  } catch {
    return { id: Date.now(), name, sort_order: 99 };
  }
};

export const patchAccountGroup = async (id: number, name: string): Promise<AccountGroup> => {
  try {
    const res = await api.patch<AccountGroup>(`/account-groups/${id}`, { name });
    return res.data;
  } catch {
    return { id, name, sort_order: 1 };
  }
};

export const deleteAccountGroup = async (id: number) => {
  try {
    await api.delete(`/account-groups/${id}`);
  } catch {
    // fallback
  }
  return { success: true };
};

export const patchAccount = async (
  id: number,
  body: Partial<Pick<Account, 'name' | 'type' | 'icon' | 'color' | 'balance' | 'group_id'>>,
): Promise<Account> => {
  const userId = getActiveUserId() || 'user-1';
  try {
    const res = await api.patch<Account>(`/accounts/${id}`, body);
    return res.data;
  } catch {
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
    return (
      updatedAccount || {
        id,
        name: '',
        type: '',
        icon: 'wallet',
        color: '#2563eb',
        balance: 0,
        group_id: 1,
        userId,
      }
    );
  }
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
  try {
    const res = await api.post<Account>('/accounts', { ...body, userId });
    return res.data;
  } catch {
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
  }
};

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
    year = userIdOrYear;
    month = typeof activeMemberOrMonth === 'number' ? activeMemberOrMonth : undefined;
    userId = getActiveUserId() || 'user-1';
    activeMember = getActiveMemberFromStorage();
  } else {
    userId =
      (typeof userIdOrYear === 'string' && userIdOrYear ? userIdOrYear : getActiveUserId()) ||
      'user-1';
    activeMember =
      activeMemberOrMonth && typeof activeMemberOrMonth === 'object'
        ? activeMemberOrMonth
        : getActiveMemberFromStorage();
    year = optYear;
    month = optMonth;
  }

  const isChild = activeMember?.role === 'Child';
  const memberId = isChild && activeMember?.id ? activeMember.id : undefined;

  try {
    const params: Record<string, string | number> = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month + 1;
    if (userId) params.userId = userId;
    if (memberId) params.paidForMemberId = memberId;

    const res = await api.get<ApiTransaction[]>('/transactions', { params });
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // fallback to local storage
  }

  if (!userId) return [];
  const store = getUserStore(userId);
  return store.transactions
    .filter((tx) => !tx.userId || tx.userId === userId)
    .filter((tx) => {
      if (isChild && activeMember?.id) {
        return tx.paidForMemberId === activeMember.id;
      }
      return true;
    })
    .filter((tx) => {
      if (year === undefined || month === undefined) return true;
      const [y, m] = tx.tx_date.split('-').map(Number);
      return y === year && m === month + 1;
    })
    .sort((a, b) => b.tx_date.localeCompare(a.tx_date) || b.tx_time.localeCompare(a.tx_time));
};

export const fetchTransactions = async (
  year?: number,
  month?: number,
  activeMember?: FamilyMember | null,
): Promise<ApiTransaction[]> => {
  const userId = getActiveUserId();
  const member = activeMember !== undefined ? activeMember : getActiveMemberFromStorage();
  return getTransactions(userId, member, year, month);
};

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

  try {
    const res = await api.post<ApiTransaction>('/transactions', { ...body, userId });
    try {
      const store = getUserStore(userId);
      const cat = DEFAULT_CATEGORIES.find((c) => c.id === body.category_id);
      const acc = store.accounts.find((a) => a.id === body.account_id);
      const savedTx: ApiTransaction = {
        ...res.data,
        category_name: res.data.category_name || cat?.name || 'General',
        category_icon: res.data.category_icon || cat?.icon || 'tag',
        account_name: res.data.account_name || acc?.name || 'Account',
      };
      store.transactions = [savedTx, ...store.transactions.filter((t) => t.id !== res.data.id)];
      store.accounts = store.accounts.map((a) =>
        a.id === body.account_id ? { ...a, balance: a.balance + Number(body.amount) } : a,
      );
      saveUserStore(userId, store);
    } catch (err) { void err; }
    return res.data;
  } catch {
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
      userId,
      paidForMemberId: body.paidForMemberId || null,
    };

    store.accounts = store.accounts.map((a) =>
      a.id === body.account_id ? { ...a, balance: a.balance + Number(body.amount) } : a,
    );
    store.transactions = [newTx, ...store.transactions];
    saveUserStore(userId, store);
    return newTx;
  }
};

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

  try {
    const res = await api.patch<ApiTransaction>(`/transactions/${id}`, { ...body, userId });
    try {
      const store = getUserStore(userId);
      const cat = DEFAULT_CATEGORIES.find((c) => c.id === body.category_id);
      const acc = store.accounts.find((a) => a.id === body.account_id);
      const savedTx: ApiTransaction = {
        ...res.data,
        category_name: res.data.category_name || cat?.name || 'General',
        category_icon: res.data.category_icon || cat?.icon || 'tag',
        account_name: res.data.account_name || acc?.name || 'Account',
      };
      store.transactions = store.transactions.map((t) => (t.id === id ? savedTx : t));
      saveUserStore(userId, store);
    } catch (err) { void err; }
    return res.data;
  } catch {
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
      store.accounts = store.accounts.map((a) =>
        a.id === oldTx.account_id ? { ...a, balance: a.balance - oldTx.amount } : a,
      );
      store.accounts = store.accounts.map((a) =>
        a.id === body.account_id ? { ...a, balance: a.balance + body.amount } : a,
      );
    }

    store.transactions = store.transactions.map((t) => (t.id === id ? updated : t));
    saveUserStore(userId, store);
    return updated;
  }
};

export const deleteTransaction = async (id: number): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/transactions/${id}`);
    try {
      const userId = getActiveUserId() || 'user-1';
      const store = getUserStore(userId);
      const oldTx = store.transactions.find((t) => t.id === id);
      if (oldTx) {
        store.accounts = store.accounts.map((a) =>
          a.id === oldTx.account_id ? { ...a, balance: a.balance - oldTx.amount } : a,
        );
      }
      store.transactions = store.transactions.filter((t) => t.id !== id);
      saveUserStore(userId, store);
    } catch (err) { void err; }

  } catch {
    const userId = getActiveUserId() || 'user-1';
    const store = getUserStore(userId);
    const oldTx = store.transactions.find((t) => t.id === id);
    if (oldTx) {
      store.accounts = store.accounts.map((a) =>
        a.id === oldTx.account_id ? { ...a, balance: a.balance - oldTx.amount } : a,
      );
      store.transactions = store.transactions.filter((t) => t.id !== id);
      saveUserStore(userId, store);
    }
  }
  return { success: true };
};

export const fetchMonthlyStats = async (): Promise<MonthlySummary[]> => {
  const userId = getActiveUserId() || 'user-1';
  try {
    const res = await api.get<MonthlySummary[]>('/stats/monthly', { params: { userId } });
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }

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

export const fetchCategoryStats = async (
  year: number,
  month?: number,
): Promise<
  {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    total: number;
  }[]
> => {
  const userId = getActiveUserId() || 'user-1';
  try {
    const res = await api.get('/stats/categories', {
      params: month !== undefined ? { year, month: month + 1, userId } : { year, userId },
    });
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }

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

export const fetchBudgets = async (year: number, month: number): Promise<BudgetEntry[]> => {
  try {
    const res = await api.get<BudgetEntry[]>('/budgets', { params: { year, month } });
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }
  const userId = getActiveUserId();
  if (!userId) return [];
  const store = getUserStore(userId);
  return store.budgets.filter((b) => !b.userId || b.userId === userId);
};

export const putBudgetDefault = async (
  categoryId: number,
  year: number,
  month: number,
  amount: number,
) => {
  try {
    await api.put(`/budgets/${categoryId}/default`, { year, month, amount });
  } catch {
    const userId = getActiveUserId() || 'user-1';
    const store = getUserStore(userId);
    const foundIndex = store.budgets.findIndex(
      (b) => b.category_id === categoryId && b.userId === userId,
    );
    if (foundIndex >= 0) {
      store.budgets[foundIndex].default_amount = amount;
    } else {
      store.budgets.push({
        category_id: categoryId,
        default_amount: amount,
        override_amount: null,
        userId,
      });
    }
    saveUserStore(userId, store);
  }
  return { success: true };
};

export const deleteAllBudgets = async (categoryId: number) => {
  try {
    await api.delete(`/budgets/${categoryId}`);
  } catch {
    const userId = getActiveUserId() || 'user-1';
    const store = getUserStore(userId);
    store.budgets = store.budgets.filter((b) => b.category_id !== categoryId);
    saveUserStore(userId, store);
  }
  return { success: true };
};

export const putBudgetOverride = async (
  categoryId: number,
  year: number,
  month: number,
  amount: number,
) => {
  try {
    await api.put(`/budgets/${categoryId}/override/${year}/${month}`, { amount });
  } catch {
    const userId = getActiveUserId() || 'user-1';
    const store = getUserStore(userId);
    const foundIndex = store.budgets.findIndex(
      (b) => b.category_id === categoryId && b.userId === userId,
    );
    if (foundIndex >= 0) {
      store.budgets[foundIndex].override_amount = amount;
    } else {
      store.budgets.push({
        category_id: categoryId,
        default_amount: null,
        override_amount: amount,
        userId,
      });
    }
    saveUserStore(userId, store);
  }
  return { success: true };
};

export const deleteBudgetOverride = async (categoryId: number, year: number, month: number) => {
  try {
    await api.delete(`/budgets/${categoryId}/override/${year}/${month}`);
  } catch {
    const userId = getActiveUserId() || 'user-1';
    const store = getUserStore(userId);
    const foundIndex = store.budgets.findIndex(
      (b) => b.category_id === categoryId && b.userId === userId,
    );
    if (foundIndex >= 0) {
      store.budgets[foundIndex].override_amount = null;
      saveUserStore(userId, store);
    }
  }
  return { success: true };
};

/* =========================================================================
 * Recurring Transactions
 * ========================================================================= */

const getRecurringKey = (userId: string) => `ledgr_recurring_${userId}`;

const DEFAULT_USER1_RECURRING: RecurringTransaction[] = [
  {
    id: 1001,
    userId: 'user-1',
    title: 'Monthly Salary',
    amount: 85000,
    type: 'income',
    category: 'Salary',
    accountId: 2,
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
    accountId: 5,
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
    accountId: 5,
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
    accountId: 201,
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
    accountId: 205,
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
      if (filtered.length > 0) return filtered;
    } catch {
      // fallback
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

export function advanceDueDate(
  dateStr: string,
  frequency: 'weekly' | 'monthly' | 'yearly',
): string {
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

export const fetchRecurringTransactions = async (
  userId?: string,
): Promise<RecurringTransaction[]> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  try {
    const res = await api.get<RecurringTransaction[]>('/recurring', {
      params: { userId: targetUserId },
    });
    if (res.data && res.data.length > 0) return res.data;
  } catch {
    // fallback
  }
  return getStoredRecurring(targetUserId);
};

export const getRecurringTransactions = fetchRecurringTransactions;

export const postRecurringTransaction = async (
  item: Omit<RecurringTransaction, 'id' | 'userId'> & { userId?: string },
  userId?: string,
): Promise<RecurringTransaction> => {
  const targetUserId = item.userId || userId || getActiveUserId() || 'user-1';
  try {
    const res = await api.post<RecurringTransaction>('/recurring', {
      ...item,
      userId: targetUserId,
    });
    return res.data;
  } catch {
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
  }
};

export const addRecurringTransaction = postRecurringTransaction;

export const patchRecurringTransaction = async (
  id: number | string,
  updates: Partial<RecurringTransaction>,
  userId?: string,
): Promise<RecurringTransaction> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  try {
    const res = await api.patch<RecurringTransaction>(`/recurring/${id}`, updates);
    return res.data;
  } catch {
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
  }
};

export const editRecurringTransaction = patchRecurringTransaction;

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

export const deleteRecurringTransaction = async (
  id: number | string,
  userId?: string,
): Promise<{ success: boolean }> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';
  try {
    await api.delete(`/recurring/${id}`);
  } catch {
    const list = getStoredRecurring(targetUserId);
    const nextList = list.filter((r) => String(r.id) !== String(id));
    saveStoredRecurring(targetUserId, nextList);
  }
  return { success: true };
};

export const processDueRecurringTransactions = async (
  userId?: string,
): Promise<{ processed: number; transactions: ApiTransaction[] }> => {
  const targetUserId = userId || getActiveUserId() || 'user-1';

  try {
    const res = await api.post<{ processed: number; transactions: ApiTransaction[] }>(
      '/recurring/process',
      { userId: targetUserId },
    );
    if (res.data) return res.data;
  } catch {
    // fallback
  }

  const recurringList = getStoredRecurring(targetUserId);
  const store = getUserStore(targetUserId);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const createdTransactions: ApiTransaction[] = [];
  let updatedRecurring = false;

  for (let i = 0; i < recurringList.length; i++) {
    const item = recurringList[i];
    if (!item.active || !item.nextDueDate) continue;

    if (item.nextDueDate <= todayStr) {
      const rawAmt = Math.abs(item.amount);
      const signedAmt = item.type === 'expense' ? -rawAmt : rawAmt;
      const cat = DEFAULT_CATEGORIES.find(
        (c) => c.name.toLowerCase() === (item.category || '').toLowerCase(),
      );
      const catId = cat ? cat.id : item.type === 'expense' ? 10 : 1;
      const catName = cat
        ? cat.name
        : item.category || (item.type === 'expense' ? 'Bills' : 'Salary');
      const catIcon = cat ? cat.icon : item.type === 'expense' ? 'receipt' : 'briefcase';

      const acc = store.accounts.find((a) => a.id === item.accountId) || store.accounts[0];
      const accountId = acc ? acc.id : item.accountId;
      const accountName = acc ? acc.name : 'Account';

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

      if (acc) {
        acc.balance += signedAmt;
      }

      store.transactions = [newTx, ...store.transactions];
      createdTransactions.push(newTx);

      let nextDate = advanceDueDate(item.nextDueDate, item.frequency);
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
