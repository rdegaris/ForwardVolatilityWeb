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
    setInputs((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleCalculate = () => {
    try {
      const calculated = calculateForwardVolatility(inputs);
      setResult(calculated);
    } catch (error) {
      console.error('Calculation error:', error);
      alert('Error calculating forward volatility. Check your inputs.');
    }
  };

  return (
    <div className="desk-surface rounded-2xl p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-desk-text border-b border-hairline pb-2">
            Front-month option
          </h3>

          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Strike price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.frontStrike}
              onChange={(e) => handleInputChange('frontStrike', e.target.value)}
              className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Option price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.frontPrice}
              onChange={(e) => handleInputChange('frontPrice', e.target.value)}
              className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Days to expiration (DTE)
            </label>
            <input
              type="number"
              value={inputs.frontDTE}
              onChange={(e) => handleInputChange('frontDTE', e.target.value)}
              className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-desk-text border-b border-hairline pb-2">
            Back-month option
          </h3>

          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Strike price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.backStrike}
              onChange={(e) => handleInputChange('backStrike', e.target.value)}
              className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Option price
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.backPrice}
              onChange={(e) => handleInputChange('backPrice', e.target.value)}
              className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-desk-secondary mb-1.5">
              Days to expiration (DTE)
            </label>
            <input
              type="number"
              value={inputs.backDTE}
              onChange={(e) => handleInputChange('backDTE', e.target.value)}
              className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-hairline">
        <div>
          <label className="block text-xs font-medium text-desk-secondary mb-1.5">
            Underlying price
          </label>
          <input
            type="number"
            step="0.01"
            value={inputs.underlyingPrice}
            onChange={(e) => handleInputChange('underlyingPrice', e.target.value)}
            className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-desk-secondary mb-1.5">
            Risk-free rate (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={inputs.riskFreeRate * 100}
            onChange={(e) => handleInputChange('riskFreeRate', (parseFloat(e.target.value) / 100).toString())}
            className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
          />
        </div>
      </div>

      <div>
        <button
          onClick={handleCalculate}
          className="desk-btn-primary px-5 py-2.5 text-xs"
        >
          Solve Black-Scholes forward volatility
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-hairline">
          <div className="desk-well rounded-xl p-4">
            <p className="text-xs text-desk-muted">Front-month IV</p>
            <p className="mt-1 text-2xl font-mono font-semibold text-desk-text tabular-nums">
              {(result.frontIV * 100).toFixed(2)}%
            </p>
          </div>
          <div className="desk-well rounded-xl p-4">
            <p className="text-xs text-desk-muted">Back-month IV</p>
            <p className="mt-1 text-2xl font-mono font-semibold text-desk-text tabular-nums">
              {(result.backIV * 100).toFixed(2)}%
            </p>
          </div>
          <div className="desk-well rounded-xl p-4">
            <p className="text-xs text-desk-muted">Forward volatility</p>
            <p className="mt-1 text-2xl font-mono font-semibold text-desk-up tabular-nums">
              {(result.forwardVol * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
