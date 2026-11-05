import { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { fetchJson } from '../lib/http';
import { fmt$ } from '../lib/formatCurrency';
import { ChevronDownIcon } from './Icons';

/** Only this login sees the IRA widget. */
const IRA_OWNER_EMAIL = 'rdegaris@gmail.com';

type IraPosition = {
  ticker: string;
  name: string;
  target_pct: number;
  current_pct: number;
  shares: number;
  price: number;
  price_date: string | null;
  value: number;
  day_change: number;
  day_change_pct: number;
  gain: number;
  gain_pct: number;
  stale?: boolean;
};

type IraPortfolioPayload = {
  timestamp: string;
  model: string;
  inception_date: string;
  starting_balance: number;
  price_date: string | null;
  total_value: number;
  day_change: number;
  day_change_pct: number;
  total_gain: number;
  total_gain_pct: number;
  positions: IraPosition[];
  history: { date: string; value: number }[];
};

const pnlColor = (v: number) => (v >= 0 ? 'text-desk-up' : 'text-desk-down');
const fmtPct = (v: number, d = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`;

export default function IraPortfolioWidget() {
  const { user } = useAuth();
  const isOwner = user?.email?.trim().toLowerCase() === IRA_OWNER_EMAIL;
  const [data, setData] = useState<IraPortfolioPayload | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    fetchJson<IraPortfolioPayload>('/data/ira_portfolio_latest.json', { cache: 'no-store' })
      .then(setData)
      .catch(() => setData(null));
  }, [isOwner]);

  if (!isOwner || !data) return null;

  const updated = new Date(data.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  });

  return (
    <section className="desk-surface rounded-2xl overflow-hidden">
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-desk-text">
            <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
            <span>IRA allocation · {data.model}</span>
            <span className="desk-tag text-[11px]">Private</span>
          </div>
          <div className="mt-1 text-xs text-desk-muted font-mono">
            NAV as of {data.price_date ?? '—'} · synced {updated} PT · {fmt$(data.starting_balance, 0)} baseline ({data.inception_date})
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="desk-btn-secondary h-8 px-3 text-xs"
        >
          <span>{expanded ? 'Hide holdings' : 'View holdings'}</span>
          <ChevronDownIcon
            className={`w-4 h-4 text-desk-muted transition-transform duration-150 ease-desk ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="desk-well rounded-xl p-5">
          <div className="text-xs text-desk-muted">Total value</div>
          <div className="mt-2 text-[28px] leading-none font-medium text-desk-text font-mono">
            {fmt$(data.total_value)}
          </div>
          <div className="mt-2 text-xs text-desk-muted font-mono">
            {data.positions.length} holdings
          </div>
        </div>

        <div className="desk-well rounded-xl p-5">
          <div className="text-xs text-desk-muted">Day change</div>
          <div className={`mt-2 text-[28px] leading-none font-medium font-mono ${pnlColor(data.day_change)}`}>
            {fmt$(data.day_change, 2, true)}
          </div>
          <div className={`mt-2 text-xs font-mono ${pnlColor(data.day_change)}`}>
            {fmtPct(data.day_change_pct)} vs prior close
          </div>
        </div>

        <div className="desk-well rounded-xl p-5">
          <div className="text-xs text-desk-muted">Since inception</div>
          <div className={`mt-2 text-[28px] leading-none font-medium font-mono ${pnlColor(data.total_gain)}`}>
            {fmt$(data.total_gain, 2, true)}
          </div>
          <div className={`mt-2 text-xs font-mono ${pnlColor(data.total_gain)}`}>
            {fmtPct(data.total_gain_pct)} vs {fmt$(data.starting_balance, 0)}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-desk-muted border-b border-hairline">
                <th className="py-2.5 pr-3 font-normal">Fund</th>
                <th className="py-2.5 px-3 text-right font-normal">Shares</th>
                <th className="py-2.5 px-3 text-right font-normal">Price</th>
                <th className="py-2.5 px-3 text-right font-normal">Value</th>
                <th className="py-2.5 px-3 text-right font-normal">Day</th>
                <th className="py-2.5 px-3 text-right font-normal">Total gain</th>
                <th className="py-2.5 pl-3 text-right font-normal">Target / actual</th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-hairline">
              {data.positions.map((p) => (
                <tr key={p.ticker} className="hover:bg-desk-raised/40 transition-colors duration-150 ease-desk">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-desk-text">
                      {p.ticker}
                      {p.stale && (
                        <span className="ml-1 text-desk-amber" title="Price fetch failed; using last known">
                          *
                        </span>
                      )}
                    </div>
                    <div className="font-sans text-xs text-desk-muted truncate max-w-[260px]">{p.name}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-desk-secondary">{p.shares.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right text-desk-secondary">{fmt$(p.price)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-desk-text">{fmt$(p.value)}</td>
                  <td className={`py-2.5 px-3 text-right ${pnlColor(p.day_change)}`}>
                    {fmt$(p.day_change, 2, true)}
                    <div className="text-[11px] opacity-80">{fmtPct(p.day_change_pct)}</div>
                  </td>
                  <td className={`py-2.5 px-3 text-right ${pnlColor(p.gain)}`}>
                    {fmt$(p.gain, 2, true)}
                    <div className="text-[11px] opacity-80">{fmtPct(p.gain_pct)}</div>
                  </td>
                  <td className="py-2.5 pl-3 text-right text-desk-secondary">
                    {p.target_pct.toFixed(1)}% / {p.current_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
