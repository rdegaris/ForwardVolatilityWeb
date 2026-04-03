import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { apiCreatePassword } from '../lib/api';

export default function CreatePassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!emailParam || !tokenParam) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Invalid Link</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            This password creation link is missing required information. Please check
            your email for the correct link.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await apiCreatePassword({
        email: emailParam,
        token: tokenParam,
        password,
      });
      login(res.token, res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-fuchsia-700 shadow-xl">
          {/* Decorative blobs */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
          </div>

          <div className="relative px-8 py-12 md:px-12 md:py-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-white/80 shadow-sm mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Almost There
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Create Your Password
              </h1>
              <p className="mt-3 text-sm text-indigo-100/80">
                Choose a strong password for <span className="font-semibold text-white">{emailParam}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                required
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition"
              />
              <input
                type="password"
                required
                placeholder="Confirm Password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                className="w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition"
              />

              {error && (
                <div className="rounded-xl bg-rose-500/20 border border-rose-400/30 px-4 py-3 text-sm text-rose-100 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-white text-indigo-700 shadow-lg hover:shadow-xl hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60 transition"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting password…
                  </span>
                ) : (
                  'Set Password & Log In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
