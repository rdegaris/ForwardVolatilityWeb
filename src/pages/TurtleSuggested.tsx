import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleSuggestedTrade, TurtleSuggestedTradesPayload } from '../types/turtle';
import { AlertCircleIcon } from '../components/Icons';

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
        setError(err?.message || 'Failed to load suggested trades');
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
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading suggested entries…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-2 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-desk-down">
          <AlertCircleIcon className="w-4 h-4" />
          <span>{error || 'No suggested-trade data available'}</span>
        </div>
        <p className="text-sm text-desk-muted">
          Ensure <span className="font-mono">turtle_suggested_latest.json</span> exists in <span className="font-mono">public/data</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
            <span>Trendorama · Continuous stop-entry candidates</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
            Suggested trades
          </h1>
          <p className="text-sm text-desk-secondary">
            Stop entries and protective stops derived from continuous contract series; execute in liquid front-month contracts.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Scan date</div>
            <div className="mt-2 text-xl font-medium font-mono text-desk-text">{data.date}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">System</div>
            <div className="mt-2 text-xl font-medium font-mono text-desk-text">{data.system}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Candidates</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-up">{rows.length}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Updated</div>
            <div className="mt-2 text-sm font-medium font-mono text-desk-secondary">
              {new Date(data.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="desk-surface rounded-xl p-6 text-sm text-desk-muted">
          No suggested trades currently listed
        </div>
      ) : (
        <div className="desk-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-normal">Contract</th>
                  <th className="px-4 py-3 text-left font-normal">Side</th>
                  <th className="px-4 py-3 text-right font-normal">Last close</th>
                  <th className="px-4 py-3 text-right font-normal">Entry stop</th>
                  <th className="px-4 py-3 text-right font-normal">Stop loss</th>
                  <th className="px-4 py-3 text-right font-normal">Unit qty</th>
                  <th className="px-4 py-3 text-right font-normal">Dist (N)</th>
                  <th className="px-4 py-3 text-right font-normal">Dist (%)</th>
                  <th className="px-4 py-3 text-left font-normal">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((r: TurtleSuggestedTrade, idx: number) => (
                  <tr key={`${r.symbol}-${idx}`} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                    <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={r.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                        {r.side === 'long' ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.last_close)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.entry_stop)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.stop_loss)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{r.unit_qty}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.distance_to_entry_N, 2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatPct(r.pct_to_entry, 2)}</td>
                    <td className="px-4 py-3 text-desk-secondary">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
