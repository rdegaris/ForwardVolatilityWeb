import { useState, useEffect } from 'react';

interface TradeDetails {
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
}

interface ScanResult {
  ticker: string;
  price: number;
  expiry1: string;
  expiry2: string;
  dte1: number;
  dte2: number;
  ff_call: number | null;
  ff_put: number | null;
  ff_avg: number | null;
  best_ff: number;
  trade: TradeDetails;
}

interface ScanData {
  timestamp: string;
  date: string;
  scan_log: string[];
  opportunities: ScanResult[];
  summary: {
    total_opportunities: number;
    tickers_scanned: number;
    best_ff: number;
    avg_ff: number;
  };
}

export default function ScannerResults() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dates, setDates] = useState<string[]>([]);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLog, setShowLog] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [searchTicker, setSearchTicker] = useState<string>('');
  const [ffFilter, setFfFilter] = useState<number>(0);

  useEffect(() => {
    const generateDates = () => {
      const today = new Date();
      const dateList: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateList.push(dateStr);
      }
      
      setDates(dateList);
      setSelectedDate(dateList[0]);
    };

    generateDates();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    const loadResults = async () => {
      setLoading(true);
      try {
        if (isToday(selectedDate)) {
          const response = await fetch('/scan_results_latest.json');
          if (response.ok) {
            const data = await response.json();
            // Sort opportunities by ticker alphabetically
            if (data.opportunities) {
              data.opportunities.sort((a: ScanResult, b: ScanResult) => 
                a.ticker.localeCompare(b.ticker)
              );
            }
            setScanData(data);
          } else {
            setScanData(null);
          }
        } else {
          const formattedDate = selectedDate.replace(/-/g, '');
          const response = await fetch(`/scan_results_${formattedDate}.json`);
          if (response.ok) {
            const data = await response.json();
            // Sort opportunities by ticker alphabetically
            if (data.opportunities) {
              data.opportunities.sort((a: ScanResult, b: ScanResult) => 
                a.ticker.localeCompare(b.ticker)
              );
            }
            setScanData(data);
          } else {
            setScanData(null);
          }
        }
      } catch (error) {
        console.error('Error loading scan results:', error);
        setScanData(null);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [selectedDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatExpiry = (expiry: string) => {
    const year = expiry.substring(0, 4);
    const month = expiry.substring(4, 6);
    const day = expiry.substring(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const formatFF = (value: number | null) => {
    if (value === null) return 'N/A';
    return (value * 100).toFixed(1) + '%';
  };

  // Filter opportunities based on search and FF filter
  const filteredOpportunities = scanData?.opportunities.filter((opp) => {
    const matchesTicker = opp.ticker.toLowerCase().includes(searchTicker.toLowerCase());
    const matchesFF = opp.best_ff >= ffFilter;
    return matchesTicker && matchesFF;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            MAG7 Scanner Results
          </h2>
          {scanData && (
            <button
              onClick={() => setShowLog(!showLog)}
              className="text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            >
              {showLog ? 'Hide' : 'Show'} Terminal Output
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {dates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedDate === date
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {isToday(date) ? 'Today' : formatDate(date)}
            </button>
          ))}
        </div>

        {/* Filters */}
        {scanData && scanData.opportunities.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Search Box */}
            <div>
              <label htmlFor="ticker-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Ticker
              </label>
              <input
                id="ticker-search"
                type="text"
                placeholder="Type ticker symbol..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* FF Filter Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Forward Factor
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 0.2, 0.4, 0.6, 0.8].map((threshold) => (
                  <button
                    key={threshold}
                    onClick={() => setFfFilter(threshold)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      ffFilter === threshold
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {threshold === 0 ? 'All' : `≥ ${(threshold * 100).toFixed(0)}%`}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredOpportunities.length} of {scanData.opportunities.length} opportunities
              </div>
            </div>
          </div>
        )}

        {scanData && showLog && scanData.scan_log && (
          <div className="mb-6 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-xs">Terminal Output</div>
              <div className="text-gray-400 text-xs">{new Date(scanData.timestamp).toLocaleString()}</div>
            </div>
            {scanData.scan_log.map((line, idx) => (
              <div key={idx} className="py-0.5">
                {line.includes('Found') ? (
                  <span className="text-green-400">{line}</span>
                ) : line.includes('No opportunities') ? (
                  <span className="text-gray-500">{line}</span>
                ) : line.includes('Error') ? (
                  <span className="text-red-400">{line}</span>
                ) : (
                  <span className="text-blue-300">{line}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {scanData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Opportunities</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {scanData.summary.total_opportunities}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tickers Scanned</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {scanData.summary.tickers_scanned}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Best FF</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatFF(scanData.summary.best_ff)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg FF</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatFF(scanData.summary.avg_ff)}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading scan results...</p>
          </div>
        )}

        {!loading && scanData && filteredOpportunities.length > 0 && (
          <div className="space-y-4">
            {filteredOpportunities.map((result, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div 
                  className="bg-gray-50 dark:bg-gray-700 p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        #{idx + 1}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {result.ticker}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ${result.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatExpiry(result.expiry1)} → {formatExpiry(result.expiry2)}
                      </div>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        FF: {formatFF(result.best_ff)}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedRow === idx ? 'transform rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {expandedRow === idx && result.trade && (
                  <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          ��� RECOMMENDED: {result.trade.spread_type} CALENDAR SPREAD
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Forward Factor:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {(result.trade.ff_display * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Front IV:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {result.trade.front_iv.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Back IV:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {result.trade.back_iv.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mt-4 mb-3">
                          ��� ESTIMATED PRICING (per contract)
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Front {result.trade.spread_type}:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              ${result.trade.front_price.toFixed(2)} (${(result.trade.front_price * 100).toFixed(0)})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Back {result.trade.spread_type}:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              ${result.trade.back_price.toFixed(2)} (${(result.trade.back_price * 100).toFixed(0)})
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                            <span className="text-gray-900 dark:text-white font-semibold">Net Debit:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              ${result.trade.net_debit.toFixed(2)} (${result.trade.net_debit_total.toFixed(0)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          ��� POTENTIAL OUTCOMES (1 contract)
                        </h4>
                        <div className="space-y-2">
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700 dark:text-gray-300">��� Best Case:</span>
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                +${result.trade.best_case.toFixed(0)} ({result.trade.best_case_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700 dark:text-gray-300">✅ Typical:</span>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                +${result.trade.typical_case.toFixed(0)} ({result.trade.typical_case_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700 dark:text-gray-300">��� Adverse:</span>
                              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                ${result.trade.adverse_case.toFixed(0)} ({result.trade.adverse_case_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700 dark:text-gray-300">⚠️ Max Loss:</span>
                              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                ${result.trade.max_loss.toFixed(0)} ({result.trade.max_loss_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            ��� Trade Setup
                          </h4>
                          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            <div>• <strong>Sell:</strong> {result.expiry1} ${result.trade.strike.toFixed(0)} {result.trade.spread_type}</div>
                            <div>• <strong>Buy:</strong> {result.expiry2} ${result.trade.strike.toFixed(0)} {result.trade.spread_type}</div>
                            <div>• <strong>Hold until:</strong> {result.expiry1}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty Filter State */}
        {!loading && scanData && scanData.opportunities.length > 0 && filteredOpportunities.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              No opportunities match your filters
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* No Data State */}
        {!loading && (!scanData || scanData.opportunities.length === 0) && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              No scan results found for {formatDate(selectedDate)}
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Run the scanner to generate results
            </p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
          About MAG7 Scanner
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
          Scans the Magnificent 7 stocks (AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA) for forward volatility opportunities with detailed trade recommendations and P&L estimates.
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>To generate new results:</strong> Run <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">python run_mag7_scan.py</code> from the terminal
        </p>
      </div>
    </div>
  );
}
