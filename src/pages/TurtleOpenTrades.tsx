import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';
import type { TurtleOpenTrade, TurtleOpenTradesPayload } from '../types/turtle';
import { AlertCircleIcon } from '../components/Icons';

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
        setError(err?.message || 'Failed to load Trendorama open trades');
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const open = data?.open_trades ?? [];
    return [...open]
      .filter((t) => typeof t.qty !== 'number' || t.qty !== 0)
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading open positions…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-2 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-desk-down">
          <AlertCircleIcon className="w-4 h-4" />
          <span>{error || 'No open-trade data available'}</span>
        </div>
        <p className="text-sm text-desk-muted">
          Ensure <span className="font-mono">turtle_open_trades_latest.json</span> exists in <span className="font-mono">public/data</span>.
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
            <span>Trendorama · Front-month positions</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
            Open positions
          </h1>
          <p className="text-sm text-desk-secondary">
            Active front-month futures contracts with protective stops and pyramid add triggers.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Session date</div>
            <div className="mt-2 text-xl font-medium font-mono text-desk-text">{data.date}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Open positions</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-up">{rows.length}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">System</div>
            <div className="mt-2 text-xl font-medium font-mono text-desk-text">{data.system}</div>
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
          No open front-month positions currently held
        </div>
      ) : (
        <div className="desk-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="border-b border-hairline bg-desk-deep text-desk-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-normal">Contract</th>
                  <th className="px-4 py-3 text-left font-normal">Month</th>
                  <th className="px-4 py-3 text-left font-normal">Side</th>
                  <th className="px-4 py-3 text-right font-normal">Qty</th>
                  <th className="px-4 py-3 text-right font-normal">Avg price</th>
                  <th className="px-4 py-3 text-right font-normal">Stop</th>
                  <th className="px-4 py-3 text-right font-normal">Next add</th>
                  <th className="px-4 py-3 text-right font-normal">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((r: TurtleOpenTrade, idx: number) => {
                  const contract = r.contract_local_symbol || r.contract_month || '—';
                  return (
                    <tr key={`${r.symbol}-${idx}`} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                      <td className="px-4 py-3 font-mono font-medium text-desk-text">{r.symbol}</td>
                      <td className="px-4 py-3 font-mono text-desk-secondary">{contract}</td>
                      <td className="px-4 py-3">
                        <span className={r.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                          {r.side === 'long' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{r.qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-text">{formatNum(r.avg_price)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-down">{formatNum(r.stop_price)}</td>
                      <td className="px-4 py-3 text-right font-mono text-desk-secondary">{formatNum(r.next_add_trigger)}</td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-medium ${
                          (r.unrealized_pnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
                        }`}
                      >
                        {formatNum(r.unrealized_pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
