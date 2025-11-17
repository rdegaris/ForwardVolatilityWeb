import { useState, useEffect } from 'react';
import type { CalendarSpreadTrade, ScenarioAnalysis } from '../types/trade';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const TRADES_STORAGE_KEY = 'forward_vol_trades';

export default function TradeTracker() {
  // Load trades from localStorage on mount
  const [trades, setTrades] = useState<CalendarSpreadTrade[]>(() => {
    const stored = localStorage.getItem(TRADES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<CalendarSpreadTrade | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateTradeId, setUpdateTradeId] = useState<string>('');
  const [updatePrices, setUpdatePrices] = useState({ front: 0, back: 0, underlying: 0 });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Auto-load trades from data file on mount
  useEffect(() => {
    const loadTradesFromFile = async () => {
      try {
        const response = await fetch('/data/trades.json');
        if (response.ok) {
          const fileTrades = await response.json();
          if (fileTrades && fileTrades.length > 0) {
            // Merge with existing trades, avoiding duplicates by ID
            setTrades(prevTrades => {
              const existingIds = new Set(prevTrades.map(t => t.id));
              const newTrades = fileTrades.filter((t: CalendarSpreadTrade) => !existingIds.has(t.id));
              if (newTrades.length > 0) {
                return [...prevTrades, ...newTrades];
              }
              // If all IDs exist, update prices for matching trades
              return prevTrades.map(existing => {
                const updated = fileTrades.find((t: CalendarSpreadTrade) => t.id === existing.id);
                return updated || existing;
              });
            });
          }
        }
      } catch (error) {
        console.log('No trades file found or error loading:', error);
      }
    };
    loadTradesFromFile();
  }, []);

  // Save trades to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  // Normalize price - if > 100, assume it's in cents and convert to dollars
  const normalizePrice = (price: number): number => {
    return price > 100 ? price / 100 : price;
  };

  // Form state
  const [formData, setFormData] = useState<Partial<CalendarSpreadTrade>>({
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
  });

  // Calculate P&L for a trade
  const calculatePnL = (trade: CalendarSpreadTrade): number => {
    // Use IB's unrealized P&L if available
    if (trade.unrealizedPnL !== undefined && trade.unrealizedPnL !== null) {
      return trade.unrealizedPnL;
    }
    
    // Otherwise calculate from prices
    // Normalize prices first
    const frontEntry = normalizePrice(trade.frontEntryPrice);
    const frontCurrent = normalizePrice(trade.frontCurrentPrice);
    const backEntry = normalizePrice(trade.backEntryPrice);
    const backCurrent = normalizePrice(trade.backCurrentPrice);
    
    // Calendar spread: Long back month, Short front month
    // P&L = (Current back - Entry back) - (Current front - Entry front) * quantity * 100
    const backPnL = (backCurrent - backEntry) * trade.quantity * 100;
    const frontPnL = (frontCurrent - frontEntry) * trade.quantity * 100;
    return backPnL - frontPnL;
  };

  // Calculate DTE
  const calculateDTE = (expirationDate: string): number => {
    const expiration = new Date(expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Generate scenario analysis for a trade
  const generateScenarios = (trade: CalendarSpreadTrade): ScenarioAnalysis[] => {
    const scenarios: ScenarioAnalysis[] = [];
    const percentChanges = [-5, -3, -1, 0, 1, 3, 5];
    
    percentChanges.forEach(pct => {
      const newPrice = trade.underlyingCurrentPrice * (1 + pct / 100);
      
      // Simplified P&L estimation - in reality would need full options pricing
      // For now, just scale current P&L based on price movement
      const currentPnL = calculatePnL(trade);
      
      // Rough estimate: P&L changes with underlying movement
      // This is simplified - real implementation would use Black-Scholes
      const estimatedPnL = currentPnL + (pct * trade.quantity * 10);
      
      scenarios.push({
        priceChange: pct === 0 ? 'Current' : `${pct > 0 ? '+' : ''}${pct}%`,
        underlyingPrice: newPrice,
        pnl: estimatedPnL,
        delta: trade.delta || 0,
        gamma: trade.gamma || 0,
        theta: trade.theta || 0,
        vega: trade.vega || 0,
      });
    });
    
    return scenarios;
  };

  // Generate chart data for P&L profile
  const generateChartData = (trade: CalendarSpreadTrade) => {
    const chartData = [];
    const currentPrice = trade.underlyingCurrentPrice;
    const minPrice = currentPrice * 0.85;
    const maxPrice = currentPrice * 1.15;
    const step = (maxPrice - minPrice) / 50;
    
    for (let price = minPrice; price <= maxPrice; price += step) {
      const pctChange = ((price - currentPrice) / currentPrice) * 100;
      const currentPnL = calculatePnL(trade);
      
      // Simplified P&L curve - would need Black-Scholes for accuracy
      const estimatedPnL = currentPnL + (pctChange * trade.quantity * 10);
      
      chartData.push({
        price: price,
        pnl: estimatedPnL,
      });
    }
    
    return chartData;
  };

  // Add new trade
  const handleAddTrade = () => {
    const newTrade: CalendarSpreadTrade = {
      id: Date.now().toString(),
      symbol: formData.symbol || '',
      strike: formData.strike || 0,
      callOrPut: formData.callOrPut || 'CALL',
      quantity: formData.quantity || 1,
      frontExpiration: formData.frontExpiration || '',
      frontEntryPrice: formData.frontEntryPrice || 0,
      frontCurrentPrice: formData.frontCurrentPrice || 0,
      backExpiration: formData.backExpiration || '',
      backEntryPrice: formData.backEntryPrice || 0,
      backCurrentPrice: formData.backCurrentPrice || 0,
      underlyingEntryPrice: formData.underlyingEntryPrice || 0,
      underlyingCurrentPrice: formData.underlyingCurrentPrice || 0,
      entryDate: formData.entryDate || new Date().toISOString().split('T')[0],
      dateToClose: formData.frontExpiration || '', // Set to front month expiration
    };

    setTrades([...trades, newTrade]);
    setShowForm(false);
    setSelectedTrade(newTrade);
    
    // Reset form
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
    });
  };

  // Delete trade
  const handleDeleteTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
    if (selectedTrade?.id === id) {
      setSelectedTrade(null);
    }
  };

  // Update current prices for a trade
  const handleUpdatePrices = (id: string, frontPrice: number, backPrice: number, underlyingPrice: number) => {
    setTrades(trades.map(t => 
      t.id === id 
        ? { ...t, frontCurrentPrice: frontPrice, backCurrentPrice: backPrice, underlyingCurrentPrice: underlyingPrice }
        : t
    ));
    
    if (selectedTrade?.id === id) {
      setSelectedTrade({ 
        ...selectedTrade, 
        frontCurrentPrice: frontPrice, 
        backCurrentPrice: backPrice, 
        underlyingCurrentPrice: underlyingPrice 
      });
    }
  };

  // Open update modal for a trade
  const openUpdateModal = (trade: CalendarSpreadTrade) => {
    setUpdateTradeId(trade.id);
    setUpdatePrices({
      front: trade.frontCurrentPrice,
      back: trade.backCurrentPrice,
      underlying: trade.underlyingCurrentPrice
    });
    setShowUpdateModal(true);
  };

  // Submit price update
  const submitPriceUpdate = () => {
    handleUpdatePrices(updateTradeId, updatePrices.front, updatePrices.back, updatePrices.underlying);
    setShowUpdateModal(false);
  };

  // Clear all trades
  const handleClearAllTrades = () => {
    if (window.confirm('Are you sure you want to delete all trades? This cannot be undone.')) {
      setTrades([]);
      setSelectedTrade(null);
    }
  };

  // Export trades to CSV
  const handleExportCSV = () => {
    if (trades.length === 0) return;
    
    const headers = ['Symbol', 'Strike', 'Type', 'Quantity', 'Front Exp', 'Front Entry', 'Front Current', 'Back Exp', 'Back Entry', 'Back Current', 'Underlying Entry', 'Underlying Current', 'P&L', 'Entry Date'];
    const rows = trades.map(t => [
      t.symbol,
      t.strike,
      t.callOrPut,
      t.quantity,
      t.frontExpiration,
      t.frontEntryPrice,
      t.frontCurrentPrice,
      t.backExpiration,
      t.backEntryPrice,
      t.backCurrentPrice,
      t.underlyingEntryPrice,
      t.underlyingCurrentPrice,
      calculatePnL(t).toFixed(2),
      t.entryDate
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Import trades from JSON
  const handleImportJSON = () => {
    try {
      const imported = JSON.parse(importJson);
      
      // Validate it's an array
      if (!Array.isArray(imported)) {
        alert('Invalid JSON: Expected an array of trades');
        return;
      }
      
      // Validate each trade has required fields
      const requiredFields = ['symbol', 'strike', 'callOrPut', 'quantity', 'frontExpiration', 
                              'frontEntryPrice', 'frontCurrentPrice', 'backExpiration', 
                              'backEntryPrice', 'backCurrentPrice', 'underlyingEntryPrice', 
                              'underlyingCurrentPrice', 'entryDate'];
      
      for (const trade of imported) {
        for (const field of requiredFields) {
          if (!(field in trade)) {
            alert(`Invalid trade data: Missing field "${field}"`);
            return;
          }
        }
      }
      
      // Merge with existing trades (avoid duplicates by ID if present)
      const existingIds = new Set(trades.map(t => t.id));
      const newTrades = imported.filter((t: CalendarSpreadTrade) => !existingIds.has(t.id));
      
      setTrades([...trades, ...newTrades]);
      setShowImportModal(false);
      setImportJson('');
      
      alert(`Successfully imported ${newTrades.length} trades!`);
      
    } catch (error) {
      alert(`Failed to import JSON: ${(error as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Trade Tracker
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Monitor your calendar spread positions and P&L
          </p>
        </div>
        <div className="flex gap-2">
          {trades.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                📊 Export CSV
              </button>
              <button
                onClick={handleClearAllTrades}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                🗑️ Clear All
              </button>
            </>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            📥 Import from IB
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition duration-200"
          >
            {showForm ? 'Cancel' : '+ Add Trade'}
          </button>
        </div>
      </div>

      {/* Add Trade Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Calendar Spread</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Symbol
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="AMD"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Strike
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.strike}
                onChange={(e) => setFormData({ ...formData, strike: parseFloat(e.target.value) })}
                placeholder="237.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={formData.callOrPut}
                onChange={(e) => setFormData({ ...formData, callOrPut: e.target.value as 'CALL' | 'PUT' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="CALL">CALL</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Front Month (Short) */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Front Month (Short)</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiration
                  </label>
                  <input
                    type="date"
                    value={formData.frontExpiration}
                    onChange={(e) => setFormData({ ...formData, frontExpiration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.frontEntryPrice}
                    onChange={(e) => setFormData({ ...formData, frontEntryPrice: parseFloat(e.target.value) })}
                    placeholder="2.44"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.frontCurrentPrice}
                    onChange={(e) => setFormData({ ...formData, frontCurrentPrice: parseFloat(e.target.value) })}
                    placeholder="2.44"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Back Month (Long) */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Back Month (Long)</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiration
                  </label>
                  <input
                    type="date"
                    value={formData.backExpiration}
                    onChange={(e) => setFormData({ ...formData, backExpiration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.backEntryPrice}
                    onChange={(e) => setFormData({ ...formData, backEntryPrice: parseFloat(e.target.value) })}
                    placeholder="5.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.backCurrentPrice}
                    onChange={(e) => setFormData({ ...formData, backCurrentPrice: parseFloat(e.target.value) })}
                    placeholder="5.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity (Contracts)
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                placeholder="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Underlying Entry Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.underlyingEntryPrice}
                onChange={(e) => setFormData({ ...formData, underlyingEntryPrice: parseFloat(e.target.value) })}
                placeholder="235.72"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Underlying Current Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.underlyingCurrentPrice}
                onChange={(e) => setFormData({ ...formData, underlyingCurrentPrice: parseFloat(e.target.value) })}
                placeholder="235.72"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={handleAddTrade}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-md transition duration-200"
          >
            Add Trade
          </button>
        </div>
      )}

      {/* Open Positions - IB Style */}
      {trades.length > 0 && (
        <>
          {/* Summary Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio Summary</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Positions</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{trades.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Contracts</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {trades.reduce((sum, t) => sum + t.quantity, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total P&L</div>
                  <div className={`text-2xl font-bold ${trades.reduce((sum, t) => sum + calculatePnL(t), 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${trades.reduce((sum, t) => sum + calculatePnL(t), 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg P&L per Trade</div>
                  <div className={`text-2xl font-bold ${(trades.reduce((sum, t) => sum + calculatePnL(t), 0) / trades.length) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${(trades.reduce((sum, t) => sum + calculatePnL(t), 0) / trades.length).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Positions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Open Positions</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900 dark:text-white">Financial Instrument</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-900 dark:text-white">Position</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-900 dark:text-white">Close By</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Avg Price</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Last</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Change</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Change %</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Daily P&L</th>
                  </tr>
                </thead>
              <tbody>
                {trades.map(trade => {
                  // Normalize all prices
                  const frontEntry = normalizePrice(trade.frontEntryPrice);
                  const frontCurrent = normalizePrice(trade.frontCurrentPrice);
                  const backEntry = normalizePrice(trade.backEntryPrice);
                  const backCurrent = normalizePrice(trade.backCurrentPrice);
                  
                  // Use IB's unrealized P&L if available, otherwise calculate
                  const frontPnL = trade.frontUnrealizedPnL !== undefined && trade.frontUnrealizedPnL !== null
                    ? trade.frontUnrealizedPnL
                    : (frontCurrent - frontEntry) * trade.quantity * 100;
                  const backPnL = trade.backUnrealizedPnL !== undefined && trade.backUnrealizedPnL !== null
                    ? trade.backUnrealizedPnL
                    : (backCurrent - backEntry) * trade.quantity * 100;
                  const totalPnL = trade.unrealizedPnL !== undefined && trade.unrealizedPnL !== null
                    ? trade.unrealizedPnL
                    : backPnL - frontPnL;
                  const frontChange = frontCurrent - frontEntry;
                  const backChange = backCurrent - backEntry;
                  const frontChangePct = (frontChange / frontEntry) * 100;
                  const backChangePct = (backChange / backEntry) * 100;
                  
                  // Calculate days to close (front month expiration)
                  const closeDate = trade.dateToClose ? new Date(trade.dateToClose) : new Date(trade.frontExpiration);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  closeDate.setHours(0, 0, 0, 0);
                  const daysToClose = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isToday = daysToClose === 0;
                  const isThisWeek = daysToClose > 0 && daysToClose <= 7;
                  
                  return (
                    <>
                      {/* Calendar Spread Row */}
                      <tr 
                        key={`${trade.id}-spread`}
                        className="border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10"
                      >
                        <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                          {trade.symbol} {new Date(trade.frontExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}/{new Date(trade.backExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} {trade.strike} CalC
                        </td>
                        <td className="text-center py-2 px-2 font-semibold text-gray-900 dark:text-white">
                          {trade.quantity}
                        </td>
                        <td className="text-center py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {isToday && <span className="text-red-600 dark:text-red-400 font-bold text-lg" title="Expires TODAY!">🔴</span>}
                            {isThisWeek && !isToday && <span className="text-yellow-600 dark:text-yellow-400 text-lg" title="Expires this week">⚠️</span>}
                            <span className={isToday ? 'text-red-600 dark:text-red-400 font-bold' : isThisWeek ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                              {closeDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                          {(backEntry - frontEntry).toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2 text-gray-900 dark:text-white">
                          {(backCurrent - frontCurrent).toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 font-medium ${totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {totalPnL >= 0 ? '+' : ''}{((backChange - frontChange)).toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 font-medium ${totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {totalPnL >= 0 ? '+' : ''}{(((backChange - frontChange) / (backEntry - frontEntry)) * 100).toFixed(2)}%
                        </td>
                        <td className={`text-right py-2 px-2 font-bold ${totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {totalPnL.toFixed(0)}
                        </td>
                      </tr>
                      
                      {/* Front Month (Short) Row */}
                      <tr 
                        key={`${trade.id}-front`}
                        className="border-b border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10"
                      >
                        <td className="py-2 px-3 pl-8 text-gray-700 dark:text-gray-300">
                          -{trade.quantity} {trade.symbol} {new Date(trade.frontExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}'{new Date(trade.frontExpiration).getFullYear().toString().slice(2)} {trade.strike} {trade.callOrPut === 'CALL' ? 'C' : 'P'}
                        </td>
                        <td className="text-center py-2 px-2 text-red-600 dark:text-red-400 font-semibold">
                          -{trade.quantity}
                        </td>
                        <td></td>
                        <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                          {frontEntry.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2 text-gray-900 dark:text-white">
                          {frontCurrent.toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${-frontPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {-frontPnL >= 0 ? '+' : ''}{(-frontChange).toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${-frontPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {-frontPnL >= 0 ? '+' : ''}{(-frontChangePct).toFixed(2)}%
                        </td>
                        <td className={`text-right py-2 px-2 ${-frontPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {(-frontPnL).toFixed(0)}
                        </td>
                      </tr>
                      
                      {/* Back Month (Long) Row */}
                      <tr 
                        key={`${trade.id}-back`}
                        className="border-b-2 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/10"
                      >
                        <td className="py-2 px-3 pl-8 text-gray-700 dark:text-gray-300">
                          +{trade.quantity} {trade.symbol} {new Date(trade.backExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}'{new Date(trade.backExpiration).getFullYear().toString().slice(2)} {trade.strike} {trade.callOrPut === 'CALL' ? 'C' : 'P'}
                        </td>
                        <td className="text-center py-2 px-2 text-green-600 dark:text-green-400 font-semibold">
                          +{trade.quantity}
                        </td>
                        <td></td>
                        <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                          {backEntry.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2 text-gray-900 dark:text-white">
                          {backCurrent.toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${backPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {backPnL >= 0 ? '+' : ''}{backChange.toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${backPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {backPnL >= 0 ? '+' : ''}{backChangePct.toFixed(2)}%
                        </td>
                        <td className={`text-right py-2 px-2 ${backPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {backPnL.toFixed(0)}
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Trade Details - Scenario Analysis & Chart */}
      {selectedTrade && (
        <div className="space-y-6">
          {/* Trade Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {selectedTrade.quantity} x {selectedTrade.symbol} ${selectedTrade.strike} {selectedTrade.callOrPut}
                </h2>
                <p className="text-blue-100">
                  {selectedTrade.frontExpiration} / {selectedTrade.backExpiration} Calendar Spread
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-100">P&L</div>
                <div className={`text-3xl font-bold ${calculatePnL(selectedTrade) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  ${calculatePnL(selectedTrade).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Scenario Analysis Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Scenario Analysis</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white">Price Change</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white">Underlying</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white">P&L</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white">Delta</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white">Gamma</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white">Theta</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white">Vega</th>
                  </tr>
                </thead>
                <tbody>
                  {generateScenarios(selectedTrade).map((scenario, idx) => (
                    <tr 
                      key={idx}
                      className={`border-b border-gray-200 dark:border-gray-700 ${scenario.priceChange === 'Current' ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''}`}
                    >
                      <td className="py-2 px-2 text-sm text-gray-900 dark:text-white">
                        {scenario.priceChange}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-gray-900 dark:text-white">
                        ${scenario.underlyingPrice.toFixed(2)}
                      </td>
                      <td className={`text-right py-2 px-2 text-sm font-semibold ${scenario.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${scenario.pnl.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {scenario.delta.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {scenario.gamma.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {scenario.theta.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {scenario.vega.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="text-yellow-600 dark:text-yellow-400">⚠️ Note:</span> Greeks values are simplified estimates. 
                For accurate Greeks, integrate with a real-time options pricing API.
              </p>
            </div>
          </div>

          {/* P&L Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">P&L Profile</h3>
            
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={generateChartData(selectedTrade)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="price" 
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  stroke="#9CA3AF"
                />
                <YAxis 
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  stroke="#9CA3AF"
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                  labelFormatter={(label) => `Price: $${parseFloat(label).toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
                <ReferenceLine 
                  x={selectedTrade.underlyingCurrentPrice} 
                  stroke="#3B82F6" 
                  strokeDasharray="3 3"
                  label={{ value: 'Current', position: 'top', fill: '#3B82F6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                  name="P&L"
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="text-yellow-600 dark:text-yellow-400">⚠️ Note:</span> This is a simplified P&L curve. 
                For accurate P&L profiles, use Black-Scholes pricing with real-time volatility and time decay.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {trades.length === 0 && !showForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No trades yet
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Start tracking your calendar spreads by adding your first trade
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition duration-200"
          >
            Add Your First Trade
          </button>
        </div>
      )}

      {/* Update Prices Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowUpdateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Update Current Prices</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Front Month Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatePrices.front}
                  onChange={(e) => setUpdatePrices({ ...updatePrices, front: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Back Month Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatePrices.back}
                  onChange={(e) => setUpdatePrices({ ...updatePrices, back: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Underlying Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatePrices.underlying}
                  onChange={(e) => setUpdatePrices({ ...updatePrices, underlying: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={submitPriceUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from IB Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Import Trades from Interactive Brokers</h2>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Instructions:</strong>
              </p>
              <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal ml-4 mt-2 space-y-1">
                <li>Run <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">python fetch_ib_positions.py</code> in your calculator folder</li>
                <li>Open the generated <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">trades.json</code> file</li>
                <li>Copy the entire JSON content</li>
                <li>Paste it in the text area below</li>
                <li>Click Import</li>
              </ol>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Paste JSON from fetch_ib_positions.py:
              </label>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"id": "...", "symbol": "AMD", "strike": 237.5, ...}]'
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJSON}
                disabled={!importJson.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                Import Trades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
