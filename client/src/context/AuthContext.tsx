import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserSession, FamilyMember } from '../types/index.ts';

export interface StoredUser extends User {
  password: string;
}

export interface DemoUserOption {
  email: string;
  name: string;
  role: string;
  password: string;
  currency_code: string;
  currency_symbol: string;
  currency: string;
}

export interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  demoUsers: DemoUserOption[];
  activeMember: FamilyMember | null;
  setActiveMember: (member: FamilyMember | null) => void;
  isChild: boolean;
  familyMembers: FamilyMember[];
  switchMember: (memberId: string) => void;
  toggleRole: () => void;
}

export const DEFAULT_FAMILY_MEMBERS: Record<string, FamilyMember[]> = {
  'user-1': [
    {
      id: 'member-alex',
      name: 'Alex Morgan',
      role: 'Parent',
      monthlyAllowance: 0,
      avatar: 'AM',
    },
    {
      id: 'member-leo',
      name: 'Leo Morgan',
      role: 'Child',
      monthlyAllowance: 2500,
      avatar: 'LM',
    },
    {
      id: 'member-maya',
      name: 'Maya Morgan',
      role: 'Child',
      monthlyAllowance: 1500,
      avatar: 'MM',
    },
  ],
  'user-2': [
    {
      id: 'member-sarah',
      name: 'Sarah Chen',
      role: 'Parent',
      monthlyAllowance: 0,
      avatar: 'SC',
    },
    {
      id: 'member-lucas',
      name: 'Lucas Chen',
      role: 'Child',
      monthlyAllowance: 3000,
      avatar: 'LC',
    },
  ],
};

export const DEMO_USERS: StoredUser[] = [
  {
    id: 'user-1',
    name: 'Alex Morgan',
    email: 'user1@demo.com',
    password: 'password123',
    avatar: 'AM',
    currency_code: 'INR',
    currency_symbol: '₹',
  },
  {
    id: 'user-2',
    name: 'Sarah Chen',
    email: 'user2@demo.com',
    password: 'password123',
    avatar: 'SC',
    currency_code: 'INR',
    currency_symbol: '₹',
  },
];

const AUTH_STORAGE_KEY = 'ledgr_current_user';
const USERS_STORAGE_KEY = 'ledgr_registered_users';
const ACTIVE_MEMBER_STORAGE_KEY = 'ledgr_active_member';
const FAMILY_MEMBERS_STORAGE_PREFIX = 'ledgr_family_members_';

export function getInitialFamilyMembers(userId: string, userName: string): FamilyMember[] {
  const storageKey = `${FAMILY_MEMBERS_STORAGE_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback to defaults
  }

  const defaults = DEFAULT_FAMILY_MEMBERS[userId] || [
    {
      id: `member-${userId}-parent`,
      name: userName ? `${userName} (Parent)` : 'Parent',
      role: 'Parent' as const,
      monthlyAllowance: 0,
      avatar: userName ? userName.slice(0, 2).toUpperCase() : 'PA',
    },
    {
      id: `member-${userId}-child`,
      name: `${(userName || 'Family').split(' ')[0]}'s Child`,
      role: 'Child' as const,
      monthlyAllowance: 2000,
      avatar: 'CH',
    },
  ];

  try {
    localStorage.setItem(storageKey, JSON.stringify(defaults));
  } catch {
    // ignore
  }

  return defaults;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEMO_USERS));
      return DEMO_USERS;
    }
    const parsed: StoredUser[] = JSON.parse(raw);
    const merged = [...parsed];
    for (const demo of DEMO_USERS) {
      const idx = merged.findIndex((u) => u.email.toLowerCase() === demo.email.toLowerCase());
      if (idx === -1) {
        merged.push(demo);
      } else {
        // Keep demo users updated with latest INR currency preferences
        merged[idx] = { ...merged[idx], currency_code: 'INR', currency_symbol: '₹' };
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return DEMO_USERS;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMember, setActiveMemberState] = useState<FamilyMember | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Computed helper flag indicating if active member is a Child
  const isChild = activeMember?.role === 'Child';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsedUser: UserSession = JSON.parse(stored);
        // Ensure default currency is INR
        if (!parsedUser.currency_symbol || parsedUser.currency_symbol === 'RM' || parsedUser.currency_symbol === '$') {
          parsedUser.currency_code = 'INR';
          parsedUser.currency_symbol = '₹';
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsedUser));
        }
        setUser(parsedUser);
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manage active family member whenever user session changes
  useEffect(() => {
    if (!user) {
      setActiveMemberState(null);
      setFamilyMembers([]);
      return;
    }

    const members = getInitialFamilyMembers(user.id, user.name);
    setFamilyMembers(members);

    const userKey = `${ACTIVE_MEMBER_STORAGE_KEY}_${user.id}`;
    const saved = localStorage.getItem(userKey) || localStorage.getItem(ACTIVE_MEMBER_STORAGE_KEY);
    let resolvedMember: FamilyMember | null = null;

    if (saved) {
      try {
        const parsed: FamilyMember = JSON.parse(saved);
        const match = members.find((m) => m.id === parsed.id);
        if (match) {
          resolvedMember = match;
        }
      } catch {
        // ignore JSON parse error
      }
    }

    // Default to Parent role if no valid member is cached
    if (!resolvedMember) {
      resolvedMember = members.find((m) => m.role === 'Parent') || members[0] || null;
    }

    setActiveMemberState(resolvedMember);
    if (resolvedMember) {
      try {
        localStorage.setItem(userKey, JSON.stringify(resolvedMember));
        localStorage.setItem(ACTIVE_MEMBER_STORAGE_KEY, JSON.stringify(resolvedMember));
      } catch {
        // ignore storage error
      }
    }
  }, [user?.id]);

  const setActiveMember = (member: FamilyMember | null) => {
    setActiveMemberState(member);
    if (user?.id && member) {
      const userKey = `${ACTIVE_MEMBER_STORAGE_KEY}_${user.id}`;
      try {
        localStorage.setItem(userKey, JSON.stringify(member));
        localStorage.setItem(ACTIVE_MEMBER_STORAGE_KEY, JSON.stringify(member));
      } catch {
        // ignore
      }
    } else if (!member) {
      localStorage.removeItem(ACTIVE_MEMBER_STORAGE_KEY);
      if (user?.id) localStorage.removeItem(`${ACTIVE_MEMBER_STORAGE_KEY}_${user.id}`);
    }
  };

  const switchMember = (memberId: string) => {
    const target = familyMembers.find((m) => m.id === memberId);
    if (target) {
      setActiveMember(target);
    }
  };

  const toggleRole = () => {
    if (isChild) {
      const parent = familyMembers.find((m) => m.role === 'Parent');
      if (parent) setActiveMember(parent);
    } else {
      const child = familyMembers.find((m) => m.role === 'Child');
      if (child) setActiveMember(child);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((r) => setTimeout(r, 200));

    const normalizedEmail = email.trim().toLowerCase();
    const users = getInitialUsers();
    const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!found) {
      return { success: false, error: 'No account found with this email address.' };
    }

    if (found.password !== password) {
      return { success: false, error: 'Incorrect password. Try password123 for demo accounts.' };
    }

    const session: UserSession = {
      id: found.id,
      name: found.name,
      email: found.email,
      avatar: found.avatar || found.name.slice(0, 2).toUpperCase(),
      currency_code: found.currency_code || 'INR',
      currency_symbol: found.currency_symbol || '₹',
    };

    setUser(session);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true };
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    await new Promise((r) => setTimeout(r, 200));

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { success: false, error: 'Name is required.' };
    }
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const users = getInitialUsers();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const initials = trimmedName
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name: trimmedName,
      email: normalizedEmail,
      password,
      avatar: initials,
      currency_code: 'INR',
      currency_symbol: '₹',
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

    const session: UserSession = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      currency_code: 'INR',
      currency_symbol: '₹',
    };

    setUser(session);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_MEMBER_STORAGE_KEY);
    if (user?.id) {
      localStorage.removeItem(`${ACTIVE_MEMBER_STORAGE_KEY}_${user.id}`);
    }
    setUser(null);
    setActiveMemberState(null);
    setFamilyMembers([]);
  };

  const demoUsersList: DemoUserOption[] = [
    {
      email: 'user1@demo.com',
      name: 'Alex Morgan',
      role: 'Personal Finances',
      password: 'password123',
      currency_code: 'INR',
      currency_symbol: '₹',
      currency: 'INR (₹)',
    },
    {
      email: 'user2@demo.com',
      name: 'Sarah Chen',
      role: 'Business & Freelance',
      password: 'password123',
      currency_code: 'INR',
      currency_symbol: '₹',
      currency: 'INR (₹)',
    },
  ];

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        demoUsers: demoUsersList,
        activeMember,
        setActiveMember,
        isChild,
        familyMembers,
        switchMember,
        toggleRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
