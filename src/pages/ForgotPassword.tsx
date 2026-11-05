import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiForgotPassword } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiForgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
      <div className="w-full max-w-md desk-surface rounded-2xl p-8 md:p-10">
        <div className="mb-7">
          <div className="text-xs font-mono text-desk-muted">Password recovery</div>
          <h1 className="mt-1.5 text-2xl font-semibold text-desk-text tracking-tight">
            Reset password
          </h1>
          <p className="mt-1.5 text-sm text-desk-secondary">
            Enter your account email and we will send a password reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-5">
            <div className="desk-well rounded-xl px-4 py-3.5 text-xs text-desk-secondary leading-relaxed">
              If an account exists for <span className="font-medium text-desk-text">{email}</span>, a reset link has been dispatched.
            </div>
            <Link to="/login" className="desk-btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center">
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Sending reset link…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-desk-muted">
          Remembered your password?{' '}
          <Link to="/login" className="font-medium text-desk-text hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
