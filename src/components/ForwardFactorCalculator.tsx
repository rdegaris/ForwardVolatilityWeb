import { useState } from 'react';
import { getTodayDatePacific } from '../lib/dateUtils';

interface ForwardFactorInputs {
  frontIV: string;
  backIV: string;
  frontDate: string;
  backDate: string;
}

interface ForwardFactorResults {
  forwardVol: number;
  forwardFactor: number;
  frontDTE: number;
  backDTE: number;
  dateRange: string;
}

export default function ForwardFactorCalculator() {
  const [inputs, setInputs] = useState<ForwardFactorInputs>({
    frontIV: '',
    backIV: '',
    frontDate: '',
    backDate: '',
  });

  const [results, setResults] = useState<ForwardFactorResults | null>(null);
  const [error, setError] = useState<string>('');

  const calculateDTE = (dateStr: string): number => {
    const targetDate = new Date(dateStr);
    const today = getTodayDatePacific();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculate = () => {
    setError('');

    try {
      const frontIV = parseFloat(inputs.frontIV);
      const backIV = parseFloat(inputs.backIV);

      if (isNaN(frontIV) || isNaN(backIV)) {
        setError('Enter valid numeric IV percentages.');
        return;
      }

      if (frontIV <= 0 || frontIV > 1000 || backIV <= 0 || backIV > 1000) {
        setError('IV values must be between 1 and 1000.');
        return;
      }

      if (!inputs.frontDate || !inputs.backDate) {
        setError('Select both front and back expiration dates.');
        return;
      }

      const frontDTE = calculateDTE(inputs.frontDate);
      const backDTE = calculateDTE(inputs.backDate);

      if (frontDTE <= 0 || backDTE <= 0) {
        setError('Expiration dates must be in the future.');
        return;
      }

      if (frontDTE >= backDTE) {
        setError('Front date must precede back date.');
        return;
      }

      const sigma1 = frontIV / 100;
      const sigma2 = backIV / 100;

      const T1 = frontDTE / 365;
      const T2 = backDTE / 365;

      const forwardVariance = (sigma2 * sigma2 * T2 - sigma1 * sigma1 * T1) / (T2 - T1);

      if (forwardVariance < 0) {
        setError('Negative forward variance: front IV exceeds sustainable term structure relative to back IV.');
        return;
      }

      const forwardVol = Math.sqrt(forwardVariance);
      const forwardFactor = (sigma1 - forwardVol) / forwardVol;

      setResults({
        forwardVol: forwardVol * 100,
        forwardFactor: forwardFactor * 100,
        frontDTE,
        backDTE,
        dateRange: `${formatDate(inputs.frontDate)} to ${formatDate(inputs.backDate)}`,
      });
    } catch (err) {
      setError('Calculation error: ' + (err as Error).message);
    }
  };

  const handleInputChange = (field: keyof ForwardFactorInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setResults(null);
  };

  return (
    <div className="desk-surface rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-desk-text">
          Direct IV &amp; forward factor calculator
        </h2>
        <p className="text-xs text-desk-muted mt-0.5">
          Enter front and back implied volatilities and expiration dates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-desk-secondary mb-1.5">
            Front IV (%)
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            max="1000"
            value={inputs.frontIV}
            onChange={(e) => handleInputChange('frontIV', e.target.value)}
            placeholder="61.87"
            className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-desk-secondary mb-1.5">
            Back IV (%)
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            max="1000"
            value={inputs.backIV}
            onChange={(e) => handleInputChange('backIV', e.target.value)}
            placeholder="52.11"
            className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-desk-secondary mb-1.5">
            Front expiration
          </label>
          <input
            type="date"
            value={inputs.frontDate}
            onChange={(e) => handleInputChange('frontDate', e.target.value)}
            className="desk-input w-full px-3.5 py-2 text-sm font-mono"
          />
          {inputs.frontDate && (
            <span className="mt-1 block text-[11px] font-mono text-desk-muted tabular-nums">
              {calculateDTE(inputs.frontDate)} DTE
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-desk-secondary mb-1.5">
            Back expiration
          </label>
          <input
            type="date"
            value={inputs.backDate}
            onChange={(e) => handleInputChange('backDate', e.target.value)}
            className="desk-input w-full px-3.5 py-2 text-sm font-mono"
          />
          {inputs.backDate && (
            <span className="mt-1 block text-[11px] font-mono text-desk-muted tabular-nums">
              {calculateDTE(inputs.backDate)} DTE
            </span>
          )}
        </div>
      </div>

      <div>
        <button
          onClick={calculate}
          className="desk-btn-primary px-5 py-2.5 text-xs"
        >
          Calculate forward factor
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-desk-down/10 border border-desk-down/30 px-4 py-3 text-xs text-desk-down">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-4 pt-2 border-t border-hairline">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="desk-well rounded-xl p-5">
              <div className="text-xs text-desk-muted">Forward volatility</div>
              <div className="mt-1.5 text-3xl font-mono font-semibold text-desk-text tabular-nums">
                {results.forwardVol.toFixed(2)}%
              </div>
              <div className="mt-1 text-xs text-desk-muted">{results.dateRange}</div>
            </div>

            <div className="desk-well rounded-xl p-5">
              <div className="text-xs text-desk-muted">Forward factor</div>
              <div
                className={`mt-1.5 text-3xl font-mono font-semibold tabular-nums ${
                  results.forwardFactor > 0 ? 'text-desk-up' : 'text-desk-down'
                }`}
              >
                {results.forwardFactor > 0 ? '+' : ''}
                {results.forwardFactor.toFixed(2)}%
              </div>
              <div className="mt-1 text-xs text-desk-muted font-mono">(Front IV / Forward vol) - 1</div>
            </div>
          </div>

          <div className="desk-well rounded-xl p-4 divide-y divide-hairline text-xs">
            {[
              { label: 'Front DTE', value: `${results.frontDTE} days` },
              { label: 'Back DTE', value: `${results.backDTE} days` },
              { label: 'Calendar spread window', value: `${results.backDTE - results.frontDTE} days` },
              { label: 'Front IV', value: `${inputs.frontIV}%` },
              { label: 'Back IV', value: `${inputs.backIV}%` },
            ].map((r) => (
              <div key={r.label} className="flex justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-desk-secondary">{r.label}</span>
                <span className="font-mono font-medium text-desk-text tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="desk-well rounded-xl p-4 text-xs text-desk-secondary leading-relaxed">
            {results.forwardFactor > 40 ? (
              <span>
                <strong className="text-desk-up">Elevated front term structure (&gt;40%):</strong> Front-month implied volatility trades well above forward implied volatility, favoring long calendar spread structures.
              </span>
            ) : results.forwardFactor > 20 ? (
              <span>
                <strong className="text-desk-amber">Moderate backwardation (&gt;20%):</strong> Front-month implied volatility carries a measurable premium over forward volatility.
              </span>
            ) : results.forwardFactor > 0 ? (
              <span>
                <strong className="text-desk-text">Modest positive forward factor:</strong> Front IV exceeds forward volatility by a narrow margin.
              </span>
            ) : (
              <span>
                <strong className="text-desk-down">Contango term structure (&lt;0%):</strong> Front IV sits below forward volatility; short-front calendar spreads carry unfavorable structure.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
