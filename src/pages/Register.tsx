import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { apiRegister } from '../lib/api';
import { ChartLineIcon, ClockIcon, MailIcon, SlidersIcon } from '../components/Icons';

export default function Register() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', professional: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
        <div className="w-full max-w-md desk-surface rounded-2xl p-8 md:p-10 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl desk-well text-desk-text">
            <MailIcon className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-semibold text-desk-text">Check your email</h1>
          <p className="mt-2.5 text-sm text-desk-secondary leading-relaxed">
            We sent a verification link to <span className="font-medium text-desk-text">{form.email}</span> to set your password and activate access.
          </p>
          <p className="mt-6 text-xs text-desk-muted">
            Did not receive the message? Check spam or{' '}
            <button onClick={() => setSubmitted(false)} className="underline text-desk-text hover:text-desk-secondary">
              try again
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRegister(form);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
      <div className="w-full max-w-2xl">
        <div className="desk-surface rounded-2xl p-6 md:p-10">
          <div className="max-w-xl">
            <div className="text-xs font-mono text-desk-muted">Complimentary research access</div>
            <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
              Create an OzCTA account
            </h1>
            <p className="mt-2 text-sm text-desk-secondary leading-relaxed">
              Register to inspect full systematic futures signals, session-stamped setups, and the live $100,000 model execution ledger.
            </p>
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            {[
              { Icon: ChartLineIcon, title: 'Performance ledger', desc: 'Contract-level P&L, drawdowns, and net friction' },
              { Icon: ClockIcon, title: 'Session scans', desc: 'Globex 60m, 15m, and daily settlement triggers' },
              { Icon: SlidersIcon, title: 'Risk ladders', desc: 'Exact entry, stop, and target levels per setup' },
            ].map((f) => (
              <div key={f.title} className="desk-well rounded-xl p-4">
                <f.Icon className="w-4 h-4 text-desk-secondary" />
                <div className="mt-2.5 text-xs font-semibold text-desk-text">{f.title}</div>
                <div className="mt-1 text-xs text-desk-muted leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                  First name *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="desk-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                  Last name *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="desk-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                  Email address *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@domain.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="desk-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="desk-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                Investor classification *
              </label>
              <select
                required
                value={form.professional}
                onChange={(e) => setForm({ ...form, professional: e.target.value })}
                className="desk-input w-full px-3.5 py-2.5 text-sm"
              >
                <option value="" disabled>Select classification…</option>
                <option value="yes">Investment professional / allocator</option>
                <option value="no">Individual / self-directed trader</option>
                <option value="student">Academic / quantitative researcher</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg bg-desk-down/10 border border-desk-down/30 px-3.5 py-2.5 text-xs text-desk-down">
                {error}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-desk-muted max-w-sm">
                By registering you agree to receive occasional research notes from OzCTA. Unsubscribe anytime.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="desk-btn-primary px-6 py-2.5 text-sm shrink-0 disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-desk-muted">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-desk-text hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
