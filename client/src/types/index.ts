export type Tab = 'transactions' | 'stats' | 'accounts' | 'budgets' | 'settings';

export interface ChildBudgetLimit {
  memberId: string;
  categoryId: number;
  amount: number; // monthly limit in ₹
}

export interface ChildBudgetStore {
  limits: ChildBudgetLimit[];
}
export type TxView = 'daily' | 'calendar' | 'monthly';
export type StatsView = 'monthly' | 'annual';
export type UnitPosition = 'prefix' | 'suffix';
export type WeekDay =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export type FamilyRole = 'Parent' | 'Child';

export interface FamilyMember {
  id: string;
  name: string;
  role: 'Parent' | 'Child';
  monthlyAllowance: number;
  avatar?: string;
  email?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  currency_code?: string;
  currency_symbol?: string;
  role?: FamilyRole;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  token?: string;
  currency_code?: string;
  currency_symbol?: string;
  role?: FamilyRole;
  activeMember?: FamilyMember;
  familyMembers?: FamilyMember[];
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

export interface AccountGroup {
  id: number;
  name: string;
  sort_order: number;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
  balance: number;
  group_id: number | null;
  userId?: string;
  user_id?: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  note: string;
  date: string;
  time: string;
  category?: Category;
  account?: Account;
  userId?: string;
  user_id?: string;
  paidForMemberId?: string | null;
}

export interface UserSettings {
  week_start: WeekDay;
  currency_country: string;
  currency_code: string;
  currency_symbol: string;
  unit_position: UnitPosition;
}

export interface MonthlySummary {
  year: number;
  month: number; // 1-indexed (MySQL MONTH())
  income: number;
  expenses: number;
}

export interface BudgetEntry {
  category_id: number;
  default_amount: number | null;
  override_amount: number | null;
  userId?: string;
  user_id?: string;
}

export interface RawTransaction {
  id: number;
  icon: string;
  cat: string;
  note: string;
  description: string | null;
  time: string;
  amt: number;
  accountId: number;
  paymentMethodId?: number | null;
  paymentMethodName?: string | null;
  paymentMethodIcon?: string | null;
  paidForMemberId?: string | null;
}

export interface RawDayGroup {
  label: string;
  date: string;
  dateKey: string;
  items: RawTransaction[];
}

export interface CalendarDayData {
  income: number;
  expense: number;
}

export interface MonthlyCategoryItem {
  id: number;
  name: string;
  icon: string;
  amount: number;
}

export interface MonthlyBarData {
  month: string;
  income: number;
  expense: number;
}

export interface ApiTransaction {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  note: string;
  description: string | null;
  tx_date: string; // 'YYYY-MM-DD'
  tx_time: string; // 'HH:mm:ss'
  category_name: string;
  category_icon: string;
  account_name: string;
  payment_method_id?: number | null;
  payment_method_name?: string | null;
  payment_method_icon?: string | null;
  userId?: string;
  user_id?: string;
  paidForMemberId?: string | null;
}

export interface PaymentMethod {
  id: number;
  name: string;
  icon: string;
}

export interface RecurringTransaction {
  id: number | string;
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  accountId: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string; // string ISO date 'YYYY-MM-DD'
  active: boolean;
  paidForMemberId?: string | null;
  memberId?: string | null;
}
