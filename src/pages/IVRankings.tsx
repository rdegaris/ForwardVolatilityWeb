import { useState, useEffect } from 'react';
import { getTodayPacific } from '../lib/dateUtils';
import { fetchJson } from '../lib/http';

interface IVRanking {
  ticker: string;
  price: number;
  iv: number;
  ma_200?: number | null;
  above_ma_200?: boolean | null;
  universe: string;
  next_earnings?: string | null;
}

interface IVResults {
  timestamp: string;
  date: string;
  universe: string;
  total_scanned: number;
  rankings: IVRanking[];
  summary: {
    highest_iv: number;
    lowest_iv: number;
    average_iv: number;
    median_iv: number;
  };
}

export default function IVRankings() {
  const [results, setResults] = useState<IVResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUniverse, setFilterUniverse] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const settled = await Promise.allSettled([
          fetchJson<{ rankings?: IVRanking[] }>('/data/mag7_iv_rankings_latest.json', { cache: 'no-store' }),
          fetchJson<{ rankings?: IVRanking[] }>('/data/nasdaq100_iv_rankings_latest.json', { cache: 'no-store' }),
          fetchJson<{ rankings?: IVRanking[] }>('/data/midcap400_iv_rankings_latest.json', { cache: 'no-store' }),
        ]);

        const mag7Data = settled[0].status === 'fulfilled' ? settled[0].value : { rankings: [] };
        const nasdaq100Data = settled[1].status === 'fulfilled' ? settled[1].value : { rankings: [] };
        const midcapData = settled[2].status === 'fulfilled' ? settled[2].value : { rankings: [] };

        const allRankings: IVRanking[] = [
          ...(mag7Data.rankings || []),
          ...(nasdaq100Data.rankings || []),
          ...(midcapData.rankings || []),
        ];

        allRankings.sort((a, b) => b.iv - a.iv);

        const result: IVResults = {
          timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
          date: getTodayPacific(),
          universe: 'ALL',
          total_scanned: allRankings.length,
          rankings: allRankings,
          summary: {
            highest_iv: allRankings[0]?.iv || 0,
            lowest_iv: allRankings[allRankings.length - 1]?.iv || 0,
            average_iv:
              allRankings.length > 0
                ? Math.round((allRankings.reduce((sum, r) => sum + r.iv, 0) / allRankings.length) * 100) / 100
                : 0,
            median_iv:
              allRankings.length > 0
                ? allRankings[Math.floor(allRankings.length / 2)].iv
                : 0,
          },
        };

        setResults(result);
      } catch (err) {
        setError('Failed to load IV rankings');
        console.error('Error loading IV rankings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-hairline border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading implied volatility rankings…</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="desk-surface rounded-2xl p-8 text-center text-sm text-desk-down">
        {error || 'No rankings available'}
      </div>
    );
  }

  const filteredRankings = results.rankings.filter((r) => {
    const matchesUniverse = filterUniverse === 'all' || r.universe.toLowerCase() === filterUniverse;
    const matchesSearch = searchTerm === '' || r.ticker.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUniverse && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-6">
        <div>
          <div className="text-xs font-mono text-desk-muted">Cross-universe screen</div>
          <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
            Implied volatility rankings
          </h1>
          <p className="mt-1.5 text-sm text-desk-secondary">
            Tickers ranked by near-term implied volatility across MAG7, Nasdaq-100, and S&amp;P MidCap 400.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Scan date</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.date}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Total scanned</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.total_scanned}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Highest IV</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-down tabular-nums">{results.summary.highest_iv.toFixed(1)}%</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Average IV</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.summary.average_iv.toFixed(1)}%</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Median IV</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.summary.median_iv.toFixed(1)}%</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-hairline">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Filter ticker…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="desk-input w-full px-3.5 py-2 text-xs font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'mag7', label: 'MAG7' },
              { id: 'nasdaq100', label: 'Nasdaq-100' },
              { id: 'midcap400', label: 'MidCap 400' },
            ].map((u) => (
              <button
                key={u.id}
                onClick={() => setFilterUniverse(u.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  filterUniverse === u.id
                    ? 'bg-desk-text text-desk-deep'
                    : 'desk-well text-desk-secondary hover:text-desk-text'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="desk-surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-hairline bg-desk-deep/60 text-desk-muted">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Rank</th>
                <th className="px-5 py-3 text-left font-medium">Ticker</th>
                <th className="px-5 py-3 text-left font-medium">Universe</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">IV</th>
                <th className="px-5 py-3 text-center font-medium">Next earnings</th>
                <th className="px-5 py-3 text-center font-medium">vs 200d MA</th>
                <th className="px-5 py-3 text-right font-medium">200d MA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredRankings.map((ranking, idx) => (
                <tr key={idx} className="hover:bg-desk-raised/30 transition-colors">
                  <td className="px-5 py-3 text-desk-muted font-mono tabular-nums">{idx + 1}</td>
                  <td className="px-5 py-3 font-mono font-semibold text-desk-text">{ranking.ticker}</td>
                  <td className="px-5 py-3">
                    <span className="desk-tag">{ranking.universe}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-desk-text">
                    ${ranking.price.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-desk-text">
                    {ranking.iv.toFixed(1)}%
                  </td>
                  <td className="px-5 py-3 text-center font-mono tabular-nums text-desk-secondary">
                    {ranking.next_earnings
                      ? new Date(ranking.next_earnings).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {ranking.above_ma_200 !== null && ranking.above_ma_200 !== undefined && (
                      <span className={ranking.above_ma_200 ? 'desk-tag-up' : 'desk-tag-down'}>
                        {ranking.above_ma_200 ? 'Above' : 'Below'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-desk-muted font-mono tabular-nums">
                    {ranking.ma_200 ? `$${ranking.ma_200.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRankings.length === 0 && (
        <div className="desk-surface rounded-2xl p-10 text-center text-sm text-desk-muted">
          No tickers match the current filter.
        </div>
      )}
    </div>
  );
}
