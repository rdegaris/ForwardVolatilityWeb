import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleTriggerSoon, TurtleTriggersPayload } from '../types/turtle';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function formatPct(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export default function TurtleTriggers() {
  const [data, setData] = useState<TurtleTriggersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<TurtleTriggersPayload>('/data/turtle_triggers_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load turtle trigger watchlist');
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const triggers = data?.triggers ?? [];
    return [...triggers].sort((a, b) => {
      const aa = a.distance_N ?? 999;
      const bb = b.distance_N ?? 999;
      return aa - bb;
    });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Turtle trigger watchlist...</p>
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
            Generate <span className="font-mono">turtle_triggers_latest.json</span> into <span className="font-mono">public/data</span>.
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
            Turtle (System 2) — Triggers Soon
          </h1>
          <p className="text-gray-300">
            Watchlist for markets approaching their breakout level. {data.threshold_note || ''}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Date</div>
              <div className="text-xl font-bold">{data.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Signals</div>
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
            <div className="text-gray-300">No near-trigger markets.</div>
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
                    <th className="px-4 py-3 text-right">Trigger</th>
                    <th className="px-4 py-3 text-right">Dist (N)</th>
                    <th className="px-4 py-3 text-right">Away (%)</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: TurtleTriggerSoon, idx: number) => {
                    const sideColor = r.side === 'long' ? 'text-emerald-200' : 'text-rose-200';
                    return (
                      <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor}`}>{r.side.toUpperCase()}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.trigger_price)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.distance_N, 2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatPct(r.pct_away, 2)}</td>
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
