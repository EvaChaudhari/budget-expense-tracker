export type Tab = 'transactions' | 'stats' | 'accounts' | 'settings';
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
}
