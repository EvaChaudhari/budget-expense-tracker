import {
  ChevronLeft,
  ChevronRight,
  Plus,
  LogOut,
  User as UserIcon,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { Tab, TxView, StatsView } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';

const PAGE_META: Record<Tab, { title: string; subtitle: string }> = {
  transactions: { title: 'Transactions', subtitle: 'Track your daily money flow' },
  stats: { title: 'Statistics', subtitle: 'Understand your spending patterns' },
  accounts: { title: 'Accounts', subtitle: 'All your balances in one place' },
  budgets: { title: 'Budgets', subtitle: 'Manage your spending limits' },
  settings: { title: 'Settings', subtitle: 'Manage your preferences' },
};

export interface HeaderProps {
  tab: Tab;
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddTransaction: () => void;
  txView?: TxView;
  statsView?: StatsView;
  viewYear?: number;
  minYear?: number;
  onPrevYear?: () => void;
  onNextYear?: () => void;
}

export default function Header({
  tab,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onAddTransaction,
  txView,
  statsView,
  viewYear,
  minYear,
  onPrevYear,
  onNextYear,
}: HeaderProps) {
  const {
    user,
    logout,
    activeMember,
    setActiveMember,
    isChild,
    familyMembers,
  } = useAuth();
  const { title, subtitle } = PAGE_META[tab];
  const showAdd = tab === 'transactions';

  const showYearNav =
    (tab === 'transactions' && txView === 'monthly') || (tab === 'stats' && statsView === 'annual');
  const showMonthNav =
    (tab === 'transactions' && txView !== 'monthly') || (tab === 'stats' && statsView !== 'annual');

  const parentMember = familyMembers.find((m) => m.role === 'Parent');
  const childrenList = familyMembers.filter((m) => m.role === 'Child');
  const currentChild = isChild ? activeMember : childrenList[0] || null;

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-4 md:px-8.5 pt-5 md:pt-6.5 pb-4">
      <div className="min-w-0">
        <div className="text-[19px] sm:text-[21px] md:text-[25px] font-extrabold tracking-[-0.02em] truncate">
          {title}
        </div>
        <div className="hidden md:block text-sm text-text-muted mt-0.75">{subtitle}</div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Profile Switcher: Parent View / Active Child View */}
        {user && familyMembers.length > 0 && (
          <div
            className="flex items-center bg-surface border border-border rounded-[14px] p-1 shadow-xs"
            data-testid="profile-switcher"
            aria-label="Profile view switcher"
          >
            {/* Parent toggle button */}
            <button
              type="button"
              onClick={() => {
                if (parentMember) setActiveMember(parentMember);
              }}
              title={`Switch to Parent view (${parentMember?.name || user.name})`}
              aria-label="Parent view"
              aria-pressed={!isChild}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                !isChild
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg'
              }`}
            >
              <Shield size={14} className={!isChild ? 'text-white' : 'text-text-muted'} />
              <span>Parent</span>
            </button>

            {/* Child toggle button */}
            <button
              type="button"
              onClick={() => {
                if (currentChild) {
                  setActiveMember(currentChild);
                } else if (childrenList.length > 0) {
                  setActiveMember(childrenList[0]);
                }
              }}
              title={
                currentChild
                  ? `Switch to Child view (${currentChild.name} - Allowance: ${currentChild.monthlyAllowance})`
                  : 'Switch to Child view'
              }
              aria-label="Child view"
              aria-pressed={isChild}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                isChild
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg'
              }`}
            >
              <Sparkles size={14} className={isChild ? 'text-white' : 'text-text-muted'} />
              <span>Child</span>
              {isChild && activeMember && (
                <span className="hidden xl:inline-block max-w-[85px] truncate text-[10px] font-semibold opacity-90 bg-black/15 px-1.5 py-0.5 rounded-full ml-0.5">
                  {activeMember.name.replace(/\s*\(Child\)$/i, '')}
                </span>
              )}
            </button>

            {/* Child selector when multiple children exist */}
            {childrenList.length > 1 && isChild && (
              <select
                value={activeMember?.id}
                onChange={(e) => {
                  const selected = familyMembers.find((m) => m.id === e.target.value);
                  if (selected) setActiveMember(selected);
                }}
                aria-label="Select active child profile"
                title="Select active child"
                className="text-[11px] font-bold bg-bg text-text-primary border border-border/80 rounded-[8px] py-1 px-1.5 ml-1 cursor-pointer focus:outline-none"
              >
                {childrenList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.replace(/\s*\(Child\)$/i, '')}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {showMonthNav && (
          <div className="flex items-center gap-0.5 bg-surface border border-border rounded-[14px] p-1.25">
            <button
              onClick={onPrevMonth}
              aria-label="Previous month"
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-sm px-2">{monthLabel}</span>
            <button
              onClick={onNextMonth}
              aria-label="Next month"
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {showYearNav && viewYear !== undefined && (
          <div className="flex items-center gap-0.5 bg-surface border border-border rounded-[14px] p-1.25">
            <button
              onClick={onPrevYear}
              disabled={minYear !== undefined && viewYear <= minYear}
              aria-label="Previous year"
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-sm px-2 tabular-nums">{viewYear}</span>
            <button
              onClick={onNextYear}
              disabled={viewYear >= new Date().getFullYear()}
              aria-label="Next year"
              className="w-8 h-8 border-0 bg-transparent rounded-[10px] text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {showAdd && (
          <button
            onClick={onAddTransaction}
            className="flex items-center gap-2 bg-accent text-white border-0 rounded-[14px] px-3 md:px-4.5 py-2.75 font-bold text-sm cursor-pointer shadow-[0_8px_20px_color-mix(in_srgb,#2563eb_34%,transparent)] hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span className="hidden lg:inline">Add transaction</span>
          </button>
        )}

        {/* User profile & Logout button */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-2.5 pl-1 border-l border-border/80 ml-1">
            <div
              title={`${activeMember?.name || user.name} (${activeMember?.role || 'Parent'})`}
              className="flex items-center gap-2 bg-surface border border-border rounded-[14px] py-1.5 px-2.5 shadow-xs"
            >
              <div
                className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                  isChild ? 'bg-amber-500' : 'bg-accent'
                }`}
              >
                {activeMember?.avatar ||
                  user.avatar ||
                  (user.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon size={14} />)}
              </div>
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-xs font-bold text-text-primary max-w-[110px] truncate leading-tight">
                  {activeMember?.name?.replace(/\s*\((Parent|Child)\)$/i, '') || user.name}
                </span>
                <span
                  className={`text-[9.5px] font-bold uppercase tracking-wider ${
                    isChild ? 'text-amber-600' : 'text-accent'
                  }`}
                >
                  {isChild ? 'Child View' : 'Parent View'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign out of account"
              className="flex items-center gap-1.5 bg-surface border border-border hover:bg-red-50 hover:text-expense hover:border-red-200 text-text-muted rounded-[14px] px-2.5 sm:px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <LogOut size={15} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

