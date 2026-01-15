import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { GrailSignalRow, GrailSignalsPayload } from '../types/grail';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export default function GrailTrade() {
  const [data, setData] = useState<GrailSignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<GrailSignalsPayload>('/data/grail_signals_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load Grail Trade signals');
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

  const watchingRows = useMemo(() => {
    const rows = data?.signals ?? [];
    // Filter to rows with strong ADX but not yet at EMA
    return [...rows]
      .filter(r => !r.eligible && r.adx >= (data?.adx_threshold ?? 30))
      .sort((a, b) => a.distance_to_ema_pct - b.distance_to_ema_pct);
  }, [data]);

  const allRows = useMemo(() => {
    const rows = data?.signals ?? [];
    return [...rows].sort((a, b) => {
      // Sort by eligible first, then by ADX descending
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.adx - a.adx;
    });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Grail Trade signals...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-lg">
          <p className="text-red-400 mb-4">⚠️ {error || 'No data available'}</p>
          <p className="text-gray-400 text-sm">
            Run the daily scan to generate the Grail Trade JSON.
          </p>
        </div>
      </div>
    );
  }

  const sideColor = (r: GrailSignalRow) => {
    if (r.side === 'long') return 'text-emerald-200';
    if (r.side === 'short') return 'text-rose-200';
    return 'text-gray-400';
  };

  const eligibleColor = (r: GrailSignalRow) => {
    if (r.eligible) return 'text-emerald-200';
    return 'text-amber-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-500">
            Holy Grail Trade
          </h1>
          <p className="text-gray-300">
            From <em>Street Smarts</em> by Linda Raschke & Larry Connors. 
            ADX above {data.adx_threshold} indicates a strong trend; enter on pullback to 20 EMA.
          </p>

          <div className="mt-4 bg-white/5 rounded-lg border border-slate-700/60 p-4 text-sm text-gray-300">
            <div className="font-semibold text-gray-200 mb-1">How to trade the Holy Grail</div>
            <ul className="space-y-1">
              <li><strong>Long setup:</strong> ADX &gt; {data.adx_threshold}, +DI &gt; -DI (uptrend), price pulls back to 20 EMA.</li>
              <li><strong>Short setup:</strong> ADX &gt; {data.adx_threshold}, -DI &gt; +DI (downtrend), price rallies to 20 EMA.</li>
              <li><strong>Entry:</strong> Buy/sell at the EMA touch zone.</li>
              <li><strong>Stop:</strong> Below recent swing low (longs) or above swing high (shorts).</li>
              <li><strong>Target:</strong> Retest of recent high (longs) or low (shorts).</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Scan Date</div>
              <div className="text-xl font-bold">{data.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">System</div>
              <div className="text-xl font-bold text-amber-300">Holy Grail</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Triggered</div>
              <div className="text-xl font-bold text-emerald-300">{data.total_triggered}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Watching</div>
              <div className="text-xl font-bold text-amber-300">{watchingRows.length}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Updated</div>
              <div className="text-xl font-bold text-gray-200">{new Date(data.timestamp).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Triggered Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">🎯 Triggered Setups</h2>
          {triggeredRows.length === 0 ? (
            <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
              <div className="text-gray-300">No markets have triggered today. Wait for price to reach EMA.</div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/20 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Symbol</th>
                      <th className="px-4 py-3 text-left">Side</th>
                      <th className="px-4 py-3 text-left">Cluster</th>
                      <th className="px-4 py-3 text-right">Close</th>
                      <th className="px-4 py-3 text-right">EMA20</th>
                      <th className="px-4 py-3 text-right">ADX</th>
                      <th className="px-4 py-3 text-right">+DI</th>
                      <th className="px-4 py-3 text-right">-DI</th>
                      <th className="px-4 py-3 text-right">Entry Zone</th>
                      <th className="px-4 py-3 text-right">Stop</th>
                      <th className="px-4 py-3 text-right">Target</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {triggeredRows.map((r, idx) => (
                      <tr
                        key={`${r.symbol}-${idx}`}
                        className={`border-t border-slate-700/50 ${idx % 2 === 0 ? 'bg-white/0' : 'bg-white/5'} hover:bg-white/10`}
                      >
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor(r)}`}>{r.side.toUpperCase()}</td>
                        <td className="px-4 py-3 text-gray-200">{r.cluster || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.close, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.ema20, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-300">{formatNum(r.adx, 1)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-300">{formatNum(r.plus_di, 1)}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-300">{formatNum(r.minus_di, 1)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.entry_zone, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-200">{formatNum(r.stop_loss, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-200">{formatNum(r.target, 4)}</td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Watching Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">👀 Watching (Strong ADX, Waiting for Pullback)</h2>
          {watchingRows.length === 0 ? (
            <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
              <div className="text-gray-300">No markets with strong ADX currently watching for pullback.</div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/20 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Symbol</th>
                      <th className="px-4 py-3 text-left">Trend</th>
                      <th className="px-4 py-3 text-left">Cluster</th>
                      <th className="px-4 py-3 text-right">Close</th>
                      <th className="px-4 py-3 text-right">EMA20</th>
                      <th className="px-4 py-3 text-right">Dist to EMA</th>
                      <th className="px-4 py-3 text-right">ADX</th>
                      <th className="px-4 py-3 text-right">+DI</th>
                      <th className="px-4 py-3 text-right">-DI</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchingRows.map((r, idx) => (
                      <tr
                        key={`${r.symbol}-${idx}`}
                        className={`border-t border-slate-700/50 ${idx % 2 === 0 ? 'bg-white/0' : 'bg-white/5'} hover:bg-white/10`}
                      >
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor(r)}`}>
                          {r.side === 'long' ? '⬆️ UP' : r.side === 'short' ? '⬇️ DN' : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-200">{r.cluster || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.close, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.ema20, 4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-300">{formatNum(r.distance_to_ema_pct, 1)}%</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-300">{formatNum(r.adx, 1)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-300">{formatNum(r.plus_di, 1)}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-300">{formatNum(r.minus_di, 1)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* All Signals Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-3">📊 All Scanned ({data.total_scanned})</h2>
          <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-black/20 text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Trend</th>
                    <th className="px-4 py-3 text-right">Close</th>
                    <th className="px-4 py-3 text-right">EMA20</th>
                    <th className="px-4 py-3 text-right">ADX</th>
                    <th className="px-4 py-3 text-right">+DI</th>
                    <th className="px-4 py-3 text-right">-DI</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((r, idx) => (
                    <tr
                      key={`${r.symbol}-${idx}`}
                      className={`border-t border-slate-700/50 ${idx % 2 === 0 ? 'bg-white/0' : 'bg-white/5'} hover:bg-white/10`}
                    >
                      <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                      <td className={`px-4 py-3 font-semibold ${eligibleColor(r)}`}>
                        {r.eligible ? '✅ TRIGGERED' : '⏳ WAITING'}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${sideColor(r)}`}>
                        {r.side === 'long' ? 'LONG' : r.side === 'short' ? 'SHORT' : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.close, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.ema20, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.adx, 1)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.plus_di, 1)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.minus_di, 1)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.reason}</td>
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
