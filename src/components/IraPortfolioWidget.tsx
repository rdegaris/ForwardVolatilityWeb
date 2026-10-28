import { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { fetchJson } from '../lib/http';
import { fmt$ } from '../lib/formatCurrency';

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

const pnlColor = (v: number) => (v >= 0 ? 'text-emerald-400' : 'text-rose-400');
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
    <div className="rounded-3xl border border-indigo-900/50 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/30 shadow-xl backdrop-blur-xl overflow-hidden">
      <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-indigo-900/40 bg-indigo-950/30">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            My IRA · {data.model}
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700">PRIVATE</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Prices as of {data.price_date ?? '—'} · updated {updated} PT · started {fmt$(data.starting_balance, 0)} on {data.inception_date}
          </div>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition"
        >
          {expanded ? 'Hide Holdings ▲' : 'Show Holdings ▼'}
        </button>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Value</div>
          <div className="mt-1 text-3xl font-black text-slate-100 font-mono">{fmt$(data.total_value)}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Day Change</div>
          <div className={`mt-1 text-2xl font-black font-mono ${pnlColor(data.day_change)}`}>
            {fmt$(data.day_change, 2, true)}
          </div>
          <div className={`text-xs font-bold font-mono ${pnlColor(data.day_change)}`}>{fmtPct(data.day_change_pct)}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Since Inception</div>
          <div className={`mt-1 text-2xl font-black font-mono ${pnlColor(data.total_gain)}`}>
            {fmt$(data.total_gain, 2, true)}
          </div>
          <div className={`text-xs font-bold font-mono ${pnlColor(data.total_gain)}`}>{fmtPct(data.total_gain_pct)}</div>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <th className="py-2 pr-3">Fund</th>
                <th className="py-2 px-3 text-right">Shares</th>
                <th className="py-2 px-3 text-right">Price</th>
                <th className="py-2 px-3 text-right">Value</th>
                <th className="py-2 px-3 text-right">Day</th>
                <th className="py-2 px-3 text-right">Gain</th>
                <th className="py-2 pl-3 text-right">Target / Current</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {data.positions.map((p) => (
                <tr key={p.ticker} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="py-2 pr-3">
                    <div className="font-bold text-slate-100">
                      {p.ticker}
                      {p.stale && <span className="ml-1 text-amber-400" title="Price fetch failed; using last known">*</span>}
                    </div>
                    <div className="font-sans text-[11px] text-slate-400 truncate max-w-[260px]">{p.name}</div>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">{p.shares.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{fmt$(p.price)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-100">{fmt$(p.value)}</td>
                  <td className={`py-2 px-3 text-right ${pnlColor(p.day_change)}`}>
                    {fmt$(p.day_change, 2, true)}
                    <div className="text-[10px]">{fmtPct(p.day_change_pct)}</div>
                  </td>
                  <td className={`py-2 px-3 text-right ${pnlColor(p.gain)}`}>
                    {fmt$(p.gain, 2, true)}
                    <div className="text-[10px]">{fmtPct(p.gain_pct)}</div>
                  </td>
                  <td className="py-2 pl-3 text-right text-slate-300">
                    {p.target_pct.toFixed(1)}% / {p.current_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
