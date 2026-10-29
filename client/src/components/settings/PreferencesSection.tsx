import type { UnitPosition, UserSettings, WeekDay } from '../../types/index.ts';
import SettingCard from '../ui/SettingCard.tsx';

const WEEK_START_OPTIONS: { label: string; value: WeekDay }[] = [
  { label: 'Sunday', value: 'Sunday' },
  { label: 'Monday', value: 'Monday' },
  { label: 'Saturday', value: 'Saturday' },
];

interface Props {
  settings: UserSettings;
  onUpdate: (patch: Partial<UserSettings>) => void;
}

export default function PreferencesSection({ settings, onUpdate }: Props) {
  return (
    <SettingCard title="Preferences">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-text-primary">Week starts on</div>
          <div className="text-xs text-text-muted mt-0.5">Affects the calendar view headers</div>
        </div>
        <div className="flex gap-1 bg-border rounded-[11px] p-1">
          {WEEK_START_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onUpdate({ week_start: value })}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-all duration-150',
                settings.week_start === value
                  ? 'bg-surface text-accent shadow-[0_2px_8px_rgba(37,99,235,0.12)]'
                  : 'bg-transparent text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-text-primary">Symbol position</div>
          <div className="text-xs text-text-muted mt-0.5">
            Example:{' '}
            {settings.unit_position === 'prefix'
              ? `${settings.currency_symbol} 100.00`
              : `100.00 ${settings.currency_symbol}`}
          </div>
        </div>
        <div className="flex gap-1 bg-border rounded-[11px] p-1">
          {(['prefix', 'suffix'] as UnitPosition[]).map((p) => (
            <button
              key={p}
              onClick={() => onUpdate({ unit_position: p })}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-all duration-150 capitalize',
                settings.unit_position === p
                  ? 'bg-surface text-accent shadow-[0_2px_8px_rgba(37,99,235,0.12)]'
                  : 'bg-transparent text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </SettingCard>
  );
}
