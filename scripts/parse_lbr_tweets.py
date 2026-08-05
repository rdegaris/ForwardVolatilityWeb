import re

path = r'C:\Users\rdega\.gemini\antigravity\brain\f3ba7165-4f6a-472d-80ac-420f15d05103\.system_generated\steps\1743\content.md'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Extract tweet bodies
bodies = re.findall(r'itemProp="articleBody"[^>]*>.*?<span>(.*?)</span>', html, re.DOTALL)
dates_raw = re.findall(r'dateCreated" content="([\d\-T:\.Z]+)"', html)
ids_raw = re.findall(r'itemID="(\d+)"', html)

# Filter out profile-level date (first one is account creation)
tweet_dates = [d for d in dates_raw if '2009' not in d]

print(f"Found {len(bodies)} tweet bodies\n")
print("=" * 80)

for i, body in enumerate(bodies):
    text = re.sub(r'<[^>]+>', '', body).strip()
    if not text:
        continue
    d = tweet_dates[i] if i < len(tweet_dates) else "unknown"
    tid = ids_raw[i] if i < len(ids_raw) else ""
    print(f"[{d[:10]}] https://x.com/LindaRaschke/status/{tid}")
    print(f"  {text}")
    print()
