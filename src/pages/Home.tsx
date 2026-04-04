import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTodayDatePacific } from '../lib/dateUtils';
import { fetchJson } from '../lib/http';
import type {
  TurtleOpenTradesPayload,
  TurtleSignalsPayload,
  TurtleSuggestedTradesPayload,
} from '../types/turtle';

/* ------------------------------------------------------------------ */
/*  Type declarations for each scanner feed                           */
/* ------------------------------------------------------------------ */

type ForwardVolOpportunity = {
  ticker: string;
  price: number;
  best_ff: number;
  expiry1: string;
  expiry2: string;
  dte1: number;
  dte2: number;
  next_earnings?: string | null;
  trade_details?: {
    spread_type: string;
    strike: number;
    net_debit: number;
    ff_display: number;
    typical_case: number;
    typical_case_pct: number;
  };
};

type ForwardVolScan = {
  date: string;
  timestamp: string;
  opportunities: ForwardVolOpportunity[];
};

type EarningsCrushOpportunity = {
  ticker: string;
  price: number;
  earnings_date: string;
  days_to_earnings: number;
  iv: number;
  expected_move_pct: number;
  recommendation: string;
  suggested_trade?: {
    strike: number;
    sell_expiration: string;
    buy_expiration: string;
    net_credit?: number;
  };
};

type EarningsCrushScan = {
  date: string;
  timestamp: string;
  total_scanned?: number;
  opportunities: EarningsCrushOpportunity[];
};

type PreEarningsStraddleOpportunity = {
  ticker: string;
  price: number;
  earnings_date: string;
  days_to_earnings: number;
  expiry: string;
  expiry_dte: number;
  expiry_is_monthly: boolean;
  strike: number;
  implied_move_pct: number;
  recommendation: string;
};

type PreEarningsStraddlesScan = {
  date: string;
  timestamp: string;
  universe_size: number;
  earnings_found: number;
  candidates_scanned: number;
  opportunities: PreEarningsStraddleOpportunity[];
  summary?: {
    total_opportunities: number;
    total_candidate: number;
    total_watch: number;
    total_pass: number;
  };
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatPct(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

function safeDateLabel(yyyymmdd?: string | null) {
  if (!yyyymmdd) return '—';
  try {
    return new Date(yyyymmdd + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return yyyymmdd;
  }
}

/* ------------------------------------------------------------------ */
/*  Reusable tiny components                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white/60 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm hover:shadow-md transition">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Homepage                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [nasdaq100, setNasdaq100] = useState<ForwardVolScan | null>(null);
  const [midcap400, setMidcap400] = useState<ForwardVolScan | null>(null);
  const [earningsCrush, setEarningsCrush] = useState<EarningsCrushScan | null>(null);
  const [preEarnings, setPreEarnings] = useState<PreEarningsStraddlesScan | null>(null);
  const [turtleSignals, setTurtleSignals] = useState<TurtleSignalsPayload | null>(null);
  const [turtleOpen, setTurtleOpen] = useState<TurtleOpenTradesPayload | null>(null);
  const [turtleSuggested, setTurtleSuggested] =
    useState<TurtleSuggestedTradesPayload | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          fetchJson<ForwardVolScan>('/data/nasdaq100_results_latest.json', { cache: 'no-store' }),
          fetchJson<ForwardVolScan>('/data/midcap400_results_latest.json', { cache: 'no-store' }),
          fetchJson<EarningsCrushScan>('/data/earnings_crush_latest.json', { cache: 'no-store' }),
          fetchJson<PreEarningsStraddlesScan>('/data/pre_earnings_straddle_latest.json', {
            cache: 'no-store',
          }),
          fetchJson<TurtleSignalsPayload>('/data/turtle_signals_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleOpenTradesPayload>('/data/turtle_open_trades_latest.json', {
            cache: 'no-store',
          }),
          fetchJson<TurtleSuggestedTradesPayload>('/data/turtle_suggested_latest.json', {
            cache: 'no-store',
          }),
        ]);

        const [n100, m400, ec, pe, ts, to2, tSug] = results;
        if (n100.status === 'fulfilled') setNasdaq100(n100.value);
        if (m400.status === 'fulfilled') setMidcap400(m400.value);
        if (ec.status === 'fulfilled') setEarningsCrush(ec.value);
        if (pe.status === 'fulfilled') setPreEarnings(pe.value);
        if (ts.status === 'fulfilled') setTurtleSignals(ts.value);
        if (to2.status === 'fulfilled') setTurtleOpen(to2.value);
        if (tSug.status === 'fulfilled') setTurtleSuggested(tSug.value);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* derived data ------------------------------------------------------- */

  const forwardVolTop = useMemo(() => {
    const n = (nasdaq100?.opportunities || []).map((o) => ({ ...o, universe: 'N100' as const }));
    const m = (midcap400?.opportunities || []).map((o) => ({ ...o, universe: 'M400' as const }));
    return [...n, ...m].sort((a, b) => b.best_ff - a.best_ff).slice(0, 5);
  }, [nasdaq100, midcap400]);

  const earningsRecommended = useMemo(() => {
    return (earningsCrush?.opportunities || [])
      .filter((o) => o.recommendation === 'RECOMMENDED')
      .slice(0, 5);
  }, [earningsCrush]);

  const preEarningsTop = useMemo(() => {
    return (preEarnings?.opportunities || []).slice(0, 5);
  }, [preEarnings]);

  const turtleTriggered = turtleSignals?.triggered || [];
  const turtleTriggeredEligible = turtleTriggered.filter((t) => t.eligible !== false);

  const todayStr = getTodayDatePacific().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

  const todayShort = getTodayDatePacific().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ──────────────── HERO ──────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/50 shadow-lg border border-slate-200/70 dark:border-slate-800/60 backdrop-blur">
        {/* Decorative background blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/2 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-teal-500/5 dark:from-indigo-400/10 dark:to-teal-400/10" />
        </div>

        <div className="relative px-6 py-8 md:px-10 md:py-10">
          {/* Top row: badge + date */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/30 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dashboard
              <span className="h-1 w-1 rounded-full bg-slate-400/70" />
              {todayShort}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{todayStr}</div>
          </div>

          {/* Headline */}
          <div className="mt-6 w-full text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.15]">
              <span className="bg-gradient-to-r from-indigo-600 via-teal-500 to-fuchsia-500 dark:from-indigo-400 dark:via-teal-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                OzCTA
              </span>
            </h1>
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              A registered Commodity Trading Advisor specialising in actively managed futures accounts.
              Futures strategies are fully managed — options trade ideas are provided as suggestions only.
              All trading involves risk; past performance is not indicative of future results.
            </p>
          </div>

          {/* Quick-nav strategy pills */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {([
              {
                label: 'Forward Vol',
                desc: 'Calendar spreads',
                to: '/trade-tracker',
                dot: 'bg-indigo-500',
                hover: 'hover:border-indigo-300 dark:hover:border-indigo-700',
                text: 'text-indigo-700 dark:text-indigo-300',
              },
              {
                label: 'Earnings Crush',
                desc: 'IV crush setups',
                to: '/earnings-crush',
                dot: 'bg-teal-500',
                hover: 'hover:border-teal-300 dark:hover:border-teal-700',
                text: 'text-teal-700 dark:text-teal-300',
              },
              {
                label: 'Earnings Ramp',
                desc: 'Long straddles',
                to: '/pre-earnings',
                dot: 'bg-amber-500',
                hover: 'hover:border-amber-300 dark:hover:border-amber-700',
                text: 'text-amber-700 dark:text-amber-300',
              },
              {
                label: 'Trendorama',
                desc: 'Breakout signals',
                to: '/turtle',
                dot: 'bg-fuchsia-500',
                hover: 'hover:border-fuchsia-300 dark:hover:border-fuchsia-700',
                text: 'text-fuchsia-700 dark:text-fuchsia-300',
              },
              {
                label: 'Grail Trade',
                desc: 'EMA pullbacks',
                to: '/grail',
                dot: 'bg-orange-500',
                hover: 'hover:border-orange-300 dark:hover:border-orange-700',
                text: 'text-orange-700 dark:text-orange-300',
              },
            ]).map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={`group rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-4 py-3 shadow-sm hover:shadow-md transition-all ${s.hover}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:translate-x-0.5 transition-transform">
                  {s.desc} →
                </div>
              </Link>
            ))}
          </div>

          {/* Summary stat bar */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Forward Vol Picks"
              value={forwardVolTop.length}
              sub="NASDAQ 100 + MidCap 400"
              accent="text-indigo-700 dark:text-indigo-300"
            />
            <StatCard
              label="Earnings Crush"
              value={earningsRecommended.length}
              sub="RECOMMENDED setups"
              accent="text-teal-700 dark:text-teal-300"
            />
            <StatCard
              label="Pre-Earnings"
              value={preEarnings?.summary?.total_watch ?? preEarningsTop.length}
              sub="WATCH / CANDIDATE"
              accent="text-amber-700 dark:text-amber-300"
            />
            <StatCard
              label="Trendorama Triggers"
              value={turtleTriggered.length}
              sub={`${turtleTriggeredEligible.length} eligible`}
              accent="text-fuchsia-700 dark:text-fuchsia-300"
            />
          </div>
        </div>
      </div>

      {/* ──────────────── STRATEGY DETAIL CARDS (Row 1) ──────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Forward Vol */}
        <div className="rounded-xl shadow-sm border border-indigo-200/60 dark:border-indigo-800/40 bg-gradient-to-br from-white/85 to-indigo-50/35 dark:from-slate-900/55 dark:to-indigo-950/15 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/60 dark:bg-indigo-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-200">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Forward Vol
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Top calendar opportunities</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/nasdaq100" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">N100</Link>
                <Link to="/midcap400" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition">M400</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Latest: N100 {nasdaq100?.date || '—'} · M400 {midcap400?.date || '—'}
            </div>
          </div>

          <div className="p-6 flex-1">
            {forwardVolTop.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No forward-vol opportunities found.</p>
            ) : (
              <div className="space-y-3">
                {forwardVolTop.map((o, i) => (
                  <div key={`${o.ticker}-${i}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {o.ticker}{' '}
                          <span className="text-xs font-sans text-slate-500 dark:text-slate-400">({o.universe})</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          ${o.price.toFixed(2)} · {o.expiry1} / {o.expiry2} ({o.dte1}/{o.dte2}&nbsp;DTE)
                        </div>
                        {o.next_earnings && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Earnings: {safeDateLabel(o.next_earnings)}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                          {(o.best_ff * 100).toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">FF</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/trade-tracker" className="px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">
                Open Calendars →
              </Link>
              <Link to="/iv-rankings" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition">
                IV Rankings
              </Link>
              <Link to="/calculator" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition">
                Calculator
              </Link>
            </div>
          </div>
        </div>

        {/* Trendorama */}
        <div className="rounded-xl shadow-sm border border-fuchsia-200/60 dark:border-fuchsia-800/40 bg-gradient-to-br from-white/85 to-fuchsia-50/30 dark:from-slate-900/55 dark:to-fuchsia-950/15 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-fuchsia-200/60 dark:border-fuchsia-800/40 bg-fuchsia-50/60 dark:bg-fuchsia-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-200">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
                  Trendorama
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Breakout signals</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/turtle" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition">Signals</Link>
                <Link to="/turtle/open-trades" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-fuchsia-800 dark:text-fuchsia-200 border border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:bg-fuchsia-100/60 dark:hover:bg-fuchsia-900/30 transition">Trades</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Latest: {turtleSignals?.date || turtleOpen?.date || turtleSuggested?.date || '—'}
            </div>
          </div>

          <div className="p-6 flex-1">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Triggered" value={turtleTriggered.length} sub={`${turtleTriggeredEligible.length} eligible`} accent="text-fuchsia-700 dark:text-fuchsia-300" />
              <StatCard label="Open Trades" value={turtleOpen?.open_trades?.length ?? 0} sub="front-month positions" accent="text-fuchsia-700 dark:text-fuchsia-300" />
            </div>

            {turtleTriggered.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No breakouts triggered on the latest bar.</p>
            ) : (
              <div className="space-y-2">
                {turtleTriggered.slice(0, 4).map((t, i) => (
                  <div key={`${t.symbol}-${i}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {t.symbol}{' '}
                          <span className="text-xs font-sans text-slate-500 dark:text-slate-400">{t.side.toUpperCase()}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          Entry {t.entry_stop} · Stop {t.stop_loss}
                        </div>
                        {t.blocked_reason ? (
                          <div className="text-xs text-rose-600 dark:text-rose-300">Blocked: {t.blocked_reason}</div>
                        ) : (
                          <div className="text-xs text-emerald-600 dark:text-emerald-300">Eligible ✓</div>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400 shrink-0">{t.asof}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/turtle/triggers" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-fuchsia-800 dark:text-fuchsia-200 border border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:bg-fuchsia-100/60 dark:hover:bg-fuchsia-900/30 transition">
                Triggers Soon
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── Row 2: Earnings strategies ──────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Crush */}
        <div className="rounded-xl shadow-sm border border-teal-200/60 dark:border-teal-800/40 bg-gradient-to-br from-white/85 to-teal-50/25 dark:from-slate-900/55 dark:to-teal-950/15 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-teal-200/60 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-200">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  Earnings Crush
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">IV crush setups</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/earnings-crush" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition">Scanner</Link>
                <Link to="/earnings-crush/trades" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-teal-800 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800/40 hover:bg-teal-100/60 dark:hover:bg-teal-900/30 transition">Trades</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Latest: {earningsCrush?.date || '—'}</div>
          </div>

          <div className="p-6 flex-1">
            {earningsRecommended.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No RECOMMENDED earnings crush plays today.</p>
            ) : (
              <div className="space-y-3">
                {earningsRecommended.map((o, i) => (
                  <div key={`${o.ticker}-${i}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{o.ticker}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          ${o.price.toFixed(2)} · earnings {safeDateLabel(o.earnings_date)} ({o.days_to_earnings}d)
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Expected move: ±{formatPct(o.expected_move_pct)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-teal-700 dark:text-teal-300">{o.iv.toFixed(1)}%</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">IV</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pre-Earnings Straddles */}
        <div className="rounded-xl shadow-sm border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-white/85 to-amber-50/25 dark:from-slate-900/55 dark:to-amber-950/15 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Earnings Ramp
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Long straddles (entry window)</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/pre-earnings" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition">Opportunities</Link>
                <Link to="/pre-earnings/open-trades" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition">Trades</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Latest: {preEarnings ? `${preEarnings.date} · universe ${preEarnings.universe_size} · scanned ${preEarnings.candidates_scanned}` : '—'}
            </div>
          </div>

          <div className="p-6 flex-1">
            {preEarningsTop.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No opportunities in the entry window.</p>
            ) : (
              <div className="space-y-3">
                {preEarningsTop.map((o, i) => (
                  <div key={`${o.ticker}-${i}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {o.ticker}{' '}
                          <span className={`text-xs font-sans px-1.5 py-0.5 rounded-full ${
                            o.recommendation === 'CANDIDATE'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                              : o.recommendation === 'WATCH'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {o.recommendation}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          ${o.price.toFixed(2)} · earnings {safeDateLabel(o.earnings_date)} ({o.days_to_earnings}d)
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Exp {safeDateLabel(o.expiry)} · ±{formatPct(o.implied_move_pct)} implied
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        {o.expiry_dte} DTE
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── QUICK LINKS FOOTER ──────────────── */}
      <div className="rounded-xl bg-white/80 dark:bg-slate-900/50 shadow-sm border border-slate-200/70 dark:border-slate-800/60 backdrop-blur p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {([
            { label: 'Trade Tracker', to: '/trade-tracker', color: 'text-indigo-700 dark:text-indigo-300' },
            { label: 'NASDAQ 100 Scan', to: '/nasdaq100', color: 'text-indigo-700 dark:text-indigo-300' },
            { label: 'MidCap 400 Scan', to: '/midcap400', color: 'text-indigo-700 dark:text-indigo-300' },
            { label: 'IV Rankings', to: '/iv-rankings', color: 'text-indigo-700 dark:text-indigo-300' },
            { label: 'Calculator', to: '/calculator', color: 'text-indigo-700 dark:text-indigo-300' },
            { label: 'Earnings Crush', to: '/earnings-crush', color: 'text-teal-700 dark:text-teal-300' },
            { label: 'Crush Trades', to: '/earnings-crush/trades', color: 'text-teal-700 dark:text-teal-300' },
            { label: 'Pre-Earnings', to: '/pre-earnings', color: 'text-amber-700 dark:text-amber-300' },
            { label: 'Pre-Earnings Trades', to: '/pre-earnings/open-trades', color: 'text-amber-700 dark:text-amber-300' },
            { label: 'Trendorama Signals', to: '/turtle', color: 'text-fuchsia-700 dark:text-fuchsia-300' },
            { label: 'Trendorama Trades', to: '/turtle/open-trades', color: 'text-fuchsia-700 dark:text-fuchsia-300' },
            { label: 'Grail Trade', to: '/grail', color: 'text-orange-700 dark:text-orange-300' },
          ]).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/20 px-4 py-3 text-sm font-semibold ${link.color} hover:shadow-md transition`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
