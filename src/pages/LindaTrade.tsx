import { useEffect, useMemo, useState, useCallback } from 'react';
import type { LindaSignalsPayload, LindaSignalRow } from '../types/linda';
import SignalChartModal from '../components/SignalChartModal';

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

const FULL_NAMES: Record<string, string> = {
  ES: 'E-mini S&P 500', NQ: 'E-mini Nasdaq 100', RTY: 'E-mini Russell 2000',
  YM: 'E-mini Dow Jones', GC: 'Gold', SI: 'Silver', CL: 'Crude Oil',
  NG: 'Natural Gas', '6E': 'Euro FX', '6J': 'Japanese Yen', '6B': 'British Pound',
  ZB: '30-Yr T-Bond', ZN: '10-Yr T-Note',
};

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function TrendBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const isBull = pct >= 75;
  const isBear = pct <= 25;
  const color = isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-slate-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 w-7 text-right">{pct}%</span>
    </div>
  );
}

function SignalCard({ sig, onChartClick }: { sig: LindaSignalRow; onChartClick: (sig: LindaSignalRow) => void }) {
  const isFadeUp = sig.direction === 'FADE_UP';
  const isFadeDown = sig.direction === 'FADE_DOWN';
  const fullName = FULL_NAMES[sig.symbol] ?? sig.symbol;

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${
      isFadeUp
        ? 'border-rose-500/40 bg-gradient-to-br from-slate-900 to-rose-950/20'
        : 'border-emerald-500/40 bg-gradient-to-br from-slate-900 to-emerald-950/20'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-xl text-slate-100">{sig.symbol}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              isFadeUp
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {isFadeUp ? 'FADE UP — SELL' : 'FADE DOWN — BUY'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{fullName}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Gap from EMA</div>
          <div className={`text-lg font-extrabold font-mono ${
            sig.gap_pct >= 2 ? 'text-amber-400' : 'text-slate-300'
          }`}>{fmt(sig.gap_pct)}%</div>
        </div>
      </div>

      {/* Price grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Prior Close</div>
          <div className="font-mono font-bold text-slate-100 text-sm">{fmt(sig.close, 4)}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5 border border-rose-500/20">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Target (EMA)</div>
          <div className="font-mono font-bold text-rose-300 text-sm">{fmt(sig.target, 4)}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Stop</div>
          <div className="font-mono font-bold text-slate-400 text-sm">{fmt(sig.stop, 4)}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <div className="text-slate-500 uppercase tracking-wider mb-1">Range / ATR</div>
          <div className="font-mono font-bold text-slate-200">{fmt(sig.range_vs_atr)}×</div>
        </div>
        <div>
          <div className="text-slate-500 uppercase tracking-wider mb-1">ATR (20)</div>
          <div className="font-mono font-bold text-slate-200">{fmt(sig.atr20, 4)}</div>
        </div>
        <div>
          <div className="text-slate-500 uppercase tracking-wider mb-1">Trend Strength</div>
          <TrendBar value={sig.trend_strength} />
        </div>
      </div>

      {/* Reason */}
      <p className="text-xs text-slate-400 italic leading-relaxed">{sig.reason}</p>

      {/* View Chart CTA */}
      <button
        onClick={() => onChartClick(sig)}
        className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
          bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500/50
          text-slate-300 hover:text-white transition-all duration-150 group"
      >
        <svg className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
        View 15-Min Chart
      </button>
    </div>
  );
}

export default function LindaTrade() {
  const [data, setData] = useState<LindaSignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartSig, setChartSig] = useState<LindaSignalRow | null>(null);
  const openChart = useCallback((sig: LindaSignalRow) => setChartSig(sig), []);
  const closeChart = useCallback(() => setChartSig(null), []);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<LindaSignalsPayload>('/data/linda_signals_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load The Linda data');
        setLoading(false);
      }
    })();
  }, []);

  const triggeredRows = useMemo(() =>
    (data?.signals ?? []).filter(s => s.triggered).sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)),
    [data]
  );

  const watchingRows = useMemo(() =>
    (data?.signals ?? []).filter(s => !s.triggered && s.direction != null)
      .sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)),
    [data]
  );

  const allRows = useMemo(() =>
    (data?.signals ?? []).sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [data]
  );

  if (loading) {
    return (
      <div className="text-white flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading The Linda signals…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-white flex items-center justify-center py-24">
        <div className="text-center max-w-lg">
          <p className="text-red-400 mb-4">⚠ Signal data is currently unavailable</p>
          <p className="text-gray-400 text-sm">The Linda signal data could not be loaded. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  const updatedTime = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : '—';

  return (
    <div className="space-y-8 text-white">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="rounded-2xl border border-rose-900/50 bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/30 p-6 md:p-8 mb-8 backdrop-blur shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-900/30 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-rose-400">Mean Reversion</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-300 to-pink-400">
                The Linda
              </h1>
            </div>
            <div className="shrink-0 text-left md:text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Today's Signals</div>
              <div className="text-2xl font-extrabold text-rose-400">
                {new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed w-full mb-5">
            A next-day mean-reversion model inspired by Linda Bradford Raschke's research. On a trend day where price closes at an extreme without ever touching the EMA, a reversion to the mean is highly probable the following session.
          </p>

          <div className="rounded-xl bg-rose-950/40 border border-rose-500/20 p-5 text-sm w-full">
            <div className="font-bold text-rose-300 mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-xs font-black uppercase tracking-wider text-rose-300">Guide</span>
              How to use:
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-rose-500/20">
                <span className="font-bold text-rose-300 block text-xs uppercase mb-1">FADE UP — SELL / SHORT</span>
                Yesterday was a bullish trend day; low never touched EMA → sell/short near the open, target pullback to EMA.
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-emerald-500/20">
                <span className="font-bold text-emerald-300 block text-xs uppercase mb-1">FADE DOWN — BUY / LONG</span>
                Yesterday was a bearish trend day; high never touched EMA → buy near the open, target rally to EMA.
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200 block text-xs uppercase mb-1">Protective Stop-Loss</span>
                Place protective stop-loss 1× ATR beyond the prior day's price extreme (high for shorts, low for longs).
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200 block text-xs uppercase mb-1">Trend Day Qualifier</span>
                Daily Range/ATR ≥ 1.25× and Close in top/bottom 25% of range without touching 20-period 15m EMA.
              </div>
            </div>
          </div>

          {/* Stat bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Today's Signals</div>
              <div className="text-xl font-bold">{new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Total Scanned</div>
              <div className="text-xl font-bold text-rose-300">{data.total_scanned}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Triggered</div>
              <div className="text-xl font-bold text-emerald-300">{data.total_triggered}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Updated</div>
              <div className="text-xl font-bold text-gray-200">{updatedTime}</div>
            </div>
          </div>
        </div>

        {/* Triggered setups */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">Triggered — Active Mean Reversion Setups</h2>
          {triggeredRows.length === 0 ? (
            <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
              <div className="text-gray-300">No trend day / no-EMA-touch setups triggered today.</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {triggeredRows.map(sig => <SignalCard key={sig.symbol} sig={sig} onChartClick={openChart} />)}
            </div>
          )}
        </div>

        {/* Watching — trend day but EMA was touched */}
        {watchingRows.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-200 mb-3">Near Miss — Trend Day, EMA Was Touched</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchingRows.map(sig => (
                <div key={sig.symbol} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-200">{sig.symbol}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700/60 text-slate-400 border border-slate-600/40">
                          {sig.direction === 'FADE_UP' ? 'Bullish Thrust' : 'Bearish Thrust'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{FULL_NAMES[sig.symbol] ?? sig.symbol}</div>
                      <div className="text-xs text-slate-400 mt-1 italic">{sig.reason}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500">EMA Gap</div>
                      <div className="font-mono font-bold text-slate-300">{fmt(sig.gap_pct)}%</div>
                    </div>
                  </div>
                  <button
                    onClick={() => openChart(sig)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                      bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500/50
                      text-slate-300 hover:text-white transition-all duration-150"
                  >
                    📊 View 15-Min Chart
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Scanned */}
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-3">All Scanned ({data?.total_scanned ?? allRows.length})</h2>
          <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-black/20 text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Direction</th>
                    <th className="px-4 py-3 text-right">Close</th>
                    <th className="px-4 py-3 text-right">EMA 20</th>
                    <th className="px-4 py-3 text-right">Gap %</th>
                    <th className="px-4 py-3 text-right">Range/ATR</th>
                    <th className="px-4 py-3 text-right">Strength</th>
                    <th className="px-4 py-3 text-right">Target</th>
                    <th className="px-4 py-3 text-right">Stop</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((sig, i) => (
                    <tr key={sig.symbol} className={`border-t border-slate-700/40 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${sig.triggered ? 'bg-rose-950/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-100">{sig.symbol}</div>
                        <div className="text-xs text-slate-500">{FULL_NAMES[sig.symbol] ?? ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        {sig.direction ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            sig.direction === 'FADE_UP'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {sig.direction === 'FADE_UP' ? 'Fade Up' : 'Fade Down'}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">{fmt(sig.close, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-rose-300">{fmt(sig.ema20, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={sig.gap_pct >= 2 ? 'text-amber-400 font-bold' : 'text-slate-400'}>{fmt(sig.gap_pct)}%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={sig.range_vs_atr >= 1.25 ? 'text-amber-300 font-bold' : 'text-slate-400'}>{fmt(sig.range_vs_atr)}×</span>
                      </td>
                      <td className="px-4 py-3">
                        <TrendBar value={sig.trend_strength} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">{fmt(sig.target, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{fmt(sig.stop, 4)}</td>
                      <td className="px-4 py-3">
                        {sig.triggered ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            ● Active
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Watch</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openChart(sig)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition-colors"
                        >
                          Chart 📈
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Chart Modal */}
        {chartSig && (
          <SignalChartModal
            isOpen={!!chartSig}
            onClose={closeChart}
            symbol={chartSig.symbol}
            strategy="linda"
            interval="15"
            signalLabel={chartSig.direction === 'FADE_UP' ? 'FADE UP — SELL' : chartSig.direction === 'FADE_DOWN' ? 'FADE DOWN — BUY' : 'THE LINDA'}
            direction={chartSig.direction === 'FADE_UP' ? 'fade_up' : chartSig.direction === 'FADE_DOWN' ? 'fade_down' : null}
            entryPrice={chartSig.close}
            targetPrice={chartSig.target}
            stopPrice={chartSig.stop}
            signalDate={data?.date}
            extraRows={[
              { label: 'EMA Gap', value: `${fmt(chartSig.gap_pct)}%`, highlight: chartSig.gap_pct >= 2 },
              { label: 'Range / ATR', value: `${fmt(chartSig.range_vs_atr)}×` },
              { label: '20 EMA Target', value: fmt(chartSig.target, 4) }
            ]}
          />
        )}

      </div>
    </div>
  );
}
