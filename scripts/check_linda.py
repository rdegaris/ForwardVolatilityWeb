import json

d = json.load(open('public/data/linda_signals_latest.json'))
print(f"Total: {d['total_scanned']} | Triggered: {d['total_triggered']}")
for s in d['signals']:
    status = 'TRIGGERED' if s['triggered'] else ('near-miss' if s['direction'] else 'no signal')
    sym = s['symbol']
    direction = s['direction']
    rvsa = s['range_vs_atr']
    strength = s['trend_strength']
    gap = s['gap_pct']
    print(f"  {sym}: {direction} | {status} | range_vs_atr={rvsa} | strength={strength} | gap={gap}%")
