import { ArrowLeftRight, PieChart, Settings, Wallet } from 'lucide-react';
import type { Tab } from '../types/index.ts';

const NAV_ITEMS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'transactions', label: 'Transactions', icon: <ArrowLeftRight size={21} /> },
  { key: 'stats', label: 'Statistics', icon: <PieChart size={21} /> },
  { key: 'accounts', label: 'Accounts', icon: <Wallet size={21} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={21} /> },
];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map(({ key, label, icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-1 py-3 border-0 cursor-pointer transition-colors bg-transparent',
              active ? 'text-accent' : 'text-text-muted',
            ].join(' ')}
          >
            {icon}
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
