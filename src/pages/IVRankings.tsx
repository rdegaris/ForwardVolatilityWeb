import { useState, useEffect } from 'react';

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
    // Load IV rankings from dedicated ranking files
    Promise.all([
      fetch('/mag7_iv_rankings_latest.json').then(res => res.ok ? res.json() : { rankings: [] }),
      fetch('/nasdaq100_iv_rankings_latest.json').then(res => res.ok ? res.json() : { rankings: [] }),
      fetch('/midcap400_iv_rankings_latest.json').then(res => res.ok ? res.json() : { rankings: [] })
    ])
      .then(([mag7Data, nasdaq100Data, midcapData]) => {
        // Combine all rankings
        const allRankings: IVRanking[] = [
          ...(mag7Data.rankings || []),
          ...(nasdaq100Data.rankings || []),
          ...(midcapData.rankings || [])
        ];
        
        // Sort by IV descending
        allRankings.sort((a, b) => b.iv - a.iv);
        
        const result: IVResults = {
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          universe: 'ALL',
          total_scanned: allRankings.length,
          rankings: allRankings,
          summary: {
            highest_iv: allRankings[0]?.iv || 0,
            lowest_iv: allRankings[allRankings.length - 1]?.iv || 0,
            average_iv: allRankings.length > 0 
              ? Math.round(allRankings.reduce((sum, r) => sum + r.iv, 0) / allRankings.length * 100) / 100 
              : 0,
            median_iv: allRankings.length > 0 
              ? allRankings[Math.floor(allRankings.length / 2)].iv 
              : 0
          }
        };
        
        setResults(result);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load IV rankings');
        setLoading(false);
        console.error('Error loading IV rankings:', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading IV Rankings...</div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error || 'No rankings available'}</div>
      </div>
    );
  }

  // Filter rankings
  const filteredRankings = results.rankings.filter(r => {
    const matchesUniverse = filterUniverse === 'all' || r.universe.toLowerCase() === filterUniverse;
    const matchesSearch = searchTerm === '' || r.ticker.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUniverse && matchesSearch;
  });

  // Get universe badge color
  const getUniverseColor = (universe: string) => {
    switch (universe) {
      case 'MAG7': return 'bg-yellow-500/20 text-yellow-300';
      case 'NASDAQ100': return 'bg-blue-500/20 text-blue-300';
      case 'MIDCAP400': return 'bg-purple-500/20 text-purple-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Implied Volatility Rankings
          </h1>
          <p className="text-gray-300 mb-6">
            Tickers ranked by near-term implied volatility across all universes
          </p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Scan Date</div>
              <div className="text-xl font-bold">{results.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Total Scanned</div>
              <div className="text-xl font-bold text-green-400">{results.total_scanned}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Highest IV</div>
              <div className="text-xl font-bold text-red-400">{results.summary.highest_iv.toFixed(1)}%</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Average IV</div>
              <div className="text-xl font-bold text-yellow-400">{results.summary.average_iv.toFixed(1)}%</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Median IV</div>
              <div className="text-xl font-bold text-blue-400">{results.summary.median_iv.toFixed(1)}%</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-indigo-400 focus:outline-none backdrop-blur-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterUniverse('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterUniverse === 'all'
                    ? 'bg-indigo-600 shadow-lg'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterUniverse('mag7')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterUniverse === 'mag7'
                    ? 'bg-yellow-600 shadow-lg'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                MAG7
              </button>
              <button
                onClick={() => setFilterUniverse('nasdaq100')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterUniverse === 'nasdaq100'
                    ? 'bg-blue-600 shadow-lg'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                NASDAQ 100
              </button>
              <button
                onClick={() => setFilterUniverse('midcap400')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterUniverse === 'midcap400'
                    ? 'bg-purple-600 shadow-lg'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                MidCap 400
              </button>
            </div>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="bg-white/10 rounded-xl backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Ticker</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Universe</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Price</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">IV</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Next Earnings</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">vs 200MA</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">200MA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredRankings.map((ranking, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold font-mono">{ranking.ticker}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getUniverseColor(ranking.universe)}`}>
                        {ranking.universe}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      ${ranking.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-lg font-bold ${
                        ranking.iv > 70 ? 'text-red-400' :
                        ranking.iv > 50 ? 'text-orange-400' :
                        ranking.iv > 30 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {ranking.iv.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm">
                      {ranking.next_earnings ? (
                        <span className="text-yellow-300">
                          {new Date(ranking.next_earnings).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {ranking.above_ma_200 !== null && (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          ranking.above_ma_200
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {ranking.above_ma_200 ? 'Above' : 'Below'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-sm">
                      {ranking.ma_200 ? `$${ranking.ma_200.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRankings.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No tickers match your filters
          </div>
        )}

        {/* About Section */}
        <div className="mt-8 bg-white/5 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-bold mb-3 text-indigo-300">About IV Rankings</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            This page ranks all tickers across MAG7, NASDAQ 100, and S&P MidCap 400 by their near-term implied volatility.
            Higher IV generally indicates greater expected price movement and can signal trading opportunities. The 200MA indicator
            shows whether the stock is currently trading above (bullish) or below (bearish) its 200-day moving average.
          </p>
        </div>
      </div>
    </div>
  );
}
