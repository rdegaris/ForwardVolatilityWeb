import { useState, useEffect } from 'react';

interface EarningsCrushTrade {
  ticker: string;
  price: number;
  earnings_date: string;
  days_to_earnings: number;
  iv: number;
  expected_move: number;
  expected_move_pct: number;
  // Add more fields as needed based on your Python script
}

interface EarningsCrushResults {
  timestamp: string;
  date: string;
  total_scanned: number;
  opportunities: EarningsCrushTrade[];
  summary?: {
    avg_iv: number;
    avg_expected_move: number;
    total_opportunities: number;
  };
}

export default function EarningsCrush() {
  const [results, setResults] = useState<EarningsCrushResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/earnings_crush_latest.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load earnings crush data');
        return res.json();
      })
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading earnings crush opportunities...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">⚠️ {error || 'No data available'}</p>
          <p className="text-gray-400 text-sm">Run the earnings crush scanner to generate data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Earnings Crush Scanner
          </h1>
          <p className="text-gray-300 mb-6">
            Identify opportunities to profit from post-earnings volatility collapse
          </p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Scan Date</div>
              <div className="text-xl font-bold">{results.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Total Scanned</div>
              <div className="text-xl font-bold text-green-400">{results.total_scanned}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Opportunities</div>
              <div className="text-xl font-bold text-purple-400">{results.opportunities.length}</div>
            </div>
            {results.summary && (
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-gray-400">Avg IV</div>
                <div className="text-xl font-bold text-yellow-400">{results.summary.avg_iv.toFixed(1)}%</div>
              </div>
            )}
          </div>
        </div>

        {/* Opportunities Table */}
        {results.opportunities.length > 0 ? (
          <div className="bg-white/10 rounded-xl backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Ticker</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Price</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Earnings Date</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Days Until</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">IV</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Expected Move</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Expected Move %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {results.opportunities.map((trade, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold font-mono">{trade.ticker}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-sm">
                        {new Date(trade.earnings_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          trade.days_to_earnings <= 1 ? 'bg-red-500/20 text-red-300' :
                          trade.days_to_earnings <= 3 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {trade.days_to_earnings} days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-lg font-bold ${
                          trade.iv > 100 ? 'text-red-400' :
                          trade.iv > 70 ? 'text-orange-400' :
                          trade.iv > 50 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {trade.iv.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        ${trade.expected_move.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-purple-400">
                          ±{trade.expected_move_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            No earnings crush opportunities found
          </div>
        )}

        {/* About Section */}
        <div className="mt-8 bg-white/5 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-bold mb-3 text-purple-300">About Earnings Crush Strategy</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            The Earnings Crush strategy profits from the volatility collapse that typically occurs after earnings announcements.
            Implied volatility (IV) often spikes in the days leading up to earnings, pricing in uncertainty. Once earnings are released,
            this uncertainty resolves and IV typically "crushes" back down to normal levels.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            This scanner identifies stocks with upcoming earnings where IV is elevated. The strategy typically involves selling
            options (or option spreads) before earnings to capture the inflated volatility premium, then profiting when IV collapses
            post-announcement regardless of the stock's price movement.
          </p>
        </div>
      </div>
    </div>
  );
}
