import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleSignalRow, TurtleSignalsPayload, TurtleTriggeredSignal } from '../types/turtle';
import SignalChartModal from '../components/SignalChartModal';
import { AlertCircleIcon, ChartLineIcon } from '../components/Icons';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export default function TurtleSignals() {
  const [data, setData] = useState<TurtleSignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartItem, setChartItem] = useState<{
    symbol: string;
    side?: 'long' | 'short' | null;
    entry?: number | null;
    stop?: number | null;
    close?: number | null;
    n?: number | null;
    qty?: number | null;
  } | null>(null);

  const closeChart = useCallback(() => setChartItem(null), []);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<TurtleSignalsPayload>('/data/turtle_signals_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load Trendorama signals');
        setLoading(false);
      }
    })();
  }, []);

  const triggeredRows = useMemo(() => {
    const rows = data?.triggered ?? [];
    return [...rows].sort((a, b) => {
      const sym = a.symbol.localeCompare(b.symbol);
      if (sym !== 0) return sym;
      return (a.side || '').localeCompare(b.side || '');
    });
  }, [data]);

  const allRows = useMemo(() => {
    const rows = data?.signals ?? [];
    return [...rows].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading Trendorama signals…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-2 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-desk-down">
          <AlertCircleIcon className="w-4 h-4" />
          <span>{error || 'Signal data unavailable'}</span>
        </div>
        <p className="text-sm text-desk-muted">
          Ensure <span className="font-mono">turtle_signals_latest.json</span> is present in <span className="font-mono">public/data</span>.
        </p>
      </div>
    );
  }

  const total = allRows.length;
  const triggered = triggeredRows.length;

  return (
    <div className="space-y-8">
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>55-day Donchian channel breakout</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
              Trendorama
            </h1>
            <p className="text-sm leading-relaxed text-desk-secondary">
              Systematic trend-following breakout model engineered to capture sustained commodity, currency, and financial futures trends with 2×N ATR protective stops and volatility-normalized unit sizing.
            </p>
          </div>
          <div className="shrink-0 md:text-right">
            <div className="text-xs text-desk-muted">Signal session</div>
            <div className="mt-1 text-xl font-medium font-mono text-desk-text">{data.date}</div>
          </div>
        </div>

        <div className="desk-well rounded-xl p-4 grid md:grid-cols-2 gap-3 text-xs text-desk-secondary">
          <div>
            <span className="text-desk-text font-medium">Stop-entry reference:</span> Use <span className="font-mono text-desk-text">Entry</span> for next-session stop placement and <span className="font-mono text-desk-text">Stop</span> for the 2×N protective exit rounded to contract tick size.
          </div>
          <div>
            <span className="text-desk-text font-medium">Position check:</span> Review <span className="font-mono text-desk-text">Open trades</span> and cluster limits before adding exposure in correlated contracts.
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Contracts scanned</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {data.total_scanned ?? total}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Triggered today</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-up">
              {triggered}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Eligible breakouts</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {triggeredRows.filter((r) => r.eligible !== false).length}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Updated</div>
            <div className="mt-2 text-lg leading-none font-medium font-mono text-desk-text">
              {data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">Triggered today</h2>
        {triggeredRows.length === 0 ? (
          <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
            No contracts triggered on the latest bar
          </div>
        ) : (
          <div className="desk-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">Contract</th>
                    <th className="px-4 py-3 text-left font-normal">Side</th>
                    <th className="px-4 py-3 text-left font-normal">Eligibility</th>
                    <th className="px-4 py-3 text-left font-normal">Cluster</th>
                    <th className="px-4 py-3 text-right font-normal">Close</th>
                    <th className="px-4 py-3 text-right font-normal">Entry</th>
                    <th className="px-4 py-3 text-right font-normal">Stop</th>
                    <th className="px-4 py-3 text-right font-normal">Unit qty</th>
                    <th className="px-4 py-3 text-right font-normal">N (ATR)</th>
                    <th className="px-4 py-3 text-left font-normal">As of</th>
                    <th className="px-4 py-3 text-left font-normal">Notes</th>
                    <th className="px-4 py-3 text-right font-normal">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {triggeredRows.map((r: TurtleTriggeredSignal, idx: number) => (
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
                      <td className="px-4 py-3">
                        {r.eligible === true ? (
                          <span className="text-desk-up">Eligible</span>
                        ) : r.eligible === false ? (
                          <span className="text-desk-muted">Blocked</span>
                        ) : (
                          <span className="text-desk-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-desk-secondary">{r.cluster || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.last_close, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.entry_stop, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.stop_loss, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">{r.unit_qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.N, 4)}</td>
                      <td className="px-4 py-3 font-mono text-desk-muted">{r.asof}</td>
                      <td className="px-4 py-3 text-desk-secondary">
                        {r.blocked_reason ? `${r.notes || ''} (${r.blocked_reason})` : r.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setChartItem({
                              symbol: r.symbol,
                              side: r.side,
                              entry: r.entry_stop,
                              stop: r.stop_loss,
                              close: r.last_close,
                              n: r.N,
                              qty: r.unit_qty,
                            })
                          }
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

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">All contracts scanned ({total})</h2>
        <div className="desk-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-normal">Contract</th>
                  <th className="px-4 py-3 text-left font-normal">Triggered</th>
                  <th className="px-4 py-3 text-right font-normal">Close</th>
                  <th className="px-4 py-3 text-right font-normal">Long entry</th>
                  <th className="px-4 py-3 text-right font-normal">Short entry</th>
                  <th className="px-4 py-3 text-right font-normal">Long stop</th>
                  <th className="px-4 py-3 text-right font-normal">Short stop</th>
                  <th className="px-4 py-3 text-right font-normal">Unit qty</th>
                  <th className="px-4 py-3 text-right font-normal">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {allRows.map((r: TurtleSignalRow, idx: number) => (
                  <tr
                    key={`${r.symbol}-${idx}`}
                    className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                    <td className="px-4 py-3">
                      {r.long_triggered && r.short_triggered ? (
                        <span className="desk-tag">Long / Short</span>
                      ) : r.long_triggered ? (
                        <span className="desk-tag-up">Long</span>
                      ) : r.short_triggered ? (
                        <span className="desk-tag-down">Short</span>
                      ) : (
                        <span className="text-desk-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.last_close, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.long_entry, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.short_entry, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.long_stop_loss, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.short_stop_loss, 4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{r.unit_qty ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setChartItem({
                            symbol: r.symbol,
                            side: r.long_triggered ? 'long' : r.short_triggered ? 'short' : null,
                            entry: r.long_triggered ? r.long_entry : r.short_triggered ? r.short_entry : null,
                            stop: r.long_triggered ? r.long_stop_loss : r.short_triggered ? r.short_stop_loss : null,
                            close: r.last_close,
                            n: r.N,
                            qty: r.unit_qty,
                          })
                        }
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

      {chartItem && (
        <SignalChartModal
          isOpen={!!chartItem}
          onClose={closeChart}
          symbol={chartItem.symbol}
          strategy="trendorama"
          interval="D"
          signalLabel={
            chartItem.side
              ? `Trendorama · ${chartItem.side === 'long' ? 'Long' : 'Short'}`
              : 'Trendorama 55-day'
          }
          direction={chartItem.side === 'long' ? 'long' : chartItem.side === 'short' ? 'short' : null}
          entryPrice={chartItem.entry}
          stopPrice={chartItem.stop}
          extraRows={[
            { label: 'Prior close', value: formatNum(chartItem.close, 4) },
            { label: 'N (ATR 20)', value: formatNum(chartItem.n, 4) },
            { label: 'Unit qty', value: chartItem.qty != null ? `${chartItem.qty}` : '—' },
          ]}
        />
      )}
    </div>
  );
}
