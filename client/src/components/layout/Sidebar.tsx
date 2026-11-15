import {
  ArrowLeftRight,
  PieChart,
  Settings,
  Wallet,
  PiggyBank,
  LogOut,
  User,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { Tab, UserSettings } from '../../types/index.ts';
import { formatMoney } from '../../lib/currency.ts';
import { useAuth } from '../../context/AuthContext.tsx';



export interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  settings: UserSettings;
  year: number;
  month: number; // 0-indexed
  budgetSpent: number;
  budgetTotal: number;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  settings,
  year,
  month,
  budgetSpent,
  budgetTotal,
}: SidebarProps) {
  const {
    user,
    logout,
    activeMember,
    setActiveMember,
    isChild,
    familyMembers,
  } = useAuth();

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'transactions', label: 'Transactions', icon: <ArrowLeftRight size={20} /> },
    { key: 'stats', label: 'Statistics', icon: <PieChart size={20} /> },
    { key: 'accounts', label: 'Accounts', icon: <Wallet size={20} /> },
    { key: 'budgets', label: isChild ? 'My Budget' : 'Budgets', icon: <PiggyBank size={20} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const sym = settings.currency_symbol;
  const pos = settings.unit_position;
  const pct = budgetTotal > 0 ? Math.min(Math.round((budgetSpent / budgetTotal) * 100), 100) : 0;
  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' });

  const parentMember = familyMembers.find((m) => m.role === 'Parent');
  const childrenList = familyMembers.filter((m) => m.role === 'Child');
  const currentChild = isChild ? activeMember : childrenList[0] || null;

  return (
    <aside className="hidden md:flex w-56 shrink-0 bg-surface border-r border-border flex-col px-4.5 py-5.5 justify-between h-full min-h-0 overflow-y-auto overflow-x-hidden gap-6">
      <div className="shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.75 px-2 pb-6.5 pt-1.5">
          <img
            src="/budget-tracker-logo.png"
            alt="Ledgr logo"
            className="w-9.5 h-9.5 object-contain"
          />
          <span className="text-[22px] font-extrabold tracking-[-0.03em]">Ledgr</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {navItems.map(({ key, label, icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={[
                  'flex items-center gap-3 px-3.25 py-2.75 rounded-[13px]',
                  'text-[14.5px] w-full text-left border-0 cursor-pointer transition-colors duration-150',
                  active
                    ? 'bg-accent-soft text-accent font-bold'
                    : 'bg-transparent text-[#6b6780] font-semibold hover:bg-accent-soft/50',
                ].join(' ')}
              >
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Budget progress card */}
        <div className="mt-6 p-4.5 rounded-[18px] text-white bg-[linear-gradient(150deg,#2563eb,#0ea5e9)]">
          <div className="text-sm font-bold mb-0.75">{monthName} budget</div>
          {budgetTotal > 0 ? (
            <>
              <div className="text-[12.5px] opacity-85 mb-3">
                {formatMoney(budgetSpent, sym, pos)} of {formatMoney(budgetTotal, sym, pos)}
              </div>
              <div className="h-2 rounded-md bg-white/28 overflow-hidden">
                <div className="h-full rounded-md bg-white" style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : (
            <div className="text-[12.5px] opacity-70 mt-1">No budget limits set</div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 shrink-0">
        {/* Profile Switcher: Parent View / Active Child View */}
        {user && familyMembers.length > 0 && (
          <div className="pt-3 border-t border-border" data-testid="sidebar-profile-switcher">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                Profile View
              </span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  isChild ? 'bg-amber-500/15 text-amber-600' : 'bg-accent/15 text-accent'
                }`}
              >
                {isChild ? 'Child' : 'Parent'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-bg/80 p-1 rounded-[12px] border border-border">
              <button
                type="button"
                onClick={() => {
                  if (parentMember) setActiveMember(parentMember);
                }}
                title="Switch to Parent View"
                aria-pressed={!isChild}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                  !isChild
                    ? 'bg-surface text-accent shadow-xs border border-border'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
                }`}
              >
                <Shield size={13} />
                <span>Parent</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentChild) {
                    setActiveMember(currentChild);
                  } else if (childrenList.length > 0) {
                    setActiveMember(childrenList[0]);
                  }
                }}
                title="Switch to Child View"
                aria-pressed={isChild}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                  isChild
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
                }`}
              >
                <Sparkles size={13} />
                <span>Child</span>
              </button>
            </div>

            {isChild && activeMember && (
              <div className="mt-2 px-2.5 py-1.5 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-[11px] flex items-center justify-between">
                <span className="font-bold text-amber-800 dark:text-amber-200 truncate max-w-[100px]">
                  {activeMember.name.replace(/\s*\(Child\)$/i, '')}
                </span>
                <span className="font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                  {formatMoney(activeMember.monthlyAllowance, sym, pos)}/mo
                </span>
              </div>
            )}
          </div>
        )}

        {/* User profile & logout */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8.5 h-8.5 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                isChild ? 'bg-amber-500' : 'bg-accent'
              }`}
            >
              {activeMember?.avatar ||
                user?.avatar ||
                (user?.name ? user.name.slice(0, 2).toUpperCase() : <User size={15} />)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-text-primary truncate">
                {activeMember?.name?.replace(/\s*\((Parent|Child)\)$/i, '') || user?.name || 'User'}
              </div>
              <div className="text-[11px] text-text-muted truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="w-8 h-8 rounded-[10px] border border-border bg-surface hover:bg-red-50 hover:text-expense hover:border-red-200 text-text-muted transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

