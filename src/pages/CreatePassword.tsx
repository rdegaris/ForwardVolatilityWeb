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
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
        <div className="max-w-md desk-surface rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold text-desk-text">Invalid setup link</h1>
          <p className="mt-2 text-sm text-desk-secondary">
            This password link is missing required verification parameters. Check your email for the original link.
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
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
      <div className="w-full max-w-md desk-surface rounded-2xl p-8 md:p-10">
        <div className="mb-7">
          <div className="text-xs font-mono text-desk-muted">Account activation</div>
          <h1 className="mt-1.5 text-2xl font-semibold text-desk-text tracking-tight">
            Set your password
          </h1>
          <p className="mt-1.5 text-sm text-desk-secondary">
            Choose a password for <span className="font-medium text-desk-text">{emailParam}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Password (minimum 8 characters)
            </label>
            <input
              type="password"
              required
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="desk-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              required
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
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
            {loading ? 'Setting password…' : 'Set password & sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
