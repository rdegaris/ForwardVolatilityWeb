import VolatilityCalculator from '../components/VolatilityCalculator';
import ForwardFactorCalculator from '../components/ForwardFactorCalculator';

export default function Calculator() {
  return (
    <div className="space-y-8 pb-16">
      <div>
        <div className="text-xs font-mono text-desk-muted">Term-structure tools</div>
        <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
          Forward volatility calculators
        </h1>
        <p className="mt-1.5 text-sm text-desk-secondary">
          Compute forward implied volatility and forward factor across two option expirations.
        </p>
      </div>

      <ForwardFactorCalculator />

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-desk-text tracking-tight">
            Derive from option prices
          </h2>
          <p className="text-xs text-desk-muted mt-0.5">
            Solve front and back implied volatility via Black-Scholes before extracting forward volatility.
          </p>
        </div>
        <VolatilityCalculator />
      </div>

      <div className="desk-surface rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-desk-text">
          Forward variance relationship
        </h3>
        <p className="text-xs text-desk-secondary leading-relaxed">
          Forward implied volatility isolates expected variance between the front expiration (<span className="font-mono">T1</span>) and back expiration (<span className="font-mono">T2</span>):
        </p>
        <div className="desk-well rounded-xl p-4 font-mono text-xs text-desk-text overflow-x-auto tabular-nums">
          <div>sigma_fwd = sqrt((sigma_back^2 * T2 - sigma_front^2 * T1) / (T2 - T1))</div>
          <div className="mt-1.5 text-desk-muted">
            Forward factor = (sigma_front - sigma_fwd) / sigma_fwd
          </div>
        </div>
      </div>
    </div>
  );
}
