"""
Fetch more Linda Raschke tweets by pulling her profile page with different cursor/pagination.
X serves recent tweets in the initial page load HTML. We'll also try nitter mirrors for historical content.
"""
import re
import urllib.request
import time

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch_and_parse(url, label=""):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='replace')
        return html
    except Exception as e:
        print(f"  ERROR fetching {label}: {e}")
        return ""

def extract_tweets(html):
    bodies = re.findall(r'itemProp="articleBody"[^>]*>.*?<span>(.*?)</span>', html, re.DOTALL)
    dates_raw = re.findall(r'dateCreated" content="([\d\-T:\.Z]+)"', html)
    ids_raw = re.findall(r'itemID="(\d+)"', html)
    tweet_dates = [d for d in dates_raw if '2009' not in d and '2024' not in d or True]
    results = []
    for i, body in enumerate(bodies):
        text = re.sub(r'<[^>]+>', '', body).strip()
        text = text.replace('&#x27;', "'").replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'")
        if text:
            d = tweet_dates[i] if i < len(tweet_dates) else "unknown"
            tid = ids_raw[i] if i < len(ids_raw) else ""
            results.append((d[:10], tid, text))
    return results

all_tweets = []

# 1. Main profile page
print("Fetching main profile...")
html = fetch_and_parse("https://x.com/LindaRaschke", "main profile")
tweets = extract_tweets(html)
all_tweets.extend(tweets)
print(f"  Got {len(tweets)} tweets")
time.sleep(1)

# 2. Try search pages for key strategy terms
search_terms = [
    "from%3ALindaRaschke+EMA+pit",
    "from%3ALindaRaschke+trend+day",
    "from%3ALindaRaschke+Taylor",
    "from%3ALindaRaschke+ADX+Holy+Grail",
    "from%3ALindaRaschke+outside+day",
    "from%3ALindaRaschke+Donchian",
    "from%3ALindaRaschke+15+minute",
    "from%3ALindaRaschke+ATR",
]

for term in search_terms:
    url = f"https://x.com/search?q={term}&f=live"
    label = term.replace('%3A','').replace('+',' ')
    print(f"Fetching search: {label}...")
    html = fetch_and_parse(url, label)
    tweets = extract_tweets(html)
    all_tweets.extend(tweets)
    print(f"  Got {len(tweets)} tweets")
    time.sleep(1)

# Deduplicate by tweet ID
seen = set()
unique = []
for d, tid, text in all_tweets:
    if tid not in seen:
        seen.add(tid)
        unique.append((d, tid, text))

# Sort by date descending
unique.sort(key=lambda x: x[0], reverse=True)

print(f"\n{'='*80}")
print(f"TOTAL UNIQUE TWEETS: {len(unique)}")
print(f"{'='*80}\n")

# Strategy keywords to flag
STRATEGY_KEYWORDS = [
    'ema', 'pit session', 'trend day', 'taylor', 'buy day', 'sell day',
    'adx', 'holy grail', 'donchian', 'breakout', '55', 'outside day',
    'inside day', 'atr', '15 min', '15m', 'keltner', 'pullback',
    'mean revert', 'fade', 'no touch', 'reversion'
]

print("=== ALL STRATEGY-RELEVANT TWEETS ===\n")
strategy_tweets = []
for d, tid, text in unique:
    lower = text.lower()
    if any(kw in lower for kw in STRATEGY_KEYWORDS):
        strategy_tweets.append((d, tid, text))
        print(f"[{d}] https://x.com/LindaRaschke/status/{tid}")
        print(f"  >> {text}")
        print()

print(f"\n=== ALL OTHER TWEETS (non-strategy) ===\n")
for d, tid, text in unique:
    lower = text.lower()
    if not any(kw in lower for kw in STRATEGY_KEYWORDS):
        print(f"[{d}] {text}")
