import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTodayDatePacific } from '../lib/dateUtils';
import { fetchJson } from '../lib/http';
import type {
  TurtleOpenTradesPayload,
  TurtleSignalsPayload,
  TurtleSuggestedTradesPayload,
} from '../types/turtle';
import type { OdidAlertsPayload, OdidOpenTradesPayload, OdidSignalsPayload } from '../types/odid';
import type { TaylorSignalsPayload } from '../types/taylor';

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

function formatSignalPrice(value?: number | null, digits = 6) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value.toFixed(digits)).toString();
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
  const [turtleSignals, setTurtleSignals] = useState<TurtleSignalsPayload | null>(null);
  const [turtleOpen, setTurtleOpen] = useState<TurtleOpenTradesPayload | null>(null);
  const [turtleSuggested, setTurtleSuggested] = useState<TurtleSuggestedTradesPayload | null>(null);
  const [odidSignals, setOdidSignals] = useState<OdidSignalsPayload | null>(null);
  const [odidAlerts, setOdidAlerts] = useState<OdidAlertsPayload | null>(null);
  const [odidOpen, setOdidOpen] = useState<OdidOpenTradesPayload | null>(null);
  const [taylorSignals, setTaylorSignals] = useState<TaylorSignalsPayload | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          fetchJson<TurtleSignalsPayload>('/data/turtle_signals_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleOpenTradesPayload>('/data/turtle_open_trades_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleSuggestedTradesPayload>('/data/turtle_suggested_latest.json', { cache: 'no-store' }),
          fetchJson<OdidSignalsPayload>('/data/odid_signals_latest.json', { cache: 'no-store' }),
          fetchJson<OdidAlertsPayload>('/data/odid_alerts_latest.json', { cache: 'no-store' }),
          fetchJson<OdidOpenTradesPayload>('/data/odid_open_trades_latest.json', { cache: 'no-store' }),
          fetchJson<TaylorSignalsPayload>('/data/taylor_signals_latest.json', { cache: 'no-store' }),
        ]);

        const [ts, to2, tSug, odSig, odAlrt, odOpen, tay] = results;
        if (ts.status === 'fulfilled') setTurtleSignals(ts.value);
        if (to2.status === 'fulfilled') setTurtleOpen(to2.value);
        if (tSug.status === 'fulfilled') setTurtleSuggested(tSug.value);
        if (odSig.status === 'fulfilled') setOdidSignals(odSig.value);
        if (odAlrt.status === 'fulfilled') setOdidAlerts(odAlrt.value);
        if (odOpen.status === 'fulfilled') setOdidOpen(odOpen.value);
        if (tay.status === 'fulfilled') setTaylorSignals(tay.value);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const turtleTriggered = turtleSignals?.triggered || [];
  const turtleTriggeredEligible = turtleTriggered.filter((t) => t.eligible !== false);
  const odidTriggered = odidSignals?.triggered || [];
  const odidAlertsCount = odidAlerts?.total_alerts ?? 0;
  const odidOpenCount = odidOpen?.open_trades?.length ?? 0;

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
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 animate-spin" />
        </div>
        <p className="text-slate-400 font-medium">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ──────────────── HERO ──────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 shadow-xl border border-slate-800 backdrop-blur">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/2 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative px-6 py-8 md:px-10 md:py-10">
          {/* Top row: badge + date */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-slate-300 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Futures Dashboard
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              {todayShort}
            </div>
            <div className="text-sm text-slate-400">{todayStr}</div>
          </div>

          {/* Headline */}
          <div className="mt-6 w-full text-center">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-100 leading-[1.15]">
              Oz<span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent">CTA</span>
            </h1>
            <p className="mt-3 text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              A NFA (National Futures Association) registered Commodity Trading Advisor specialising in actively managed futures & currency accounts.
              All trading involves risk; past performance is not indicative of future results.
            </p>
            <p className="mt-4 text-lg font-semibold text-slate-200">
              Access our futures strategies, signals, and trade tracking —{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent font-extrabold text-xl">
                FREE
              </span>
              , yes{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent font-extrabold text-xl">
                FREE
              </span>
              .
            </p>
          </div>

          {/* Quick-nav strategy pills */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Trendorama',
                desc: 'Breakout signals',
                to: '/turtle',
                dot: 'bg-fuchsia-500',
                hover: 'hover:border-fuchsia-700',
                text: 'text-fuchsia-300',
              },
              {
                label: 'Grail Trade',
                desc: 'EMA pullbacks',
                to: '/grail',
                dot: 'bg-orange-500',
                hover: 'hover:border-orange-700',
                text: 'text-orange-300',
              },
              {
                label: 'OD/ID Breakout',
                desc: 'Range break alerts',
                to: '/odid',
                dot: 'bg-cyan-500',
                hover: 'hover:border-cyan-700',
                text: 'text-cyan-300',
              },
              {
                label: 'Taylor Cycle',
                desc: '3-Day cycle setups',
                to: '/taylor',
                dot: 'bg-amber-500',
                hover: 'hover:border-amber-700',
                text: 'text-amber-300',
              },
            ].map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={`group rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 shadow-sm hover:shadow-md transition-all ${s.hover}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-slate-100 group-hover:translate-x-0.5 transition-transform">
                  {s.desc} →
                </div>
              </Link>
            ))}
          </div>

          {/* Summary stat bar */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              label="Trendorama Triggers"
              value={turtleTriggered.length}
              sub={`${turtleTriggeredEligible.length} eligible`}
              accent="text-fuchsia-300"
            />
            <StatCard
              label="OD/ID Alerts"
              value={odidAlertsCount}
              sub={`${odidTriggered.length} triggered · ${odidOpenCount} open`}
              accent="text-cyan-300"
            />
            <StatCard
              label="Taylor Cycle Signals"
              value={taylorSignals?.total_scanned ?? 0}
              sub={`${taylorSignals?.summary?.buy_day_count ?? 0} Buy Days · ${taylorSignals?.summary?.sell_short_day_count ?? 0} Short Days`}
              accent="text-amber-300"
            />
          </div>
        </div>
      </div>

      {/* ──────────────── STRATEGY DETAIL CARDS ──────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trendorama */}
        <div className="rounded-xl shadow-sm border border-fuchsia-900/40 bg-gradient-to-br from-slate-900/80 to-fuchsia-950/20 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-fuchsia-900/40 bg-fuchsia-950/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
                  Trendorama
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">Breakout signals</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/turtle" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition">Signals</Link>
                <Link to="/turtle/open-trades" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-950/40 text-fuchsia-300 border border-fuchsia-800/40 hover:bg-fuchsia-900/30 transition">Trades</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-400">
              Latest: {turtleSignals?.date || turtleOpen?.date || turtleSuggested?.date || '—'}
            </div>
          </div>

          <div className="p-6 flex-1">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Triggered" value={turtleTriggered.length} sub={`${turtleTriggeredEligible.length} eligible`} accent="text-fuchsia-300" />
              <StatCard label="Open Trades" value={turtleOpen?.open_trades?.length ?? 0} sub="front-month positions" accent="text-fuchsia-300" />
            </div>

            {turtleTriggered.length === 0 ? (
              <p className="text-slate-400">No breakouts triggered on the latest bar.</p>
            ) : (
              <div className="space-y-2">
                {turtleTriggered.slice(0, 3).map((t, i) => (
                  <div key={`${t.symbol}-${i}`} className="bg-slate-950/40 rounded-lg p-4 border border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-100">
                          {t.symbol}{' '}
                          <span className="text-xs font-sans text-slate-400">{t.side.toUpperCase()}</span>
                        </div>
                        <div className="text-sm text-slate-300">
                          Entry {formatSignalPrice(t.entry_stop)} · Stop {formatSignalPrice(t.stop_loss)}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400 shrink-0">{t.asof}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Taylor Cycle */}
        <div className="rounded-xl shadow-sm border border-amber-900/40 bg-gradient-to-br from-slate-900/80 to-amber-950/20 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-amber-900/40 bg-amber-950/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Taylor Trading Technique
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">3-Day Cycle Support/Resistance</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/taylor" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition">View Signals</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-400">
              Latest: {taylorSignals?.date || '—'}
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatCard label="Buy Days" value={taylorSignals?.summary?.buy_day_count ?? 0} sub="Support entry" accent="text-emerald-400" />
              <StatCard label="Sell Days" value={taylorSignals?.summary?.sell_day_count ?? 0} sub="Target exit" accent="text-amber-400" />
              <StatCard label="Short Days" value={taylorSignals?.summary?.sell_short_day_count ?? 0} sub="Resistance entry" accent="text-rose-400" />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Calculates George Douglass Taylor's 3-day market cycle rhythm (*Buy Day* → *Sell Day* → *Sell Short Day*) with daily Buying & Selling Objective target levels for futures and commodities.
            </p>
            <div className="mt-4">
              <Link to="/taylor" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition">
                Explore Taylor Book Levels →
              </Link>
            </div>
          </div>
        </div>

        {/* Grail Trade */}
        <div className="rounded-xl shadow-sm border border-orange-900/40 bg-gradient-to-br from-slate-900/80 to-orange-950/20 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-orange-900/40 bg-orange-950/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-300">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Grail Trade
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">EMA pullbacks</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/grail" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition">Signals</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-400">
              Active futures trend setups
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-slate-300 leading-relaxed">
              Monitors futures contracts pulling back to key exponential moving averages in high-ADX trending markets for high-probability continuation setups.
            </p>
            <div className="mt-6">
              <Link to="/grail" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition">
                View Grail Signals →
              </Link>
            </div>
          </div>
        </div>

        {/* OD/ID Breakout */}
        <div className="rounded-xl shadow-sm border border-cyan-900/40 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-cyan-900/40 bg-cyan-950/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  OD/ID Breakout
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">Outside Day / Inside Day</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/odid" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-700 transition">Monitor</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-400">
              Latest: {odidSignals?.date || odidAlerts?.date || odidOpen?.date || '—'}
            </div>
          </div>

          <div className="p-6 flex-1">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Alerts" value={odidAlertsCount} sub={`${odidSignals?.total_armed ?? 0} armed`} accent="text-cyan-300" />
              <StatCard label="Triggered" value={odidTriggered.length} sub={`${odidOpenCount} open positions`} accent="text-cyan-300" />
            </div>

            {odidTriggered.length === 0 ? (
              <p className="text-slate-400">No OD/ID close-confirmed breakouts today.</p>
            ) : (
              <div className="space-y-2">
                {odidTriggered.slice(0, 3).map((t, i) => (
                  <div key={`${t.symbol}-${i}`} className="bg-slate-950/40 rounded-lg p-4 border border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-100">
                          {t.symbol}{' '}
                          <span className="text-xs font-sans text-slate-400">{t.side.toUpperCase()}</span>
                        </div>
                        <div className="text-sm text-slate-300">
                          Entry {formatSignalPrice(t.entry_stop)} · Stop {formatSignalPrice(t.stop_loss)}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400 shrink-0">{t.asof}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── QUICK LINKS FOOTER ──────────────── */}
      <div className="rounded-xl bg-slate-900/80 shadow-sm border border-slate-800 backdrop-blur p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Trendorama Signals', to: '/turtle', color: 'text-fuchsia-300' },
            { label: 'Trendorama Trades', to: '/turtle/open-trades', color: 'text-fuchsia-300' },
            { label: 'Taylor Cycle Signals', to: '/taylor', color: 'text-amber-300' },
            { label: 'Grail Trade', to: '/grail', color: 'text-orange-300' },
            { label: 'OD/ID Breakout', to: '/odid', color: 'text-cyan-300' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm font-semibold ${link.color} hover:shadow-md transition`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
