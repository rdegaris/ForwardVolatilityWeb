import { useEffect, useState, useMemo } from 'react';
import { fetchJson } from '../lib/http';
import type { TaylorSignalsPayload, TaylorSignalItem } from '../types/taylor';

const SYMBOL_NAMES: Record<string, string> = {
  ES: 'E-mini S&P 500',
  NQ: 'E-mini Nasdaq 100',
  RTY: 'E-mini Russell 2000',
  YM: 'E-mini Dow Jones',
  GC: 'Gold Futures',
  SI: 'Silver Futures',
  CL: 'Crude Oil Futures',
  NG: 'Natural Gas Futures',
  '6E': 'Euro FX Futures',
  '6J': 'Japanese Yen Futures',
  '6B': 'British Pound Futures',
  ZB: '30-Year T-Bond Futures',
  ZN: '10-Year T-Note Futures',
};

function formatPrice(val: number) {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  if (Math.abs(val) >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(val) < 2) return val.toFixed(4);
  return val.toFixed(2);
}

export default function TaylorTrade() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TaylorSignalsPayload | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BUY_DAY' | 'SELL_DAY' | 'SELL_SHORT_DAY'>('ALL');

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

  const summary = data?.summary || { buy_day_count: 0, sell_day_count: 0, sell_short_day_count: 0 };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 p-6 md:p-8 border border-slate-800 backdrop-blur shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              The Bradman · 3-Day Cycle
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-black text-slate-100 tracking-tight">
              The Bradman
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
              A systematic 3-day momentum and mean-reversion model. Customized across liquid commodity and financial futures markets using proprietary backtested parameters to identify high-probability cycle turning points and objective target levels.
            </p>
          </div>
          <div className="shrink-0 text-left md:text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Latest Cycle Date</div>
            <div className="text-2xl font-extrabold text-amber-400">{data?.date || '—'}</div>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800">
            <div className="text-xs font-semibold uppercase text-slate-400">Total Scanned</div>
            <div className="mt-1 text-2xl font-bold text-slate-100">{data?.total_scanned ?? 0}</div>
            <div className="text-[11px] text-slate-400">Active Futures Contracts</div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-emerald-900/40">
            <div className="text-xs font-semibold uppercase text-emerald-400">Buy Days (Day 1)</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">{summary.buy_day_count}</div>
            <div className="text-[11px] text-slate-400">Support / Long Setups</div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-amber-900/40">
            <div className="text-xs font-semibold uppercase text-amber-400">Sell Days (Day 2)</div>
            <div className="mt-1 text-2xl font-bold text-amber-400">{summary.sell_day_count}</div>
            <div className="text-[11px] text-slate-400">Target Rally Exits</div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-rose-900/40">
            <div className="text-xs font-semibold uppercase text-rose-400">Sell Short Days (Day 3)</div>
            <div className="mt-1 text-2xl font-bold text-rose-400">{summary.sell_short_day_count}</div>
            <div className="text-[11px] text-slate-400">Resistance Short Entries</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['ALL', 'BUY_DAY', 'SELL_DAY', 'SELL_SHORT_DAY'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              filter === tab
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab === 'ALL' ? 'All Contracts' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Signals Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSignals.map((item) => {
          const fullName = SYMBOL_NAMES[item.symbol] || item.symbol;
          const isBuy = item.cycle_phase === 'BUY_DAY';
          const isSell = item.cycle_phase === 'SELL_DAY';
          const isShort = item.cycle_phase === 'SELL_SHORT_DAY';

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
                      Last Close: <span className="font-mono font-bold text-amber-400">${formatPrice(item.last_close)}</span>
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
                    Day {item.cycle_day} · {item.cycle_phase.replace('_', ' ')}
                  </div>
                </div>

                {/* Key Objectives Table */}
                <div className="mt-5 grid grid-cols-2 gap-2 bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 text-xs">
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
                      {item.action.replace('_', ' ')}
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

                {/* Strategy Notes */}
                <p className="mt-3 text-xs text-slate-400 italic leading-relaxed">
                  "{item.notes}"
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
