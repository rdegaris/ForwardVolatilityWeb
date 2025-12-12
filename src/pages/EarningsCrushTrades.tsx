import { useState, useEffect } from 'react';

interface EarningsCrushTrade {
  id: string;
  symbol: string;
  strike: number;
  callOrPut: 'CALL' | 'PUT';
  quantity: number;
  
  // Front month (short) - sells before earnings
  frontExpiration: string;
  frontEntryPrice: number;
  frontCurrentPrice: number;
  
  // Back month (long) - for protection
  backExpiration: string;
  backEntryPrice: number;
  backCurrentPrice: number;
  
  // Entry details
  underlyingEntryPrice: number;
  underlyingCurrentPrice: number;
  entryDate: string;
  earningsDate: string;
  
  // Trade status
  status: 'open' | 'closed';
  closedDate?: string;
  realizedPnL?: number;
  closeNotes?: string;
}

const EARNINGS_TRADES_STORAGE_KEY = 'earnings_crush_trades';

export default function EarningsCrushTrades() {
  const [trades, setTrades] = useState<EarningsCrushTrade[]>(() => {
    const stored = localStorage.getItem(EARNINGS_TRADES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [showForm, setShowForm] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<EarningsCrushTrade | null>(null);
  const [closeData, setCloseData] = useState({
    frontClosePrice: 0,
    backClosePrice: 0,
    closeNotes: ''
  });
  
  const [formData, setFormData] = useState<Partial<EarningsCrushTrade>>({
    symbol: '',
    strike: 0,
    callOrPut: 'CALL',
    quantity: 1,
    frontExpiration: '',
    frontEntryPrice: 0,
    frontCurrentPrice: 0,
    backExpiration: '',
    backEntryPrice: 0,
    backCurrentPrice: 0,
    underlyingEntryPrice: 0,
    underlyingCurrentPrice: 0,
    entryDate: new Date().toISOString().split('T')[0],
    earningsDate: '',
    status: 'open'
  });

  // Auto-load trades from data file on mount
  useEffect(() => {
    const loadTradesFromFile = async () => {
      try {
        const response = await fetch('/data/earnings_crush_trades.json');
        if (response.ok) {
          const fileTrades = await response.json();
          if (fileTrades && fileTrades.length > 0) {
            // Merge with existing trades, avoiding duplicates by ID
            setTrades(prevTrades => {
              const existingIds = new Set(prevTrades.map(t => t.id));
              const newTrades = fileTrades.filter((t: EarningsCrushTrade) => !existingIds.has(t.id));
              if (newTrades.length > 0) {
                return [...prevTrades, ...newTrades];
              }
              return prevTrades;
            });
          }
        }
      } catch (error) {
        console.log('No earnings trades file found:', error);
      }
    };
    loadTradesFromFile();
  }, []);

  // Save to localStorage whenever trades change
  useEffect(() => {
    localStorage.setItem(EARNINGS_TRADES_STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  // Calculate unrealized P&L for open trades
  const calculateUnrealizedPnL = (trade: EarningsCrushTrade): number => {
    const frontPnL = (trade.frontCurrentPrice - trade.frontEntryPrice) * trade.quantity * 100;
    const backPnL = (trade.backCurrentPrice - trade.backEntryPrice) * trade.quantity * 100;
    // Calendar spread: long back, short front
    return backPnL - frontPnL;
  };

  // Separate open and closed trades
  const openTrades = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status === 'closed');

  // Calculate totals
  const totalOpenPnL = openTrades.reduce((sum, t) => sum + calculateUnrealizedPnL(t), 0);
  const totalClosedPnL = closedTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);

  // Add new trade
  const handleAddTrade = () => {
    const newTrade: EarningsCrushTrade = {
      id: Date.now().toString(),
      symbol: formData.symbol?.toUpperCase() || '',
      strike: formData.strike || 0,
      callOrPut: formData.callOrPut || 'CALL',
      quantity: formData.quantity || 1,
      frontExpiration: formData.frontExpiration || '',
      frontEntryPrice: formData.frontEntryPrice || 0,
      frontCurrentPrice: formData.frontCurrentPrice || formData.frontEntryPrice || 0,
      backExpiration: formData.backExpiration || '',
      backEntryPrice: formData.backEntryPrice || 0,
      backCurrentPrice: formData.backCurrentPrice || formData.backEntryPrice || 0,
      underlyingEntryPrice: formData.underlyingEntryPrice || 0,
      underlyingCurrentPrice: formData.underlyingCurrentPrice || formData.underlyingEntryPrice || 0,
      entryDate: formData.entryDate || new Date().toISOString().split('T')[0],
      earningsDate: formData.earningsDate || '',
      status: 'open'
    };

    setTrades([...trades, newTrade]);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      strike: 0,
      callOrPut: 'CALL',
      quantity: 1,
      frontExpiration: '',
      frontEntryPrice: 0,
      frontCurrentPrice: 0,
      backExpiration: '',
      backEntryPrice: 0,
      backCurrentPrice: 0,
      underlyingEntryPrice: 0,
      underlyingCurrentPrice: 0,
      entryDate: new Date().toISOString().split('T')[0],
      earningsDate: '',
      status: 'open'
    });
  };

  // Open close modal
  const openCloseModal = (trade: EarningsCrushTrade) => {
    setTradeToClose(trade);
    setCloseData({
      frontClosePrice: trade.frontCurrentPrice,
      backClosePrice: trade.backCurrentPrice,
      closeNotes: ''
    });
    setShowCloseModal(true);
  };

  // Close a trade
  const handleCloseTrade = () => {
    if (!tradeToClose) return;

    const frontPnL = (closeData.frontClosePrice - tradeToClose.frontEntryPrice) * tradeToClose.quantity * 100;
    const backPnL = (closeData.backClosePrice - tradeToClose.backEntryPrice) * tradeToClose.quantity * 100;
    const realizedPnL = backPnL - frontPnL;

    setTrades(trades.map(t => 
      t.id === tradeToClose.id 
        ? { 
            ...t, 
            status: 'closed' as const,
            closedDate: new Date().toISOString().split('T')[0],
            realizedPnL,
            closeNotes: closeData.closeNotes,
            frontCurrentPrice: closeData.frontClosePrice,
            backCurrentPrice: closeData.backClosePrice
          }
        : t
    ));
    
    setShowCloseModal(false);
    setTradeToClose(null);
  };

  // Delete trade
  const handleDeleteTrade = (id: string) => {
    if (window.confirm('Delete this trade?')) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  // Reopen a closed trade
  const handleReopenTrade = (id: string) => {
    setTrades(trades.map(t => 
      t.id === id 
        ? { ...t, status: 'open' as const, closedDate: undefined, realizedPnL: undefined, closeNotes: undefined }
        : t
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400">
              Earnings Crush Trades
            </h1>
            <p className="text-gray-300">
              Track your earnings volatility trades
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-6 rounded-md transition duration-200"
          >
            {showForm ? 'Cancel' : '+ Add Trade'}
          </button>
        </div>

        {/* Add Trade Form */}
        {showForm && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-teal-500/30">
            <h2 className="text-xl font-bold text-white mb-4">New Earnings Crush Trade</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="AVGO"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Strike</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.strike || ''}
                  onChange={(e) => setFormData({ ...formData, strike: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={formData.callOrPut}
                  onChange={(e) => setFormData({ ...formData, callOrPut: e.target.value as 'CALL' | 'PUT' })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="CALL">CALL</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Front Month (Short - Sell) */}
              <div className="border border-red-500/30 rounded-lg p-4 bg-red-900/10">
                <h3 className="font-semibold text-red-300 mb-3">Front Month (SELL - Short)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Expiration</label>
                    <input
                      type="date"
                      value={formData.frontExpiration}
                      onChange={(e) => setFormData({ ...formData, frontExpiration: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Entry Credit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.frontEntryPrice || ''}
                      onChange={(e) => setFormData({ ...formData, frontEntryPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Back Month (Long - Buy) */}
              <div className="border border-green-500/30 rounded-lg p-4 bg-green-900/10">
                <h3 className="font-semibold text-green-300 mb-3">Back Month (BUY - Long)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Expiration</label>
                    <input
                      type="date"
                      value={formData.backExpiration}
                      onChange={(e) => setFormData({ ...formData, backExpiration: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Entry Debit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.backEntryPrice || ''}
                      onChange={(e) => setFormData({ ...formData, backEntryPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Entry Date</label>
                <input
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Earnings Date</label>
                <input
                  type="date"
                  value={formData.earningsDate}
                  onChange={(e) => setFormData({ ...formData, earningsDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Underlying Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.underlyingEntryPrice || ''}
                  onChange={(e) => setFormData({ ...formData, underlyingEntryPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                />
              </div>
            </div>

            <button
              onClick={handleAddTrade}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-md transition"
            >
              Add Trade
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Open Positions</div>
            <div className="text-2xl font-bold text-teal-400">{openTrades.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Open P&L</div>
            <div className={`text-2xl font-bold ${totalOpenPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalOpenPnL.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Closed Trades</div>
            <div className="text-2xl font-bold text-gray-300">{closedTrades.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Realized P&L</div>
            <div className={`text-2xl font-bold ${totalClosedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalClosedPnL.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Open Positions */}
        {openTrades.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-teal-500/30">
            <div className="bg-teal-900/30 px-6 py-4 border-b border-teal-500/30">
              <h2 className="text-xl font-bold text-teal-300">📈 Open Positions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Trade</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-300">Qty</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-300">Earnings</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-300">Entry Cost</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-300">Current</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-300">P&L</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map(trade => {
                    const pnl = calculateUnrealizedPnL(trade);
                    const entryCost = trade.backEntryPrice - trade.frontEntryPrice;
                    const currentValue = trade.backCurrentPrice - trade.frontCurrentPrice;
                    const earningsDate = new Date(trade.earningsDate + 'T12:00:00');
                    const today = new Date();
                    const daysToEarnings = Math.ceil((earningsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-white/5">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{trade.symbol}</div>
                          <div className="text-xs text-gray-400">
                            ${trade.strike} {trade.callOrPut} | {new Date(trade.frontExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}/{new Date(trade.backExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="text-center py-3 px-3 font-semibold">{trade.quantity}</td>
                        <td className="text-center py-3 px-3">
                          <div className={`text-sm ${daysToEarnings <= 0 ? 'text-gray-400' : daysToEarnings <= 1 ? 'text-red-400 font-bold' : 'text-yellow-400'}`}>
                            {daysToEarnings <= 0 ? 'PASSED' : `${daysToEarnings}d`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {earningsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 font-mono">${entryCost.toFixed(2)}</td>
                        <td className="text-right py-3 px-3 font-mono">${currentValue.toFixed(2)}</td>
                        <td className={`text-right py-3 px-3 font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${pnl.toFixed(0)}
                        </td>
                        <td className="text-center py-3 px-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openCloseModal(trade)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                            >
                              Close
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(trade.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Closed Trades */}
        {closedTrades.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-500/30">
            <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-500/30">
              <h2 className="text-xl font-bold text-gray-300">📊 Closed Trades</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-400">Trade</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-400">Qty</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-400">Entry</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-400">Closed</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-400">Realized P&L</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-400">Notes</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.map(trade => (
                    <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-white/5 opacity-75">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-300">{trade.symbol}</div>
                        <div className="text-xs text-gray-500">
                          ${trade.strike} {trade.callOrPut}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">{trade.quantity}</td>
                      <td className="text-center py-3 px-3 text-gray-400">
                        {new Date(trade.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="text-center py-3 px-3 text-gray-400">
                        {trade.closedDate ? new Date(trade.closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </td>
                      <td className={`text-right py-3 px-3 font-bold ${(trade.realizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${(trade.realizedPnL || 0).toFixed(0)}
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs max-w-[200px] truncate">
                        {trade.closeNotes || '-'}
                      </td>
                      <td className="text-center py-3 px-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleReopenTrade(trade.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                            title="Reopen trade"
                          >
                            ↩
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {trades.length === 0 && !showForm && (
          <div className="bg-white/5 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📉</div>
            <h3 className="text-xl font-semibold text-white mb-2">No earnings crush trades yet</h3>
            <p className="text-gray-400 mb-6">
              Start tracking your earnings volatility trades
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-6 rounded-md transition"
            >
              Add Your First Trade
            </button>
          </div>
        )}

        {/* Close Trade Modal */}
        {showCloseModal && tradeToClose && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowCloseModal(false)}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-teal-500/30" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">Close Trade: {tradeToClose.symbol}</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Front Month Close Price (Credit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeData.frontClosePrice}
                    onChange={(e) => setCloseData({ ...closeData, frontClosePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Back Month Close Price (Debit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeData.backClosePrice}
                    onChange={(e) => setCloseData({ ...closeData, backClosePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={closeData.closeNotes}
                    onChange={(e) => setCloseData({ ...closeData, closeNotes: e.target.value })}
                    placeholder="e.g., Closed after earnings beat"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
                
                {/* P&L Preview */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Estimated P&L</div>
                  {(() => {
                    const frontPnL = (closeData.frontClosePrice - tradeToClose.frontEntryPrice) * tradeToClose.quantity * 100;
                    const backPnL = (closeData.backClosePrice - tradeToClose.backEntryPrice) * tradeToClose.quantity * 100;
                    const totalPnL = backPnL - frontPnL;
                    return (
                      <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${totalPnL.toFixed(2)}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseTrade}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md transition"
                >
                  Close Trade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
