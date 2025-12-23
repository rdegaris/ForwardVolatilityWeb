import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTodayDatePacific } from '../lib/dateUtils';
import { fetchJson } from '../lib/http';
import type { TurtleOpenTradesPayload, TurtleSignalsPayload, TurtleSuggestedTradesPayload } from '../types/turtle';

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

function formatPct(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

function safeDateLabel(yyyymmdd?: string | null) {
  if (!yyyymmdd) return '—';
  try {
    return new Date(yyyymmdd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return yyyymmdd;
  }
}

function daysUntil(yyyymmdd?: string | null) {
  if (!yyyymmdd) return null;
  const today = getTodayDatePacific();
  const d = new Date(yyyymmdd + 'T00:00:00');
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [nasdaq100, setNasdaq100] = useState<ForwardVolScan | null>(null);
  const [midcap400, setMidcap400] = useState<ForwardVolScan | null>(null);
  const [earningsCrush, setEarningsCrush] = useState<EarningsCrushScan | null>(null);
  const [preEarnings, setPreEarnings] = useState<PreEarningsStraddlesScan | null>(null);
  const [turtleSignals, setTurtleSignals] = useState<TurtleSignalsPayload | null>(null);
  const [turtleOpen, setTurtleOpen] = useState<TurtleOpenTradesPayload | null>(null);
  const [turtleSuggested, setTurtleSuggested] = useState<TurtleSuggestedTradesPayload | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          fetchJson<ForwardVolScan>('/data/nasdaq100_results_latest.json', { cache: 'no-store' }),
          fetchJson<ForwardVolScan>('/data/midcap400_results_latest.json', { cache: 'no-store' }),
          fetchJson<EarningsCrushScan>('/data/earnings_crush_latest.json', { cache: 'no-store' }),
          fetchJson<PreEarningsStraddlesScan>('/data/pre_earnings_straddle_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleSignalsPayload>('/data/turtle_signals_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleOpenTradesPayload>('/data/turtle_open_trades_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleSuggestedTradesPayload>('/data/turtle_suggested_latest.json', { cache: 'no-store' }),
        ]);

        const [n100Res, m400Res, ecRes, peRes, tsRes, toRes, tSugRes] = results;
        if (n100Res.status === 'fulfilled') setNasdaq100(n100Res.value);
        if (m400Res.status === 'fulfilled') setMidcap400(m400Res.value);
        if (ecRes.status === 'fulfilled') setEarningsCrush(ecRes.value);
        if (peRes.status === 'fulfilled') setPreEarnings(peRes.value);
        if (tsRes.status === 'fulfilled') setTurtleSignals(tsRes.value);
        if (toRes.status === 'fulfilled') setTurtleOpen(toRes.value);
        if (tSugRes.status === 'fulfilled') setTurtleSuggested(tSugRes.value);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const forwardVolTop = useMemo(() => {
    const n = (nasdaq100?.opportunities || []).map(o => ({ ...o, universe: 'NASDAQ 100' as const }));
    const m = (midcap400?.opportunities || []).map(o => ({ ...o, universe: 'MidCap 400' as const }));
    return [...n, ...m].sort((a, b) => b.best_ff - a.best_ff).slice(0, 5);
  }, [nasdaq100, midcap400]);


  const earningsRecommended = useMemo(() => {
    const opps = earningsCrush?.opportunities || [];
    return opps.filter(o => o.recommendation === 'RECOMMENDED').slice(0, 5);
  }, [earningsCrush]);

  const preEarningsTop = useMemo(() => {
    const opps = preEarnings?.opportunities || [];
    return opps.slice(0, 5);
  }, [preEarnings]);

  const turtleTriggered = turtleSignals?.triggered || [];
  const turtleTriggeredEligible = turtleTriggered.filter(t => t.eligible !== false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-slate-600 dark:text-slate-300">Loading overview…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/50 rounded-2xl shadow-lg p-6 border border-slate-200/70 dark:border-slate-800/60 backdrop-blur">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-teal-500/5 dark:from-indigo-400/10 dark:to-teal-400/10" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Dashboard
              <span className="h-1 w-1 rounded-full bg-slate-400/70" />
              {getTodayDatePacific().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}
            </div>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Overview
            </h1>
            <p className="mt-2 text-slate-700 dark:text-slate-200">
              Your daily command center for signals, opportunities, and what needs attention.
            </p>
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'America/Los_Angeles',
            })}

            <div className="mt-3 flex justify-end">
              <Link
                to="/trade-tracker"
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Trade Tracker
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/nasdaq100"
            className="group rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-4 py-3 shadow-sm hover:shadow-md transition"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Forward Vol</div>
            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-800 dark:group-hover:text-indigo-200">Top calendars</div>
          </Link>

          <Link
            to="/earnings-crush"
            className="group rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-4 py-3 shadow-sm hover:shadow-md transition"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Earnings Crush</div>
            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-800 dark:group-hover:text-teal-200">Scanner</div>
          </Link>

          <Link
            to="/pre-earnings"
            className="group rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-4 py-3 shadow-sm hover:shadow-md transition"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Pre-Earnings</div>
            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-800 dark:group-hover:text-amber-200">Opportunities</div>
          </Link>

          <Link
            to="/turtle/signals"
            className="group rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-4 py-3 shadow-sm hover:shadow-md transition"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Trendorama</div>
            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-fuchsia-800 dark:group-hover:text-fuchsia-200">Signals</div>
          </Link>
        </div>

        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white/70 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm hover:shadow-md transition">
            <div className="text-slate-500 dark:text-slate-400">Forward Vol Top</div>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{forwardVolTop.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">from N100 + M400</div>
          </div>
          <div className="bg-white/70 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm hover:shadow-md transition">
            <div className="text-slate-500 dark:text-slate-400">Earnings Crush</div>
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{earningsRecommended.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">RECOMMENDED</div>
          </div>
          <div className="bg-white/70 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm hover:shadow-md transition">
            <div className="text-slate-500 dark:text-slate-400">Pre-Earnings</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{preEarnings?.summary?.total_watch ?? preEarningsTop.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">WATCH / CANDIDATE</div>
          </div>
          <div className="bg-white/70 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm hover:shadow-md transition">
            <div className="text-slate-500 dark:text-slate-400">Trendorama Triggers</div>
            <div className="text-2xl font-bold text-fuchsia-700 dark:text-fuchsia-300">{turtleTriggered.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">eligible: {turtleTriggeredEligible.length}</div>
          </div>
        </div>
      </div>

      {/* Strategy Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Forward Vol */}
        <div className="rounded-xl shadow-sm border border-indigo-200/60 dark:border-indigo-800/40 bg-gradient-to-br from-white/85 to-indigo-50/35 dark:from-slate-900/55 dark:to-indigo-950/15 backdrop-blur overflow-hidden">
          <div className="px-6 py-4 border-b border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/60 dark:bg-indigo-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-200">Forward Vol</div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">Calendar opportunities</div>
              </div>
              <div className="flex gap-2">
                <Link to="/nasdaq100" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
                  NASDAQ 100
                </Link>
                <Link to="/midcap400" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30">
                  MidCap 400
                </Link>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Latest: N100 {nasdaq100?.date || '—'} · M400 {midcap400?.date || '—'}
            </div>
          </div>

          <div className="p-6">
            {forwardVolTop.length === 0 ? (
              <div className="text-slate-600 dark:text-slate-300">No Forward Vol opportunities found.</div>
            ) : (
              <div className="space-y-3">
                {forwardVolTop.map((o, idx) => (
                  <div key={`${o.ticker}-${idx}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {o.ticker} <span className="text-xs font-sans text-slate-500 dark:text-slate-400">({o.universe})</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          ${o.price.toFixed(2)} · {o.expiry1} / {o.expiry2} ({o.dte1}/{o.dte2} DTE)
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Next earnings: {o.next_earnings || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{(o.best_ff * 100).toFixed(1)}%</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">FF</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/trade-tracker" className="px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
                View Open Calendars
              </Link>
              <Link to="/iv-rankings" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30">
                IV Rankings
              </Link>
            </div>
          </div>
        </div>

        {/* Trendorama */}
        <div className="rounded-xl shadow-sm border border-fuchsia-200/60 dark:border-fuchsia-800/40 bg-gradient-to-br from-white/85 to-fuchsia-50/30 dark:from-slate-900/55 dark:to-fuchsia-950/15 backdrop-blur overflow-hidden">
          <div className="px-6 py-4 border-b border-fuchsia-200/60 dark:border-fuchsia-800/40 bg-fuchsia-50/60 dark:bg-fuchsia-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-200">Trendorama</div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">System 2 signals</div>
              </div>
              <div className="flex gap-2">
                <Link to="/turtle/signals" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                  Signals
                </Link>
                <Link to="/turtle/open-trades" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-fuchsia-800 dark:text-fuchsia-200 border border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:bg-fuchsia-100/60 dark:hover:bg-fuchsia-900/30">
                  Open Trades
                </Link>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Latest: {turtleSignals?.date || turtleOpen?.date || turtleSuggested?.date || '—'}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                <div className="text-slate-500 dark:text-slate-400">Triggered</div>
                <div className="text-2xl font-bold text-fuchsia-700 dark:text-fuchsia-300">{turtleTriggered.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">eligible: {turtleTriggeredEligible.length}</div>
              </div>
              <div className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                <div className="text-slate-500 dark:text-slate-400">Open trades</div>
                <div className="text-2xl font-bold text-fuchsia-700 dark:text-fuchsia-300">{turtleOpen?.open_trades?.length ?? 0}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">front-month positions</div>
              </div>
            </div>

            {turtleTriggered.length === 0 ? (
              <div className="text-slate-600 dark:text-slate-300">No breakouts triggered on the latest bar.</div>
            ) : (
              <div className="space-y-2">
                {turtleTriggered.slice(0, 5).map((t, idx) => (
                  <div key={`${t.symbol}-${idx}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {t.symbol} <span className="text-xs font-sans text-slate-500 dark:text-slate-400">{t.side.toUpperCase()}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          Entry {t.entry_stop} · Stop {t.stop_loss}
                        </div>
                        {t.blocked_reason ? (
                          <div className="text-xs text-rose-600 dark:text-rose-300">Blocked: {t.blocked_reason}</div>
                        ) : (
                          <div className="text-xs text-emerald-700 dark:text-emerald-300">OK to consider (per cap rules)</div>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        asof {t.asof}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link to="/turtle" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-fuchsia-800 dark:text-fuchsia-200 border border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:bg-fuchsia-100/60 dark:hover:bg-fuchsia-900/30">
                Suggested
              </Link>
              <Link to="/turtle/triggers" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-fuchsia-800 dark:text-fuchsia-200 border border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:bg-fuchsia-100/60 dark:hover:bg-fuchsia-900/30">
                Triggers Soon
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings / Pre-earnings */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Crush */}
        <div className="rounded-xl shadow-sm border border-teal-200/60 dark:border-teal-800/40 bg-gradient-to-br from-white/85 to-teal-50/25 dark:from-slate-900/55 dark:to-teal-950/15 backdrop-blur overflow-hidden">
          <div className="px-6 py-4 border-b border-teal-200/60 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-200">Earnings Crush</div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">IV crush setups</div>
              </div>
              <div className="flex gap-2">
                <Link to="/earnings-crush" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">
                  Scanner
                </Link>
                <Link to="/earnings-crush/trades" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-teal-800 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800/40 hover:bg-teal-100/60 dark:hover:bg-teal-900/30">
                  Trades
                </Link>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Latest: {earningsCrush?.date || '—'}
            </div>
          </div>

          <div className="p-6">
            {earningsRecommended.length === 0 ? (
              <div className="text-slate-600 dark:text-slate-300">No RECOMMENDED earnings crush plays today.</div>
            ) : (
              <div className="space-y-3">
                {earningsRecommended.map((o, idx) => (
                  <div key={`${o.ticker}-${idx}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{o.ticker}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          ${o.price.toFixed(2)} · earnings {safeDateLabel(o.earnings_date)} ({o.days_to_earnings}d)
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Expected move: ±{formatPct(o.expected_move_pct)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-teal-700 dark:text-teal-300">{o.iv.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">IV</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pre-Earnings Straddles */}
        <div className="rounded-xl shadow-sm border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-white/85 to-amber-50/25 dark:from-slate-900/55 dark:to-amber-950/15 backdrop-blur overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">Pre-Earnings</div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">Long straddles (entry window)</div>
              </div>
              <div className="flex gap-2">
                <Link to="/pre-earnings" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700">
                  Opportunities
                </Link>
                <Link to="/pre-earnings/open-trades" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/70 dark:bg-slate-950/20 text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100/60 dark:hover:bg-amber-900/30">
                  Open Trades
                </Link>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Latest: {preEarnings?.date || '—'} · universe {preEarnings?.universe_size ?? '—'} · scanned {preEarnings?.candidates_scanned ?? '—'}
            </div>
          </div>

          <div className="p-6">
            {preEarningsTop.length === 0 ? (
              <div className="text-slate-600 dark:text-slate-300">No opportunities in the entry window.</div>
            ) : (
              <div className="space-y-3">
                {preEarningsTop.map((o, idx) => (
                  <div key={`${o.ticker}-${idx}`} className="bg-white/60 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200/60 dark:border-slate-800/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {o.ticker} <span className="text-xs font-sans text-slate-500 dark:text-slate-400">{o.recommendation}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          ${o.price.toFixed(2)} · earnings {safeDateLabel(o.earnings_date)} ({o.days_to_earnings}d)
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Exp {safeDateLabel(o.expiry)} · ±{formatPct(o.implied_move_pct)} implied
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        asof {preEarnings?.date || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Note: Open Trades requires the local IB bridge + local web dev server.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
