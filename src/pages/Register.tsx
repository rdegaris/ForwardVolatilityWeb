import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegistration } from '../lib/registrationContext';

export default function Register() {
  const navigate = useNavigate();
  const { isRegistered, register } = useRegistration();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', professional: '' });
  const [loading, setLoading] = useState(false);

  /* If already registered, send straight to the fund page */
  if (isRegistered) {
    navigate('/fund', { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission — replace with a real endpoint
    setTimeout(() => {
      setLoading(false);
      register(form);
      navigate('/fund');
    }, 1200);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="w-full max-w-3xl">

        {/* ── Hero card ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-fuchsia-700 shadow-xl">
          {/* Decorative blobs */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[28rem] w-[28rem] rounded-full bg-teal-400/5 blur-3xl" />
          </div>

          <div className="relative px-6 py-12 md:px-14 md:py-16 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-white/80 shadow-sm mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Free Access
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Get the Full Picture!
            </h1>
            <p className="mt-4 text-base md:text-lg text-indigo-100/90 max-w-2xl mx-auto leading-relaxed">
              Register now to see detailed analysis of every strategy, and gain
              access to the complete OzCTA database where you can:
            </p>

            {/* Feature cards */}
            <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {[
                { icon: '📊', title: 'Performance Data', desc: 'Full returns, drawdowns & research reports' },
                { icon: '🔔', title: 'Trade Signals', desc: 'Daily scanner alerts across all strategies' },
                { icon: '📈', title: 'Watchlists & Trades', desc: 'Build watchlists & track open positions' },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-4 text-left"
                >
                  <span className="text-2xl">{f.icon}</span>
                  <div className="mt-2 text-sm font-bold text-white">{f.title}</div>
                  <div className="mt-0.5 text-xs text-indigo-100/70 leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* ── Registration form ── */}
            <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-xl text-left">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="First Name *"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition"
                />
                <input
                  type="text"
                  required
                  placeholder="Last Name *"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition"
                />
                <input
                  type="email"
                  required
                  placeholder="Email *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition"
                />
              </div>
              <select
                required
                value={form.professional}
                onChange={(e) => setForm({ ...form, professional: e.target.value })}
                className="mt-3 w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition appearance-none"
              >
                <option value="" disabled className="text-slate-900">Are you an investment professional? *</option>
                <option value="yes" className="text-slate-900">Yes — I manage money professionally</option>
                <option value="no" className="text-slate-900">No — I'm an individual / retail trader</option>
                <option value="student" className="text-slate-900">Student / learning about systematic trading</option>
              </select>

              <div className="mt-6 text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-12 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-white text-indigo-700 shadow-lg hover:shadow-xl hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60 transition"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting…
                    </span>
                  ) : (
                    'Register Now'
                  )}
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-indigo-200/50 max-w-md mx-auto">
                By registering you agree to receive occasional updates from @OzCTA.
                You may unsubscribe at any time. We respect your privacy.
              </p>
            </form>
          </div>
        </div>

        {/* Already have access? */}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered?{' '}
          <Link to="/fund" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Go to Fund Profile →
          </Link>
        </p>
      </div>
    </div>
  );
}
