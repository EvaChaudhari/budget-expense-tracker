import type { UnitPosition, UserSettings } from '../../types/index.ts';
import SettingCard from '../ui/SettingCard.tsx';

interface CurrencyPreset {
  code: string;
  symbol: string;
  country: string;
  position: UnitPosition;
}

const CURRENCY_PRESETS: CurrencyPreset[] = [
  { code: 'MYR', symbol: 'RM', country: 'Malaysia', position: 'prefix' },
  { code: 'USD', symbol: '$', country: 'United States', position: 'prefix' },
  { code: 'EUR', symbol: '€', country: 'Eurozone', position: 'suffix' },
  { code: 'GBP', symbol: '£', country: 'United Kingdom', position: 'prefix' },
  { code: 'JPY', symbol: '¥', country: 'Japan', position: 'prefix' },
];

interface Props {
  settings: UserSettings;
  onUpdate: (patch: Partial<UserSettings>) => void;
}

export default function CurrencySection({ settings, onUpdate }: Props) {
  return (
    <SettingCard title="Currency">
      <div className="grid grid-cols-5 gap-2">
        {CURRENCY_PRESETS.map((c) => {
          const active = settings.currency_code === c.code;
          return (
            <button
              key={c.code}
              onClick={() =>
                onUpdate({
                  currency_country: c.country,
                  currency_code: c.code,
                  currency_symbol: c.symbol,
                  unit_position: c.position,
                })
              }
              className={[
                'flex flex-col items-center gap-1.5 py-3 rounded-[13px] border-2 cursor-pointer transition-all duration-150',
                active
                  ? 'border-accent bg-accent-soft'
                  : 'border-border bg-bg hover:border-accent/50',
              ].join(' ')}
            >
              <span
                className={`text-base font-extrabold ${active ? 'text-accent' : 'text-text-primary'}`}
              >
                {c.symbol}
              </span>
              <span
                className={`text-[10px] font-semibold ${active ? 'text-accent' : 'text-text-muted'}`}
              >
                {c.code}
              </span>
            </button>
          );
        })}
      </div>
    </SettingCard>
  );
}
