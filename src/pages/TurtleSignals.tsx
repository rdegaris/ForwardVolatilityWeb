import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleSignalRow, TurtleSignalsPayload } from '../types/turtle';

function formatNum(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export default function TurtleSignals() {
  const [data, setData] = useState<TurtleSignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson<TurtleSignalsPayload>('/data/turtle_signals_latest.json', { cache: 'no-store' });
        setData(d);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load turtle signals');
        setLoading(false);
      }
    })();
  }, []);

  const triggeredRows = useMemo(() => {
    const rows = data?.triggered ?? [];
    return [...rows].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [data]);

  const allRows = useMemo(() => {
    const rows = data?.signals ?? [];
    return [...rows].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Turtle signals...</p>
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
            Generate <span className="font-mono">turtle_signals_latest.json</span> into <span className="font-mono">public/data</span>.
          </p>
        </div>
      </div>
    );
  }

  const total = allRows.length;
  const triggered = triggeredRows.length;

  const sideText = (r: TurtleSignalRow) => {
    if (r.long_triggered && r.short_triggered) return 'LONG / SHORT';
    if (r.long_triggered) return 'LONG';
    if (r.short_triggered) return 'SHORT';
    return '—';
  };

  const sideColor = (r: TurtleSignalRow) => {
    if (r.long_triggered && !r.short_triggered) return 'text-emerald-200';
    if (r.short_triggered && !r.long_triggered) return 'text-rose-200';
    if (r.long_triggered && r.short_triggered) return 'text-amber-200';
    return 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-indigo-500">
            Turtle (System 2) — Signals
          </h1>
          <p className="text-gray-300">
            Markets that have already hit their breakout entry level on the latest daily bar.
          </p>

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
              <div className="text-gray-400">Triggered</div>
              <div className="text-xl font-bold text-emerald-300">{triggered}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Updated</div>
              <div className="text-xl font-bold text-gray-200">{new Date(data.timestamp).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">Triggered Today</h2>
          {triggeredRows.length === 0 ? (
            <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
              <div className="text-gray-300">No markets triggered today.</div>
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
                      <th className="px-4 py-3 text-right">Long Entry</th>
                      <th className="px-4 py-3 text-right">Short Entry</th>
                      <th className="px-4 py-3 text-right">N</th>
                      <th className="px-4 py-3 text-left">Asof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {triggeredRows.map((r: TurtleSignalRow, idx: number) => (
                      <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className={`px-4 py-3 font-semibold ${sideColor(r)}`}>{sideText(r)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close, 6)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.long_entry, 6)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.short_entry, 6)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.N, 6)}</td>
                        <td className="px-4 py-3 text-gray-300 font-mono">{r.asof}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-3">All Scanned ({total})</h2>
          <div className="bg-white/5 rounded-xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-black/20 text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Triggered</th>
                    <th className="px-4 py-3 text-right">Close</th>
                    <th className="px-4 py-3 text-right">Long Entry</th>
                    <th className="px-4 py-3 text-right">Short Entry</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((r: TurtleSignalRow, idx: number) => (
                    <tr key={`${r.symbol}-${idx}`} className="border-t border-slate-700/50 hover:bg-white/5">
                      <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                      <td className={`px-4 py-3 font-semibold ${sideColor(r)}`}>{sideText(r)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close, 6)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.long_entry, 6)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.short_entry, 6)}</td>
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
