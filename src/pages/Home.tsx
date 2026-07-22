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
import type { GrailSignalsPayload } from '../types/grail';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatSignalPrice(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(value) < 2) return value.toFixed(4);
  return value.toFixed(digits);
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
    <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800 shadow-sm hover:shadow-md transition">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
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
  const [grailSignals, setGrailSignals] = useState<GrailSignalsPayload | null>(null);

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
          fetchJson<GrailSignalsPayload>('/data/grail_signals_latest.json', { cache: 'no-store' }),
        ]);

        const [ts, to2, tSug, odSig, odAlrt, odOpen, tay, gr] = results;
        if (ts.status === 'fulfilled') setTurtleSignals(ts.value);
        if (to2.status === 'fulfilled') setTurtleOpen(to2.value);
        if (tSug.status === 'fulfilled') setTurtleSuggested(tSug.value);
        if (odSig.status === 'fulfilled') setOdidSignals(odSig.value);
        if (odAlrt.status === 'fulfilled') setOdidAlerts(odAlrt.value);
        if (odOpen.status === 'fulfilled') setOdidOpen(odOpen.value);
        if (tay.status === 'fulfilled') setTaylorSignals(tay.value);
        if (gr.status === 'fulfilled') setGrailSignals(gr.value);
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

  // Filter top actionable Taylor signals (Buy Long / Sell Short)
  const taylorActionable = useMemo(() => {
    if (!taylorSignals?.signals) return [];
    return taylorSignals.signals.filter((s) => s.action !== 'WATCH');
  }, [taylorSignals]);

  // Filter top Grail signals
  const grailTriggered = useMemo(() => {
    if (!grailSignals?.signals) return [];
    return grailSignals.signals.filter((s) => s.eligible !== false && s.side !== 'none');
  }, [grailSignals]);

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
                label: 'Bradman Cycle',
                desc: '3-Day cycle setups',
                to: '/taylor',
                dot: 'bg-amber-500',
                hover: 'hover:border-amber-700',
                text: 'text-amber-300',
              },
              {
                label: 'YouHaveChosenWisely',
                desc: 'EMA pullbacks',
                to: '/grail',
                dot: 'bg-orange-500',
                hover: 'hover:border-orange-700',
                text: 'text-orange-300',
              },
              {
                label: 'Too Hot / Too Cold',
                desc: 'Range break alerts',
                to: '/odid',
                dot: 'bg-cyan-500',
                hover: 'hover:border-cyan-700',
                text: 'text-cyan-300',
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
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Trendorama Triggers"
              value={turtleTriggered.length}
              sub={`${turtleTriggeredEligible.length} eligible`}
              accent="text-fuchsia-300"
            />
            <StatCard
              label="Bradman Cycle Signals"
              value={taylorSignals?.total_scanned ?? 0}
              sub={`${taylorActionable.length} actionable setups`}
              accent="text-amber-300"
            />
            <StatCard
              label="YouHaveChosenWisely Signals"
              value={grailSignals?.total_triggered ?? 0}
              sub={`${grailTriggered.length} active setups`}
              accent="text-orange-300"
            />
            <StatCard
              label="Too Hot / Too Cold Alerts"
              value={odidAlertsCount}
              sub={`${odidTriggered.length} triggered · ${odidOpenCount} open`}
              accent="text-cyan-300"
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

        {/* Bradman Cycle */}
        <div className="rounded-xl shadow-sm border border-amber-900/40 bg-gradient-to-br from-slate-900/80 to-amber-950/20 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-amber-900/40 bg-amber-950/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Bradman Trading Technique
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">3-Day Cycle Trade Recommendations</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/taylor" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition">View All Signals</Link>
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

            {/* Active Trade Recommendations List */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Cycle Recommendations:
              </div>
              {(taylorActionable.length > 0 ? taylorActionable : taylorSignals?.signals || []).slice(0, 3).map((sig) => (
                <div key={sig.symbol} className="bg-slate-950/40 rounded-lg p-3 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-slate-100 flex items-center gap-2">
                      <span>{sig.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                        sig.action === 'BUY_LONG' ? 'bg-emerald-500/20 text-emerald-300' :
                        sig.action === 'SELL_SHORT' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {sig.action.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-1">
                      Entry: <span className="font-mono font-bold text-slate-200">${formatSignalPrice(sig.entry_target)}</span> · 
                      Target: <span className="font-mono font-bold text-emerald-400">${formatSignalPrice(sig.profit_target)}</span> · 
                      Stop: <span className="font-mono font-bold text-rose-400">${formatSignalPrice(sig.stop_loss)}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-slate-400 shrink-0">
                    Day {sig.cycle_day}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2">
              <Link to="/taylor" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition">
                Explore Bradman Book Levels →
              </Link>
            </div>
          </div>
        </div>

        {/* YouHaveChosenWisely */}
        <div className="rounded-xl shadow-sm border border-orange-900/40 bg-gradient-to-br from-slate-900/80 to-orange-950/20 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-orange-900/40 bg-orange-950/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-300">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  YouHaveChosenWisely
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">EMA Pullback Recommendations</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link to="/grail" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition">View All Signals</Link>
              </div>
            </div>
            <div className="mt-1.5 text-sm text-slate-400">
              Latest: {grailSignals?.date || '—'}
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Scanned" value={grailSignals?.total_scanned ?? 0} sub="futures contracts" accent="text-orange-300" />
              <StatCard label="Active Setups" value={grailSignals?.total_triggered ?? 0} sub="high-ADX trend pullbacks" accent="text-orange-300" />
            </div>

            {/* Active YouHaveChosenWisely Trade Recommendations List */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active YouHaveChosenWisely Recommendations:
              </div>
              {grailTriggered.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No active pullback signals today.</p>
              ) : (
                grailTriggered.slice(0, 3).map((sig) => (
                  <div key={sig.symbol} className="bg-slate-950/40 rounded-lg p-3 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2">
                        <span>{sig.symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                          sig.side === 'long' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {sig.side.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-1">
                        Entry: <span className="font-mono font-bold text-slate-200">${formatSignalPrice(sig.entry_zone)}</span> · 
                        Stop: <span className="font-mono font-bold text-rose-400">${formatSignalPrice(sig.stop_loss)}</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-orange-400 font-mono shrink-0">
                      ADX {sig.adx.toFixed(0)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2">
              <Link to="/grail" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition">
                View Signals →
              </Link>
            </div>
          </div>
        </div>

        {/* Too Hot / Too Cold */}
        <div className="rounded-xl shadow-sm border border-cyan-900/40 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 backdrop-blur overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-cyan-900/40 bg-cyan-950/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  Too Hot / Too Cold
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">Range Breakout Signals</div>
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
              <p className="text-slate-400">No Too Hot / Too Cold close-confirmed breakouts today.</p>
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
            { label: 'Bradman Cycle Signals', to: '/taylor', color: 'text-amber-300' },
            { label: 'YouHaveChosenWisely', to: '/grail', color: 'text-orange-300' },
            { label: 'Too Hot / Too Cold', to: '/odid', color: 'text-cyan-300' },
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
