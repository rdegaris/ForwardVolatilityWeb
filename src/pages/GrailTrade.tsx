import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchJson } from '../lib/http';
import type { GrailSignalRow, GrailSignalsPayload } from '../types/grail';
import SignalChartModal from '../components/SignalChartModal';
import { AlertCircleIcon, ChartLineIcon } from '../components/Icons';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export default function GrailTrade() {
  const [data, setData] = useState<GrailSignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRow, setChartRow] = useState<GrailSignalRow | null>(null);

  const openChart = useCallback((row: GrailSignalRow) => setChartRow(row), []);
  const closeChart = useCallback(() => setChartRow(null), []);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<GrailSignalsPayload>('/data/grail_signals_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load YouHaveChosenWisely signals');
        setLoading(false);
      }
    })();
  }, []);

  const triggeredRows = useMemo(() => {
    const rows = data?.triggered?.length ? data.triggered : (data?.signals ?? []).filter((r) => r.eligible);
    return [...rows].sort((a, b) => {
      const sym = a.symbol.localeCompare(b.symbol);
      if (sym !== 0) return sym;
      return (a.side || '').localeCompare(b.side || '');
    });
  }, [data]);

  const watchingRows = useMemo(() => {
    const rows = data?.signals ?? [];
    return [...rows]
      .filter((r) => !r.eligible && r.adx >= (data?.adx_threshold ?? 30))
      .sort((a, b) => a.distance_to_ema_pct - b.distance_to_ema_pct);
  }, [data]);

  const allRows = useMemo(() => {
    const rows = data?.signals ?? [];
    return [...rows].sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.adx - a.adx;
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading YouHaveChosenWisely signals…</p>
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
        <p className="text-sm text-desk-muted">YouHaveChosenWisely signal data could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>ADX trend continuation / 20 EMA pullback</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
              YouHaveChosenWisely
            </h1>
            <p className="text-sm leading-relaxed text-desk-secondary">
              Trend-continuation pullback model capturing 20-period EMA retracements inside strong directional trends (ADX ≥ {data.adx_threshold ?? 30}), paired with swing-extreme targets and ATR-calibrated stops.
            </p>
          </div>
          <div className="shrink-0 md:text-right">
            <div className="text-xs text-desk-muted">Signal session</div>
            <div className="mt-1 text-xl font-medium font-mono text-desk-text">{data.date}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Contracts scanned</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {data.total_scanned ?? allRows.length}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Triggered setups</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-up">
              {data.total_triggered}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Strong trend watching</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {watchingRows.length}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Updated</div>
            <div className="mt-2 text-lg leading-none font-medium font-mono text-desk-text">
              {new Date(data.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
            </div>
          </div>
        </div>
      </section>

      {/* Triggered Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">Triggered setups</h2>
        {triggeredRows.length === 0 ? (
          <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
            No contracts have tagged the 20 EMA pullback zone today
          </div>
        ) : (
          <div className="desk-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">Contract</th>
                    <th className="px-4 py-3 text-left font-normal">Side</th>
                    <th className="px-4 py-3 text-left font-normal">Cluster</th>
                    <th className="px-4 py-3 text-right font-normal">Close</th>
                    <th className="px-4 py-3 text-right font-normal">EMA 20</th>
                    <th className="px-4 py-3 text-right font-normal">ADX</th>
                    <th className="px-4 py-3 text-right font-normal">+DI / -DI</th>
                    <th className="px-4 py-3 text-right font-normal">Entry zone</th>
                    <th className="px-4 py-3 text-right font-normal">Stop</th>
                    <th className="px-4 py-3 text-right font-normal">Target</th>
                    <th className="px-4 py-3 text-left font-normal">Notes</th>
                    <th className="px-4 py-3 text-right font-normal">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {triggeredRows.map((r, idx) => (
                    <tr
                      key={`${r.symbol}-${idx}`}
                      className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={r.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                          {r.side === 'long' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-desk-secondary">{r.cluster || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.close, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.ema20, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-desk-text">{formatNum(r.adx, 1)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">
                        {formatNum(r.plus_di, 1)} / {formatNum(r.minus_di, 1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.entry_zone, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.stop_loss, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-up">{formatNum(r.target, 4)}</td>
                      <td className="px-4 py-3 text-desk-secondary">{r.reason}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openChart(r)}
                          className="desk-btn-secondary h-7 px-2.5 text-xs"
                        >
                          <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                          <span>1D</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Watching Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">Strong trend watchlist (awaiting EMA pullback)</h2>
        {watchingRows.length === 0 ? (
          <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
            No contracts with ADX ≥ {data.adx_threshold ?? 30} currently awaiting pullback
          </div>
        ) : (
          <div className="desk-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">Contract</th>
                    <th className="px-4 py-3 text-left font-normal">Trend</th>
                    <th className="px-4 py-3 text-left font-normal">Cluster</th>
                    <th className="px-4 py-3 text-right font-normal">Close</th>
                    <th className="px-4 py-3 text-right font-normal">EMA 20</th>
                    <th className="px-4 py-3 text-right font-normal">Dist to EMA</th>
                    <th className="px-4 py-3 text-right font-normal">ADX</th>
                    <th className="px-4 py-3 text-right font-normal">+DI / -DI</th>
                    <th className="px-4 py-3 text-left font-normal">Status</th>
                    <th className="px-4 py-3 text-right font-normal">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {watchingRows.map((r, idx) => (
                    <tr
                      key={`${r.symbol}-${idx}`}
                      className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                      <td className="px-4 py-3">
                        {r.side === 'long' ? (
                          <span className="desk-tag-up">Up</span>
                        ) : r.side === 'short' ? (
                          <span className="desk-tag-down">Down</span>
                        ) : (
                          <span className="text-desk-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-desk-secondary">{r.cluster || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.close, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.ema20, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.distance_to_ema_pct, 1)}%</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-desk-text">{formatNum(r.adx, 1)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">
                        {formatNum(r.plus_di, 1)} / {formatNum(r.minus_di, 1)}
                      </td>
                      <td className="px-4 py-3 text-desk-muted">{r.reason}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openChart(r)}
                          className="desk-btn-secondary h-7 px-2.5 text-xs"
                        >
                          <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                          <span>1D</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

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
                  <th className="px-4 py-3 text-left font-normal">Status</th>
                  <th className="px-4 py-3 text-left font-normal">Trend</th>
                  <th className="px-4 py-3 text-right font-normal">Close</th>
                  <th className="px-4 py-3 text-right font-normal">EMA 20</th>
                  <th className="px-4 py-3 text-right font-normal">ADX</th>
                  <th className="px-4 py-3 text-right font-normal">+DI / -DI</th>
                  <th className="px-4 py-3 text-left font-normal">Notes</th>
                  <th className="px-4 py-3 text-right font-normal">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {allRows.map((r, idx) => (
                  <tr
                    key={`${r.symbol}-${idx}`}
                    className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                    <td className="px-4 py-3">
                      {r.eligible ? (
                        <span className="inline-flex items-center gap-1.5 text-desk-up">
                          <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
                          <span>Triggered</span>
                        </span>
                      ) : (
                        <span className="text-desk-muted">Waiting</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.side === 'long' ? (
                        <span className="text-desk-up">Long</span>
                      ) : r.side === 'short' ? (
                        <span className="text-desk-down">Short</span>
                      ) : (
                        <span className="text-desk-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.close, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.ema20, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.adx, 1)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">
                      {formatNum(r.plus_di, 1)} / {formatNum(r.minus_di, 1)}
                    </td>
                    <td className="px-4 py-3 text-desk-muted">{r.reason}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openChart(r)}
                        className="desk-btn-secondary h-7 px-2.5 text-xs"
                      >
                        <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                        <span>1D</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {chartRow && (
        <SignalChartModal
          isOpen={!!chartRow}
          onClose={closeChart}
          symbol={chartRow.symbol}
          strategy="grail"
          interval="D"
          signalLabel={
            chartRow.side && chartRow.side !== 'none'
              ? `YouHaveChosenWisely · ${chartRow.side === 'long' ? 'Long' : 'Short'}`
              : 'YouHaveChosenWisely'
          }
          direction={chartRow.side === 'long' ? 'long' : chartRow.side === 'short' ? 'short' : null}
          entryPrice={chartRow.entry_zone ?? chartRow.ema20}
          targetPrice={chartRow.target}
          stopPrice={chartRow.stop_loss}
          signalDate={data?.date}
          extraRows={[
            { label: 'ADX (14)', value: formatNum(chartRow.adx, 1), highlight: chartRow.adx >= (data?.adx_threshold ?? 30) },
            { label: '+DI / -DI', value: `${formatNum(chartRow.plus_di, 1)} / ${formatNum(chartRow.minus_di, 1)}` },
            { label: 'EMA (20)', value: formatNum(chartRow.ema20, 4) },
          ]}
        />
      )}
    </div>
  );
}
