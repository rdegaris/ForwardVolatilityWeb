import { useState } from 'react';
import type { CalendarSpreadTrade, ScenarioAnalysis } from '../types/trade';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function TradeTracker() {
  const [trades, setTrades] = useState<CalendarSpreadTrade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<CalendarSpreadTrade | null>(null);

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
    // Calendar spread: Long back month, Short front month
    // P&L = (Current back price - Entry back price) - (Current front price - Entry front price)
    const backPnL = (trade.backCurrentPrice - trade.backEntryPrice) * trade.quantity * 100;
    const frontPnL = (trade.frontCurrentPrice - trade.frontEntryPrice) * trade.quantity * 100;
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

  // Update current prices for a trade (for future use)
  // const handleUpdatePrices = (id: string, frontPrice: number, backPrice: number, underlyingPrice: number) => {
  //   setTrades(trades.map(t => 
  //     t.id === id 
  //       ? { ...t, frontCurrentPrice: frontPrice, backCurrentPrice: backPrice, underlyingCurrentPrice: underlyingPrice }
  //       : t
  //   ));
  //   
  //   if (selectedTrade?.id === id) {
  //     setSelectedTrade({ 
  //       ...selectedTrade, 
  //       frontCurrentPrice: frontPrice, 
  //       backCurrentPrice: backPrice, 
  //       underlyingCurrentPrice: underlyingPrice 
  //     });
  //   }
  // };

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
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition duration-200"
        >
          {showForm ? 'Cancel' : '+ Add Trade'}
        </button>
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

      {/* Open Positions */}
      {trades.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Open Positions</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-900 dark:text-white">Position</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-white">Strike</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-white">Front DTE</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-white">Back DTE</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-white">Underlying</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-white">P&L</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => {
                  const pnl = calculatePnL(trade);
                  const frontDTE = calculateDTE(trade.frontExpiration);
                  const backDTE = calculateDTE(trade.backExpiration);
                  
                  return (
                    <tr 
                      key={trade.id} 
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedTrade?.id === trade.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <td className="py-3 px-2">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {trade.quantity} x {trade.symbol} {trade.callOrPut}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Calendar Spread
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-sm text-gray-900 dark:text-white">
                        ${trade.strike.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-2 text-sm text-gray-900 dark:text-white">
                        {frontDTE}d
                      </td>
                      <td className="text-right py-3 px-2 text-sm text-gray-900 dark:text-white">
                        {backDTE}d
                      </td>
                      <td className="text-right py-3 px-2 text-sm text-gray-900 dark:text-white">
                        ${trade.underlyingCurrentPrice.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-2 text-sm font-bold ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${pnl.toFixed(2)}
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrade(trade.id);
                          }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
    </div>
  );
}
