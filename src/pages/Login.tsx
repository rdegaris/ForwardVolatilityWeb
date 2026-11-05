import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { apiLogin } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiLogin({ email, password });
      login(res.token, res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
      <div className="w-full max-w-md desk-surface rounded-2xl p-8 md:p-10">
        <div className="mb-7">
          <div className="text-xs font-mono text-desk-muted">OzCTA account</div>
          <h1 className="mt-1.5 text-2xl font-semibold text-desk-text tracking-tight">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-desk-secondary">
            Access daily strategy scans, session charts, and execution logs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="desk-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-desk-secondary">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-desk-muted hover:text-desk-text">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="desk-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-desk-down/10 border border-desk-down/30 px-3.5 py-2.5 text-xs text-desk-down">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="desk-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-desk-muted">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-desk-text hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
