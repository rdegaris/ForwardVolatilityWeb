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
/*  Reusable StatCard                                                 */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  badge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 p-5 border border-slate-800/80 backdrop-blur-md shadow-lg hover:border-slate-700/80 transition-all duration-300 group">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
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
          <div className="mt-8 text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-100 leading-tight">
              Oz<span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent">CTA</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
              National Futures Association (NFA) registered Commodity Trading Advisor specializing in actively managed futures & FX strategies.
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
                desc: 'Donchian Breakouts',
                to: '/turtle',
                dot: 'bg-fuchsia-500',
                border: 'hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/10',
                text: 'text-fuchsia-300',
                bg: 'from-fuchsia-950/40 to-slate-900/40',
              },
              {
                label: 'Bradman Cycle',
                desc: '3-Day Natural Rhythms',
                to: '/taylor',
                dot: 'bg-amber-500',
                border: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
                text: 'text-amber-300',
                bg: 'from-amber-950/40 to-slate-900/40',
              },
              {
                label: 'YouHaveChosenWisely',
                desc: 'EMA Trend Pullbacks',
                to: '/grail',
                dot: 'bg-orange-500',
                border: 'hover:border-orange-500/50 hover:shadow-orange-500/10',
                text: 'text-orange-300',
                bg: 'from-orange-950/40 to-slate-900/40',
              },
              {
                label: 'TooHot TooCold',
                desc: 'Range Breakout Confirmations',
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
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Trendorama"
              value={turtleTriggered.length}
              sub={`${turtleTriggeredEligible.length} eligible breakouts`}
              accent="text-fuchsia-400"
              badge="Donchian"
            />
            <StatCard
              label="Bradman Cycle"
              value={taylorSignals?.total_scanned ?? 0}
              sub={`${bradmanActionable.length} actionable setups`}
              accent="text-amber-400"
              badge="3-Day"
            />
            <StatCard
              label="YouHaveChosenWisely"
              value={grailSignals?.total_triggered ?? 0}
              sub={`${grailTriggered.length} active setups`}
              accent="text-orange-400"
              badge="EMA Pullback"
            />
            <StatCard
              label="TooHot TooCold"
              value={odidAlertsCount}
              sub={`${odidTriggered.length} triggered · ${odidOpenCount} open`}
              accent="text-cyan-400"
              badge="Range Break"
            />
          </div>
        </div>
      </div>

      {/* ──────────────── STRATEGY DETAIL GRID ──────────────── */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Trendorama */}
        <div className="rounded-3xl shadow-xl border border-fuchsia-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-fuchsia-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-fuchsia">
          <div className="px-6 py-5 border-b border-fuchsia-900/40 bg-fuchsia-950/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-fuchsia-300">
                <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
                Trendorama
              </div>
              <div className="mt-1 text-xl font-bold text-slate-100">Donchian Breakout Signals</div>
            </div>
            <div className="flex gap-2">
              <Link to="/turtle" className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-500 transition shadow-md">Signals</Link>
              <Link to="/turtle/open-trades" className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-950/60 text-fuchsia-300 border border-fuchsia-800/50 hover:bg-fuchsia-900/40 transition">Trades</Link>
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
                  <div key={`${t.symbol}-${i}`} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <span>{t.symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          t.side.toLowerCase() === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {t.side.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 font-mono">
                        Entry: <span className="font-bold text-slate-100">${formatSignalPrice(t.entry_stop)}</span> · Stop: <span className="font-bold text-rose-400">${formatSignalPrice(t.stop_loss)}</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-mono text-slate-400">{t.asof}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Date: <strong className="text-slate-200">{turtleSignals?.date || '—'}</strong></span>
              <Link to="/turtle" className="font-semibold text-fuchsia-300 hover:text-fuchsia-200 transition">
                View Full Donchian Levels →
              </Link>
            </div>
          </div>
        </div>

        {/* Bradman Cycle */}
        <div className="rounded-3xl shadow-xl border border-amber-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-amber-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-amber">
          <div className="px-6 py-5 border-b border-amber-900/40 bg-amber-950/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Bradman Trading Technique
              </div>
              <div className="mt-1 text-xl font-bold text-slate-100">3-Day Cycle Recommendations</div>
            </div>
            <Link to="/taylor" className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition shadow-md">View All Signals</Link>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Cycle Recommendations:
              </div>
              {(bradmanActionable.length > 0 ? bradmanActionable : taylorSignals?.signals || []).slice(0, 3).map((sig) => (
                <div key={sig.symbol} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                      <span>{sig.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                        sig.action === 'BUY_LONG' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        sig.action === 'SELL_SHORT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {sig.action.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-slate-300 mt-1 font-mono">
                      Entry: <span className="font-bold text-slate-100">${formatSignalPrice(sig.entry_target)}</span> · 
                      Target: <span className="font-bold text-emerald-400">${formatSignalPrice(sig.profit_target)}</span> · 
                      Stop: <span className="font-bold text-rose-400">${formatSignalPrice(sig.stop_loss)}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-amber-400 font-bold shrink-0">
                    Day {sig.cycle_day}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Date: <strong className="text-slate-200">{taylorSignals?.date || '—'}</strong></span>
              <Link to="/taylor" className="font-semibold text-amber-300 hover:text-amber-200 transition">
                Explore Bradman Book Levels →
              </Link>
            </div>
          </div>
        </div>

        {/* YouHaveChosenWisely */}
        <div className="rounded-3xl shadow-xl border border-orange-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-orange-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-orange">
          <div className="px-6 py-5 border-b border-orange-900/40 bg-orange-950/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-orange-300">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                YouHaveChosenWisely
              </div>
              <div className="mt-1 text-xl font-bold text-slate-100">EMA Trend Pullback Signals</div>
            </div>
            <Link to="/grail" className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-500 transition shadow-md">View Signals</Link>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Pullback Recommendations:
              </div>
              {grailTriggered.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No active EMA pullback signals today.</p>
              ) : (
                grailTriggered.slice(0, 3).map((sig) => (
                  <div key={sig.symbol} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <span>{sig.symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                          sig.side === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {sig.side.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-300 mt-1 font-mono">
                        Entry: <span className="font-bold text-slate-100">${formatSignalPrice(sig.entry_zone)}</span> · 
                        Stop: <span className="font-bold text-rose-400">${formatSignalPrice(sig.stop_loss)}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-orange-400 font-mono font-bold shrink-0">
                      ADX {sig.adx.toFixed(0)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Date: <strong className="text-slate-200">{grailSignals?.date || '—'}</strong></span>
              <Link to="/grail" className="font-semibold text-orange-300 hover:text-orange-200 transition">
                View ADX & EMA Signals →
              </Link>
            </div>
          </div>
        </div>

        {/* TooHot TooCold */}
        <div className="rounded-3xl shadow-xl border border-cyan-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-cyan-950/20 backdrop-blur-xl overflow-hidden flex flex-col glow-cyan">
          <div className="px-6 py-5 border-b border-cyan-900/40 bg-cyan-950/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                TooHot TooCold
              </div>
              <div className="mt-1 text-xl font-bold text-slate-100">Range Breakout Monitor</div>
            </div>
            <Link to="/odid" className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition shadow-md">Monitor</Link>
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
                  <div key={`${t.symbol}-${i}`} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <span>{t.symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          t.side.toLowerCase() === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {t.side.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-300 mt-1 font-mono">
                        Entry: <span className="font-bold text-slate-100">${formatSignalPrice(t.entry_stop)}</span> · Stop: <span className="font-bold text-rose-400">${formatSignalPrice(t.stop_loss)}</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-mono text-slate-400">{t.asof}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Date: <strong className="text-slate-200">{odidSignals?.date || '—'}</strong></span>
              <Link to="/odid" className="font-semibold text-cyan-300 hover:text-cyan-200 transition">
                Monitor Armed Setups →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── QUICK LINKS FOOTER ──────────────── */}
      <div className="rounded-3xl bg-slate-900/80 p-8 border border-slate-800/90 backdrop-blur-xl shadow-xl">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Quick Access Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Trendorama Signals', to: '/turtle', color: 'text-fuchsia-300 border-fuchsia-900/40 hover:border-fuchsia-600' },
            { label: 'Bradman Cycle Signals', to: '/taylor', color: 'text-amber-300 border-amber-900/40 hover:border-amber-600' },
            { label: 'YouHaveChosenWisely', to: '/grail', color: 'text-orange-300 border-orange-900/40 hover:border-orange-600' },
            { label: 'TooHot TooCold', to: '/odid', color: 'text-cyan-300 border-cyan-900/40 hover:border-cyan-600' },
            { label: 'Open Positions Tracker', to: '/turtle/open-trades', color: 'text-emerald-300 border-emerald-900/40 hover:border-emerald-600' },
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
    </div>
  );
}
