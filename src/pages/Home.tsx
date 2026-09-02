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
import type { PaperTradePerformancePayload } from '../types/paperTrade';
import { fmt$ } from '../lib/formatCurrency';
import SignalChartModal from '../components/SignalChartModal';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatSignalPrice(value?: number | string | null, digits = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  if (Math.abs(num) >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(num) < 2) return num.toFixed(4);
  return num.toFixed(digits);
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
  const [paperPerformance, setPaperPerformance] = useState<PaperTradePerformancePayload | null>(null);
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
          fetchJson<PaperTradePerformancePayload>('/data/paper_trade_performance.json', { cache: 'no-store' }),
        ]);

        const [ts, to2, tSug, odSig, odAlrt, odOpen, tay, gr, lin, pp] = results;
        if (ts.status === 'fulfilled') setTurtleSignals(ts.value);
        if (to2.status === 'fulfilled') setTurtleOpen(to2.value);
        if (tSug.status === 'fulfilled') setTurtleSuggested(tSug.value);
        if (odSig.status === 'fulfilled') setOdidSignals(odSig.value);
        if (odAlrt.status === 'fulfilled') setOdidAlerts(odAlrt.value);
        if (odOpen.status === 'fulfilled') setOdidOpen(odOpen.value);
        if (tay.status === 'fulfilled') setTaylorSignals(tay.value);
        if (gr.status === 'fulfilled') setGrailSignals(gr.value);
        if (lin.status === 'fulfilled') setLindaSignals(lin.value);
        if (pp.status === 'fulfilled') setPaperPerformance(pp.value);
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

  const [selectedPerfStrategy, setSelectedPerfStrategy] = useState<string>('ALL');
  const [selectedPerfTimeframe, setSelectedPerfTimeframe] = useState<'QTD' | 'YTD' | 'INCEPTION'>('INCEPTION');

  const isTradeInTimeframe = (entryDateStr?: string | null, tf: 'QTD' | 'YTD' | 'INCEPTION' = 'INCEPTION'): boolean => {
    if (tf === 'INCEPTION' || !entryDateStr) return true;
    const d = new Date(entryDateStr.slice(0, 10));
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    const currentYear = now.getFullYear();
    if (tf === 'YTD') {
      const ytdStart = new Date(currentYear, 0, 1);
      return d >= ytdStart;
    }
    if (tf === 'QTD') {
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const qtdStart = new Date(currentYear, quarterStartMonth, 1);
      return d >= qtdStart;
    }
    return true;
  };

  // Filtered Trades for Performance Section
  const perfTrades = useMemo(() => {
    if (!paperPerformance?.recent_trades) return [];
    return paperPerformance.recent_trades.filter((t) => {
      const matchStrat = selectedPerfStrategy === 'ALL' || t.strategy === selectedPerfStrategy;
      const matchTf = isTradeInTimeframe(t.entry_date, selectedPerfTimeframe);
      return matchStrat && matchTf;
    });
  }, [paperPerformance, selectedPerfStrategy, selectedPerfTimeframe]);

  // Strategy Specific Metrics
  const activeMetrics = useMemo(() => {
    if (!paperPerformance) return null;
    const pool = perfTrades;

    const closed = pool.filter((t) => t.status !== 'OPEN');
    const open = pool.filter((t) => t.status === 'OPEN');

    const realizedPnl = closed.reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
    const unrealizedPnl = open.reduce((acc, t) => acc + (t.unrealized_pnl || 0), 0);
    const netPnl = realizedPnl + unrealizedPnl;
    const returnPct = (netPnl / 100000) * 100;

    const wins = closed.filter((t) => (t.realized_pnl || 0) > 0);
    const losses = closed.filter((t) => (t.realized_pnl || 0) < 0);
    const winDollars = wins.reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
    const lossDollars = Math.abs(losses.reduce((acc, t) => acc + (t.realized_pnl || 0), 0));

    const winRate = closed.length > 0
      ? (wins.length / closed.length) * 100
      : (open.length > 0 ? (open.filter((t) => (t.unrealized_pnl || 0) > 0).length / open.length) * 100 : 0);

    const profitFactor = lossDollars > 0
      ? winDollars / lossDollars
      : (winDollars > 0 ? 99.9 : 1.0);

    const avgWin = wins.length > 0 ? winDollars / wins.length : 0;

    return {
      netPnl: Math.round(netPnl * 100) / 100,
      returnPct: Math.round(returnPct * 100) / 100,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      wins: wins.length,
      losses: losses.length,
      profitFactor: Math.round(profitFactor * 100) / 100,
      openCount: open.length,
      totalTrades: pool.length,
      closedCount: closed.length,
      avgWin: Math.round(avgWin * 100) / 100,
    };
  }, [paperPerformance, perfTrades]);

  // Biggest Winners & Losers for Selected Strategy
  const biggestWinners = useMemo(() => {
    return [...perfTrades]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) > 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlB - pnlA;
      })
      .slice(0, 4);
  }, [perfTrades]);

  const biggestLosers = useMemo(() => {
    return [...perfTrades]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) < 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlA - pnlB;
      })
      .slice(0, 4);
  }, [perfTrades]);

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

      {/* ──────────────── SYSTEMATIC TRADING PERFORMANCE & RUNNING LOG ──────────────── */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Signal Execution Log
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
              Trading Performance
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Running ledger of systematically executed futures strategy signals with active stops & profit targets
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Starting Capital
              </div>
              <div className="text-sm font-black text-slate-100 font-mono">
                $100,000 <span className="text-[10px] text-emerald-400/80 font-normal">(2% Risk / Trade)</span>
              </div>
            </div>
            <Link
              to="/executed-trades"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition shadow-lg shadow-emerald-600/20 whitespace-nowrap"
            >
              View Executed Trades Desk →
            </Link>
          </div>
        </div>

        {/* ── STRATEGY & TIMEFRAME CONTROLS (SINGLE NON-WRAPPING ROW) ── */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-4 overflow-x-auto no-scrollbar whitespace-nowrap flex-nowrap">
          {/* Strategy Pills */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">Strategy:</span>
            {[
              { id: 'ALL', label: 'All', dot: 'bg-emerald-400' },
              { id: 'Trendorama', label: 'Trendorama', dot: 'bg-fuchsia-400' },
              { id: 'The Bradman', label: 'The Bradman', dot: 'bg-amber-400' },
              { id: 'YouHaveChosenWisely', label: 'YouHaveChosenWisely', dot: 'bg-orange-400' },
              { id: 'TooHot TooCold', label: 'TooHot TooCold', dot: 'bg-cyan-400' },
              { id: 'The Linda', label: 'The Linda', dot: 'bg-rose-400' },
            ].map((strat) => {
              const isSelected = selectedPerfStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => setSelectedPerfStrategy(strat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 shadow-md ring-2 ring-emerald-400/50'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${strat.dot}`} />
                  {strat.label}
                </button>
              );
            })}
          </div>

          {/* Timeframe Buttons: QTD, YTD, Inception (Single Row) */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 shrink-0 flex-nowrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 shrink-0">Timeframe:</span>
            {[
              { id: 'QTD' as const, label: `QTD (Q${Math.floor(new Date().getMonth() / 3) + 1})` },
              { id: 'YTD' as const, label: `YTD (${new Date().getFullYear()})` },
              { id: 'INCEPTION' as const, label: 'Inception' },
            ].map((tf) => {
              const isSelected = selectedPerfTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => setSelectedPerfTimeframe(tf.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link
            to="/executed-trades"
            className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:scale-[1.02] hover:border-slate-700 hover:bg-slate-900/80 active:scale-[0.98] block"
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
              <span>Net P&L ({selectedPerfTimeframe === 'INCEPTION' ? 'Inception' : selectedPerfTimeframe})</span>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Ledger →</span>
            </div>
            <div className={`mt-1 text-2xl font-black font-mono ${(activeMetrics?.netPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmt$(activeMetrics?.netPnl ?? 0)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              Return: {activeMetrics?.returnPct !== undefined ? (activeMetrics.returnPct >= 0 ? `+${activeMetrics.returnPct.toFixed(1)}%` : `${activeMetrics.returnPct.toFixed(1)}%`) : '0.0%'}
            </div>
          </Link>

          <Link
            to="/executed-trades?status=CLOSED"
            className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:scale-[1.02] hover:border-slate-700 hover:bg-slate-900/80 active:scale-[0.98] block"
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
              <span>Win Rate</span>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Closed →</span>
            </div>
            <div className="mt-1 text-2xl font-black text-amber-400 font-mono">
              {(activeMetrics?.winRate ?? 0).toFixed(1)}%
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              {activeMetrics?.wins ?? 0} Wins / {activeMetrics?.losses ?? 0} Losses
            </div>
          </Link>

          <Link
            to="/executed-trades?status=CLOSED"
            className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:scale-[1.02] hover:border-slate-700 hover:bg-slate-900/80 active:scale-[0.98] block"
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
              <span>Profit Factor</span>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Metrics →</span>
            </div>
            <div className="mt-1 text-2xl font-black text-cyan-300 font-mono">
              {(activeMetrics?.profitFactor ?? 0) > 50 ? '> 50' : (activeMetrics?.profitFactor ?? 0).toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              Avg Win: {fmt$(activeMetrics?.avgWin ?? 0)}
            </div>
          </Link>

          <Link
            to="/executed-trades?status=OPEN"
            className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:scale-[1.02] hover:border-indigo-500/80 hover:bg-indigo-950/20 active:scale-[0.98] block shadow-sm hover:shadow-indigo-950/40"
            title="Click to view all open positions in the executed ledger"
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
              <span>Open Positions</span>
              <span className="text-[10px] text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </div>
            <div className="mt-1 text-2xl font-black text-indigo-300 font-mono">
              {activeMetrics?.openCount ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              Unrealized: {fmt$(activeMetrics?.unrealizedPnl ?? 0)}
            </div>
          </Link>

          <Link
            to="/executed-trades"
            className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:scale-[1.02] hover:border-slate-700 hover:bg-slate-900/80 active:scale-[0.98] block"
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
              <span>Total Trades</span>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">All →</span>
            </div>
            <div className="mt-1 text-2xl font-black text-slate-200 font-mono">
              {activeMetrics?.totalTrades ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              {activeMetrics?.closedCount ?? 0} completed
            </div>
          </Link>
        </div>

        {/* ── BIGGEST WINNERS & LOSERS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Winners */}
          <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/20 via-slate-950/60 to-slate-950/80 p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-900/30 pb-3">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                <span>🏆</span> Top Winners {selectedPerfStrategy !== 'ALL' && `(${selectedPerfStrategy})`}
              </span>
              <span className="text-[11px] font-bold text-emerald-400">
                {biggestWinners.length} Top Performing
              </span>
            </div>

            {biggestWinners.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No winning trades recorded for this selection.</p>
            ) : (
              <div className="space-y-2">
                {biggestWinners.map((t) => {
                  const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 transition hover:border-emerald-500/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-bold text-slate-100 text-sm">{t.symbol}</div>
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-300 border border-emerald-500/20">
                          {t.side.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-[110px]">
                          {t.strategy}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-black text-emerald-400 text-sm">+{fmt$(pnl)}</div>
                        <div className="text-[10px] text-emerald-300 font-semibold">
                          {t.return_pct > 0 ? `+${t.return_pct.toFixed(1)}%` : `${t.return_pct.toFixed(1)}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Losers */}
          <div className="rounded-2xl border border-rose-900/40 bg-gradient-to-br from-rose-950/20 via-slate-950/60 to-slate-950/80 p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-rose-900/30 pb-3">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-300">
                <span>⚠️</span> Top Drawdowns / Losers {selectedPerfStrategy !== 'ALL' && `(${selectedPerfStrategy})`}
              </span>
              <span className="text-[11px] font-bold text-rose-400">
                {biggestLosers.length} Trailing Trades
              </span>
            </div>

            {biggestLosers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No drawdown trades recorded for this selection.</p>
            ) : (
              <div className="space-y-2">
                {biggestLosers.map((t) => {
                  const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 transition hover:border-rose-500/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-bold text-slate-100 text-sm">{t.symbol}</div>
                        <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-300 border border-rose-500/20">
                          {t.side.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-[110px]">
                          {t.strategy}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-black text-rose-400 text-sm">{fmt$(pnl)}</div>
                        <div className="text-[10px] text-rose-300 font-semibold">
                          {t.return_pct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Executed Signals Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Recent Trade Executions & Status {selectedPerfStrategy !== 'ALL' && `· ${selectedPerfStrategy}`}
            </span>
            <Link to="/executed-trades" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition">
              Full Ledger ({activeMetrics?.totalTrades ?? 0}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800/80 bg-slate-950/90 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Strategy</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Current / Exit</th>
                  <th className="px-4 py-3 text-right">Stop Loss</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">P&L ($)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {(!perfTrades || perfTrades.length === 0) ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No executed trades recorded for this selection.
                    </td>
                  </tr>
                ) : (
                  perfTrades.slice(0, 8).map((t) => {
                    const isOpen = t.status === 'OPEN';
                    const displayPnl = isOpen ? t.unrealized_pnl : t.realized_pnl;
                    return (
                      <tr key={t.id} className="transition-colors hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono text-slate-400">{t.entry_date}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-100">{t.symbol}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                            {t.strategy}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                            t.side === 'long' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          }`}>
                            {t.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          {formatSignalPrice(t.entry_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-100 font-semibold">
                          {formatSignalPrice(isOpen ? t.current_price : t.exit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-300">
                          {formatSignalPrice(t.stop_loss)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-300">
                          {formatSignalPrice(t.profit_target)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-black ${displayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {fmt$(displayPnl)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.status === 'OPEN' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                              <span className="h-1 w-1 rounded-full bg-blue-400 animate-pulse" />
                              OPEN
                            </span>
                          )}
                          {t.status === 'HIT_TARGET' && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                              🎯 TARGET HIT
                            </span>
                          )}
                          {t.status === 'STOPPED_OUT' && (
                            <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-extrabold text-rose-300 border border-rose-500/30">
                              🛑 STOPPED
                            </span>
                          )}
                          {t.status === 'MANUALLY_CLOSED' && (
                            <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                              CLOSED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
