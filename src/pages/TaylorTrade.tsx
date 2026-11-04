import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchJson } from '../lib/http';
import type { TaylorSignalsPayload, TaylorSignalItem } from '../types/taylor';
import SignalChartModal from '../components/SignalChartModal';

const SYMBOL_NAMES: Record<string, string> = {
  ES: 'E-mini S&P 500',
  NQ: 'E-mini Nasdaq 100',
  RTY: 'E-mini Russell 2000',
  YM: 'E-mini Dow Jones',
  GC: 'Gold Futures',
  SI: 'Silver Futures',
  CL: 'Crude Oil Futures',
  NG: 'Natural Gas Futures',
  '6E': 'Euro FX Futures (EC)',
  '6J': 'Japanese Yen Futures',
  '6B': 'British Pound Futures',
  DX: 'US Dollar Index ($)',
  ZB: '30-Year T-Bond Futures',
  ZN: '10-Year T-Note Futures',
};

function formatPrice(val: number) {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  if (Math.abs(val) >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(val) < 2) return val.toFixed(4);
  return val.toFixed(2);
}

function sessionBadge(session?: string | null) {
  if (session === 'ASIA') {
    return { label: '🌙 Asia Session', cls: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' };
  }
  if (session === 'LONDON') {
    return { label: '🌍 London Session', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
  }
  if (session === 'US') {
    return { label: '🗽 US Session', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
  }
  return { label: '📅 Daily RTH', cls: 'bg-slate-800 text-slate-300 border-slate-700' };
}

export default function TaylorTrade() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TaylorSignalsPayload | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'HOURLY_DIV' | 'BUY_DAY' | 'SELL_DAY' | 'SELL_SHORT_DAY'>('ALL');
  const [chartState, setChartState] = useState<{ item: TaylorSignalItem; interval: '60' | 'D' } | null>(null);

  const openChart = useCallback((item: TaylorSignalItem, interval: '60' | 'D') => {
    setChartState({ item, interval });
  }, []);
  const closeChart = useCallback(() => setChartState(null), []);

  useEffect(() => {
    async function loadData() {
      try {
        const payload = await fetchJson<TaylorSignalsPayload>('/data/taylor_signals_latest.json', { cache: 'no-store' });
        setData(payload);
      } catch (err) {
        console.error('Failed loading Taylor signals:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSignals = useMemo(() => {
    if (!data?.signals) return [];
    if (filter === 'ALL') return data.signals;
    if (filter === 'HOURLY_DIV') return data.signals.filter((s) => !!s.hourly_divergence);
    return data.signals.filter((s) => s.cycle_phase === filter);
  }, [data, filter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 animate-spin" />
        </div>
        <p className="text-slate-400 font-medium">Loading The Bradman Signals…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="text-center">
          <p className="text-rose-400 font-semibold mb-2">⚠ Signal data unavailable</p>
          <p className="text-slate-400 text-sm">The Bradman signal data could not be loaded. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || { buy_day_count: 0, sell_day_count: 0, sell_short_day_count: 0 };
  const hourlyDivCount = summary.hourly_div_count ?? data.signals.filter((s) => !!s.hourly_divergence).length;
  const overnightDivCount =
    summary.overnight_div_count ??
    data.signals.filter((s) => s.entry_session === 'ASIA' || s.entry_session === 'LONDON').length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 p-6 md:p-8 border border-slate-800 backdrop-blur shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              The Bradman · 24h Globex + 3-Day Cycle
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-black text-slate-100 tracking-tight">
              The Bradman
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
              Combines George Douglass Taylor&rsquo;s 3-day swing cycle with 24-hour Globex (Asia, London &amp; US) 60-minute{' '}
              <span className="text-slate-200 font-semibold">LBR 3/10 oscillator divergences</span> and{' '}
              <span className="text-slate-200 font-semibold">Keltner Channel (20 EMA &plusmn; 2.5 ATR)</span> exhaustion triggers, including Euro FX (<span className="font-mono">6E</span>) / US Dollar (<span className="font-mono">DX</span>) inverse swing confirmation.
            </p>
          </div>
          <div className="shrink-0 text-left md:text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Signal Session</div>
            <div className="text-2xl font-extrabold text-amber-400">{data.date}</div>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800">
            <div className="text-xs font-semibold uppercase text-slate-400">Total Scanned</div>
            <div className="mt-1 text-2xl font-bold text-slate-100">{data?.total_scanned ?? 0}</div>
            <div className="text-[11px] text-slate-400">Globex + ICE Futures</div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-fuchsia-900/50">
            <div className="text-xs font-semibold uppercase text-fuchsia-300">1H 3/10 Divergences</div>
            <div className="mt-1 text-2xl font-bold text-fuchsia-300">{hourlyDivCount}</div>
            <div className="text-[11px] text-slate-400">{overnightDivCount} entered in Asia / London</div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-emerald-900/40">
            <div className="text-xs font-semibold uppercase text-emerald-400">Buy Days (Day 1)</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">{summary.buy_day_count}</div>
            <div className="text-[11px] text-slate-400">Support / Buy Div Setups</div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-amber-900/40">
            <div className="text-xs font-semibold uppercase text-amber-400">Sell Days (Day 2)</div>
            <div className="mt-1 text-2xl font-bold text-amber-400">{summary.sell_day_count}</div>
            <div className="text-[11px] text-slate-400">Mid-Cycle Rotation</div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-rose-900/40">
            <div className="text-xs font-semibold uppercase text-rose-400">Sell Short Days (Day 3)</div>
            <div className="mt-1 text-2xl font-bold text-rose-400">{summary.sell_short_day_count}</div>
            <div className="text-[11px] text-slate-400">Resistance / Sell Div Setups</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {(
          [
            { id: 'ALL', label: 'All Contracts' },
            { id: 'HOURLY_DIV', label: `⚡ 1H Divergences (${hourlyDivCount})` },
            { id: 'BUY_DAY', label: 'BUY DAY' },
            { id: 'SELL_DAY', label: 'SELL DAY' },
            { id: 'SELL_SHORT_DAY', label: 'SELL SHORT DAY' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              filter === tab.id
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Signals Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSignals.map((item) => {
          const fullName = SYMBOL_NAMES[item.symbol] || item.symbol;
          const isBuy = item.cycle_phase === 'BUY_DAY';
          const isSell = item.cycle_phase === 'SELL_DAY';
          const sBadge = sessionBadge(item.entry_session);

          return (
            <div
              key={item.symbol}
              className={`rounded-2xl bg-slate-900/70 border backdrop-blur p-6 flex flex-col justify-between shadow-lg transition-all hover:border-amber-500/50 ${
                isBuy
                  ? 'border-emerald-500/30 bg-gradient-to-b from-slate-900/80 to-emerald-950/20'
                  : isSell
                    ? 'border-amber-500/30 bg-gradient-to-b from-slate-900/80 to-amber-950/20'
                    : 'border-rose-500/30 bg-gradient-to-b from-slate-900/80 to-rose-950/20'
              }`}
            >
              <div>
                {/* Symbol Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-2xl text-slate-100">{item.symbol}</span>
                      <span className="text-xs font-medium text-slate-400">({fullName})</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-300">
                      Last Close: <span className="font-mono font-bold text-amber-400">{formatPrice(item.close)}</span>
                    </div>
                  </div>

                  {/* Cycle Phase Badge */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                      isBuy
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isSell
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    Day {item.cycle_day} · {item.cycle_phase.replaceAll('_', ' ')}
                  </div>
                </div>

                {/* Overnight / 1H Divergence & Session Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${sBadge.cls}`}>
                    {sBadge.label}
                  </span>
                  {item.hourly_divergence && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase border ${
                        item.hourly_divergence === 'BUY_DIV'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      1H 3/10 {item.hourly_divergence === 'BUY_DIV' ? 'Buy Div' : 'Sell Div'}
                      {item.divergence_time_et ? ` · ${item.divergence_time_et}` : ''}
                    </span>
                  )}
                  {item.keltner_pierce && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Keltner &plusmn;2.5 Pierce
                    </span>
                  )}
                  {item.fx_pair_confirmed && (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ⚡ EC / $ Inverse Div Confirmed
                    </span>
                  )}
                </div>

                {/* Key Objectives Table */}
                <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400">Buying Objective:</span>
                    <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                      ${formatPrice(item.buying_objective)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Selling Objective:</span>
                    <div className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                      ${formatPrice(item.selling_objective)}
                    </div>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Buying Pressure:</span>
                    <div className="font-mono font-medium text-slate-200 mt-0.5">
                      {formatPrice(item.buying_pressure)}
                    </div>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Selling Pressure:</span>
                    <div className="font-mono font-medium text-slate-200 mt-0.5">
                      {formatPrice(item.selling_pressure)}
                    </div>
                  </div>
                </div>

                {/* Recommended Trade Action */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Action:</span>
                    <span
                      className={`font-black uppercase px-2.5 py-0.5 rounded text-xs ${
                        item.action === 'BUY_LONG'
                          ? 'bg-emerald-500 text-slate-950'
                          : item.action === 'SELL_SHORT'
                            ? 'bg-rose-500 text-slate-950'
                            : item.action === 'SELL_EXIT'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {item.action.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Entry:</span>
                      <span className="text-slate-200 font-bold">${formatPrice(item.entry_target)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Target:</span>
                      <span className="text-emerald-400 font-bold">${formatPrice(item.profit_target)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Stop:</span>
                      <span className="text-rose-400 font-bold">${formatPrice(item.stop_loss)}</span>
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <p className="mt-3 text-xs text-slate-400 italic leading-relaxed">
                    &ldquo;{item.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* View Chart Buttons (60m Globex + Daily) */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => openChart(item, '60')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                    item.hourly_divergence
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-200'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-600 hover:border-blue-500/50 text-slate-300 hover:text-white'
                  }`}
                >
                  ⚡ 60m Globex
                </button>
                <button
                  onClick={() => openChart(item, 'D')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                    bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500/50
                    text-slate-300 hover:text-white transition-all duration-150"
                >
                  📈 Daily Chart
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Modal */}
      {chartState && (
        <SignalChartModal
          isOpen={!!chartState}
          onClose={closeChart}
          symbol={chartState.item.symbol}
          strategy="taylor"
          interval={chartState.interval}
          signalLabel={`BRADMAN (${chartState.interval === '60' ? '60M GLOBEX' : 'DAILY'}) — ${chartState.item.cycle_phase.replaceAll('_', ' ')}`}
          direction={
            chartState.item.action === 'BUY_LONG'
              ? 'long'
              : chartState.item.action === 'SELL_SHORT'
                ? 'short'
                : null
          }
          entryPrice={chartState.item.entry_target}
          targetPrice={chartState.item.profit_target}
          stopPrice={chartState.item.stop_loss}
          extraRows={[
            { label: 'Cycle Day', value: `Day ${chartState.item.cycle_day}` },
            { label: 'Session', value: chartState.item.entry_session || 'DAILY', highlight: chartState.item.entry_session === 'ASIA' || chartState.item.entry_session === 'LONDON' },
            ...(chartState.item.hourly_divergence
              ? [{ label: '1H 3/10 Div', value: `${chartState.item.hourly_divergence.replace('_', ' ')} (${chartState.item.divergence_time_et || ''})`, highlight: true }]
              : []),
            { label: 'Buy Objective', value: `$${formatPrice(chartState.item.buying_objective)}` },
            { label: 'Sell Objective', value: `$${formatPrice(chartState.item.selling_objective)}` },
          ]}
        />
      )}
    </div>
  );
}
