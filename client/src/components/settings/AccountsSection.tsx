import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Account, UserSettings } from '../../types/index.ts';
import {
  fetchAccountGroups,
  fetchAccounts,
  postAccountGroup,
  patchAccountGroup,
  deleteAccountGroup,
  patchAccount,
  postAccount,
} from '../../lib/api.ts';
import { formatMoney } from '../../lib/currency.ts';
import SettingCard from '../ui/SettingCard.tsx';

interface Props {
  settings: UserSettings;
}

export default function AccountsSection({ settings }: Props) {
  const { currency_symbol: sym, unit_position: pos } = settings;
  const queryClient = useQueryClient();

  const { data: accountGroups = [] } = useQuery({
    queryKey: ['account-groups'],
    queryFn: fetchAccountGroups,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const sortedGroups = [...accountGroups].sort((a, b) => a.sort_order - b.sort_order);

  // ── Account groups ────────────────────────────────────────────────────────────
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupDeleteError, setGroupDeleteError] = useState<number | null>(null);

  const addGroupMutation = useMutation({
    mutationFn: (name: string) => postAccountGroup(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-groups'] }),
  });
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => patchAccountGroup(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-groups'] }),
  });
  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => deleteAccountGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-groups'] }),
    onError: (_err, id) => setGroupDeleteError(id),
  });

  const saveGroupEdit = () => {
    if (!editGroupName.trim() || editingGroupId === null) return;
    updateGroupMutation.mutate({ id: editingGroupId, name: editGroupName.trim() });
    setEditingGroupId(null);
  };

  // ── Accounts ──────────────────────────────────────────────────────────────────
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editAccountDraft, setEditAccountDraft] = useState<{
    name: string;
    balance: string;
    group_id: number | null;
  }>({
    name: '',
    balance: '',
    group_id: null,
  });
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountDraft, setNewAccountDraft] = useState({
    name: '',
    balance: '',
    group_id: null as number | null,
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof patchAccount>[1] }) =>
      patchAccount(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
  const addAccountMutation = useMutation({
    mutationFn: (body: Parameters<typeof postAccount>[0]) => postAccount(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowAddAccount(false);
      setNewAccountDraft({ name: '', balance: '', group_id: null });
    },
  });

  const startAccountEdit = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditAccountDraft({ name: acc.name, balance: String(acc.balance), group_id: acc.group_id });
  };
  const saveAccountEdit = () => {
    if (!editingAccountId || !editAccountDraft.name.trim()) return;
    const balanceNum = parseFloat(editAccountDraft.balance);
    updateAccountMutation.mutate({
      id: editingAccountId,
      data: {
        name: editAccountDraft.name.trim(),
        balance: isNaN(balanceNum) ? 0 : balanceNum,
        group_id: editAccountDraft.group_id,
      },
    });
    setEditingAccountId(null);
  };
  const submitAddAccount = () => {
    if (!newAccountDraft.name.trim()) return;
    const balanceNum = parseFloat(newAccountDraft.balance);
    addAccountMutation.mutate({
      name: newAccountDraft.name.trim(),
      type: 'Wallet',
      balance: isNaN(balanceNum) ? 0 : balanceNum,
      group_id: newAccountDraft.group_id,
    });
  };

  return (
    <SettingCard title="Accounts">
      {/* Groups sub-section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Groups
          </span>
          {!showAddGroup && (
            <button
              onClick={() => {
                setShowAddGroup(true);
                setNewGroupName('');
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-accent border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity p-0"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {showAddGroup && (
          <div className="flex gap-2 mb-3">
            <input
              autoFocus
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newGroupName.trim()) {
                  addGroupMutation.mutate(newGroupName.trim());
                  setShowAddGroup(false);
                  setNewGroupName('');
                }
                if (e.key === 'Escape') setShowAddGroup(false);
              }}
              className="flex-1 text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] px-3 py-2 outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                if (newGroupName.trim()) {
                  addGroupMutation.mutate(newGroupName.trim());
                  setShowAddGroup(false);
                  setNewGroupName('');
                }
              }}
              disabled={!newGroupName.trim()}
              className="px-3 py-2 rounded-[11px] bg-accent text-white text-xs font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddGroup(false)}
              className="px-3 py-2 rounded-[11px] bg-bg text-text-muted text-xs font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-col">
          {sortedGroups.map((group, i) => {
            const isEditingGroup = editingGroupId === group.id;
            const isLast = i === sortedGroups.length - 1;
            return (
              <div
                key={group.id}
                className={[
                  'flex items-center gap-3 py-2.5',
                  !isLast ? 'border-b border-bg' : '',
                ].join(' ')}
              >
                {isEditingGroup ? (
                  <>
                    <input
                      autoFocus
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveGroupEdit();
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                      className="flex-1 text-sm font-semibold text-text-primary bg-bg border border-accent rounded-lg px-2 py-1 outline-none"
                    />
                    <button
                      onClick={saveGroupEdit}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-accent text-white border-0 cursor-pointer shrink-0"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-border text-text-muted border-0 cursor-pointer shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-text-primary flex-1">
                      {group.name}
                    </span>
                    {groupDeleteError === group.id && (
                      <span className="text-[11px] text-expense mr-1">Has accounts</span>
                    )}
                    <button
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setEditGroupName(group.name);
                        setGroupDeleteError(null);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-text-faint hover:text-accent hover:bg-accent-soft border-0 cursor-pointer transition-colors shrink-0"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setGroupDeleteError(null);
                        deleteGroupMutation.mutate(group.id);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-text-faint hover:text-expense hover:bg-expense/10 border-0 cursor-pointer transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Accounts sub-section */}
      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Account list
          </span>
          {!showAddAccount && (
            <button
              onClick={() => setShowAddAccount(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-accent border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity p-0"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {showAddAccount && (
          <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-bg">
            <input
              autoFocus
              placeholder="Account name"
              value={newAccountDraft.name}
              onChange={(e) => setNewAccountDraft((p) => ({ ...p, name: e.target.value }))}
              className="w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] px-3 py-2 outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Balance"
                value={newAccountDraft.balance}
                onChange={(e) => setNewAccountDraft((p) => ({ ...p, balance: e.target.value }))}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                className="flex-1 text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] px-3 py-2 outline-none focus:border-accent"
              />
              <div className="relative flex-1">
                <select
                  value={newAccountDraft.group_id ?? ''}
                  onChange={(e) =>
                    setNewAccountDraft((p) => ({
                      ...p,
                      group_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="w-full text-sm font-semibold text-text-primary bg-bg border border-border rounded-[11px] pl-3 pr-8 py-2 outline-none focus:border-accent cursor-pointer appearance-none"
                >
                  <option value="" disabled>
                    Select group
                  </option>
                  {sortedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={submitAddAccount}
                disabled={
                  !newAccountDraft.name.trim() ||
                  !newAccountDraft.group_id ||
                  addAccountMutation.isPending
                }
                className="px-4 py-2 rounded-[11px] bg-accent text-white text-xs font-bold border-0 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Add Account
              </button>
              <button
                onClick={() => setShowAddAccount(false)}
                className="px-4 py-2 rounded-[11px] bg-bg text-text-muted text-xs font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col">
          {accounts.map((acc, i) => {
            const isEditingAcc = editingAccountId === acc.id;
            const isLast = i === accounts.length - 1;
            const groupName = accountGroups.find((g) => g.id === acc.group_id)?.name;
            return (
              <div
                key={acc.id}
                className={[
                  'flex items-center gap-3 py-2.5',
                  !isLast ? 'border-b border-bg' : '',
                ].join(' ')}
              >
                {isEditingAcc ? (
                  <>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <input
                        autoFocus
                        value={editAccountDraft.name}
                        onChange={(e) =>
                          setEditAccountDraft((p) => ({ ...p, name: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAccountEdit();
                          if (e.key === 'Escape') setEditingAccountId(null);
                        }}
                        className="text-sm font-semibold text-text-primary bg-bg border border-accent rounded-lg px-2 py-1 outline-none w-full"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={editAccountDraft.balance}
                          onChange={(e) =>
                            setEditAccountDraft((p) => ({ ...p, balance: e.target.value }))
                          }
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          className="flex-1 min-w-0 text-xs font-semibold text-text-primary bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:border-accent"
                        />
                        <div className="relative flex-1 min-w-0">
                          <select
                            value={editAccountDraft.group_id ?? ''}
                            onChange={(e) =>
                              setEditAccountDraft((p) => ({
                                ...p,
                                group_id: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                            className="w-full text-xs font-semibold text-text-primary bg-bg border border-border rounded-lg pl-2 pr-6 py-1 outline-none focus:border-accent cursor-pointer appearance-none"
                          >
                            <option value="" disabled>
                              Select group
                            </option>
                            {sortedGroups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={saveAccountEdit}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-accent text-white border-0 cursor-pointer shrink-0"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => setEditingAccountId(null)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-border text-text-muted border-0 cursor-pointer shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary leading-snug">
                        {acc.name}
                      </div>
                      <div className="text-xs text-text-muted">{groupName}</div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-text-primary shrink-0">
                      {formatMoney(acc.balance, sym, pos)}
                    </span>
                    <button
                      onClick={() => startAccountEdit(acc)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-text-faint hover:text-accent hover:bg-accent-soft border-0 cursor-pointer transition-colors shrink-0"
                    >
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SettingCard>
  );
}
