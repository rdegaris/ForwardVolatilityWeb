import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    (async () => {
      try {
        const [s, a, o] = await Promise.all([
          fetchJson<OdidSignalsPayload>('/data/odid_signals_latest.json', { cache: 'no-store' }),
          fetchJson<OdidAlertsPayload>('/data/odid_alerts_latest.json', { cache: 'no-store' }),
          fetchJson<OdidOpenTradesPayload>('/data/odid_open_trades_latest.json', { cache: 'no-store' }),
        ]);
        setSignals(s);
        setAlerts(a);
        setOpenTrades(o);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load OD/ID breakout data');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading OD/ID breakout monitor...</p>
        </div>
      </div>
    );
  }

  if (error || !signals || !alerts || !openTrades) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-lg">
          <p className="text-red-400 mb-4">⚠️ {error || 'No OD/ID data available'}</p>
          <p className="text-gray-400 text-sm">
            Run the daily scan to generate OD/ID signals, alerts, and open trades JSON.
          </p>
        </div>
      </div>
    );
  }

  const sideColor = (side?: string | null) => {
    if (side === 'long') return 'text-emerald-200';
    if (side === 'short') return 'text-rose-200';
    return 'text-gray-400';
  };

  const severityColor = (s: string) => {
    if (s === 'high') return 'text-rose-200';
    if (s === 'medium') return 'text-amber-200';
    return 'text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-cyan-500">
            OD/ID Breakout Monitor
          </h1>
          <p className="text-gray-300">
            Outside Day / Inside Day breakout scanner for futures. Alerts are generated for confirmed close breakouts and near-level armed setups.
          </p>

          <div className="mt-4 bg-white/5 rounded-lg border border-slate-700/60 p-4 text-sm text-gray-300">
            <div className="font-semibold text-gray-200 mb-1">Pattern logic</div>
            <ul className="space-y-1">
              <li>Outside Day: higher high and lower low than the previous session.</li>
              <li>Inside Day: next day is fully inside the Outside Day range.</li>
              <li>Breakout confirmation: close above OD high (long) or below OD low (short).</li>
              <li>Initial stop reference: opposite side of the Outside Day range.</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Scan Date</div>
              <div className="text-xl font-bold">{signals.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Triggered</div>
              <div className="text-xl font-bold text-rose-200">{signals.total_triggered}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Armed Setups</div>
              <div className="text-xl font-bold text-cyan-200">{signals.total_armed}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Alerts</div>
              <div className="text-xl font-bold text-amber-200">{alerts.total_alerts}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Open Positions</div>
              <div className="text-xl font-bold text-emerald-300">{openRows.length}</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">Alerts</h2>
          {alertRows.length === 0 ? (
            <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
              <div className="text-gray-300">No active OD/ID alerts.</div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/20 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Symbol</th>
                      <th className="px-4 py-3 text-left">Severity</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Side</th>
                      <th className="px-4 py-3 text-right">Entry</th>
                      <th className="px-4 py-3 text-right">Stop</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertRows.map((r: OdidAlert, idx: number) => (
                      <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className={`px-4 py-3 font-semibold ${severityColor(r.severity)}`}>{r.severity.toUpperCase()}</td>
                        <td className="px-4 py-3 text-gray-200">{r.type}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor(r.side)}`}>{r.side ? r.side.toUpperCase() : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.entry_stop, 6)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.stop_loss, 6)}</td>
                        <td className="px-4 py-3 text-gray-200">
                          {r.eligible === false ? `Blocked (${r.blocked_reason || 'rule'})` : 'Eligible'}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">Open Futures Positions</h2>
          {openRows.length === 0 ? (
            <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
              <div className="text-gray-300">No OD/ID universe futures positions open in IB.</div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/20 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Symbol</th>
                      <th className="px-4 py-3 text-left">Contract</th>
                      <th className="px-4 py-3 text-left">Side</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Net Qty</th>
                      <th className="px-4 py-3 text-right">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openRows.map((r: OdidOpenTrade, idx: number) => (
                      <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className="px-4 py-3 text-gray-200 font-mono">{r.contract_local_symbol || r.contract_month || '—'}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor(r.side)}`}>{r.side.toUpperCase()}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.qty}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.net_qty}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.avg_price, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-200 mb-3">Triggered Breakouts</h2>
            {triggeredRows.length === 0 ? (
              <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
                <div className="text-gray-300">No confirmed OD/ID breakouts on the latest close.</div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black/20 text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">Symbol</th>
                        <th className="px-4 py-3 text-left">Side</th>
                        <th className="px-4 py-3 text-right">Close</th>
                        <th className="px-4 py-3 text-right">Entry</th>
                        <th className="px-4 py-3 text-right">Stop</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {triggeredRows.map((r: OdidTriggeredSignal, idx: number) => (
                        <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                          <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                          <td className={`px-4 py-3 font-semibold ${sideColor(r.side)}`}>{r.side.toUpperCase()}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close, 6)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNum(r.entry_stop, 6)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNum(r.stop_loss, 6)}</td>
                          <td className="px-4 py-3 text-gray-200">
                            {r.eligible === false ? `Blocked (${r.blocked_reason || 'rule'})` : 'Eligible'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-200 mb-3">Armed Setups</h2>
            {armedRows.length === 0 ? (
              <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
                <div className="text-gray-300">No currently armed OD/ID setups.</div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black/20 text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">Symbol</th>
                        <th className="px-4 py-3 text-right">Close</th>
                        <th className="px-4 py-3 text-right">Up Lvl</th>
                        <th className="px-4 py-3 text-right">Dn Lvl</th>
                        <th className="px-4 py-3 text-right">Up Dist</th>
                        <th className="px-4 py-3 text-right">Dn Dist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {armedRows.map((r: OdidSignalRow, idx: number) => (
                        <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                          <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close, 6)}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-200">{formatNum(r.armed_breakout_up, 6)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-200">{formatNum(r.armed_breakout_down, 6)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPct(r.distance_to_up_pct, 2)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPct(r.distance_to_down_pct, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">All Scanned ({allRows.length})</h2>
          <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-black/20 text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Cluster</th>
                    <th className="px-4 py-3 text-right">Close</th>
                    <th className="px-4 py-3 text-left">Armed</th>
                    <th className="px-4 py-3 text-left">Breakout</th>
                    <th className="px-4 py-3 text-left">Open Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((r: OdidSignalRow, idx: number) => (
                    <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                      <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                      <td className="px-4 py-3 text-gray-200">{r.cluster || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close, 6)}</td>
                      <td className="px-4 py-3 text-gray-200">{r.odid_setup_armed ? 'YES' : '—'}</td>
                      <td className={`px-4 py-3 font-semibold ${sideColor(r.breakout_side)}`}>
                        {r.breakout_confirmed && r.breakout_side ? r.breakout_side.toUpperCase() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-200">
                        {r.has_open_position ? `YES (${r.open_position_qty || 0})` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
