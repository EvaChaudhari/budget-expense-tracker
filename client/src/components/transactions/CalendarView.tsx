import { useState } from 'react';
import type { UserSettings, WeekDay } from '../../types/index.ts';
import type { CalendarDayData } from '../../types/index.ts';
import { formatMoney } from '../../lib/currency.ts';

const ALL_DAYS: WeekDay[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_SHORT: Record<WeekDay, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

interface Props {
  year: number;
  month: number; // 0-indexed
  settings: UserSettings;
  calendarData: Record<string, CalendarDayData>;
}

const buildGrid = (year: number, month: number, weekStart: WeekDay) => {
  const startIdx = ALL_DAYS.indexOf(weekStart);
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay - startIdx + 7) % 7;

  const blanks: null[] = new Array(offset).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cells: (number | null)[] = [...blanks, ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return {
    headers: [...ALL_DAYS.slice(startIdx), ...ALL_DAYS.slice(0, startIdx)] as WeekDay[],
    rows: Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7)),
  };
};

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export default function CalendarView({ year, month, settings, calendarData }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;

  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

  const [selectedDay, setSelectedDay] = useState<number | null>(isCurrentMonth ? todayDay : null);

  const { headers, rows } = buildGrid(year, month, settings.week_start);

  return (
    <div className="bg-surface border border-border rounded-[20px] shadow-(--shadow-card) overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {headers.map((h) => (
          <div
            key={h}
            className="py-3 text-center text-xs font-semibold text-text-muted tracking-wide"
          >
            {DAY_SHORT[h]}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          className={[
            'grid grid-cols-7',
            ri < rows.length - 1 ? 'border-b border-border' : '',
          ].join(' ')}
        >
          {row.map((day, ci) => {
            const borderRight = ci < 6 ? 'border-r border-border' : '';

            if (day === null) {
              return <div key={ci} className={['min-h-18 bg-bg/40', borderRight].join(' ')} />;
            }

            const dateKey = toDateKey(year, month, day);
            const data = calendarData[dateKey];
            const isToday = day === todayDay;
            const isSelected = day === selectedDay;

            return (
              <div
                key={ci}
                onClick={() => setSelectedDay(day)}
                className={[
                  'min-h-18 p-1.5 flex flex-col cursor-pointer transition-colors duration-100',
                  borderRight,
                  isSelected && !isToday ? 'bg-accent-soft' : '',
                  !isSelected && !isToday ? 'hover:bg-bg/50' : '',
                ].join(' ')}
              >
                {/* Day number */}
                <span
                  className={[
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold self-start',
                    isToday
                      ? 'bg-accent text-white'
                      : isSelected
                        ? 'text-accent'
                        : 'text-text-primary',
                  ].join(' ')}
                >
                  {day}
                </span>

                {/* Income / expense amounts */}
                {data && (
                  <div className="flex flex-col gap-0.5 mt-auto">
                    {data.income > 0 && (
                      <span className="text-[10px] font-semibold text-income leading-none truncate">
                        {formatMoney(data.income, sym, pos)}
                      </span>
                    )}
                    {data.expense < 0 && (
                      <span className="text-[10px] font-semibold text-expense leading-none truncate">
                        {formatMoney(Math.abs(data.expense), sym, pos)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
