import { useState, useEffect } from 'react';

interface EarningsCrushTrade {
  ticker: string;
  price: number;
  earnings_date: string;
  days_to_earnings: number;
  iv: number;
  expected_move: number;
  expected_move_pct: number;
  recommendation: string;
  criteria: {
    avg_volume: boolean;
    iv30_rv30: boolean;
    ts_slope_positive: boolean;
    iv_slope_pct?: number;
  };
  suggested_trade?: {
    strike: number;
    sell_expiration: string;
    buy_expiration: string;
    sell_dte: number;
    buy_dte: number;
  };
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
    fetch('/data/earnings_crush_latest.json')
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
          <div className="space-y-6">
            {results.opportunities.map((trade, idx) => {
              const isRecommended = trade.recommendation === 'RECOMMENDED';
              const isConsider = trade.recommendation === 'CONSIDER';
              
              return (
                <div key={idx} className={`rounded-xl overflow-hidden ${
                  isRecommended ? 'bg-green-900/20 border-2 border-green-500/30' :
                  isConsider ? 'bg-yellow-900/20 border-2 border-yellow-500/30' :
                  'bg-white/10 border border-white/10'
                } backdrop-blur-sm`}>
                  {/* Main Trade Info */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold font-mono">{trade.ticker}</span>
                        <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                          isRecommended ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                          isConsider ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                          'bg-red-500/20 text-red-300 border border-red-500/50'
                        }`}>
                          {trade.recommendation}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono">${trade.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-400">Current Price</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Earnings Date</div>
                        <div className="font-mono text-sm">
                          {new Date(trade.earnings_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Days Until</div>
                        <div className={`text-lg font-bold ${
                          trade.days_to_earnings <= 1 ? 'text-red-300' :
                          trade.days_to_earnings <= 3 ? 'text-yellow-300' :
                          'text-green-300'
                        }`}>
                          {trade.days_to_earnings}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">IV Rank</div>
                        <div className={`text-lg font-bold ${
                          trade.iv > 100 ? 'text-red-400' :
                          trade.iv > 70 ? 'text-orange-400' :
                          trade.iv > 50 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {trade.iv.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Expected Move</div>
                        <div className="text-lg font-bold text-purple-400">
                          ±{trade.expected_move_pct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Expected Move $</div>
                        <div className="font-mono text-sm">
                          ${trade.expected_move.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Criteria Badges */}
                    <div className="flex gap-2 text-xs">
                      <span className={`px-3 py-1 rounded-full ${
                        trade.criteria.avg_volume ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {trade.criteria.avg_volume ? '✓' : '✗'} Volume &gt; 1.5M
                      </span>
                      <span className={`px-3 py-1 rounded-full ${
                        trade.criteria.iv30_rv30 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {trade.criteria.iv30_rv30 ? '✓' : '✗'} IV/RV &gt; 1.25
                      </span>
                      <span className={`px-3 py-1 rounded-full ${
                        trade.criteria.ts_slope_positive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {trade.criteria.ts_slope_positive ? '✓' : '✗'} IV Slope {trade.criteria.iv_slope_pct ? `(+${trade.criteria.iv_slope_pct.toFixed(0)}%)` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Suggested Trade - Only show for RECOMMENDED */}
                  {isRecommended && trade.suggested_trade && (
                    <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-t border-white/10 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <h4 className="text-lg font-bold text-green-300">Suggested Calendar Spread</h4>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-black/30 rounded-lg p-4 border border-red-500/30">
                          <div className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="text-xl">↓</span> SELL (Short Front)
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Strike:</span>
                              <span className="font-mono font-bold">${trade.suggested_trade.strike.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Expiration:</span>
                              <span className="font-mono">{new Date(trade.suggested_trade.sell_expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">DTE:</span>
                              <span className="font-bold">{trade.suggested_trade.sell_dte} days</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <span className="text-xs text-gray-400">ATM Call - Expires around earnings</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-black/30 rounded-lg p-4 border border-green-500/30">
                          <div className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="text-xl">↑</span> BUY (Long Back)
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Strike:</span>
                              <span className="font-mono font-bold">${trade.suggested_trade.strike.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Expiration:</span>
                              <span className="font-mono">{new Date(trade.suggested_trade.buy_expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">DTE:</span>
                              <span className="font-bold">{trade.suggested_trade.buy_dte} days</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <span className="text-xs text-gray-400">ATM Call - 30 days out for protection</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                        <div className="text-sm text-blue-200">
                          <strong>Strategy:</strong> Sell near-term inflated IV before earnings, buy longer-dated for protection. 
                          Profit from IV crush post-earnings as front month decays faster than back month.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
