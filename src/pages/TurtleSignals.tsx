import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleSignalRow, TurtleSignalsPayload, TurtleTriggeredSignal } from '../types/turtle';

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

  const triggeredSideColor = (r: TurtleTriggeredSignal) => {
    if (r.side === 'long') return 'text-emerald-200';
    if (r.side === 'short') return 'text-rose-200';
    return 'text-gray-400';
  };

  const eligibleText = (r: TurtleTriggeredSignal) => {
    if (r.eligible === true) return 'OK';
    if (r.eligible === false) return 'BLOCKED';
    return '—';
  };

  const eligibleColor = (r: TurtleTriggeredSignal) => {
    if (r.eligible === true) return 'text-emerald-200';
    if (r.eligible === false) return 'text-amber-200';
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
            "Triggered Today" means the latest daily bar's high/low crossed the prior Donchian breakout entry level.
            This is an entry signal only if you're flat and your rules allow a new position.
          </p>

          <div className="mt-4 bg-white/5 rounded-lg border border-slate-700/60 p-4 text-sm text-gray-300">
            <div className="font-semibold text-gray-200 mb-1">How to use this page</div>
            <ul className="space-y-1">
              <li>Use the <span className="font-mono">ENTRY</span> as your stop-entry reference (classic Turtle: place for the next session).</li>
              <li>Use the <span className="font-mono">STOP</span> as the protective stop-loss ($2N$ from entry), rounded to tick size.</li>
              <li>If price already ran far past entry, you may be late — consider skipping or using your execution rules.</li>
              <li>Check <span className="font-mono">Open Trades</span> before entering a duplicate position.</li>
            </ul>
          </div>

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
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Cluster</th>
                      <th className="px-4 py-3 text-right">Close</th>
                      <th className="px-4 py-3 text-right">ENTRY</th>
                      <th className="px-4 py-3 text-right">STOP</th>
                      <th className="px-4 py-3 text-right">Unit Qty</th>
                      <th className="px-4 py-3 text-right">N</th>
                      <th className="px-4 py-3 text-left">Asof</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {triggeredRows.map((r: TurtleTriggeredSignal, idx: number) => (
                      <tr
                        key={`${r.symbol}-${idx}`}
                        className={`border-t border-slate-700/50 ${idx % 2 === 0 ? 'bg-white/0' : 'bg-white/5'} hover:bg-white/10`}
                      >
                        <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                        <td className={`px-4 py-3 font-semibold ${triggeredSideColor(r)}`}>{r.side.toUpperCase()}</td>
                        <td className={`px-4 py-3 font-semibold ${eligibleColor(r)}`}>{eligibleText(r)}</td>
                        <td className="px-4 py-3 text-gray-200">{r.cluster || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close, 6)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.entry_stop, 6)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.stop_loss, 6)}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.unit_qty}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNum(r.N, 6)}</td>
                        <td className="px-4 py-3 text-gray-300 font-mono">{r.asof}</td>
                        <td className="px-4 py-3 text-gray-300">{r.blocked_reason ? `${r.notes || ''} (${r.blocked_reason})` : r.notes || '—'}</td>
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
                    <th className="px-4 py-3 text-right">Long STOP</th>
                    <th className="px-4 py-3 text-right">Short STOP</th>
                    <th className="px-4 py-3 text-right">Unit Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((r: TurtleSignalRow, idx: number) => (
                    <tr
                      key={`${r.symbol}-${idx}`}
                      className={`border-t border-slate-700/50 ${idx % 2 === 0 ? 'bg-white/0' : 'bg-white/5'} hover:bg-white/10`}
                    >
                      <td className="px-4 py-3 font-mono font-bold">{r.symbol}</td>
                      <td className={`px-4 py-3 font-semibold ${sideColor(r)}`}>{sideText(r)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.last_close, 6)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.long_entry, 6)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.short_entry, 6)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.long_stop_loss, 6)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(r.short_stop_loss, 6)}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.unit_qty ?? '—'}</td>
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
