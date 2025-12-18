import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleSuggestedTrade, TurtleSuggestedTradesPayload } from '../types/turtle';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function formatPct(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export default function TurtleSuggested() {
  const [data, setData] = useState<TurtleSuggestedTradesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<TurtleSuggestedTradesPayload>('/data/turtle_suggested_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load turtle suggested trades');
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const suggested = data?.suggested ?? [];
    return [...suggested].sort((a, b) => {
      const aa = a.distance_to_entry_N ?? 999;
      const bb = b.distance_to_entry_N ?? 999;
      return aa - bb;
    });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Turtle suggested trades...</p>
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
            Generate <span className="font-mono">turtle_suggested_latest.json</span> into <span className="font-mono">public/data</span>.
          </p>
        </div>
      </div>
    );
  }

  const total = rows.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-indigo-500">
            Turtle (System 2) — Suggested Trades
          </h1>
          <p className="text-gray-300">Stop entries + protective stops based on continuous signals; execute in front month.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Scan Date</div>
              <div className="text-xl font-bold">{data.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">System</div>
              <div className="text-xl font-bold text-indigo-300">{data.system}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Suggested</div>
              <div className="text-xl font-bold text-emerald-300">{total}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Updated</div>
              <div className="text-xl font-bold text-gray-200">
                {new Date(data.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
            <div className="text-gray-300">No suggested trades.</div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-black/20 text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Side</th>
                    <th className="px-4 py-3 text-right">Last</th>
                    <th className="px-4 py-3 text-right">Entry Stop</th>
                    <th className="px-4 py-3 text-right">Stop Loss</th>
                    <th className="px-4 py-3 text-right">Unit Qty</th>
                    <th className="px-4 py-3 text-right">Dist (N)</th>
                    <th className="px-4 py-3 text-right">Dist (%)</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: TurtleSuggestedTrade, idx: number) => {
                    const sideColor = r.side === 'long' ? 'text-emerald-200' : 'text-rose-200';
                    return (
                      <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor}`}>{r.side.toUpperCase()}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.entry_stop)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.stop_loss)}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.unit_qty}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.distance_to_entry_N, 2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatPct(r.pct_to_entry, 2)}</td>
                        <td className="px-4 py-3 text-gray-300">{r.notes || '—'}</td>
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
