import { useState, useEffect, useCallback } from 'react';
import type { CalendarSpreadTrade, DirectionalTrade, ScenarioAnalysis } from '../types/trade';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fetchJsonText } from '../lib/http';
import { fmt$ } from '../lib/formatCurrency';
import { fetchMultipleQuotes, fetchOptionQuotes, type OptionQuoteRequest } from '../lib/yahooFinance';
import LivePriceEstimator from '../components/LivePriceEstimator';

const TRADES_STORAGE_KEY = 'forward_vol_trades';

// Interface for closed trades
interface ClosedTrade {
  id: string;
  symbol: string;
  strike: number;
  callOrPut: 'CALL' | 'PUT';
  quantity: number;
  frontExpiration: string;
  backExpiration: string;
  entryPrice: number;
  exitPrice: number;
  entryDate: string;
  closedDate: string;
  realizedPnL: number;
  strategy?: string;
  notes?: string;
}

export default function TradeTracker() {
  // Load trades from localStorage on mount
  const [trades, setTrades] = useState<CalendarSpreadTrade[]>(() => {
    const stored = localStorage.getItem(TRADES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  
  // Closed trades state
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);

  // Directional trades state
  const [directionalTrades, setDirectionalTrades] = useState<DirectionalTrade[]>([]);
  const [dirRefreshing, setDirRefreshing] = useState(false);
  const [dirLastUpdate, setDirLastUpdate] = useState<Date | null>(null);
  const [dirPriceSource, setDirPriceSource] = useState<string>('');
  
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
        const { res, text } = await fetchJsonText('/data/trades.json', { cache: 'no-store' });
        if (res.ok) {
          const fileTrades = JSON.parse(text);
          if (Array.isArray(fileTrades)) {
            // Keep manual/local trades, but treat IB-sourced trades as authoritative from the file.
            // This prevents duplicates across runs and removes trades that were closed (no longer in IB).
            // Important: if the file contains an empty array, that means "no open IB positions" and we should clear old IB trades.
            setTrades(prevTrades => {
              const keepLocal = prevTrades.filter(t => {
                const anyT = t as any;
                const source = anyT?.source;
                return source !== 'ib' && !t.id.startsWith('ib_') && !t.id.startsWith('ibcal_');
              });
              return [...keepLocal, ...fileTrades];
            });
          }
        }
      } catch (error) {
        console.log('No trades file found or error loading:', error);
      }
    };
    loadTradesFromFile();
  }, []);

  // Load closed trades from data file
  useEffect(() => {
    const loadClosedTrades = async () => {
      try {
        const { res, text } = await fetchJsonText('/data/closed_trades.json', { cache: 'no-store' });
        if (res.ok) {
          const fileClosedTrades = JSON.parse(text);
          if (Array.isArray(fileClosedTrades)) {
            setClosedTrades(fileClosedTrades);
          }
        }
      } catch (error) {
        console.log('No closed trades file found or error loading:', error);
      }
    };
    loadClosedTrades();
  }, []);

  // Load directional trades from data file
  useEffect(() => {
    const loadDirectionalTrades = async () => {
      try {
        const { res, text } = await fetchJsonText('/data/directional_trades.json', { cache: 'no-store' });
        if (res.ok) {
          const fileTrades = JSON.parse(text);
          if (Array.isArray(fileTrades)) {
            setDirectionalTrades(fileTrades);
          }
        }
      } catch (error) {
        console.log('No directional trades file found or error loading:', error);
      }
    };
    loadDirectionalTrades();
  }, []);

  // Refresh directional trade prices from Yahoo Finance
  const refreshDirectionalPrices = useCallback(async () => {
    if (directionalTrades.length === 0 || dirRefreshing) return;
    setDirRefreshing(true);
    setDirPriceSource('');

    try {
      // 1. Fetch underlying stock prices
      const symbols = [...new Set(directionalTrades.map(t => t.symbol))];
      const stockQuotes = await fetchMultipleQuotes(symbols);

      // 2. Try to fetch option prices via quote server
      const optionRequests: OptionQuoteRequest[] = directionalTrades.map(t => ({
        id: t.id,
        symbol: t.symbol,
        strike: t.strike,
        expiration: t.expiration,
        type: t.callOrPut as 'CALL' | 'PUT',
      }));
      const optionQuotes = await fetchOptionQuotes(optionRequests);

      // 3. Update trades with fresh prices
      setDirectionalTrades(prev =>
        prev.map(t => {
          const updated = { ...t };

          // Update underlying price
          const sq = stockQuotes.get(t.symbol.toUpperCase());
          if (sq) {
            updated.underlyingCurrentPrice = sq.displayPrice;
          }

          // Update option price if available
          const oq = optionQuotes?.get(t.id);
          if (oq) {
            const livePrice = oq.mid > 0 ? oq.mid : oq.lastPrice;
            updated.currentPrice = livePrice;
            const isLong = t.quantity > 0;
            updated.unrealizedPnL = isLong
              ? (livePrice - t.entryPrice) * Math.abs(t.quantity) * 100
              : (t.entryPrice - livePrice) * Math.abs(t.quantity) * 100;
          }

          return updated;
        })
      );

      setDirPriceSource(optionQuotes ? 'Yahoo (stock + options)' : 'Yahoo (stock only)');
      setDirLastUpdate(new Date());
    } catch (e) {
      console.error('Error refreshing directional prices:', e);
      setDirPriceSource('Error fetching prices');
    } finally {
      setDirRefreshing(false);
    }
  }, [directionalTrades, dirRefreshing]);

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
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-desk-text">
            Trade Tracker
          </h1>
          <p className="text-lg text-desk-secondary">
            Monitor your calendar spread positions and P&L
          </p>
        </div>
        <div className="flex gap-2">
          {trades.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="font-semibold py-2 px-4 rounded-md transition-colors duration-200 bg-desk-up hover:bg-desk-up text-desk-deep"
              >
                 Export CSV
              </button>
              <button
                onClick={handleClearAllTrades}
                className="font-semibold py-2 px-4 rounded-md transition-colors duration-200 bg-desk-down hover:bg-desk-down text-desk-deep"
              >
                 Clear All
              </button>
            </>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="font-semibold py-2 px-4 rounded-md transition-colors duration-200 bg-desk-text hover:bg-desk-text text-desk-deep"
          >
             Import from IB
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="font-semibold py-2 px-6 rounded-md transition-colors duration-200 bg-desk-text hover:bg-desk-text text-desk-deep"
          >
            {showForm ? 'Cancel' : '+ Add Trade'}
          </button>
        </div>
      </div>

      {/* Add Trade Form */}
      {showForm && (
        <div className="rounded-lg p-6 bg-desk-card">
          <h2 className="text-xl font-bold mb-4 text-desk-text">New Calendar Spread</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-desk-secondary">
                Symbol
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="AMD"
                className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-desk-secondary">
                Strike
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.strike}
                onChange={(e) => setFormData({ ...formData, strike: parseFloat(e.target.value) })}
                placeholder="237.5"
                className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-desk-secondary">
                Type
              </label>
              <select
                value={formData.callOrPut}
                onChange={(e) => setFormData({ ...formData, callOrPut: e.target.value as 'CALL' | 'PUT' })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
              >
                <option value="CALL">CALL</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Front Month (Short) */}
            <div className="border rounded-lg p-4 border-hairline">
              <h3 className="font-semibold mb-3 text-desk-text">Front Month (Short)</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-desk-secondary">
                    Expiration
                  </label>
                  <input
                    type="date"
                    value={formData.frontExpiration}
                    onChange={(e) => setFormData({ ...formData, frontExpiration: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-desk-secondary">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.frontEntryPrice}
                    onChange={(e) => setFormData({ ...formData, frontEntryPrice: parseFloat(e.target.value) })}
                    placeholder="2.44"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-desk-secondary">
                    Current Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.frontCurrentPrice}
                    onChange={(e) => setFormData({ ...formData, frontCurrentPrice: parseFloat(e.target.value) })}
                    placeholder="2.44"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                  />
                </div>
              </div>
            </div>

            {/* Back Month (Long) */}
            <div className="border rounded-lg p-4 border-hairline">
              <h3 className="font-semibold mb-3 text-desk-text">Back Month (Long)</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-desk-secondary">
                    Expiration
                  </label>
                  <input
                    type="date"
                    value={formData.backExpiration}
                    onChange={(e) => setFormData({ ...formData, backExpiration: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-desk-secondary">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.backEntryPrice}
                    onChange={(e) => setFormData({ ...formData, backEntryPrice: parseFloat(e.target.value) })}
                    placeholder="5.00"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-desk-secondary">
                    Current Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.backCurrentPrice}
                    onChange={(e) => setFormData({ ...formData, backCurrentPrice: parseFloat(e.target.value) })}
                    placeholder="5.00"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-desk-secondary">
                Quantity (Contracts)
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                placeholder="1"
                className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-desk-secondary">
                Underlying Entry Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.underlyingEntryPrice}
                onChange={(e) => setFormData({ ...formData, underlyingEntryPrice: parseFloat(e.target.value) })}
                placeholder="235.72"
                className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-desk-secondary">
                Underlying Current Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.underlyingCurrentPrice}
                onChange={(e) => setFormData({ ...formData, underlyingCurrentPrice: parseFloat(e.target.value) })}
                placeholder="235.72"
                className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
              />
            </div>
          </div>

          <button
            onClick={handleAddTrade}
            className="w-full font-semibold py-3 px-6 rounded-md transition-colors duration-200 text-desk-text bg-desk-raised"
          >
            Add Trade
          </button>
        </div>
      )}

      {/* Open Positions - IB Style */}
      {trades.length > 0 && (
        <>
          {/* Summary Section */}
          <div className="rounded-lg overflow-hidden bg-desk-card">
            <div className="px-4 py-3 border-b bg-desk-raised border-hairline">
              <h2 className="text-lg font-semibold text-desk-text">Portfolio Summary</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm mb-1 text-desk-muted">Total Positions</div>
                  <div className="text-2xl font-bold text-desk-text">{trades.length}</div>
                </div>
                <div>
                  <div className="text-sm mb-1 text-desk-muted">Total Contracts</div>
                  <div className="text-2xl font-bold text-desk-text">
                    {trades.reduce((sum, t) => sum + t.quantity, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1 text-desk-muted">Total P&L</div>
                  <div className={`text-2xl font-bold ${trades.reduce((sum, t) => sum + calculatePnL(t), 0) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                    {fmt$(trades.reduce((sum, t) => sum + calculatePnL(t), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1 text-desk-muted">Avg P&L per Trade</div>
                  <div className={`text-2xl font-bold ${(trades.reduce((sum, t) => sum + calculatePnL(t), 0) / trades.length) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                    {fmt$(trades.reduce((sum, t) => sum + calculatePnL(t), 0) / trades.length)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Open Positions Table */}
          <div className="rounded-lg overflow-hidden bg-desk-card">
            <div className="px-4 py-3 border-b bg-desk-raised border-hairline">
              <h2 className="text-lg font-semibold text-desk-text">Open Positions</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-desk-raised">
                  <tr className="border-b border-hairline">
                    <th className="text-left py-2 px-3 font-semibold text-desk-text">Financial Instrument</th>
                    <th className="text-center py-2 px-2 font-semibold text-desk-text">Position</th>
                    <th className="text-center py-2 px-2 font-semibold text-desk-text">Close By</th>
                    <th className="text-right py-2 px-2 font-semibold text-desk-text">Avg Price</th>
                    <th className="text-right py-2 px-2 font-semibold text-desk-text">Last</th>
                    <th className="text-right py-2 px-2 font-semibold text-desk-text">Change</th>
                    <th className="text-right py-2 px-2 font-semibold text-desk-text">Change %</th>
                    <th className="text-right py-2 px-2 font-semibold text-desk-text">Daily P&L</th>
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
                        className="border-b border-hairline bg-desk-card"
                      >
                        <td className="py-2 px-3 font-medium text-desk-text">
                          {trade.symbol} {new Date(trade.frontExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}/{new Date(trade.backExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} {trade.strike} CalC
                        </td>
                        <td className="text-center py-2 px-2 font-semibold text-desk-text">
                          {trade.quantity}
                        </td>
                        <td className="text-center py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {isToday && <span className="font-bold text-lg text-desk-down" title="Expires TODAY!"></span>}
                            {isThisWeek && !isToday && <span className="text-lg text-desk-amber" title="Expires this week"></span>}
                            <span className={isToday ? 'font-bold text-desk-down' : isThisWeek ? 'font-semibold text-desk-amber' : 'text-desk-secondary'}>
                              {closeDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2 text-desk-secondary">
                          {(backEntry - frontEntry).toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2 text-desk-text">
                          {(backCurrent - frontCurrent).toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 font-medium ${totalPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {totalPnL >= 0 ? '+' : ''}{((backChange - frontChange)).toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 font-medium ${totalPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {totalPnL >= 0 ? '+' : ''}{(((backChange - frontChange) / (backEntry - frontEntry)) * 100).toFixed(2)}%
                        </td>
                        <td className={`text-right py-2 px-2 font-bold ${totalPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {fmt$(totalPnL, 0)}
                        </td>
                      </tr>
                      
                      {/* Front Month (Short) Row */}
                      <tr 
                        key={`${trade.id}-front`}
                        className="border-b border-hairline bg-desk-card"
                      >
                        <td className="py-2 px-3 pl-8 text-desk-secondary">
                          -{trade.quantity} {trade.symbol} {new Date(trade.frontExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}'{new Date(trade.frontExpiration).getFullYear().toString().slice(2)} {trade.strike} {trade.callOrPut === 'CALL' ? 'C' : 'P'}
                        </td>
                        <td className="text-center py-2 px-2 font-semibold text-desk-down">
                          -{trade.quantity}
                        </td>
                        <td></td>
                        <td className="text-right py-2 px-2 text-desk-secondary">
                          {frontEntry.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2 text-desk-text">
                          {frontCurrent.toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${-frontPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {-frontPnL >= 0 ? '+' : ''}{(-frontChange).toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${-frontPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {-frontPnL >= 0 ? '+' : ''}{(-frontChangePct).toFixed(2)}%
                        </td>
                        <td className={`text-right py-2 px-2 ${-frontPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {(-frontPnL).toFixed(0)}
                        </td>
                      </tr>
                      
                      {/* Back Month (Long) Row */}
                      <tr 
                        key={`${trade.id}-back`}
                        className="border-b-2 border-hairline bg-desk-card"
                      >
                        <td className="py-2 px-3 pl-8 text-desk-secondary">
                          +{trade.quantity} {trade.symbol} {new Date(trade.backExpiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}'{new Date(trade.backExpiration).getFullYear().toString().slice(2)} {trade.strike} {trade.callOrPut === 'CALL' ? 'C' : 'P'}
                        </td>
                        <td className="text-center py-2 px-2 font-semibold text-desk-up">
                          +{trade.quantity}
                        </td>
                        <td></td>
                        <td className="text-right py-2 px-2 text-desk-secondary">
                          {backEntry.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2 text-desk-text">
                          {backCurrent.toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${backPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {backPnL >= 0 ? '+' : ''}{backChange.toFixed(2)}
                        </td>
                        <td className={`text-right py-2 px-2 ${backPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {backPnL >= 0 ? '+' : ''}{backChangePct.toFixed(2)}%
                        </td>
                        <td className={`text-right py-2 px-2 ${backPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
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

          {/* Live Price Estimator */}
          <LivePriceEstimator trades={trades} />
        </>
      )}

      {/* Directional Option Trades */}
      {directionalTrades.length > 0 && (
        <div className="rounded-lg overflow-hidden bg-desk-card">
          <div className="px-4 py-3 border-b flex items-center justify-between border-hairline bg-desk-raised">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-desk-text">
              <span></span> Directional Option Trades
            </h2>
            <div className="flex items-center gap-3">
              {dirLastUpdate && (
                <span className="text-xs text-desk-amber">
                  {dirPriceSource} · {dirLastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={refreshDirectionalPrices}
                disabled={dirRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-50 text-sm font-medium rounded-md transition-colors bg-desk-card hover:bg-desk-card text-desk-text"
              >
                <span className={dirRefreshing ? 'animate-spin' : ''}></span>
                {dirRefreshing ? 'Refreshing...' : 'Refresh Prices'}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 border-b bg-desk-card border-hairline">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs mb-1 text-desk-muted">Open Positions</div>
                <div className="text-xl font-bold text-desk-text">{directionalTrades.length}</div>
              </div>
              <div>
                <div className="text-xs mb-1 text-desk-muted">Total Contracts</div>
                <div className="text-xl font-bold text-desk-text">
                  {directionalTrades.reduce((sum, t) => sum + Math.abs(t.quantity), 0)}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1 text-desk-muted">Total Cost</div>
                <div className="text-xl font-bold text-desk-text">
                  {fmt$(directionalTrades.reduce((sum, t) => sum + t.entryPrice * Math.abs(t.quantity) * 100, 0), 0)}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1 text-desk-muted">Total P&L</div>
                {(() => {
                  const totalPnl = directionalTrades.reduce((sum, t) => {
                    if (t.unrealizedPnL !== undefined && t.unrealizedPnL !== null) return sum + t.unrealizedPnL;
                    const pnl = t.quantity > 0
                      ? (t.currentPrice - t.entryPrice) * Math.abs(t.quantity) * 100
                      : (t.entryPrice - t.currentPrice) * Math.abs(t.quantity) * 100;
                    return sum + pnl;
                  }, 0);
                  return (
                    <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                      {fmt$(totalPnl, 0, true)}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-desk-raised">
                <tr className="border-b border-hairline">
                  <th className="text-left py-3 px-4 font-semibold text-desk-text">Position</th>
                  <th className="text-center py-3 px-3 font-semibold text-desk-text">Qty</th>
                  <th className="text-center py-3 px-3 font-semibold text-desk-text">Expiration</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">Entry</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">Current</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">Change</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">Change %</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">P&L</th>
                </tr>
              </thead>
              <tbody>
                {directionalTrades.map(trade => {
                  const isLong = trade.quantity > 0;
                  const qty = Math.abs(trade.quantity);
                  const change = trade.currentPrice - trade.entryPrice;
                  const changePct = trade.entryPrice > 0 ? (change / trade.entryPrice) * 100 : 0;
                  const pnl = trade.unrealizedPnL !== undefined && trade.unrealizedPnL !== null
                    ? trade.unrealizedPnL
                    : isLong
                      ? change * qty * 100
                      : -change * qty * 100;
                  const dte = calculateDTE(trade.expiration);

                  return (
                    <tr
                      key={trade.id}
                      className={`border-b border-hairline ${
                        isLong
                          ? 'bg-desk-card hover:bg-desk-card'
                          : 'bg-desk-card hover:bg-desk-card'
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-desk-text">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${isLong ? 'bg-desk-up text-desk-up' : 'bg-desk-down text-desk-down'}`}>
                            {isLong ? 'LONG' : 'SHORT'}
                          </span>
                          <span>{trade.symbol} ${trade.strike} {trade.callOrPut}</span>
                        </div>
                        <div className="text-xs mt-0.5 text-desk-muted">
                          Underlying: {fmt$(trade.underlyingCurrentPrice)}
                        </div>
                      </td>
                      <td className={`text-center py-3 px-3 font-semibold ${isLong ? 'text-desk-up' : 'text-desk-down'}`}>
                        {isLong ? '+' : ''}{trade.quantity}
                      </td>
                      <td className="text-center py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {dte <= 0 && <span className="font-bold text-lg text-desk-down" title="Expired!"></span>}
                          {dte > 0 && dte <= 7 && <span className="text-lg text-desk-amber" title="Expires this week"></span>}
                          <div>
                            <div className={dte <= 0 ? 'font-bold text-desk-down' : dte <= 7 ? 'font-semibold text-desk-amber' : 'text-desk-secondary'}>
                              {new Date(trade.expiration).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}
                            </div>
                            <div className="text-xs text-desk-muted">{dte}d</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 text-desk-secondary">
                        {fmt$(trade.entryPrice)}
                      </td>
                      <td className="text-right py-3 px-3 font-medium text-desk-text">
                        {fmt$(trade.currentPrice)}
                      </td>
                      <td className={`text-right py-3 px-3 font-medium ${(isLong ? change : -change) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        {(isLong ? change : -change) >= 0 ? '+' : ''}{(isLong ? change : -change).toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-3 font-medium ${(isLong ? changePct : -changePct) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        {(isLong ? changePct : -changePct) >= 0 ? '+' : ''}{(isLong ? changePct : -changePct).toFixed(1)}%
                      </td>
                      <td className={`text-right py-3 px-3 font-bold ${pnl >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        {fmt$(pnl, 0, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {directionalTrades[0]?.asOf && (
            <div className="px-4 py-2 text-xs border-t text-desk-muted border-hairline">
              Last updated: {new Date(directionalTrades[0].asOf).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Recently Closed Trades */}
      {closedTrades.length > 0 && (
        <div className="rounded-lg overflow-hidden bg-desk-card">
          <div className="px-4 py-3 border-b border-hairline bg-desk-raised">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-desk-text">
              <span></span> Recently Closed Trades
            </h2>
          </div>
          
          {/* Closed Trades Summary */}
          <div className="p-4 border-b bg-desk-card border-hairline">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs mb-1 text-desk-muted">Closed This Week</div>
                <div className="text-xl font-bold text-desk-text">{closedTrades.length}</div>
              </div>
              <div>
                <div className="text-xs mb-1 text-desk-muted">Winners</div>
                <div className="text-xl font-bold text-desk-up">
                  {closedTrades.filter(t => t.realizedPnL > 0).length}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1 text-desk-muted">Losers</div>
                <div className="text-xl font-bold text-desk-down">
                  {closedTrades.filter(t => t.realizedPnL < 0).length}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1 text-desk-muted">Total Realized P&L</div>
                <div className={`text-xl font-bold ${closedTrades.reduce((sum, t) => sum + t.realizedPnL, 0) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                  {fmt$(closedTrades.reduce((sum, t) => sum + t.realizedPnL, 0))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-desk-raised">
                <tr className="border-b border-hairline">
                  <th className="text-left py-3 px-4 font-semibold text-desk-text">Symbol</th>
                  <th className="text-center py-3 px-3 font-semibold text-desk-text">Strike</th>
                  <th className="text-center py-3 px-3 font-semibold text-desk-text">Qty</th>
                  <th className="text-center py-3 px-3 font-semibold text-desk-text">Strategy</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">Entry</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">Exit</th>
                  <th className="text-right py-3 px-3 font-semibold text-desk-text">P&L</th>
                  <th className="text-center py-3 px-3 font-semibold text-desk-text">Closed</th>
                </tr>
              </thead>
              <tbody>
                {[...closedTrades].sort((a, b) => new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime()).map(trade => {
                  const pnlPerContract = trade.exitPrice - trade.entryPrice;
                  const pnlPct = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
                  const isWinner = trade.realizedPnL > 0;
                  const isLoser = trade.realizedPnL < 0;
                  
                  return (
                    <tr 
                      key={trade.id}
                      className={`border-b border-hairline transition-colors ${
                        isWinner 
                          ? 'bg-desk-card hover:bg-desk-card' 
                          : isLoser 
                            ? 'bg-desk-card hover:bg-desk-card'
                            : 'hover:bg-desk-card'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {isWinner ? '' : isLoser ? '' : ''}
                          </span>
                          <div>
                            <div className="font-bold text-desk-text">{trade.symbol}</div>
                            <div className="text-xs text-desk-muted">
                              {new Date(trade.frontExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} / {new Date(trade.backExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 font-medium text-desk-text">
                        ${trade.strike} {trade.callOrPut.charAt(0)}
                      </td>
                      <td className="text-center py-3 px-3 font-medium text-desk-text">
                        {trade.quantity}
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-desk-card text-desk-text">
                          {trade.strategy || 'Calendar'}
                        </span>
                      </td>
                      <td className="text-right py-3 px-3 text-desk-secondary">
                        {fmt$(trade.entryPrice)}
                      </td>
                      <td className="text-right py-3 px-3 text-desk-secondary">
                        {fmt$(trade.exitPrice)}
                      </td>
                      <td className="text-right py-3 px-3">
                        <div className={`font-bold ${isWinner ? 'text-desk-up' : isLoser ? 'text-desk-down' : 'text-desk-muted'}`}>
                          {fmt$(trade.realizedPnL, 2, true)}
                        </div>
                        <div className={`text-xs ${isWinner ? 'text-desk-up' : isLoser ? 'text-desk-down' : 'text-desk-muted'}`}>
                          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 text-xs text-desk-muted">
                        {new Date(trade.closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {closedTrades.some(t => t.notes) && (
            <div className="p-4 border-t border-hairline">
              <div className="text-xs font-medium mb-2 text-desk-muted">Trade Notes:</div>
              {closedTrades.filter(t => t.notes).map(trade => (
                <div key={trade.id} className="text-sm mb-1 text-desk-secondary">
                  <span className="font-medium">{trade.symbol}:</span> {trade.notes}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade Details - Scenario Analysis & Chart */}
      {selectedTrade && (
        <div className="space-y-6">
          {/* Trade Header */}
          <div className="rounded-lg p-6 text-desk-text bg-desk-raised">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {selectedTrade.quantity} x {selectedTrade.symbol} ${selectedTrade.strike} {selectedTrade.callOrPut}
                </h2>
                <p className="text-desk-text">
                  {selectedTrade.frontExpiration} / {selectedTrade.backExpiration} Calendar Spread
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-desk-text">P&L</div>
                <div className={`text-3xl font-bold ${calculatePnL(selectedTrade) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                  {fmt$(calculatePnL(selectedTrade))}
                </div>
              </div>
            </div>
          </div>

          {/* Scenario Analysis Table */}
          <div className="rounded-lg p-6 bg-desk-card">
            <h3 className="text-lg font-semibold mb-4 text-desk-text">Scenario Analysis</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left py-2 px-2 text-sm font-semibold text-desk-text">Price Change</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-desk-text">Underlying</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-desk-text">P&L</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-desk-text">Delta</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-desk-text">Gamma</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-desk-text">Theta</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-desk-text">Vega</th>
                  </tr>
                </thead>
                <tbody>
                  {generateScenarios(selectedTrade).map((scenario, idx) => (
                    <tr 
                      key={idx}
                      className={`border-b border-hairline ${scenario.priceChange === 'Current' ? 'font-semibold bg-desk-card' : ''}`}
                    >
                      <td className="py-2 px-2 text-sm text-desk-text">
                        {scenario.priceChange}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-desk-text">
                        {fmt$(scenario.underlyingPrice)}
                      </td>
                      <td className={`text-right py-2 px-2 text-sm font-semibold ${scenario.pnl >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        {fmt$(scenario.pnl)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-desk-muted">
                        {scenario.delta.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-desk-muted">
                        {scenario.gamma.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-desk-muted">
                        {scenario.theta.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 text-sm text-desk-muted">
                        {scenario.vega.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-desk-muted">
              <p>
                <span className="text-desk-amber"> Note:</span> Greeks values are simplified estimates. 
                For accurate Greeks, integrate with a real-time options pricing API.
              </p>
            </div>
          </div>

          {/* P&L Chart */}
          <div className="rounded-lg p-6 bg-desk-card">
            <h3 className="text-lg font-semibold mb-4 text-desk-text">P&L Profile</h3>
            
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={generateChartData(selectedTrade)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="price" 
                  tickFormatter={(value) => fmt$(value, 0)}
                  stroke="#9CA3AF"
                />
                <YAxis 
                  tickFormatter={(value) => fmt$(value, 0)}
                  stroke="#9CA3AF"
                />
                <Tooltip 
                  formatter={(value: number) => [fmt$(value), 'P&L']}
                  labelFormatter={(label) => `Price: ${fmt$(parseFloat(label))}`}
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
            
            <div className="mt-4 text-sm text-desk-muted">
              <p>
                <span className="text-desk-amber"> Note:</span> This is a simplified P&L curve. 
                For accurate P&L profiles, use Black-Scholes pricing with real-time volatility and time decay.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {trades.length === 0 && !showForm && (
        <div className="rounded-lg p-12 text-center bg-desk-raised">
          <div className="text-6xl mb-4"></div>
          <h3 className="text-xl font-semibold mb-2 text-desk-text">
            No trades yet
          </h3>
          <p className="mb-6 text-desk-secondary">
            Start tracking your calendar spreads by adding your first trade
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="font-semibold py-2 px-6 rounded-md transition-colors duration-200 bg-desk-text hover:bg-desk-text text-desk-deep"
          >
            Add Your First Trade
          </button>
        </div>
      )}

      {/* Update Prices Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black" onClick={() => setShowUpdateModal(false)}>
          <div className="rounded-lg p-6 max-w-md w-full mx-4 bg-desk-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-desk-text">Update Current Prices</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-desk-secondary">
                  Front Month Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatePrices.front}
                  onChange={(e) => setUpdatePrices({ ...updatePrices, front: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-desk-secondary">
                  Back Month Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatePrices.back}
                  onChange={(e) => setUpdatePrices({ ...updatePrices, back: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-desk-secondary">
                  Underlying Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatePrices.underlying}
                  onChange={(e) => setUpdatePrices({ ...updatePrices, underlying: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none border-hairline bg-desk-raised text-desk-text"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 font-semibold py-2 px-4 rounded-md transition-colors duration-200 bg-desk-raised hover:bg-desk-raised text-desk-text"
              >
                Cancel
              </button>
              <button
                onClick={submitPriceUpdate}
                className="flex-1 font-semibold py-2 px-4 rounded-md transition-colors duration-200 bg-desk-text hover:bg-desk-text text-desk-deep"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from IB Modal */}
      {showImportModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black" onClick={() => setShowImportModal(false)}>
          <div className="rounded-lg p-6 max-w-2xl w-full mx-4 bg-desk-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-desk-text">Import Trades from Interactive Brokers</h2>
            
            <div className="border-l-4 p-4 mb-4 rounded bg-desk-card border-hairline">
              <p className="text-sm text-desk-text">
                <strong>Instructions:</strong>
              </p>
              <ol className="text-sm list-decimal ml-4 mt-2 space-y-1 text-desk-text">
                <li>Run <code className="px-1 rounded bg-desk-text">python fetch_ib_positions.py</code> in your calculator folder</li>
                <li>Open the generated <code className="px-1 rounded bg-desk-text">trades.json</code> file</li>
                <li>Copy the entire JSON content</li>
                <li>Paste it in the text area below</li>
                <li>Click Import</li>
              </ol>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-desk-secondary">
                Paste JSON from fetch_ib_positions.py:
              </label>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"id": "...", "symbol": "AMD", "strike": 237.5, ...}]'
                rows={10}
                className="w-full px-3 py-2 border rounded-md focus:outline-none font-mono text-xs border-hairline bg-desk-raised text-desk-text"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                }}
                className="flex-1 font-semibold py-2 px-4 rounded-md transition-colors duration-200 bg-desk-raised hover:bg-desk-raised text-desk-text"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJSON}
                disabled={!importJson.trim()}
                className="flex-1 disabled:cursor-not-allowed font-semibold py-2 px-4 rounded-md transition-colors duration-200 bg-desk-text hover:bg-desk-text disabled:bg-desk-raised text-desk-deep"
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
