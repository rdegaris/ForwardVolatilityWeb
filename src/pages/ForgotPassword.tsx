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
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-fuchsia-700 shadow-xl">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
          </div>

          <div className="relative px-8 py-12 md:px-12 md:py-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-white/80 shadow-sm mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Password Recovery
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Reset Password
              </h1>
              <p className="mt-3 text-sm text-indigo-100/80">
                Enter your email and we’ll send you a secure password reset link.
              </p>
            </div>

            {submitted ? (
              <div className="space-y-5 text-center">
                <div className="rounded-xl bg-white/10 border border-white/15 px-5 py-4 text-sm text-indigo-50 leading-relaxed">
                  If an account exists for <span className="font-semibold text-white">{email}</span>, a reset link is on the way.
                </div>
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 transition">
                  Back To Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  {loading ? 'Sending reset link…' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-indigo-200/60">
              Remembered it?{' '}
              <Link to="/login" className="font-semibold text-white hover:underline">
                Return to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}