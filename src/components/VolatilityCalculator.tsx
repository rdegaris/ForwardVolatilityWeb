import { useState } from 'react';
import { calculateForwardVolatility } from '../lib/volatility';
import type { OptionInput, CalculationResult } from '../types/volatility';

export default function VolatilityCalculator() {
  const [inputs, setInputs] = useState<OptionInput>({
    frontStrike: 100,
    frontPrice: 5,
    frontDTE: 30,
    backStrike: 100,
    backPrice: 8,
    backDTE: 60,
    underlyingPrice: 100,
    riskFreeRate: 0.05,
  });

  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleInputChange = (field: keyof OptionInput, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };

  const handleCalculate = () => {
    try {
      const calculated = calculateForwardVolatility(inputs);
      setResult(calculated);
    } catch (error) {
      console.error('Calculation error:', error);
      alert('Error calculating forward volatility. Please check your inputs.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Front Month Option */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">
            Front Month Option
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Strike Price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.frontStrike}
              onChange={(e) => handleInputChange('frontStrike', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Option Price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.frontPrice}
              onChange={(e) => handleInputChange('frontPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Days to Expiration (DTE)
            </label>
            <input
              type="number"
              value={inputs.frontDTE}
              onChange={(e) => handleInputChange('frontDTE', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Back Month Option */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">
            Back Month Option
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Strike Price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.backStrike}
              onChange={(e) => handleInputChange('backStrike', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Option Price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.backPrice}
              onChange={(e) => handleInputChange('backPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Days to Expiration (DTE)
            </label>
            <input
              type="number"
              value={inputs.backDTE}
              onChange={(e) => handleInputChange('backDTE', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Additional Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Underlying Price
          </label>
          <input
            type="number"
            step="0.01"
            value={inputs.underlyingPrice}
            onChange={(e) => handleInputChange('underlyingPrice', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Risk-Free Rate (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={inputs.riskFreeRate * 100}
            onChange={(e) => handleInputChange('riskFreeRate', (parseFloat(e.target.value) / 100).toString())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <div className="mt-6">
        <button
          onClick={handleCalculate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition duration-200 ease-in-out transform hover:scale-105"
        >
          Calculate Forward Volatility
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 p-6 bg-blue-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Front Month IV</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(result.frontIV * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Back Month IV</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(result.backIV * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Forward Volatility</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(result.forwardVol * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
