import { useState, useEffect } from 'react';

interface Opportunity {
  ticker: string;
  price: number;
  ma_200?: number | null;
  above_ma_200?: boolean | null;
  expiry1: string;
  expiry2: string;
  dte1: number;
  dte2: number;
  ff_call?: number | null;
  ff_put?: number | null;
  ff_avg?: number | null;
  best_ff: number;
  next_earnings?: string | null;
  call_iv1?: number | null;
  call_iv2?: number | null;
  put_iv1?: number | null;
  put_iv2?: number | null;
  avg_iv1?: number | null;
  avg_iv2?: number | null;
  fwd_var_call?: number | null;
  fwd_var_put?: number | null;
  fwd_var_avg?: number | null;
  fwd_vol_call?: number | null;
  fwd_vol_put?: number | null;
  fwd_vol_avg?: number | null;
  trade_details?: {
    spread_type: string;
    strike: number;
    front_iv: number;
    back_iv: number;
    ff_display: number;
    front_price: number;
    back_price: number;
    net_debit: number;
    net_debit_total: number;
    best_case: number;
    typical_case: number;
    adverse_case: number;
    max_loss: number;
    best_case_pct: number;
    typical_case_pct: number;
    adverse_case_pct: number;
    max_loss_pct: number;
  };
}

interface ScanResults {
  timestamp: string;
  date: string;
  scan_log: string[];
  opportunities: Opportunity[];
  summary: {
    total_opportunities: number;
    tickers_scanned: number;
    best_ff: number;
    avg_ff: number;
  };
}

export default function MidCap400Results() {
  const [results, setResults] = useState<ScanResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<number>(0);

  useEffect(() => {
    fetch('/midcap400_results_latest.json')
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load scan results');
        setLoading(false);
        console.error('Error loading results:', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading S&P MidCap 400 results...</div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error || 'No results available'}</div>
      </div>
    );
  }

  const opportunity = results.opportunities[selectedOpportunity];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            S&P MidCap 400 Scanner Results
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Scan Date</div>
              <div className="text-xl font-bold">{results.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Opportunities</div>
              <div className="text-xl font-bold text-green-400">{results.summary.total_opportunities}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Tickers Scanned</div>
              <div className="text-xl font-bold">{results.summary.tickers_scanned}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Best FF</div>
              <div className="text-xl font-bold text-yellow-400">
                {results.summary.best_ff > 0 ? results.summary.best_ff.toFixed(3) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {results.opportunities.length === 0 ? (
          <div className="bg-white/10 rounded-xl p-8 backdrop-blur-sm text-center">
            <p className="text-xl text-gray-300">No opportunities found in current scan.</p>
            <p className="text-sm text-gray-400 mt-2">
              This may be due to earnings conflicts or market conditions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Opportunities List */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold mb-4">Opportunities</h2>
              <div className="space-y-2">
                {results.opportunities.map((opp, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOpportunity(idx)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      idx === selectedOpportunity
                        ? 'bg-purple-600 shadow-lg scale-105'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xl font-bold">{opp.ticker}</div>
                        <div className="text-sm text-gray-300">${opp.price.toFixed(2)}</div>
                        {opp.above_ma_200 !== null && (
                          <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                            opp.above_ma_200 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {opp.above_ma_200 ? '↑ Above' : '↓ Below'} 200MA
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-400">
                          {opp.best_ff.toFixed(3)}
                        </div>
                        <div className="text-xs text-gray-400">FF</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Opportunity Details */}
            {opportunity && (
              <div className="lg:col-span-2">
                <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-3xl font-bold">{opportunity.ticker}</h2>
                      <p className="text-gray-300">Price: ${opportunity.price.toFixed(2)}</p>
                      {opportunity.ma_200 && (
                        <p className="text-sm text-gray-400">
                          200-day MA: ${opportunity.ma_200.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-400">
                        {opportunity.best_ff.toFixed(3)}
                      </div>
                      <div className="text-sm text-gray-400">Forward Factor</div>
                    </div>
                  </div>

                  {/* Trade Setup */}
                  {opportunity.trade_details && (
                    <div className="bg-purple-900/30 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-bold mb-4 text-purple-300">
                        {opportunity.trade_details.spread_type} Calendar Spread
                      </h3>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-purple-500/30">
                          <span className="text-gray-300">Sell (Front)</span>
                          <span className="font-mono font-bold">
                            {opportunity.expiry1} ${opportunity.trade_details.strike.toFixed(0)} {opportunity.trade_details.spread_type}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-purple-500/30">
                          <span className="text-gray-300">Buy (Back)</span>
                          <span className="font-mono font-bold">
                            {opportunity.expiry2} ${opportunity.trade_details.strike.toFixed(0)} {opportunity.trade_details.spread_type}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-300">Net Debit</span>
                          <span className="font-bold text-yellow-400">
                            ${opportunity.trade_details.net_debit_total.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-purple-500/30">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">Front IV</div>
                            <div className="font-bold">{opportunity.trade_details.front_iv.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Back IV</div>
                            <div className="font-bold">{opportunity.trade_details.back_iv.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forward Volatility Metrics */}
                  {(opportunity.fwd_vol_call || opportunity.fwd_vol_put || opportunity.fwd_vol_avg) && (
                    <div className="bg-purple-900/30 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-bold mb-4 text-purple-300">Forward Volatility Metrics</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {opportunity.fwd_vol_call && (
                          <div>
                            <div className="text-gray-400">Call Fwd Vol</div>
                            <div className="font-bold text-lg">{opportunity.fwd_vol_call.toFixed(1)}%</div>
                          </div>
                        )}
                        {opportunity.fwd_vol_put && (
                          <div>
                            <div className="text-gray-400">Put Fwd Vol</div>
                            <div className="font-bold text-lg">{opportunity.fwd_vol_put.toFixed(1)}%</div>
                          </div>
                        )}
                        {opportunity.fwd_vol_avg && (
                          <div>
                            <div className="text-gray-400">Avg Fwd Vol</div>
                            <div className="font-bold text-lg text-yellow-400">{opportunity.fwd_vol_avg.toFixed(1)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* P&L Scenarios */}
                  {opportunity.trade_details && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-900/20 rounded-lg p-4">
                        <div className="text-gray-300 mb-1">Best Case</div>
                        <div className="text-xl font-bold text-green-400">
                          +${opportunity.trade_details.best_case.toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-400">
                          ({opportunity.trade_details.best_case_pct.toFixed(0)}%)
                        </div>
                      </div>
                      <div className="bg-blue-900/20 rounded-lg p-4">
                        <div className="text-gray-300 mb-1">Typical</div>
                        <div className="text-xl font-bold text-blue-400">
                          +${opportunity.trade_details.typical_case.toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-400">
                          ({opportunity.trade_details.typical_case_pct.toFixed(0)}%)
                        </div>
                      </div>
                      <div className="bg-orange-900/20 rounded-lg p-4">
                        <div className="text-gray-300 mb-1">Adverse</div>
                        <div className="text-xl font-bold text-orange-400">
                          ${opportunity.trade_details.adverse_case.toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-400">
                          ({opportunity.trade_details.adverse_case_pct.toFixed(0)}%)
                        </div>
                      </div>
                      <div className="bg-red-900/20 rounded-lg p-4">
                        <div className="text-gray-300 mb-1">Max Loss</div>
                        <div className="text-xl font-bold text-red-400">
                          ${opportunity.trade_details.max_loss.toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-400">
                          ({opportunity.trade_details.max_loss_pct.toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* About Section */}
        <div className="mt-8 bg-white/5 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-bold mb-3 text-purple-300">About S&P MidCap 400 Scanner</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            This scanner analyzes S&P MidCap 400 stocks for calendar spread opportunities based on forward volatility.
            It scans {results.summary.tickers_scanned} mid-cap stocks (market cap ~$3.7B to ~$13.1B) and identifies 
            opportunities where implied volatility structure suggests favorable conditions for calendar spreads.
          </p>
        </div>
      </div>
    </div>
  );
}
