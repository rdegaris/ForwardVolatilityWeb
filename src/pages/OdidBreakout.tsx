import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchJson } from '../lib/http';
import type {
  OdidAlert,
  OdidAlertsPayload,
  OdidOpenTrade,
  OdidOpenTradesPayload,
  OdidSignalRow,
  OdidSignalsPayload,
  OdidTriggeredSignal,
} from '../types/odid';
import SignalChartModal from '../components/SignalChartModal';
import { AlertCircleIcon, ChartLineIcon } from '../components/Icons';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function formatPct(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export default function OdidBreakout() {
  const [signals, setSignals] = useState<OdidSignalsPayload | null>(null);
  const [alerts, setAlerts] = useState<OdidAlertsPayload | null>(null);
  const [openTrades, setOpenTrades] = useState<OdidOpenTradesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartItem, setChartItem] = useState<{
    symbol: string;
    side?: 'long' | 'short' | null;
    entry?: number | null;
    stop?: number | null;
    target?: number | null;
    upLvl?: number | null;
    dnLvl?: number | null;
  } | null>(null);

  const closeChart = useCallback(() => setChartItem(null), []);

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.allSettled([
          fetchJson<OdidSignalsPayload>('/data/odid_signals_latest.json', { cache: 'no-store' }),
          fetchJson<OdidAlertsPayload>('/data/odid_alerts_latest.json', { cache: 'no-store' }),
        ]);
        let o: OdidOpenTradesPayload | null = null;
        try {
          o = await fetchJson<OdidOpenTradesPayload>('/data/odid_open_trades_latest.json', { cache: 'no-store' });
        } catch {
          /* open trades file is optional */
        }
        if (s.status === 'rejected') throw new Error(s.reason?.message || 'Failed to load signal data');
        if (a.status === 'rejected') throw new Error(a.reason?.message || 'Failed to load alert data');
        setSignals(s.value);
        setAlerts(a.value);
        setOpenTrades(o);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load TooHot TooCold data');
        setLoading(false);
      }
    })();
  }, []);

  const triggeredRows = useMemo(() => {
    const rows = signals?.triggered ?? [];
    return [...rows].sort((a: OdidTriggeredSignal, b: OdidTriggeredSignal) => {
      const sym = a.symbol.localeCompare(b.symbol);
      if (sym !== 0) return sym;
      return (a.side || '').localeCompare(b.side || '');
    });
  }, [signals]);

  const armedRows = useMemo(() => {
    const rows = signals?.signals ?? [];
    return [...rows]
      .filter((r: OdidSignalRow) => r.odid_setup_armed)
      .sort((a: OdidSignalRow, b: OdidSignalRow) => {
        const aa = Math.min(a.distance_to_up_pct ?? 999, a.distance_to_down_pct ?? 999);
        const bb = Math.min(b.distance_to_up_pct ?? 999, b.distance_to_down_pct ?? 999);
        return aa - bb;
      });
  }, [signals]);

  const alertRows = useMemo(() => {
    const rows = alerts?.alerts ?? [];
    return [...rows].sort((a: OdidAlert, b: OdidAlert) => {
      const pa = a.severity === 'high' ? 0 : 1;
      const pb = b.severity === 'high' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [alerts]);

  const openRows = useMemo(() => {
    const rows = openTrades?.open_trades ?? [];
    return [...rows].sort((a: OdidOpenTrade, b: OdidOpenTrade) => a.symbol.localeCompare(b.symbol));
  }, [openTrades]);

  const allRows = useMemo(() => {
    const rows = signals?.signals ?? [];
    return [...rows].sort((a: OdidSignalRow, b: OdidSignalRow) => a.symbol.localeCompare(b.symbol));
  }, [signals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading TooHot TooCold monitor…</p>
      </div>
    );
  }

  if (error || !signals || !alerts) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-2 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-desk-down">
          <AlertCircleIcon className="w-4 h-4" />
          <span>{error || 'Signal data unavailable'}</span>
        </div>
        <p className="text-sm text-desk-muted">TooHot TooCold feed could not be loaded.</p>
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
              <span>Outside / inside range compression breakout</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
              TooHot TooCold
            </h1>
            <p className="text-sm leading-relaxed text-desk-secondary">
              Range-expansion breakout monitor identifying volatility compression (armed OD/ID bars) and close-confirmed directional expansions across major futures markets.
            </p>
          </div>
          <div className="shrink-0 md:text-right">
            <div className="text-xs text-desk-muted">Signal session</div>
            <div className="mt-1 text-xl font-medium font-mono text-desk-text">{signals.date}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Contracts scanned</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {allRows.length}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Triggered</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-up">
              {signals.total_triggered}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Armed setups</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {signals.total_armed}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Active alerts</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {alerts.total_alerts}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Open positions</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {openRows.length}
            </div>
          </div>
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">Active alerts</h2>
        {alertRows.length === 0 ? (
          <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
            No active TooHot TooCold alerts
          </div>
        ) : (
          <div className="desk-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">Contract</th>
                    <th className="px-4 py-3 text-left font-normal">Severity</th>
                    <th className="px-4 py-3 text-left font-normal">Type</th>
                    <th className="px-4 py-3 text-left font-normal">Side</th>
                    <th className="px-4 py-3 text-right font-normal">Entry</th>
                    <th className="px-4 py-3 text-right font-normal">Stop</th>
                    <th className="px-4 py-3 text-left font-normal">Eligibility</th>
                    <th className="px-4 py-3 text-left font-normal">Message</th>
                    <th className="px-4 py-3 text-right font-normal">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {alertRows.map((r: OdidAlert, idx: number) => (
                    <tr key={`${r.symbol}-${idx}`} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                      <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={r.severity === 'high' ? 'desk-tag-down' : 'desk-tag'}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-desk-secondary">{r.type}</td>
                      <td className="px-4 py-3">
                        {r.side ? (
                          <span className={r.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                            {r.side === 'long' ? 'Long' : 'Short'}
                          </span>
                        ) : (
                          <span className="text-desk-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.entry_stop, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.stop_loss, 4)}</td>
                      <td className="px-4 py-3 text-desk-secondary">
                        {r.eligible === false ? `Blocked (${r.blocked_reason || 'rule'})` : 'Eligible'}
                      </td>
                      <td className="px-4 py-3 text-desk-secondary">{r.message}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setChartItem({
                              symbol: r.symbol,
                              side: r.side === 'long' ? 'long' : r.side === 'short' ? 'short' : null,
                              entry: r.entry_stop,
                              stop: r.stop_loss,
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

      {/* Triggered & Armed Split */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-desk-text">Triggered breakouts</h2>
          {triggeredRows.length === 0 ? (
            <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
              No close-confirmed OD/ID breakouts on the latest bar
            </div>
          ) : (
            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-normal">Contract</th>
                      <th className="px-4 py-3 text-left font-normal">Side</th>
                      <th className="px-4 py-3 text-right font-normal">Close</th>
                      <th className="px-4 py-3 text-right font-normal">Entry</th>
                      <th className="px-4 py-3 text-right font-normal">Stop</th>
                      <th className="px-4 py-3 text-left font-normal">Status</th>
                      <th className="px-4 py-3 text-right font-normal">Chart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {triggeredRows.map((r: OdidTriggeredSignal, idx: number) => (
                      <tr key={`${r.symbol}-${idx}`} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                        <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={r.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                            {r.side === 'long' ? 'Long' : 'Short'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.last_close, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.entry_stop, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.stop_loss, 4)}</td>
                        <td className="px-4 py-3 text-desk-secondary">
                          {r.eligible === false ? `Blocked (${r.blocked_reason || 'rule'})` : 'Eligible'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setChartItem({
                                symbol: r.symbol,
                                side: r.side === 'long' ? 'long' : r.side === 'short' ? 'short' : null,
                                entry: r.entry_stop,
                                stop: r.stop_loss,
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
          <h2 className="text-lg font-medium text-desk-text">Armed setups</h2>
          {armedRows.length === 0 ? (
            <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
              No currently armed OD/ID compression setups
            </div>
          ) : (
            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-normal">Contract</th>
                      <th className="px-4 py-3 text-right font-normal">Close</th>
                      <th className="px-4 py-3 text-right font-normal">Up level</th>
                      <th className="px-4 py-3 text-right font-normal">Down level</th>
                      <th className="px-4 py-3 text-right font-normal">Up dist</th>
                      <th className="px-4 py-3 text-right font-normal">Down dist</th>
                      <th className="px-4 py-3 text-right font-normal">Chart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {armedRows.map((r: OdidSignalRow, idx: number) => (
                      <tr key={`${r.symbol}-${idx}`} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                        <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                        <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.last_close, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-desk-up">{formatNum(r.armed_breakout_up, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.armed_breakout_down, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatPct(r.distance_to_up_pct, 2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatPct(r.distance_to_down_pct, 2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setChartItem({
                                symbol: r.symbol,
                                upLvl: r.armed_breakout_up,
                                dnLvl: r.armed_breakout_down,
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
      </div>

      {/* Open Futures Positions */}
      {openRows.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-desk-text">Open futures positions</h2>
          <div className="desk-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">Contract</th>
                    <th className="px-4 py-3 text-left font-normal">Month</th>
                    <th className="px-4 py-3 text-left font-normal">Side</th>
                    <th className="px-4 py-3 text-right font-normal">Qty</th>
                    <th className="px-4 py-3 text-right font-normal">Net qty</th>
                    <th className="px-4 py-3 text-right font-normal">Avg price</th>
                    <th className="px-4 py-3 text-right font-normal">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {openRows.map((r: OdidOpenTrade, idx: number) => (
                    <tr key={`${r.symbol}-${idx}`} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                      <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                      <td className="px-4 py-3 font-mono text-desk-secondary">
                        {r.contract_local_symbol || r.contract_month || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={r.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                          {r.side === 'long' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{r.qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">{r.net_qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.avg_price, 4)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setChartItem({
                              symbol: r.symbol,
                              side: r.side === 'long' ? 'long' : r.side === 'short' ? 'short' : null,
                              entry: r.avg_price,
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
      )}

      {/* All Scanned */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-desk-text">All contracts scanned ({allRows.length})</h2>
        <div className="desk-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-normal">Contract</th>
                  <th className="px-4 py-3 text-left font-normal">Cluster</th>
                  <th className="px-4 py-3 text-right font-normal">Close</th>
                  <th className="px-4 py-3 text-left font-normal">Armed</th>
                  <th className="px-4 py-3 text-left font-normal">Breakout</th>
                  <th className="px-4 py-3 text-left font-normal">Open pos</th>
                  <th className="px-4 py-3 text-right font-normal">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {allRows.map((r: OdidSignalRow, idx: number) => (
                  <tr key={`${r.symbol}-${idx}`} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                    <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                    <td className="px-4 py-3 text-desk-secondary">{r.cluster || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.last_close, 4)}</td>
                    <td className="px-4 py-3 text-desk-secondary">{r.odid_setup_armed ? 'Yes' : '—'}</td>
                    <td className="px-4 py-3">
                      {r.breakout_confirmed && r.breakout_side ? (
                        <span className={r.breakout_side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                          {r.breakout_side === 'long' ? 'Long' : 'Short'}
                        </span>
                      ) : (
                        <span className="text-desk-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-desk-secondary">
                      {r.has_open_position ? `Yes (${r.open_position_qty || 0})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setChartItem({
                            symbol: r.symbol,
                            side:
                              r.breakout_confirmed && r.breakout_side === 'long'
                                ? 'long'
                                : r.breakout_confirmed && r.breakout_side === 'short'
                                  ? 'short'
                                  : null,
                            upLvl: r.armed_breakout_up,
                            dnLvl: r.armed_breakout_down,
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
          strategy="odid"
          interval="D"
          signalLabel={
            chartItem.side
              ? `TooHot TooCold · ${chartItem.side === 'long' ? 'Long' : 'Short'}`
              : 'TooHot TooCold'
          }
          direction={chartItem.side === 'long' ? 'long' : chartItem.side === 'short' ? 'short' : null}
          entryPrice={chartItem.entry}
          stopPrice={chartItem.stop}
          extraRows={[
            ...(chartItem.upLvl ? [{ label: 'Breakout up', value: formatNum(chartItem.upLvl, 4) }] : []),
            ...(chartItem.dnLvl ? [{ label: 'Breakout down', value: formatNum(chartItem.dnLvl, 4) }] : []),
          ]}
        />
      )}
    </div>
  );
}
