import { Search } from 'lucide-react';
import type { TxView } from '../../types/index.ts';

const VIEWS: { key: TxView; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'monthly', label: 'Monthly' },
];

interface Props {
  active: TxView;
  onChange: (v: TxView) => void;
  onSearchOpen: () => void;
}

export default function ViewSwitcher({ active, onChange, onSearchOpen }: Props) {
  return (
    <div className="flex items-center justify-between mb-4.5">
      <div className="inline-flex gap-1 bg-border rounded-[15px] p-1.25">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              'px-3 sm:px-4.5 py-2.25 rounded-[11px] text-[12px] sm:text-[13.5px] font-semibold border-0 cursor-pointer transition-all duration-150',
              active === key
                ? 'bg-surface text-text-primary font-bold shadow-[0_2px_8px_rgba(37,99,235,0.12)]'
                : 'bg-transparent text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 bg-surface border border-border rounded-[13px] px-3 sm:px-3.5 py-2.25 text-text-subtle text-[13.5px] font-medium hover:text-text-primary hover:border-accent/40 transition-colors cursor-pointer"
      >
        <Search size={15} />
        <span className="hidden sm:inline">Search</span>
      </button>
    </div>
  );
}
