import type { ApiTransaction, CalendarDayData, RawDayGroup } from '../types/index.ts';
import { DAY_SHORT, MONTH_LONG } from './constants.ts';

export const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const buildDateLabel = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
};

export const buildFullDateLabel = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
};

export const buildDayLabel = (dateStr: string) => {
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (dateStr === localDateStr(today)) return 'Today';
  if (dateStr === localDateStr(yest)) return 'Yesterday';
  return buildDateLabel(dateStr);
};

export const buildDailyGroups = (txs: ApiTransaction[]): RawDayGroup[] => {
  const dateMap = new Map<string, ApiTransaction[]>();
  for (const tx of txs) {
    const list = dateMap.get(tx.tx_date) ?? [];
    list.push(tx);
    dateMap.set(tx.tx_date, list);
  }
  const dates = [...new Set(txs.map((t) => t.tx_date))];
  return dates.map((dateStr) => ({
    label: buildDayLabel(dateStr),
    date: buildDateLabel(dateStr),
    dateKey: dateStr,
    items: (dateMap.get(dateStr) ?? []).map((tx) => ({
      id: tx.id,
      icon: tx.category_icon,
      cat: tx.category_name,
      note: tx.note,
      description: tx.description,
      time: formatTime(tx.tx_time),
      amt: tx.amount,
      accountId: tx.account_id,
    })),
  }));
};

export const buildCalendarData = (txs: ApiTransaction[]): Record<string, CalendarDayData> => {
  const result: Record<string, CalendarDayData> = {};
  for (const tx of txs) {
    if (!result[tx.tx_date]) result[tx.tx_date] = { income: 0, expense: 0 };
    if (tx.amount > 0) result[tx.tx_date].income += tx.amount;
    else result[tx.tx_date].expense += tx.amount;
  }
  return result;
};
