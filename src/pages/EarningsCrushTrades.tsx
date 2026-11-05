import { useState, useEffect } from 'react';
import { fmt$ } from '../lib/formatCurrency';

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
    <div className="p-8 text-desk-text bg-desk-raised">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-desk-raised">
              Earnings Crush Trades
            </h1>
            <p className="text-desk-secondary">
              Track your earnings volatility trades
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="font-semibold py-2 px-6 rounded-md transition-colors duration-200 bg-desk-up hover:bg-desk-up text-desk-deep"
          >
            {showForm ? 'Cancel' : '+ Add Trade'}
          </button>
        </div>

        {/* Add Trade Form */}
        {showForm && (
          <div className="rounded-xl p-6 border bg-desk-card border-desk-up/30">
            <h2 className="text-xl font-bold mb-4 text-desk-text">New Earnings Crush Trade</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-desk-secondary">Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="AVGO"
                  className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-desk-secondary">Strike</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.strike || ''}
                  onChange={(e) => setFormData({ ...formData, strike: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-desk-secondary">Type</label>
                <select
                  value={formData.callOrPut}
                  onChange={(e) => setFormData({ ...formData, callOrPut: e.target.value as 'CALL' | 'PUT' })}
                  className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                >
                  <option value="CALL">CALL</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-desk-secondary">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Front Month (Short - Sell) */}
              <div className="border rounded-lg p-4 border-desk-down/30 bg-desk-card">
                <h3 className="font-semibold mb-3 text-desk-down">Front Month (SELL - Short)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1 text-desk-muted">Expiration</label>
                    <input
                      type="date"
                      value={formData.frontExpiration}
                      onChange={(e) => setFormData({ ...formData, frontExpiration: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-desk-muted">Entry Credit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.frontEntryPrice || ''}
                      onChange={(e) => setFormData({ ...formData, frontEntryPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                    />
                  </div>
                </div>
              </div>

              {/* Back Month (Long - Buy) */}
              <div className="border rounded-lg p-4 border-desk-up/30 bg-desk-card">
                <h3 className="font-semibold mb-3 text-desk-up">Back Month (BUY - Long)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1 text-desk-muted">Expiration</label>
                    <input
                      type="date"
                      value={formData.backExpiration}
                      onChange={(e) => setFormData({ ...formData, backExpiration: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-desk-muted">Entry Debit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.backEntryPrice || ''}
                      onChange={(e) => setFormData({ ...formData, backEntryPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1 text-desk-muted">Entry Date</label>
                <input
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-desk-muted">Earnings Date</label>
                <input
                  type="date"
                  value={formData.earningsDate}
                  onChange={(e) => setFormData({ ...formData, earningsDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-desk-muted">Underlying Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.underlyingEntryPrice || ''}
                  onChange={(e) => setFormData({ ...formData, underlyingEntryPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md bg-desk-card border-hairline text-desk-text"
                />
              </div>
            </div>

            <button
              onClick={handleAddTrade}
              className="w-full font-semibold py-3 rounded-md transition-colors text-desk-text bg-desk-raised"
            >
              Add Trade
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 border bg-desk-card border-hairline">
            <div className="text-sm mb-1 text-desk-muted">Open Positions</div>
            <div className="text-2xl font-bold text-desk-up">{openTrades.length}</div>
          </div>
          <div className="rounded-xl p-4 border bg-desk-card border-hairline">
            <div className="text-sm mb-1 text-desk-muted">Open P&L</div>
            <div className={`text-2xl font-bold ${totalOpenPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
              {fmt$(totalOpenPnL)}
            </div>
          </div>
          <div className="rounded-xl p-4 border bg-desk-card border-hairline">
            <div className="text-sm mb-1 text-desk-muted">Closed Trades</div>
            <div className="text-2xl font-bold text-desk-secondary">{closedTrades.length}</div>
          </div>
          <div className="rounded-xl p-4 border bg-desk-card border-hairline">
            <div className="text-sm mb-1 text-desk-muted">Realized P&L</div>
            <div className={`text-2xl font-bold ${totalClosedPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
              {fmt$(totalClosedPnL)}
            </div>
          </div>
        </div>

        {/* Open Positions */}
        {openTrades.length > 0 && (
          <div className="rounded-xl overflow-hidden border bg-desk-card border-desk-up/30">
            <div className="px-6 py-4 border-b bg-desk-card border-desk-up/30">
              <h2 className="text-xl font-bold text-desk-up"> Open Positions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-desk-card">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-desk-secondary">Trade</th>
                    <th className="text-center py-3 px-3 font-semibold text-desk-secondary">Qty</th>
                    <th className="text-center py-3 px-3 font-semibold text-desk-secondary">Earnings</th>
                    <th className="text-right py-3 px-3 font-semibold text-desk-secondary">Entry Cost</th>
                    <th className="text-right py-3 px-3 font-semibold text-desk-secondary">Current</th>
                    <th className="text-right py-3 px-3 font-semibold text-desk-secondary">P&L</th>
                    <th className="text-center py-3 px-3 font-semibold text-desk-secondary">Actions</th>
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
                      <tr key={trade.id} className="border-b border-hairline hover:bg-desk-card">
                        <td className="py-3 px-4">
                          <div className="font-bold text-desk-text">{trade.symbol}</div>
                          <div className="text-xs text-desk-muted">
                            ${trade.strike} {trade.callOrPut} | {new Date(trade.frontExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}/{new Date(trade.backExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="text-center py-3 px-3 font-semibold">{trade.quantity}</td>
                        <td className="text-center py-3 px-3">
                          <div className={`text-sm ${daysToEarnings <= 0 ? 'text-desk-muted' : daysToEarnings <= 1 ? 'font-bold text-desk-down' : 'text-desk-amber'}`}>
                            {daysToEarnings <= 0 ? 'PASSED' : `${daysToEarnings}d`}
                          </div>
                          <div className="text-xs text-desk-muted">
                            {earningsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 font-mono">{fmt$(entryCost)}</td>
                        <td className="text-right py-3 px-3 font-mono">{fmt$(currentValue)}</td>
                        <td className={`text-right py-3 px-3 font-bold ${pnl >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {fmt$(pnl, 0)}
                        </td>
                        <td className="text-center py-3 px-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openCloseModal(trade)}
                              className="px-3 py-1 text-xs rounded transition-colors bg-desk-up hover:bg-desk-up text-desk-deep"
                            >
                              Close
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(trade.id)}
                              className="px-3 py-1 text-xs rounded transition-colors bg-desk-down hover:bg-desk-down text-desk-deep"
                            >
                              Delete
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
          <div className="rounded-xl overflow-hidden border bg-desk-card border-hairline">
            <div className="px-6 py-4 border-b bg-desk-card border-hairline">
              <h2 className="text-xl font-bold text-desk-secondary"> Closed Trades</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-desk-card">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-desk-muted">Trade</th>
                    <th className="text-center py-3 px-3 font-semibold text-desk-muted">Qty</th>
                    <th className="text-center py-3 px-3 font-semibold text-desk-muted">Entry</th>
                    <th className="text-center py-3 px-3 font-semibold text-desk-muted">Closed</th>
                    <th className="text-right py-3 px-3 font-semibold text-desk-muted">Realized P&L</th>
                    <th className="text-left py-3 px-3 font-semibold text-desk-muted">Notes</th>
                    <th className="text-center py-3 px-3 font-semibold text-desk-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.map(trade => (
                    <tr key={trade.id} className="border-b opacity-75 border-hairline hover:bg-desk-card">
                      <td className="py-3 px-4">
                        <div className="font-bold text-desk-secondary">{trade.symbol}</div>
                        <div className="text-xs text-desk-muted">
                          ${trade.strike} {trade.callOrPut}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">{trade.quantity}</td>
                      <td className="text-center py-3 px-3 text-desk-muted">
                        {new Date(trade.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="text-center py-3 px-3 text-desk-muted">
                        {trade.closedDate ? new Date(trade.closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </td>
                      <td className={`text-right py-3 px-3 font-bold ${(trade.realizedPnL || 0) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        {fmt$(trade.realizedPnL || 0, 0)}
                      </td>
                      <td className="py-3 px-3 text-xs max-w-[200px] truncate text-desk-muted">
                        {trade.closeNotes || '-'}
                      </td>
                      <td className="text-center py-3 px-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleReopenTrade(trade.id)}
                            className="px-3 py-1 text-xs rounded transition-colors bg-desk-text hover:bg-desk-text text-desk-deep"
                            title="Reopen trade"
                          >
                            Reopen
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="px-3 py-1 text-xs rounded transition-colors bg-desk-down hover:bg-desk-down text-desk-deep"
                          >
                            Delete
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
          <div className="rounded-xl p-12 text-center bg-desk-card">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-xl font-semibold mb-2 text-desk-text">No earnings crush trades yet</h3>
            <p className="mb-6 text-desk-muted">
              Start tracking your earnings volatility trades
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="font-semibold py-2 px-6 rounded-md transition-colors bg-desk-up hover:bg-desk-up text-desk-deep"
            >
              Add Your First Trade
            </button>
          </div>
        )}

        {/* Close Trade Modal */}
        {showCloseModal && tradeToClose && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-desk-card" onClick={() => setShowCloseModal(false)}>
            <div className="rounded-xl p-6 max-w-md w-full mx-4 border bg-desk-card border-desk-up/30" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-desk-text">Close Trade: {tradeToClose.symbol}</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm mb-1 text-desk-muted">Front Month Close Price (Credit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeData.frontClosePrice}
                    onChange={(e) => setCloseData({ ...closeData, frontClosePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md bg-desk-raised border-hairline text-desk-text"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-desk-muted">Back Month Close Price (Debit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeData.backClosePrice}
                    onChange={(e) => setCloseData({ ...closeData, backClosePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md bg-desk-raised border-hairline text-desk-text"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-desk-muted">Notes (optional)</label>
                  <input
                    type="text"
                    value={closeData.closeNotes}
                    onChange={(e) => setCloseData({ ...closeData, closeNotes: e.target.value })}
                    placeholder="e.g., Closed after earnings beat"
                    className="w-full px-3 py-2 border rounded-md bg-desk-raised border-hairline text-desk-text"
                  />
                </div>
                
                {/* P&L Preview */}
                <div className="rounded-lg p-4 bg-desk-card">
                  <div className="text-sm mb-1 text-desk-muted">Estimated P&L</div>
                  {(() => {
                    const frontPnL = (closeData.frontClosePrice - tradeToClose.frontEntryPrice) * tradeToClose.quantity * 100;
                    const backPnL = (closeData.backClosePrice - tradeToClose.backEntryPrice) * tradeToClose.quantity * 100;
                    const totalPnL = backPnL - frontPnL;
                    return (
                      <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        {fmt$(totalPnL)}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 font-semibold py-2 rounded-md transition-colors bg-desk-raised hover:bg-desk-raised text-desk-text"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseTrade}
                  className="flex-1 font-semibold py-2 rounded-md transition-colors bg-desk-up hover:bg-desk-up text-desk-deep"
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
