import { useEffect, useMemo, useState, useCallback } from 'react';
import type { LindaSignalsPayload, LindaSignalRow } from '../types/linda';
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

function TrendBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const isBull = pct >= 75;
  const isBear = pct <= 25;
  const color = isBull ? 'bg-desk-up' : isBear ? 'bg-desk-down' : 'bg-desk-muted';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-desk-raised">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-desk-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

function SignalCard({ sig, onChartClick }: { sig: LindaSignalRow; onChartClick: (sig: LindaSignalRow) => void }) {
  const isFadeUp = sig.direction === 'FADE_UP';
  const fullName = FULL_NAMES[sig.symbol] ?? sig.symbol;

  return (
    <div className="desk-surface rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-hairline-strong transition-colors duration-150 ease-desk">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span className="font-mono text-xl font-medium text-desk-text">{sig.symbol}</span>
              <span className={isFadeUp ? 'desk-tag-down' : 'desk-tag-up'}>
                {isFadeUp ? 'Fade up · Short' : 'Fade down · Long'}
              </span>
            </div>
            <div className="text-xs text-desk-muted mt-0.5">{fullName}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-desk-muted">EMA gap</div>
            <div className="text-lg font-medium font-mono text-desk-text">{fmt(sig.gap_pct)}%</div>
          </div>
        </div>

        {/* Price grid */}
        <div className="desk-well rounded-xl p-3.5 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-desk-muted">Prior close</div>
            <div className="mt-1 font-mono font-medium text-desk-text">{fmt(sig.close, 4)}</div>
          </div>
          <div>
            <div className="text-desk-muted">Target (EMA)</div>
            <div className={`mt-1 font-mono font-medium ${isFadeUp ? 'text-desk-down' : 'text-desk-up'}`}>
              {fmt(sig.target, 4)}
            </div>
          </div>
          <div>
            <div className="text-desk-muted">Stop</div>
            <div className="mt-1 font-mono font-medium text-desk-secondary">{fmt(sig.stop, 4)}</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-desk-muted mb-1">Range / ATR</div>
            <div className="font-mono font-medium text-desk-text">{fmt(sig.range_vs_atr)}×</div>
          </div>
          <div>
            <div className="text-desk-muted mb-1">ATR (20)</div>
            <div className="font-mono font-medium text-desk-text">{fmt(sig.atr20, 4)}</div>
          </div>
          <div>
            <div className="text-desk-muted mb-1">Close location</div>
            <TrendBar value={sig.trend_strength} />
          </div>
        </div>

        <p className="text-xs text-desk-secondary leading-relaxed">{sig.reason}</p>
      </div>

      <button
        type="button"
        onClick={() => onChartClick(sig)}
        className="desk-btn-secondary w-full h-8 text-xs"
      >
        <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
        <span>15-minute chart</span>
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

  const triggeredRows = useMemo(
    () => (data?.signals ?? []).filter((s) => s.triggered).sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)),
    [data]
  );

  const watchingRows = useMemo(
    () =>
      (data?.signals ?? [])
        .filter((s) => !s.triggered && s.direction != null)
        .sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)),
    [data]
  );

  const allRows = useMemo(
    () => [...(data?.signals ?? [])].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [data]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading The Linda signals…</p>
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
        <p className="text-sm text-desk-muted">The Linda signal feed could not be loaded.</p>
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
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>15-minute pit session EMA reversion</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
              The Linda
            </h1>
            <p className="text-sm leading-relaxed text-desk-secondary">
              Next-day mean-reversion model derived from Linda Bradford Raschke’s trend-day research. When a contract closes in the extreme 25% of a wide pit session without touching its 20-period 15-minute EMA, reversion toward the EMA is favored on the following session.
            </p>
          </div>
          <div className="shrink-0 md:text-right">
            <div className="text-xs text-desk-muted">Signal date</div>
            <div className="mt-1 text-xl font-medium font-mono text-desk-text">{data.date}</div>
          </div>
        </div>

        {/* Execution rules */}
        <div className="grid md:grid-cols-4 gap-3 text-xs">
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-desk-down">Fade up · Short</div>
            <p className="text-desk-secondary leading-relaxed">
              Prior session closed near highs without touching 15m EMA; look to fade near open toward EMA.
            </p>
          </div>
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-desk-up">Fade down · Long</div>
            <p className="text-desk-secondary leading-relaxed">
              Prior session closed near lows without touching 15m EMA; look to buy near open toward EMA.
            </p>
          </div>
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-desk-text">Protective stop</div>
            <p className="text-desk-secondary leading-relaxed">
              Placed 1.0 × ATR beyond the prior day’s session extreme (high for shorts, low for longs).
            </p>
          </div>
          <div className="desk-well rounded-xl p-4 space-y-1">
            <div className="font-medium text-desk-text">Trend day qualifier</div>
            <p className="text-desk-secondary leading-relaxed">
              Pit range / ATR ≥ {(data.trend_day_atr_multiple ?? 0.7).toFixed(2)}× and close in outer 25% of range.
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
            <div className="text-xs text-desk-muted">Triggered today</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-up">
              {data.total_triggered}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Near-miss thrust</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {watchingRows.length}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Last updated</div>
            <div className="mt-2 text-lg leading-none font-medium font-mono text-desk-text">
              {updatedTime}
            </div>
          </div>
        </div>
      </section>

      {/* Triggered setups */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">Triggered mean-reversion setups</h2>
        {triggeredRows.length === 0 ? (
          <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
            No untagged-EMA trend-day setups triggered today
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {triggeredRows.map((sig) => (
              <SignalCard key={sig.symbol} sig={sig} onChartClick={openChart} />
            ))}
          </div>
        )}
      </section>

      {/* Near Miss */}
      {watchingRows.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-desk-text">Near miss (trend day, EMA touched)</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchingRows.map((sig) => (
              <div key={sig.symbol} className="desk-surface rounded-xl p-4 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-desk-text">{sig.symbol}</span>
                      <span className="desk-tag text-[11px]">
                        {sig.direction === 'FADE_UP' ? 'Bullish thrust' : 'Bearish thrust'}
                      </span>
                    </div>
                    <div className="text-xs text-desk-muted mt-0.5">{FULL_NAMES[sig.symbol] ?? sig.symbol}</div>
                    <div className="text-xs text-desk-secondary mt-1.5">{sig.reason}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-desk-muted">EMA gap</div>
                    <div className="font-mono font-medium text-desk-text">{fmt(sig.gap_pct)}%</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openChart(sig)}
                  className="desk-btn-secondary w-full h-8 text-xs"
                >
                  <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                  <span>15-minute chart</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Scanned */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">
          All contracts scanned ({data?.total_scanned ?? allRows.length})
        </h2>
        <div className="desk-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-normal">Contract</th>
                  <th className="px-4 py-3 text-left font-normal">Direction</th>
                  <th className="px-4 py-3 text-right font-normal">Close</th>
                  <th className="px-4 py-3 text-right font-normal">EMA 20</th>
                  <th className="px-4 py-3 text-right font-normal">Gap %</th>
                  <th className="px-4 py-3 text-right font-normal">Range / ATR</th>
                  <th className="px-4 py-3 text-left font-normal">Close loc</th>
                  <th className="px-4 py-3 text-right font-normal">Target</th>
                  <th className="px-4 py-3 text-right font-normal">Stop</th>
                  <th className="px-4 py-3 text-left font-normal">Status</th>
                  <th className="px-4 py-3 text-right font-normal">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {allRows.map((sig) => (
                  <tr
                    key={sig.symbol}
                    className={`hover:bg-desk-raised/40 transition-colors duration-150 ease-desk ${
                      sig.triggered ? 'bg-desk-raised/25' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-desk-text">{sig.symbol}</div>
                      <div className="text-[11px] text-desk-muted">{FULL_NAMES[sig.symbol] ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      {sig.direction ? (
                        <span className={sig.direction === 'FADE_UP' ? 'desk-tag-down' : 'desk-tag-up'}>
                          {sig.direction === 'FADE_UP' ? 'Fade up' : 'Fade down'}
                        </span>
                      ) : (
                        <span className="text-desk-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{fmt(sig.close, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{fmt(sig.ema20, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{fmt(sig.gap_pct)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{fmt(sig.range_vs_atr)}×</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <TrendBar value={sig.trend_strength} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{fmt(sig.target, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-muted">{fmt(sig.stop, 4)}</td>
                    <td className="px-4 py-3">
                      {sig.triggered ? (
                        <span className="inline-flex items-center gap-1.5 text-desk-up">
                          <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-desk-muted">Watch</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openChart(sig)}
                        className="desk-btn-secondary h-7 px-2.5 text-xs"
                      >
                        <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                        <span>15m</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {chartSig && (
        <SignalChartModal
          isOpen={!!chartSig}
          onClose={closeChart}
          symbol={chartSig.symbol}
          strategy="linda"
          interval="15"
          signalLabel={
            chartSig.direction === 'FADE_UP'
              ? 'Fade up · Short'
              : chartSig.direction === 'FADE_DOWN'
                ? 'Fade down · Long'
                : 'The Linda'
          }
          direction={
            chartSig.direction === 'FADE_UP'
              ? 'fade_up'
              : chartSig.direction === 'FADE_DOWN'
                ? 'fade_down'
                : null
          }
          entryPrice={chartSig.close}
          targetPrice={chartSig.target}
          stopPrice={chartSig.stop}
          signalDate={data?.date}
          extraRows={[
            { label: 'EMA gap', value: `${fmt(chartSig.gap_pct)}%`, highlight: chartSig.gap_pct >= 2 },
            { label: 'Range / ATR', value: `${fmt(chartSig.range_vs_atr)}×` },
            { label: '20 EMA target', value: fmt(chartSig.target, 4) },
          ]}
        />
      )}
    </div>
  );
}
