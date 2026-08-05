import urllib.request, json, datetime

tickers = {
    'NQ (Equity)': 'NQ=F',
    'ZB (T-Bond)': 'ZB=F',
    '6E (Euro FX)': '6E=F',
    'GC (Gold)': 'GC=F',
    'CL (Crude Oil)': 'CL=F',
}

for sym, ticker in tickers.items():
    url = f'https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range=2d&interval=15m'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    res = json.loads(urllib.request.urlopen(req).read())
    result = res['chart']['result'][0]
    ts = result['timestamp']
    q = result['indicators']['quote'][0]

    times = set()
    for i in range(len(ts)):
        if q['close'][i] is None:
            continue
        dt = datetime.datetime.utcfromtimestamp(ts[i])
        times.add(dt.strftime('%H:%M'))

    sorted_times = sorted(times)
    first_utc = sorted_times[0]
    last_utc = sorted_times[-1]

    # Convert to ET (EDT = UTC-4, EST = UTC-5 — currently EDT)
    def utc_to_et(t):
        h, m = map(int, t.split(':'))
        et_h = (h - 4) % 24
        return f'{et_h:02d}:{m:02d} ET'

    print(f'{sym}')
    print(f'  Yahoo data: {first_utc} UTC to {last_utc} UTC')
    print(f'            = {utc_to_et(first_utc)} to {utc_to_et(last_utc)}')
    print(f'  WE USE:     13:30 UTC to 20:00 UTC (09:30 ET to 16:00 ET)')
    print()
