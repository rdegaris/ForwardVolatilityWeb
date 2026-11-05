import { useState, useEffect } from 'react';
import { getTodayPacific, getTodayDatePacific } from '../lib/dateUtils';
import { fetchJsonText } from '../lib/http';

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
  next_earnings?: string | null;
  trade_details: TradeDetails;
  ma_200?: number | null;
  above_ma_200?: boolean | null;
  fwd_vol_call?: number | null;
  fwd_vol_put?: number | null;
  fwd_vol_avg?: number | null;
  fwd_var_call?: number | null;
  fwd_var_put?: number | null;
  fwd_var_avg?: number | null;
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
      const today = getTodayDatePacific();
      const dateList: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
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
          const { res, text } = await fetchJsonText('/data/scan_results_latest.json', { cache: 'no-store' });
          if (res.ok) {
            const data = JSON.parse(text);
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
          const url = `/scan_results_${formattedDate}.json`;
          const { res, text } = await fetchJsonText(url, { cache: 'no-store' });
          if (res.ok) {
            const data = JSON.parse(text);
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
    const today = getTodayPacific();
    return dateStr === today;
  };

  const formatFF = (value: number | null) => {
    if (value === null) return 'N/A';
    return (value * 100).toFixed(1) + '%';
  };

  const formatEarningsDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter opportunities based on search and FF filter
  const filteredOpportunities = scanData?.opportunities.filter((opp) => {
    const matchesTicker = opp.ticker.toLowerCase().includes(searchTicker.toLowerCase());
    const matchesFF = opp.best_ff >= ffFilter;
    return matchesTicker && matchesFF;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6 bg-desk-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-desk-text">
            MAG7 Scanner Results
          </h2>
          {scanData && (
            <button
              onClick={() => setShowLog(!showLog)}
              className="text-sm px-3 py-1 rounded-md bg-desk-raised hover:bg-desk-raised text-desk-secondary"
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
                  ? 'bg-desk-text text-desk-deep'
                  : 'bg-desk-raised text-desk-secondary hover:bg-desk-raised'
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
              <label htmlFor="ticker-search" className="block text-sm font-medium mb-2 text-desk-secondary">
                Search by Ticker
              </label>
              <input
                id="ticker-search"
                type="text"
                placeholder="Type ticker symbol..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border rounded-md placeholder-gray-400 focus:border-transparent border-hairline bg-desk-raised text-desk-text"
              />
            </div>

            {/* FF Filter Buttons */}
            <div>
              <label className="block text-sm font-medium mb-2 text-desk-secondary">
                Filter by Forward Factor
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 0.2, 0.4, 0.6, 0.8].map((threshold) => (
                  <button
                    key={threshold}
                    onClick={() => setFfFilter(threshold)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      ffFilter === threshold
                        ? 'bg-desk-text text-desk-deep'
                        : 'bg-desk-raised text-desk-secondary hover:bg-desk-raised'
                    }`}
                  >
                    {threshold === 0 ? 'All' : `≥ ${(threshold * 100).toFixed(0)}%`}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-sm text-desk-muted">
                Showing {filteredOpportunities.length} of {scanData.opportunities.length} opportunities
              </div>
            </div>
          </div>
        )}

        {scanData && showLog && scanData.scan_log && (
          <div className="mb-6 p-4 rounded-lg font-mono text-sm overflow-x-auto bg-desk-deep text-desk-up">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-desk-muted">Terminal Output</div>
              <div className="text-xs text-desk-muted">{new Date(scanData.timestamp).toLocaleString()}</div>
            </div>
            {scanData.scan_log.map((line, idx) => (
              <div key={idx} className="py-0.5">
                {line.includes('Found') ? (
                  <span className="text-desk-up">{line}</span>
                ) : line.includes('No opportunities') ? (
                  <span className="text-desk-muted">{line}</span>
                ) : line.includes('Error') ? (
                  <span className="text-desk-down">{line}</span>
                ) : (
                  <span className="text-desk-text">{line}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {scanData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-lg bg-desk-card">
            <div>
              <div className="text-sm text-desk-muted">Opportunities</div>
              <div className="text-2xl font-bold text-desk-text">
                {scanData.summary.total_opportunities}
              </div>
            </div>
            <div>
              <div className="text-sm text-desk-muted">Tickers Scanned</div>
              <div className="text-2xl font-bold text-desk-text">
                {scanData.summary.tickers_scanned}
              </div>
            </div>
            <div>
              <div className="text-sm text-desk-muted">Best FF</div>
              <div className="text-2xl font-bold text-desk-text">
                {formatFF(scanData.summary.best_ff)}
              </div>
            </div>
            <div>
              <div className="text-sm text-desk-muted">Avg FF</div>
              <div className="text-2xl font-bold text-desk-text">
                {formatFF(scanData.summary.avg_ff)}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-hairline"></div>
            <p className="mt-2 text-desk-muted">Loading scan results...</p>
          </div>
        )}

        {!loading && scanData && filteredOpportunities.length > 0 && (
          <div className="space-y-4">
            {filteredOpportunities.map((result, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden border-hairline">
                <div 
                  className="p-4 cursor-pointer transition-colors bg-desk-raised hover:bg-desk-raised"
                  onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-wrap">
                      <div className="text-sm font-medium text-desk-muted">
                        #{idx + 1}
                      </div>
                      <div className="text-lg font-bold text-desk-text">
                        {result.ticker}
                      </div>
                      <div className="text-sm text-desk-muted">
                        ${result.price.toFixed(2)}
                      </div>
                      {result.ma_200 && result.above_ma_200 !== null && (
                        <div className={`text-xs px-2 py-1 rounded ${
                          result.above_ma_200 
                            ? 'text-desk-up bg-desk-card' 
                            : 'text-desk-down bg-desk-card'
                        }`}>
                          {result.above_ma_200 ? '↑' : '↓'} 200MA: ${result.ma_200.toFixed(2)}
                        </div>
                      )}
                      <div className="text-sm text-desk-muted">
                        {formatExpiry(result.expiry1)} → {formatExpiry(result.expiry2)}
                      </div>
                      <div className="text-sm font-semibold text-desk-text">
                        FF: {formatFF(result.best_ff)}
                      </div>
                      {result.next_earnings && (
                        <div className="text-xs px-2 py-1 rounded text-desk-up bg-desk-card">
                           Next Earnings: {formatEarningsDate(result.next_earnings)}
                        </div>
                      )}
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

                {expandedRow === idx && result.trade_details && (
                  <div className="p-4 border-t bg-desk-card border-hairline">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-desk-text">
                           RECOMMENDED: {result.trade_details.spread_type} CALENDAR SPREAD
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-desk-muted">Forward Factor:</span>
                            <span className="font-medium text-desk-text">
                              {(result.trade_details.ff_display * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-desk-muted">Front IV:</span>
                            <span className="font-medium text-desk-text">
                              {result.trade_details.front_iv.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-desk-muted">Back IV:</span>
                            <span className="font-medium text-desk-text">
                              {result.trade_details.back_iv.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-semibold mt-4 mb-3 text-desk-text">
                           ESTIMATED PRICING (per contract)
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-desk-muted">Front {result.trade_details.spread_type}:</span>
                            <span className="font-medium text-desk-text">
                              ${result.trade_details.front_price.toFixed(2)} (${(result.trade_details.front_price * 100).toFixed(0)})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-desk-muted">Back {result.trade_details.spread_type}:</span>
                            <span className="font-medium text-desk-text">
                              ${result.trade_details.back_price.toFixed(2)} (${(result.trade_details.back_price * 100).toFixed(0)})
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2 border-hairline">
                            <span className="font-semibold text-desk-text">Net Debit:</span>
                            <span className="font-bold text-desk-text">
                              ${result.trade_details.net_debit.toFixed(2)} (${result.trade_details.net_debit_total.toFixed(0)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-desk-text">
                           POTENTIAL OUTCOMES (1 contract)
                        </h4>
                        <div className="space-y-2">
                          <div className="p-3 rounded bg-desk-card">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-desk-secondary"> Best Case:</span>
                              <span className="text-lg font-bold text-desk-up">
                                +${result.trade_details.best_case.toFixed(0)} ({result.trade_details.best_case_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="p-3 rounded bg-desk-card">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-desk-secondary"> Typical:</span>
                              <span className="text-lg font-bold text-desk-text">
                                +${result.trade_details.typical_case.toFixed(0)} ({result.trade_details.typical_case_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="p-3 rounded bg-desk-card">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-desk-secondary"> Adverse:</span>
                              <span className="text-lg font-bold text-desk-amber">
                                ${result.trade_details.adverse_case.toFixed(0)} ({result.trade_details.adverse_case_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="p-3 rounded bg-desk-card">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-desk-secondary"> Max Loss:</span>
                              <span className="text-lg font-bold text-desk-down">
                                ${result.trade_details.max_loss.toFixed(0)} ({result.trade_details.max_loss_pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 rounded bg-desk-raised">
                          <h4 className="text-sm font-semibold mb-2 text-desk-text">
                             Trade Setup
                          </h4>
                          <div className="space-y-1 text-sm text-desk-secondary">
                            <div>• <strong>Sell:</strong> {result.expiry1} ${result.trade_details.strike.toFixed(0)} {result.trade_details.spread_type}</div>
                            <div>• <strong>Buy:</strong> {result.expiry2} ${result.trade_details.strike.toFixed(0)} {result.trade_details.spread_type}</div>
                            <div>• <strong>Hold until:</strong> {result.expiry1}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(result.fwd_vol_avg || result.fwd_var_avg) && (
                      <div className="mt-4 p-3 rounded bg-desk-card">
                        <h4 className="text-sm font-semibold mb-2 text-desk-text">
                           Forward Volatility Metrics
                        </h4>
                        <div className="space-y-2 text-sm">
                          {result.fwd_vol_avg && (
                            <div className="flex justify-between">
                              <span className="text-desk-muted">Fwd Vol (Avg):</span>
                              <span className="font-medium text-desk-text">
                                {result.fwd_vol_avg.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {result.fwd_vol_call && (
                            <div className="flex justify-between">
                              <span className="text-desk-muted">Fwd Vol (Call):</span>
                              <span className="font-medium text-desk-text">
                                {result.fwd_vol_call.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {result.fwd_vol_put && (
                            <div className="flex justify-between">
                              <span className="text-desk-muted">Fwd Vol (Put):</span>
                              <span className="font-medium text-desk-text">
                                {result.fwd_vol_put.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {result.fwd_var_avg && (
                            <div className="flex justify-between border-t pt-2 mt-2 border-hairline">
                              <span className="text-desk-muted">Fwd Var (Avg):</span>
                              <span className="font-medium text-desk-text">
                                {result.fwd_var_avg.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
              className="mx-auto h-12 w-12 text-desk-muted"
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
            <p className="mt-2 text-desk-muted">
              No opportunities match your filters
            </p>
            <p className="mt-1 text-sm text-desk-muted">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* No Data State */}
        {!loading && (!scanData || scanData.opportunities.length === 0) && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-desk-muted"
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
            <p className="mt-2 text-desk-muted">
              No scan results found for {formatDate(selectedDate)}
            </p>
            <p className="mt-1 text-sm text-desk-muted">
              Run the scanner to generate results
            </p>
          </div>
        )}

        <div className="rounded-lg p-6 bg-desk-card">
          <h3 className="text-lg font-semibold mb-2 text-desk-text">
            About MAG7 Scanner
          </h3>
          <p className="text-sm mb-2 text-desk-text">
            Scans the Magnificent 7 stocks (AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA) for forward volatility opportunities with detailed trade recommendations and P&L estimates.
          </p>
          <p className="text-sm text-desk-text">
            <strong>To generate new results:</strong> Run <code className="px-1 py-0.5 rounded bg-desk-text">python run_mag7_scan.py</code> from the terminal
          </p>
        </div>
      </div>
    </div>
  );
}
