import { useState, type FormEvent } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface Props {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: Props) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await signup(name, email, password);
      if (!res.success) {
        setError(res.error || 'Failed to create account.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
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
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-14 h-14 rounded-[18px] bg-accent-soft border border-border flex items-center justify-center mb-4">
              <img
                src="/budget-tracker-logo.png"
                alt="Monexa Logo"
                className="w-9 h-9 object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-text-primary">
              Create your account
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              Start managing your personal finances in complete privacy
            </p>
          </div>

          {/* Privacy badge */}
          <div className="mb-6 p-3 rounded-[14px] bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-800">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span>All your accounts and budgets are private to your user ID.</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-[14px] bg-red-50 border border-red-200 text-expense text-xs leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-10 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-subtle hover:text-text-primary border-0 bg-transparent cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-4 py-2.75 rounded-[13px] bg-bg/50 border border-border text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 transition-all"
                />
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
                  <span>Create Account</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-7 pt-5 border-t border-border text-center">
            <p className="text-xs text-text-muted">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-bold text-accent hover:underline bg-transparent border-0 cursor-pointer p-0"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Footnote */}
        <div className="text-center mt-6 text-xs text-text-subtle">
          Monexa Client Finance &bull; Private & Secure Workspace
        </div>
      </div>
    </div>
  );
}

