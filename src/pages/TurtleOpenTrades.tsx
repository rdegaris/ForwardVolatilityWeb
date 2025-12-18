import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleOpenTrade, TurtleOpenTradesPayload } from '../types/turtle';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export default function TurtleOpenTrades() {
  const [data, setData] = useState<TurtleOpenTradesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<TurtleOpenTradesPayload>('/data/turtle_open_trades_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load turtle open trades');
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const open = data?.open_trades ?? [];
    return [...open].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Turtle open trades...</p>
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
            Generate <span className="font-mono">turtle_open_trades_latest.json</span> into <span className="font-mono">public/data</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-indigo-500">
            Turtle (System 2) — Open Trades
          </h1>
          <p className="text-gray-300">Positions currently held in the front-month contract.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Date</div>
              <div className="text-xl font-bold">{data.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Open Trades</div>
              <div className="text-xl font-bold text-emerald-300">{rows.length}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">System</div>
              <div className="text-xl font-bold text-indigo-300">{data.system}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Updated</div>
              <div className="text-xl font-bold text-gray-200">{new Date(data.timestamp).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
            <div className="text-gray-300">No open trades.</div>
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
                    <th className="px-4 py-3 text-right">Avg</th>
                    <th className="px-4 py-3 text-right">Stop</th>
                    <th className="px-4 py-3 text-right">Next Add</th>
                    <th className="px-4 py-3 text-right">Unrl PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: TurtleOpenTrade, idx: number) => {
                    const sideColor = r.side === 'long' ? 'text-emerald-200' : 'text-rose-200';
                    const contract = r.contract_local_symbol || r.contract_month || '—';
                    return (
                      <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className="px-4 py-3 font-mono text-gray-200">{contract}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor}`}>{r.side.toUpperCase()}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.qty}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.avg_price)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.stop_price)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.next_add_trigger)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.unrealized_pnl)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
