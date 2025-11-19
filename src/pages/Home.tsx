import { useEffect, useState } from 'react';
import { getTodayPacific, getTodayDatePacific } from '../lib/dateUtils';

interface Trade {
  id: string;
  symbol: string;
  strike: number;
  callOrPut: string;
  quantity: number;
  frontExpiration: string;
  backExpiration: string;
  frontCurrentPrice: number;
  backCurrentPrice: number;
  underlyingCurrentPrice: number;
  entryDate: string;
  unrealizedPnL?: number;
}

interface ScanOpportunity {
  ticker: string;
  price: number;
  best_ff: number;
  expiry1: string;
  expiry2: string;
  dte1: number;
  dte2: number;
  trade_details?: {
    spread_type: string;
    strike: number;
    net_debit: number;
    ff_display: number;
    typical_case: number;
    typical_case_pct: number;
  };
  universe: string;
}

interface EarningsOpportunity {
  ticker: string;
  price: number;
  earnings_date: string;
  days_to_earnings: number;
  iv: number;
  expected_move_pct: number;
  recommendation: string;
  suggested_trade?: {
    strike: number;
    sell_expiration: string;
    buy_expiration: string;
    net_credit: number;
  };
}

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [nasdaq100, setNasdaq100] = useState<ScanOpportunity[]>([]);
  const [midcap400, setMidcap400] = useState<ScanOpportunity[]>([]);
  const [earnings, setEarnings] = useState<EarningsOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [tradesRes, nasdaq100Res, midcap400Res, earningsRes] = await Promise.all([
          fetch('/data/trades.json'),
          fetch('/data/nasdaq100_results_latest.json'),
          fetch('/data/midcap400_results_latest.json'),
          fetch('/data/earnings_crush_latest.json'),
        ]);

        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          setTrades(Array.isArray(tradesData) ? tradesData : []);
        }

        if (nasdaq100Res.ok) {
          const nasdaq100Data = await nasdaq100Res.json();
          const today = getTodayPacific();
          const isToday = nasdaq100Data.date === today;
          const opps = (nasdaq100Data.opportunities || []).map((opp: ScanOpportunity) => ({
            ...opp,
            universe: 'NASDAQ 100'
          }));
          setNasdaq100(isToday ? opps : []);
        }

        if (midcap400Res.ok) {
          const midcap400Data = await midcap400Res.json();
          const today = getTodayPacific();
          const isToday = midcap400Data.date === today;
          const opps = (midcap400Data.opportunities || []).map((opp: ScanOpportunity) => ({
            ...opp,
            universe: 'MidCap 400'
          }));
          setMidcap400(isToday ? opps : []);
        }

        if (earningsRes.ok) {
          const earningsData = await earningsRes.json();
          const today = getTodayPacific();
          const isToday = earningsData.date === today;
          const recommended = (earningsData.opportunities || []).filter(
            (opp: EarningsOpportunity) => opp.recommendation === 'RECOMMENDED'
          );
          setEarnings(isToday ? recommended : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get end of this week (Friday)
  const getEndOfWeek = () => {
    const today = getTodayDatePacific();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 0;
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysUntilFriday);
    return friday.toISOString().split('T')[0];
  };

  // Filter trades expiring this week
  const tradesExpiringThisWeek = trades.filter(trade => {
    const endOfWeek = getEndOfWeek();
    return trade.frontExpiration <= endOfWeek;
  });

  // Combine and sort all opportunities
  const allOpportunities = [...nasdaq100, ...midcap400]
    .sort((a, b) => b.best_ff - a.best_ff)
    .slice(0, 5);

  const calculatePnL = (trade: Trade) => {
    if (trade.unrealizedPnL !== undefined) {
      return trade.unrealizedPnL;
    }
    // Calculate from prices if not provided
    return ((trade.backCurrentPrice - trade.frontCurrentPrice) * trade.quantity * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Daily Trading Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Los_Angeles'
          })}
        </p>
      </div>

      {/* Positions Needing Action This Week */}
      {tradesExpiringThisWeek.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg shadow-lg p-6 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-red-900 dark:text-red-200">
              Action Required - Expiring This Week
            </h2>
          </div>
          <div className="space-y-3">
            {tradesExpiringThisWeek.map((trade) => {
              const pnl = calculatePnL(trade);
              const pnlColor = pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
              
              return (
                <div key={trade.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {trade.quantity}x {trade.symbol} ${trade.strike} {trade.callOrPut}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Front: {trade.frontExpiration} @ ${trade.frontCurrentPrice.toFixed(2)} | 
                        Back: {trade.backExpiration} @ ${trade.backCurrentPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Underlying: ${trade.underlyingCurrentPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${pnlColor}`}>
                        ${pnl.toFixed(0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">P&L</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-red-800 dark:text-red-300 font-medium">
            💡 Consider closing these positions before front expiration
          </p>
        </div>
      )}

      {/* Best Opportunities Today */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Forward Vol Opportunities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
            🎯 Top Forward Vol Opportunities
          </h2>
          {allOpportunities.length > 0 ? (
            <div className="space-y-3">
              {allOpportunities.map((opp, idx) => (
                <div key={`${opp.ticker}-${idx}`} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {opp.ticker} <span className="text-sm text-gray-500">@ ${opp.price.toFixed(2)}</span>
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {opp.universe}
                      </p>
                      {opp.trade_details && (
                        <>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {opp.trade_details.spread_type} ${opp.trade_details.strike}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Sell {opp.expiry1} / Buy {opp.expiry2}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Debit: ${(opp.trade_details.net_debit * 100).toFixed(0)} | 
                            Target: +${opp.trade_details.typical_case.toFixed(0)} ({opp.trade_details.typical_case_pct.toFixed(0)}%)
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {(opp.best_ff * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">FF</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No opportunities found today
            </p>
          )}
        </div>

        {/* Earnings Crush Opportunities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-4">
            📈 Earnings Crush Plays
          </h2>
          {earnings.length > 0 ? (
            <div className="space-y-3">
              {earnings.map((opp, idx) => (
                <div key={`${opp.ticker}-${idx}`} className="border-l-4 border-purple-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {opp.ticker} <span className="text-sm text-gray-500">@ ${opp.price.toFixed(2)}</span>
                      </h3>
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        Earnings in {opp.days_to_earnings} day{opp.days_to_earnings !== 1 ? 's' : ''}
                      </p>
                      {opp.suggested_trade && (
                        <>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ${opp.suggested_trade.strike} Calendar Spread
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Sell {opp.suggested_trade.sell_expiration} / Buy {opp.suggested_trade.buy_expiration}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Credit: ${(opp.suggested_trade.net_credit * 100).toFixed(0)}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {opp.iv.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">IV</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        ±{opp.expected_move_pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No recommended earnings plays today
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {allOpportunities.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Forward Vol</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {earnings.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Earnings</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {trades.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Open Positions</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {tradesExpiringThisWeek.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Need Action</p>
        </div>
      </div>
    </div>
  );
}
