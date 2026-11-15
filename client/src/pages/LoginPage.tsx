import { useState, type FormEvent } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface Props {
  initialTab?: 'login' | 'signup';
}

export default function LoginPage({ initialTab = 'login' }: Props) {
  const { login, signup, demoUsers } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Common UI states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTabSwitch = (newTab: 'login' | 'signup') => {
    setTab(newTab);
    setError(null);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (!res.success) {
        setError(res.error || 'Invalid email or password.');
      }
    } catch {
      setError('An unexpected error occurred while logging in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await signup(signupName, signupEmail, signupPassword);
      if (!res.success) {
        setError(res.error || 'Failed to create account.');
      }
    } catch {
      setError('An unexpected error occurred while creating your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, 'password123');
      if (!res.success) {
        setError(res.error || 'Failed to sign in to demo account.');
      }
    } catch {
      setError('An error occurred during demo sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-surface border border-border rounded-[24px] shadow-(--shadow-card) p-7 sm:p-9">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-[18px] bg-accent-soft border border-border flex items-center justify-center mb-4">
              <img
                src="/budget-tracker-logo.png"
                alt="Monexa Logo"
                className="w-9 h-9 object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-text-primary">
              {tab === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              {tab === 'login'
                ? 'Sign in to access your personal finances & budgets'
                : 'Start tracking your finances with your own workspace'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 mb-6 bg-bg border border-border rounded-[14px]">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={[
                'py-2 text-xs font-bold rounded-[11px] transition-all cursor-pointer border-0',
                tab === 'login'
                  ? 'bg-surface text-accent shadow-xs'
                  : 'bg-transparent text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('signup')}
              className={[
                'py-2 text-xs font-bold rounded-[11px] transition-all cursor-pointer border-0',
                tab === 'signup'
                  ? 'bg-surface text-accent shadow-xs'
                  : 'bg-transparent text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              Sign Up
            </button>
          </div>

          {/* Quick Demo Sign-In Buttons */}
          <div className="mb-6 p-4 rounded-[18px] bg-accent-soft/70 border border-blue-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent mb-2.5">
              <Sparkles size={14} />
              <span>Quick Demo Access</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers && demoUsers.length >= 2 ? (
                demoUsers.map((demo, idx) => (
                  <button
                    key={demo.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin(demo.email)}
                    className="flex flex-col text-left p-2.5 rounded-[12px] bg-surface border border-border hover:border-accent hover:shadow-xs transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-text-primary group-hover:text-accent flex items-center justify-between">
                      <span>Demo User {idx + 1}</span>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">{demo.name}</div>
                    <div className="text-[10px] text-accent/80 font-mono mt-0.5">
                      {demo.role.includes('Personal') ? 'Personal' : 'Business'} · INR (₹)
                    </div>
                  </button>
                ))
              ) : (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin('user1@demo.com')}
                    className="flex flex-col text-left p-2.5 rounded-[12px] bg-surface border border-border hover:border-accent hover:shadow-xs transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-text-primary group-hover:text-accent flex items-center justify-between">
                      <span>Demo User 1</span>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">Alex Morgan</div>
                    <div className="text-[10px] text-accent/80 font-mono mt-0.5">Personal · INR (₹)</div>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin('user2@demo.com')}
                    className="flex flex-col text-left p-2.5 rounded-[12px] bg-surface border border-border hover:border-accent hover:shadow-xs transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-text-primary group-hover:text-accent flex items-center justify-between">
                      <span>Demo User 2</span>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">Sarah Chen</div>
                    <div className="text-[10px] text-accent/80 font-mono mt-0.5">Business · INR (₹)</div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-[14px] bg-red-50 border border-red-200 text-expense text-xs leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-subtle">
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user1@demo.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-text-muted">
                    Password
                  </label>
                  <span className="text-[11px] text-text-subtle">Demo: password123</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-subtle">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-10 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-subtle hover:text-text-primary border-0 bg-transparent cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 px-4 rounded-[14px] bg-accent text-white font-bold text-sm cursor-pointer shadow-[0_8px_20px_color-mix(in_srgb,#2563eb_34%,transparent)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <UserCheck size={17} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-subtle">
                    <User size={17} />
                  </div>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. David Miller"
                    autoComplete="name"
                    required
                    className="w-full pl-10 pr-4 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-subtle">
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="david@example.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-subtle">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-10 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-subtle hover:text-text-primary border-0 bg-transparent cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-subtle">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-4 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-[12px] bg-emerald-50 text-[11px] text-emerald-800 border border-emerald-100">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Your financial data is private and scoped to your account in INR (₹).</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-3 px-4 rounded-[14px] bg-accent text-white font-bold text-sm cursor-pointer shadow-[0_8px_20px_color-mix(in_srgb,#2563eb_34%,transparent)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Toggle Tab link at bottom */}
          <div className="mt-6 pt-5 border-t border-border text-center">
            {tab === 'login' ? (
              <p className="text-xs text-text-muted">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signup')}
                  className="font-bold text-accent hover:underline bg-transparent border-0 cursor-pointer p-0"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('login')}
                  className="font-bold text-accent hover:underline bg-transparent border-0 cursor-pointer p-0"
                >
                  Sign in instead
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footnote */}
        <div className="text-center mt-6 text-xs text-text-subtle">
          Monexa Client Finance &bull; Private & Secure Workspace &bull; INR (₹)
        </div>
      </div>
    </div>
  );
}
