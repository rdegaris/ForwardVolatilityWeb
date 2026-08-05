import { useEffect, useMemo, useState, useCallback } from 'react';
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
import type { LindaSignalsPayload } from '../types/linda';
import SignalChartModal from '../components/SignalChartModal';

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
/*  Reusable StatCard                                                 */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  title,
  value,
  sub,
  accent,
  badge,
}: {
  label?: string;
  title?: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent: string;
  badge?: string;
}) {
  const cardTitle = label || title || '';
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{cardTitle}</span>
        {badge && (
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-300 border border-slate-700">
            {badge}
          </span>
        )}
      </div>
      <div className={`mt-2 text-3xl font-black tracking-tight ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400 font-medium">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Homepage Dashboard                                                */
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
  const [lindaSignals, setLindaSignals] = useState<LindaSignalsPayload | null>(null);
  const [chartItem, setChartItem] = useState<{
    symbol: string;
    strategy: string;
    interval?: string;
    signalLabel?: string;
    direction?: 'long' | 'short' | 'fade_up' | 'fade_down' | null;
    entryPrice?: number | null;
    stopPrice?: number | null;
    targetPrice?: number | null;
  } | null>(null);

  const closeChart = useCallback(() => setChartItem(null), []);

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
          fetchJson<LindaSignalsPayload>('/data/linda_signals_latest.json', { cache: 'no-store' }),
        ]);

        const [ts, to2, tSug, odSig, odAlrt, odOpen, tay, gr, lin] = results;
        if (ts.status === 'fulfilled') setTurtleSignals(ts.value);
        if (to2.status === 'fulfilled') setTurtleOpen(to2.value);
        if (tSug.status === 'fulfilled') setTurtleSuggested(tSug.value);
        if (odSig.status === 'fulfilled') setOdidSignals(odSig.value);
        if (odAlrt.status === 'fulfilled') setOdidAlerts(odAlrt.value);
        if (odOpen.status === 'fulfilled') setOdidOpen(odOpen.value);
        if (tay.status === 'fulfilled') setTaylorSignals(tay.value);
        if (gr.status === 'fulfilled') setGrailSignals(gr.value);
        if (lin.status === 'fulfilled') setLindaSignals(lin.value);
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

  // Actionable Bradman signals
  const bradmanActionable = useMemo(() => {
    if (!taylorSignals?.signals) return [];
    return taylorSignals.signals.filter((s) => s.action !== 'WATCH');
  }, [taylorSignals]);

  // Actionable YouHaveChosenWisely signals
  const grailTriggered = useMemo(() => {
    if (!grailSignals?.signals) return [];
    return grailSignals.signals.filter((s) => s.eligible !== false && s.side !== 'none');
  }, [grailSignals]);

  // The Linda triggered
  const lindaTriggered = useMemo(() => {
    if (!lindaSignals?.signals) return [];
    return lindaSignals.signals.filter(s => s.triggered);
  }, [lindaSignals]);

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
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 border-r-amber-400 animate-spin" />
        </div>
        <p className="text-slate-400 font-medium tracking-wide">Initializing Quantitative Dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 bg-grid-pattern pb-12">
      {/* ──────────────── HERO TERMINAL BANNER ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 shadow-2xl border border-slate-800/90 backdrop-blur-xl">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative px-6 py-10 md:px-12 md:py-12">
          {/* Top Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              SYSTEMATIC FUTURES DESK
              <span className="text-slate-500">|</span>
              <span className="font-mono text-slate-300">{todayShort}</span>
            </div>
            <div className="text-xs font-semibold tracking-wide text-slate-400">{todayStr}</div>
          </div>

          {/* Headline */}
          <div className="mt-8 text-center max-w-5xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-100 leading-tight">
              Oz<span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent">CTA</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-300 font-medium">
              National Futures Association (NFA) registered Commodity Trading Advisor specializing in actively managed futures.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950/60 px-5 py-2.5 border border-slate-800 text-sm font-semibold text-slate-200">
              ⚡ Access our futures strategy signals, trade models, and daily scans —{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent font-black tracking-wider text-base">
                100% FREE
              </span>
            </div>
          </div>

          {/* Quick-Nav Strategy Cards */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Trendorama',
                desc: 'Systematic Trend Following',
                to: '/trendorama',
                dot: 'bg-fuchsia-500',
                border: 'hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/10',
                text: 'text-fuchsia-300',
                bg: 'from-fuchsia-950/40 to-slate-900/40',
              },
              {
                label: 'The Bradman',
                desc: 'Momentum & Mean-Reversion',
                to: '/taylor',
                dot: 'bg-amber-500',
                border: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
                text: 'text-amber-300',
                bg: 'from-amber-950/40 to-slate-900/40',
              },
              {
                label: 'YouHaveChosenWisely',
                desc: 'Trend Continuation Pullbacks',
                to: '/grail',
                dot: 'bg-orange-500',
                border: 'hover:border-orange-500/50 hover:shadow-orange-500/10',
                text: 'text-orange-300',
                bg: 'from-orange-950/40 to-slate-900/40',
              },
              {
                label: 'TooHot TooCold',
                desc: 'Range Expansion Breakouts',
                to: '/odid',
                dot: 'bg-cyan-500',
                border: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
                text: 'text-cyan-300',
                bg: 'from-cyan-950/40 to-slate-900/40',
              },
            ].map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={`group rounded-2xl border border-slate-800 bg-gradient-to-br ${s.bg} p-4 shadow-lg transition-all duration-300 ${s.border}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                </div>
                <div className="mt-2 text-sm font-bold text-slate-100 group-hover:translate-x-1 transition-transform flex items-center justify-between">
                  <span>{s.desc}</span>
                  <span className="text-slate-400 group-hover:text-slate-100 transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Key Metrics Bar */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Trendorama"
              value={turtleTriggered.length}
              sub={`${turtleTriggeredEligible.length} eligible breakouts`}
              accent="text-fuchsia-400"
              badge="Donchian"
            />
            <StatCard
              label="The Bradman"
              value={bradmanActionable.length}
              sub={`of ${taylorSignals?.total_scanned ?? 0} scanned have actionable setups`}
              accent="text-amber-400"
              badge="3-Day"
            />
            <StatCard
              label="YouHaveChosenWisely"
              value={grailSignals?.total_triggered ?? 0}
              sub={`${grailTriggered.length} active setups`}
              accent="text-orange-400"
              badge="EMA"
            />
            <StatCard
              label="TooHot TooCold"
              value={odidAlertsCount}
              sub={`${odidTriggered.length} triggered · ${odidOpenCount} open`}
              accent="text-cyan-400"
              badge="Range Break"
            />
            <StatCard
              label="The Linda"
              value={lindaTriggered.length}
              sub={`of ${lindaSignals?.total_scanned ?? 0} scanned mean-revert today`}
              accent="text-rose-400"
              badge="Mean Rev"
            />
          </div>
        </div>
      </div>

      {/* ──────────────── STRATEGY DETAIL GRID ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Trendorama */}
        <div className="rounded-3xl shadow-xl border border-fuchsia-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-fuchsia-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-fuchsia">
          <div className="px-5 py-4 border-b border-fuchsia-900/40 bg-fuchsia-950/30 flex flex-col justify-between h-[105px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-fuchsia-300 truncate">
                <span className="h-2 w-2 rounded-full bg-fuchsia-500 shrink-0" />
                <span>Trendorama</span>
              </div>
              <Link to="/trendorama" className="px-3 py-1 rounded-lg text-xs font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-500 transition shadow-sm whitespace-nowrap shrink-0">
                Signals
              </Link>
            </div>
            <div className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
              Systematic Trend Following
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Breakout Setups:
              </div>
              {turtleTriggered.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No breakouts triggered on the latest bar.</p>
              ) : (
                turtleTriggered.slice(0, 3).map((t, i) => (
                  <div key={`${t.symbol}-${i}`} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <span>{t.symbol}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          t.side.toLowerCase() === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {t.side.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => setChartItem({
                          symbol: t.symbol,
                          strategy: 'trendorama',
                          interval: 'D',
                          signalLabel: `TRENDORAMA — ${t.side.toUpperCase()}`,
                          direction: t.side.toLowerCase() === 'long' ? 'long' : 'short',
                          entryPrice: t.entry_stop,
                          stopPrice: t.stop_loss,
                        })}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition-colors text-xs font-bold shrink-0 flex items-center gap-1"
                        title="View Interactive Chart"
                      >
                        📈 Chart
                      </button>
                    </div>

                    <div className="grid grid-cols-[54px_1fr] gap-x-2 gap-y-1 text-xs font-mono">
                      <span className="text-slate-400">Entry:</span>
                      <span className="font-bold text-slate-100">${formatSignalPrice(t.entry_stop)}</span>

                      <span className="text-slate-400">Stop:</span>
                      <span className="font-bold text-rose-400">${formatSignalPrice(t.stop_loss)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-end text-xs text-slate-400">
              <Link to="/trendorama" className="font-semibold text-fuchsia-300 hover:text-fuchsia-200 transition">
                View Full Signal Matrix →
              </Link>
            </div>
          </div>
        </div>

        {/* The Bradman */}
        <div className="rounded-3xl shadow-xl border border-amber-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-amber-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-amber">
          <div className="px-5 py-4 border-b border-amber-900/40 bg-amber-950/30 flex flex-col justify-between h-[105px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300 truncate">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>The Bradman</span>
              </div>
              <Link to="/taylor" className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition shadow-sm whitespace-nowrap shrink-0">
                Signals
              </Link>
            </div>
            <div className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
              Momentum & Mean-Reversion
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Cycle Recommendations:
              </div>
              {(bradmanActionable.length > 0 ? bradmanActionable : taylorSignals?.signals || []).slice(0, 3).map((sig) => (
                <div key={sig.symbol} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                      <span>{sig.symbol}</span>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                        sig.action === 'BUY_LONG' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        sig.action === 'SELL_SHORT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {sig.action.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => setChartItem({
                        symbol: sig.symbol,
                        strategy: 'taylor',
                        interval: 'D',
                        signalLabel: `BRADMAN — ${sig.action.replaceAll('_', ' ')}`,
                        direction: sig.action === 'BUY_LONG' ? 'long' : sig.action === 'SELL_SHORT' ? 'short' : null,
                        entryPrice: sig.entry_target,
                        targetPrice: sig.profit_target,
                        stopPrice: sig.stop_loss,
                      })}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition-colors text-xs font-bold shrink-0 flex items-center gap-1"
                      title="View Interactive Chart"
                    >
                      📈 Chart
                    </button>
                  </div>

                  <div className="grid grid-cols-[54px_1fr] gap-x-2 gap-y-1 text-xs font-mono">
                    <span className="text-slate-400">Entry:</span>
                    <span className="font-bold text-slate-100">${formatSignalPrice(sig.entry_target)}</span>

                    <span className="text-slate-400">Target:</span>
                    <span className="font-bold text-emerald-400">${formatSignalPrice(sig.profit_target)}</span>

                    <span className="text-slate-400">Stop:</span>
                    <span className="font-bold text-rose-400">${formatSignalPrice(sig.stop_loss)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-end text-xs text-slate-400">
              <Link to="/taylor" className="font-semibold text-amber-300 hover:text-amber-200 transition">
                Explore The Bradman Levels →
              </Link>
            </div>
          </div>
        </div>

        {/* YouHaveChosenWisely */}
        <div className="rounded-3xl shadow-xl border border-orange-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-orange-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-orange">
          <div className="px-5 py-4 border-b border-orange-900/40 bg-orange-950/30 flex flex-col justify-between h-[105px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-orange-300 truncate">
                <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span className="truncate">YouHaveChosenWisely</span>
              </div>
              <Link to="/grail" className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-600 text-white hover:bg-orange-500 transition shadow-sm whitespace-nowrap shrink-0">
                Signals
              </Link>
            </div>
            <div className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
              Trend Continuation Pullbacks
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Pullback Recommendations:
              </div>
              {grailTriggered.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No active pullback signals today.</p>
              ) : (
                grailTriggered.slice(0, 3).map((sig) => (
                  <div key={sig.symbol} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <span>{sig.symbol}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          sig.side === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {sig.side.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => setChartItem({
                          symbol: sig.symbol,
                          strategy: 'grail',
                          interval: 'D',
                          signalLabel: `GRAIL — ${sig.side.toUpperCase()}`,
                          direction: sig.side === 'long' ? 'long' : 'short',
                          entryPrice: sig.entry_zone ?? sig.ema20,
                          targetPrice: sig.target,
                          stopPrice: sig.stop_loss,
                        })}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition-colors text-xs font-bold shrink-0 flex items-center gap-1"
                        title="View Interactive Chart"
                      >
                        📈 Chart
                      </button>
                    </div>

                    <div className="grid grid-cols-[54px_1fr] gap-x-2 gap-y-1 text-xs font-mono">
                      <span className="text-slate-400">Entry:</span>
                      <span className="font-bold text-slate-100">${formatSignalPrice(sig.entry_zone)}</span>

                      <span className="text-slate-400">Stop:</span>
                      <span className="font-bold text-rose-400">${formatSignalPrice(sig.stop_loss)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-end text-xs text-slate-400">
              <Link to="/grail" className="font-semibold text-orange-300 hover:text-orange-200 transition">
                View Strategy Signals →
              </Link>
            </div>
          </div>
        </div>

        {/* TooHot TooCold */}
        <div className="rounded-3xl shadow-xl border border-cyan-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-cyan-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-cyan">
          <div className="px-5 py-4 border-b border-cyan-900/40 bg-cyan-950/30 flex flex-col justify-between h-[105px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cyan-300 truncate">
                <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
                <span>TooHot TooCold</span>
              </div>
              <Link to="/odid" className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition shadow-sm whitespace-nowrap shrink-0">
                Monitor
              </Link>
            </div>
            <div className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
              Range Expansion Breakouts
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Confirmed Breakout Triggers:
              </div>
              {odidTriggered.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No close-confirmed range breakouts today.</p>
              ) : (
                odidTriggered.slice(0, 3).map((t, i) => (
                  <div key={`${t.symbol}-${i}`} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <span>{t.symbol}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          t.side.toLowerCase() === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {t.side.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => setChartItem({
                          symbol: t.symbol,
                          strategy: 'odid',
                          interval: 'D',
                          signalLabel: `TOOHOT TOCOLD — ${t.side.toUpperCase()}`,
                          direction: t.side.toLowerCase() === 'long' ? 'long' : 'short',
                          entryPrice: t.entry_stop,
                          stopPrice: t.stop_loss,
                        })}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition-colors text-xs font-bold shrink-0 flex items-center gap-1"
                        title="View Interactive Chart"
                      >
                        📈 Chart
                      </button>
                    </div>

                    <div className="grid grid-cols-[54px_1fr] gap-x-2 gap-y-1 text-xs font-mono">
                      <span className="text-slate-400">Entry:</span>
                      <span className="font-bold text-slate-100">${formatSignalPrice(t.entry_stop)}</span>

                      <span className="text-slate-400">Stop:</span>
                      <span className="font-bold text-rose-400">${formatSignalPrice(t.stop_loss)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-end text-xs text-slate-400">
              <Link to="/odid" className="font-semibold text-cyan-300 hover:text-cyan-200 transition">
                Monitor Armed Setups →
              </Link>
            </div>
          </div>
        </div>
        {/* The Linda */}
        <div className="rounded-3xl shadow-xl border border-rose-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-rose-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-rose">
          <div className="px-5 py-4 border-b border-rose-900/40 bg-rose-950/30 flex flex-col justify-between h-[105px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-300 truncate">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span>The Linda</span>
              </div>
              <Link to="/linda" className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition shadow-sm whitespace-nowrap shrink-0">
                Signals
              </Link>
            </div>
            <div className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
              Next-Day Mean Reversion
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Reversion Setups:
              </div>
              {lindaTriggered.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No trend day / no-EMA-touch setups today.</p>
              ) : (
                lindaTriggered.slice(0, 3).map((sig) => (
                  <div key={sig.symbol} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <span>{sig.symbol}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          sig.direction === 'FADE_UP'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {sig.direction === 'FADE_UP' ? 'Fade Up' : 'Fade Down'}
                        </span>
                      </div>
                      <button
                        onClick={() => setChartItem({
                          symbol: sig.symbol,
                          strategy: 'linda',
                          interval: '15',
                          signalLabel: sig.direction === 'FADE_UP' ? 'FADE UP — SELL' : 'FADE DOWN — BUY',
                          direction: sig.direction === 'FADE_UP' ? 'fade_up' : 'fade_down',
                          entryPrice: sig.close,
                          targetPrice: sig.target,
                          stopPrice: sig.stop,
                        })}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition-colors text-xs font-bold shrink-0 flex items-center gap-1"
                        title="View Interactive Chart"
                      >
                        📈 Chart
                      </button>
                    </div>

                    <div className="grid grid-cols-[54px_1fr] gap-x-2 gap-y-1 text-xs font-mono">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-bold text-rose-300">${sig.target?.toFixed(2) ?? '—'}</span>

                      <span className="text-slate-400">Stop:</span>
                      <span className="font-bold text-slate-400">${sig.stop?.toFixed(2) ?? '—'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-end text-xs text-slate-400">
              <Link to="/linda" className="font-semibold text-rose-300 hover:text-rose-200 transition">
                View The Linda Setups →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── QUICK LINKS FOOTER ──────────────── */}
      <div className="rounded-3xl bg-slate-900/80 p-8 border border-slate-800/90 backdrop-blur-xl shadow-xl">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Quick Access Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Trendorama Signals', to: '/trendorama', color: 'text-fuchsia-300 border-fuchsia-900/40 hover:border-fuchsia-600' },
            { label: 'The Bradman', to: '/taylor', color: 'text-amber-300 border-amber-900/40 hover:border-amber-600' },
            { label: 'YouHaveChosenWisely', to: '/grail', color: 'text-orange-300 border-orange-900/40 hover:border-orange-600' },
            { label: 'TooHot TooCold', to: '/odid', color: 'text-cyan-300 border-cyan-900/40 hover:border-cyan-600' },
            { label: 'The Linda', to: '/linda', color: 'text-rose-300 border-rose-900/40 hover:border-rose-600' },
            { label: 'Open Positions Tracker', to: '/trendorama/open-trades', color: 'text-emerald-300 border-emerald-900/40 hover:border-emerald-600' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-2xl border bg-slate-950/60 px-5 py-4 text-sm font-bold ${link.color} shadow-md transition-all duration-300 hover:translate-y-0.5`}
            >
              {link.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* Interactive Chart Modal */}
      {chartItem && (
        <SignalChartModal
          isOpen={!!chartItem}
          onClose={closeChart}
          symbol={chartItem.symbol}
          strategy={chartItem.strategy}
          interval={chartItem.interval ?? 'D'}
          signalLabel={chartItem.signalLabel}
          direction={chartItem.direction}
          entryPrice={chartItem.entryPrice}
          targetPrice={chartItem.targetPrice}
          stopPrice={chartItem.stopPrice}
        />
      )}
    </div>
  );
}
