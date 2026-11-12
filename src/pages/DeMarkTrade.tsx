import { useEffect, useMemo, useState, useCallback } from 'react';
import type { DeMarkSignalsPayload, DeMarkSignalRow } from '../types/demark';
import SignalChartModal from '../components/SignalChartModal';
import { AlertCircleIcon, ChartLineIcon } from '../components/Icons';

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

const FULL_NAMES: Record<string, string> = {
  ES: 'E-mini S&P 500',
  NQ: 'E-mini Nasdaq 100',
  RTY: 'E-mini Russell 2000',
  YM: 'E-mini Dow Jones',
  GC: 'Gold',
  SI: 'Silver',
  CL: 'Crude Oil',
  NG: 'Natural Gas',
  '6E': 'Euro FX',
  '6J': 'Japanese Yen',
  '6B': 'British Pound',
  DX: 'US Dollar Index',
  ZB: '30-Yr T-Bond',
  ZN: '10-Yr T-Note',
};

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function CountdownProgressBar({ count, max = 13 }: { count: number; max?: number }) {
  const pct = Math.min(100, Math.round((count / max) * 100));
  const isComplete = count >= 13;
  const isNear = count >= 10 && count < 13;
  const color = isComplete ? 'bg-desk-down' : isNear ? 'bg-amber-400' : count > 0 ? 'bg-desk-accent' : 'bg-desk-muted';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-desk-muted">Countdown Progress</span>
        <span className="font-mono font-medium text-desk-text">{count} / {max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-desk-raised overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DeMarkCard({
  sig,
  onChartClick,
}: {
  sig: DeMarkSignalRow;
  onChartClick: (sig: DeMarkSignalRow) => void;
}) {
  const fullName = FULL_NAMES[sig.symbol] ?? sig.symbol;
  const isTriggered = sig.triggered;
  const isNear = sig.countdown_active && sig.countdown_count >= 10;
  const isActive = sig.countdown_active && sig.countdown_count > 0;
  const isSetup = sig.setup_count > 0 && !sig.countdown_active;

  return (
    <div className={`desk-surface rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors duration-150 ease-desk ${
      isTriggered
        ? 'border-desk-down/60 ring-1 ring-desk-down/30'
        : isNear
        ? 'border-amber-400/40'
        : 'hover:border-hairline-strong'
    }`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                isTriggered
                  ? 'bg-desk-down animate-ping'
                  : isNear
                  ? 'bg-amber-400'
                  : isActive
                  ? 'bg-desk-accent'
                  : 'bg-desk-muted'
              }`} />
              <span className="font-mono text-xl font-medium text-desk-text">{sig.symbol}</span>
              {isTriggered && (
                <span className="desk-tag-down">
                  Countdown 13 Triggered
                </span>
              )}
              {!isTriggered && isNear && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-400/10 text-amber-400 border border-amber-400/30">
                  Imminent 13 ({sig.countdown_count}/13)
                </span>
              )}
              {!isTriggered && !isNear && isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/30">
                  Countdown {sig.countdown_count}/13
                </span>
              )}
              {!isTriggered && !isActive && isSetup && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-purple-400/10 text-purple-400 border border-purple-400/30">
                  Setup {sig.setup_count}/9
                </span>
              )}
              {!isTriggered && !isActive && !isSetup && (
                <span className="desk-tag-muted">Neutral</span>
              )}
            </div>
            <div className="text-xs text-desk-muted mt-0.5">{fullName}</div>
          </div>

          <div className="text-right">
            <div className="text-xs text-desk-muted">Last Close</div>
            <div className="text-lg font-medium font-mono text-desk-text">{fmt(sig.last_close, 4)}</div>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <CountdownProgressBar count={sig.countdown_count} max={13} />

        {/* Price & TDST Grid */}
        <div className="desk-well rounded-xl p-3.5 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-desk-muted">TDST Resistance</div>
            <div className="mt-1 font-mono font-medium text-desk-text">{fmt(sig.tdst_resistance, 4)}</div>
          </div>
          <div>
            <div className="text-desk-muted">TDST Support</div>
            <div className="mt-1 font-mono font-medium text-desk-secondary">{fmt(sig.tdst_support, 4)}</div>
          </div>
          <div>
            <div className="text-desk-muted">20-day ATR</div>
            <div className="mt-1 font-mono font-medium text-desk-text">{fmt(sig.atr20, 4)}</div>
          </div>
        </div>

        {/* Trade Execution Grid */}
        <div className="desk-well rounded-xl p-3.5 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-desk-muted">Short Entry</div>
            <div className="mt-1 font-mono font-medium text-desk-down">{fmt(sig.entry_price, 4)}</div>
          </div>
          <div>
            <div className="text-desk-muted">Stop (TD Risk)</div>
            <div className="mt-1 font-mono font-medium text-desk-secondary">{fmt(sig.stop_loss, 4)}</div>
          </div>
          <div>
            <div className="text-desk-muted">Profit Target</div>
            <div className="mt-1 font-mono font-medium text-desk-up">{fmt(sig.profit_target, 4)}</div>
          </div>
        </div>

        {/* Status / Notes */}
        <div className="text-xs text-desk-secondary leading-relaxed bg-desk-base/40 rounded-lg p-2.5">
          {sig.notes}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-hairline text-xs">
        <span className="text-desk-muted font-mono">Qty: {sig.unit_qty} unit{sig.unit_qty > 1 ? 's' : ''}</span>
        <button
          onClick={() => onChartClick(sig)}
          className="desk-btn-secondary h-7 px-2.5 text-xs inline-flex items-center gap-1.5"
        >
          <ChartLineIcon className="w-3.5 h-3.5" />
          <span>Chart</span>
        </button>
      </div>
    </div>
  );
}

export default function DeMarkTrade() {
  const [data, setData] = useState<DeMarkSignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'IMMINENT' | 'ACTIVE_COUNTDOWN' | 'ACTIVE_SETUP'>('ALL');
  const [chartItem, setChartItem] = useState<DeMarkSignalRow | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchJson<DeMarkSignalsPayload>('/data/demark_signals_latest.json', { cache: 'no-store' });
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load DeMark Sequential signals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSignals = useMemo(() => {
    if (!data?.signals) return [];
    if (filter === 'IMMINENT') {
      return data.signals.filter((s) => s.triggered || (s.countdown_active && s.countdown_count >= 10));
    }
    if (filter === 'ACTIVE_COUNTDOWN') {
      return data.signals.filter((s) => s.countdown_active && s.countdown_count > 0);
    }
    if (filter === 'ACTIVE_SETUP') {
      return data.signals.filter((s) => s.setup_count > 0);
    }
    return data.signals;
  }, [data, filter]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-sm text-desk-muted">Loading DeMark Sequential signals…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-2 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-desk-down">
          <AlertCircleIcon className="w-4 h-4" />
          <span>Signal data unavailable</span>
        </div>
        <p className="text-sm text-desk-muted">The DeMark Sequential signal feed could not be loaded.</p>
      </div>
    );
  }

  const updatedTime = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : '—';

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-down" />
              <span>Tom DeMark Sequential · Exhaustion Countdown Model</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
              DeMark Sequential
            </h1>
            <p className="text-sm leading-relaxed text-desk-secondary">
              Institutional trend-exhaustion model. Tracks the 9-bar TD Sell Setup followed by the 13-bar TD Sell Countdown across the OzCTA futures basket. Signals a high-probability exhaustion top and mean-reversion short trade upon reaching qualified Countdown 13.
            </p>
          </div>
          <div className="shrink-0 md:text-right">
            <div className="text-xs text-desk-muted">Signal date</div>
            <div className="mt-1 text-xl font-medium font-mono text-desk-text">{data.date}</div>
            <div className="text-xs text-desk-muted mt-1">Updated {updatedTime}</div>
          </div>
        </div>

        {/* Execution rules */}
        <div className="grid md:grid-cols-4 gap-3 text-xs">
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-purple-400">1. 9-Bar TD Sell Setup</div>
            <p className="text-desk-secondary leading-relaxed">
              9 consecutive closes higher than close 4 bars prior (<span className="font-mono text-desk-text">close &gt; close[t-4]</span>). Establishes TDST Support & Resistance.
            </p>
          </div>
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-cyan-400">2. 13-Bar TD Countdown</div>
            <p className="text-desk-secondary leading-relaxed">
              13 non-consecutive closes <span className="font-mono text-desk-text">≥ high[t-2]</span>. Canceled if close undercuts TDST Support or opposing Buy Setup completes.
            </p>
          </div>
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-amber-400">3. Bar 13 Qualification</div>
            <p className="text-desk-secondary leading-relaxed">
              High of Bar 13 must be <span className="font-mono text-desk-text">≥ close[Countdown Bar 8]</span>. Ensures final surge exhaustion before trigger.
            </p>
          </div>
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-desk-down">4. Short Entry & TD Risk</div>
            <p className="text-desk-secondary leading-relaxed">
              Fade market on Countdown 13 close. Protective stop placed +1.0× ATR above highest countdown high, targeting mean-reversion.
            </p>
          </div>
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Contracts scanned</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {data.total_scanned}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Countdown 13 Triggered</div>
            <div className={`mt-2 text-[28px] leading-none font-medium font-mono ${data.total_triggered > 0 ? 'text-desk-down' : 'text-desk-muted'}`}>
              {data.total_triggered}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Imminent (Count ≥ 10)</div>
            <div className={`mt-2 text-[28px] leading-none font-medium font-mono ${data.total_approaching_13 > 0 ? 'text-amber-400' : 'text-desk-text'}`}>
              {data.total_approaching_13}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Active Countdowns</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-cyan-400">
              {data.total_countdown_active}
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-desk-text text-desk-deep'
                : 'desk-well text-desk-secondary hover:text-desk-text'
            }`}
          >
            All Contracts ({data.signals.length})
          </button>
          <button
            onClick={() => setFilter('IMMINENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'IMMINENT'
                ? 'bg-desk-text text-desk-deep'
                : 'desk-well text-desk-secondary hover:text-desk-text'
            }`}
          >
            Imminent / Triggered ({data.signals.filter((s) => s.triggered || (s.countdown_active && s.countdown_count >= 10)).length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE_COUNTDOWN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'ACTIVE_COUNTDOWN'
                ? 'bg-desk-text text-desk-deep'
                : 'desk-well text-desk-secondary hover:text-desk-text'
            }`}
          >
            Countdowns Active ({data.signals.filter((s) => s.countdown_active && s.countdown_count > 0).length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE_SETUP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'ACTIVE_SETUP'
                ? 'bg-desk-text text-desk-deep'
                : 'desk-well text-desk-secondary hover:text-desk-text'
            }`}
          >
            Setups Active ({data.signals.filter((s) => s.setup_count > 0).length})
          </button>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSignals.map((sig) => (
          <DeMarkCard
            key={sig.symbol}
            sig={sig}
            onChartClick={(s) => setChartItem(s)}
          />
        ))}
      </div>

      {/* Chart Modal */}
      {chartItem && (
        <SignalChartModal
          isOpen={true}
          onClose={() => setChartItem(null)}
          symbol={chartItem.symbol}
          strategy="demark"
          signalLabel={`DeMark Sequential · Countdown ${chartItem.countdown_count}/13`}
        />
      )}
    </div>
  );
}
