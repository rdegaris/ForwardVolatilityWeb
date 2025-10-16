import { useState, useEffect } from 'react';

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
  trade_details?: {
    spread_type: string;
    strike: number;
    front_iv: number;
    back_iv: number;
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

export default function Nasdaq100Results() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dates, setDates] = useState<string[]>([]);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Generate last 5 days
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
      setSelectedDate(dateList[0]); // Set today as default
    };
    generateDates();
  }, []);

  // Load scan results for selected date
  useEffect(() => {
    if (!selectedDate) return;

    const loadResults = async () => {
      setLoading(true);
      try {
        // Try to load today's results from the JSON file
        if (isToday(selectedDate)) {
          const response = await fetch('/nasdaq100_results_latest.json');
          if (response.ok) {
            const data = await response.json();
            data.opportunities.sort((a: ScanResult, b: ScanResult) => a.ticker.localeCompare(b.ticker));
            setScanData(data);
          } else {
            setScanData(null);
          }
        } else {
          // For historical dates, try to load dated files
          const formattedDate = selectedDate.replace(/-/g, '');
          const response = await fetch(`/nasdaq100_results_${formattedDate}.json`);
          if (response.ok) {
            const data = await response.json();
            data.opportunities.sort((a: ScanResult, b: ScanResult) => a.ticker.localeCompare(b.ticker));
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
    // Format YYYYMMDD to MMM DD
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

  const toggleRow = (idx: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            NASDAQ 100 Scanner Results
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

        {/* Date Navigation */}
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

        {/* Terminal Output */}
        {scanData && showLog && scanData.scan_log && (
          <div className="mb-6 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-xs">Terminal Output</div>
              <div className="text-gray-400 text-xs">
                {new Date(scanData.timestamp).toLocaleString()}
              </div>
            </div>
            {scanData.scan_log.map((line, idx) => (
              <div key={idx} className="py-0.5">
                {line.includes('‚úÖ') || line.includes('Found') ? (
                  <span className="text-green-400">{line}</span>
                ) : line.includes('‚ö™') || line.includes('No opportunities') ? (
                  <span className="text-gray-500">{line}</span>
                ) : line.includes('‚ùå') || line.includes('Error') ? (
                  <span className="text-red-400">{line}</span>
                ) : (
                  <span className="text-blue-300">{line}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading scan results...</p>
          </div>
        )}

        {/* Results Table with Expandable Rows */}
        {!loading && scanData && scanData.opportunities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ticker
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    DTE
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Call FF
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Put FF
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Best FF
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {scanData.opportunities.map((result, idx) => (
                  <>
                    <tr 
                      key={idx} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => toggleRow(idx)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                          {expandedRows.has(idx) ? '‚ñº' : '‚ñ∂'}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {result.ticker}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          ${result.price.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatExpiry(result.expiry1)} ‚Üí {formatExpiry(result.expiry2)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {result.dte1}d ‚Üí {result.dte2}d
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatFF(result.ff_call)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatFF(result.ff_put)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {formatFF(result.best_ff)}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row Details */}
                    {expandedRows.has(idx) && result.trade_details && (
                      <tr key={`${idx}-details`} className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={8} className="px-4 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Trade Setup */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                Ì≥ä {result.trade_details.spread_type} CALENDAR SPREAD
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Front IV:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {result.trade_details.front_iv.toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Back IV:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {result.trade_details.back_iv.toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                  <span className="text-gray-600 dark:text-gray-400">Net Debit:</span>
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    ${result.trade_details.net_debit_total.toFixed(0)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* P&L Scenarios */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                Ì≥à Potential Outcomes
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-green-600 dark:text-green-400">ÌæØ Best Case:</span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    +${result.trade_details.best_case.toFixed(0)} ({result.trade_details.best_case_pct.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-600 dark:text-blue-400">‚úÖ Typical:</span>
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    +${result.trade_details.typical_case.toFixed(0)} ({result.trade_details.typical_case_pct.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orange-600 dark:text-orange-400">Ìªë Adverse:</span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">
                                    ${result.trade_details.adverse_case.toFixed(0)} ({result.trade_details.adverse_case_pct.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                  <span className="text-red-600 dark:text-red-400">‚ö†Ô∏è Max Loss:</span>
                                  <span className="font-bold text-red-600 dark:text-red-400">
                                    ${result.trade_details.max_loss.toFixed(0)} ({result.trade_details.max_loss_pct.toFixed(0)}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Trade Instructions */}
                          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                              Ì≤° Trade Setup
                            </h4>
                            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                              <div>‚Ä¢ Sell: {formatExpiry(result.expiry1)} ${result.trade_details.strike.toFixed(0)} {result.trade_details.spread_type}</div>
                              <div>‚Ä¢ Buy: {formatExpiry(result.expiry2)} ${result.trade_details.strike.toFixed(0)} {result.trade_details.spread_type}</div>
                              <div>‚Ä¢ Hold until: {formatExpiry(result.expiry1)} (exit 15 min before close)</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
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

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
          About NASDAQ 100 Scanner
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
          Scans all 100+ NASDAQ 100 stocks for forward volatility opportunities with earnings filtering enabled.
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>To generate new results:</strong> Run{' '}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
            python run_nasdaq100_scan.py
          </code>{' '}
          from the terminal
        </p>
      </div>
    </div>
  );
}
