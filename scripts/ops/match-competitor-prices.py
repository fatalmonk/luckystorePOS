#!/usr/bin/env python3
"""
Match competitor prices to inventory items using strict fuzzy matching.
Requires brand + product words to overlap, not just any word.
"""
import json, subprocess, re, sys

SUPABASE_URL = "https://hvmyxyccfnkrbxqbhlnm.supabase.co"

with open("/Users/mac.alvi/Desktop/Projects/Lucky Store/.env") as f:
    for line in f:
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            KEY = line.split("=", 1)[1].strip().strip('"')
            break

def curl_get(url):
    r = subprocess.run(["curl", "-s", url, "-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {KEY}"], capture_output=True, text=True)
    return json.loads(r.stdout)

def curl_patch(url, body):
    r = subprocess.run(["curl", "-s", "-X", "PATCH", url, "-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {KEY}",
        "-H", "Content-Type: application/json", "-H", "Prefer: return=minimal", "-d", json.dumps(body)], capture_output=True, text=True)
    return r.returncode == 0, r.stdout

def normalize(name):
    n = name.lower()
    n = re.sub(r'[^a-z0-9\s]', ' ', n)
    return re.sub(r'\s+', ' ', n).strip()

def tokenize(name):
    """Extract meaningful tokens, removing packaging/unit words"""
    n = normalize(name)
    # Words that describe packaging/units, not the product itself
    stop = {'gm','g','kg','ml','l','pcs','pc','pack','pk','loose','piece','pieces',
            'box','bottle','bag','free','with','the','and','of','a','an','jar',
            'cup','tin','can','pouch','sachet','dozen','dz','pack','combo',
            'big','small','mini','jumbo','family','party','value','economy',
            'original','classic','premium','special','new','mega','super'}
    words = [w for w in n.split() if w not in stop and len(w) > 1]
    return words

def match_score(comp_tokens, item_tokens):
    """
    Score match between competitor and inventory tokens.
    Returns 0 if no match, higher = better match.
    Requires at least 2 meaningful word overlaps.
    """
    comp_set = set(comp_tokens)
    item_set = set(item_tokens)
    if not comp_set or not item_set:
        return 0
    
    common = comp_set & item_set
    if len(common) < 2:
        return 0
    
    # Score: fraction of the shorter token list that matches
    overlap = len(common) / min(len(comp_set), len(item_set))
    
    # Penalize if the match is only on very short/common brand words
    # Bonus if brand name matches (first token is usually brand)
    brand_match = 0
    if comp_tokens and item_tokens:
        if comp_tokens[0] == item_tokens[0]:
            brand_match = 0.2
    
    return overlap + brand_match

# 1. Fetch inventory
print("Fetching inventory...")
items = curl_get(f"{SUPABASE_URL}/rest/v1/items?select=id,name,price,sku&limit=1000")
print(f"  {len(items)} items")

# Build token index
items_tokens = []
for item in items:
    tokens = tokenize(item["name"])
    items_tokens.append((item, tokens, set(tokens)))

print(f"  Tokenized {len(items_tokens)} items")

# 2. Fetch competitor prices
print("\nFetching competitor prices...")
# Get total
r = subprocess.run(["curl", "-s", f"{SUPABASE_URL}/rest/v1/competitor_prices?select=id&limit=1",
    "-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {KEY}", "-H", "Prefer: count=exact", "-I"], capture_output=True, text=True)
total = 0
for line in r.stdout.split('\n'):
    if 'content-range' in line.lower():
        total = int(line.split('/')[-1].strip())
print(f"  Total: {total}")

all_cp = []
for off in range(0, total, 500):
    r = subprocess.run(["curl", "-s", f"{SUPABASE_URL}/rest/v1/competitor_prices?select=id,product_name,competitor_name,competitor_price,item_id",
        "-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {KEY}", "-H", f"Range: {off}-{off+499}"], capture_output=True, text=True)
    try:
        batch = json.loads(r.stdout)
        if isinstance(batch, list):
            all_cp.extend(batch)
    except:
        pass

unmatched_list = [cp for cp in all_cp if cp.get("item_id") is None]
print(f"  Fetched: {len(all_cp)}, Unmatched: {len(unmatched_list)}")

# 3. Match with strict scoring
print("\nMatching...")
matched = 0
unmatched_count = 0
updates = []

MIN_SCORE = 0.65

for cp in unmatched_list:
    comp_tokens = tokenize(cp["product_name"])
    best_match = None
    best_score = 0
    
    for item, item_toks, item_set in items_tokens:
        score = match_score(comp_tokens, item_toks)
        if score > best_score:
            best_score = score
            best_match = item
    
    if best_match and best_score >= MIN_SCORE:
        matched += 1
        our_price = float(best_match["price"]) if best_match.get("price") else None
        comp_price = float(cp["competitor_price"]) if cp.get("competitor_price") else None
        updates.append((cp["id"], best_match["id"], best_match["name"], our_price, comp_price, cp["product_name"], cp["competitor_name"], best_score))
    else:
        unmatched_count += 1

pct = matched * 100 // len(unmatched_list) if unmatched_list else 0
print(f"  Matched: {matched}/{len(unmatched_list)} ({pct}%) [min_score={MIN_SCORE}]")
print(f"  Unmatched: {unmatched_count}")

# Show all matches
print("\nAll matches:")
for cp_id, item_id, item_name, our_p, comp_p, comp_name, comp_src, score in sorted(updates, key=lambda x: -x[7]):
    gap = f"{(our_p-comp_p)/comp_p*100:+.0f}%" if our_p and comp_p else "?"
    print(f"  [{score:.2f}] {item_name[:30]:30s} ৳{our_p:>7} | {comp_name[:30]:30s} ৳{comp_p:>7} {gap:>6s} ({comp_src})")

# 4. Update DB
print(f"\nUpdating {len(updates)} rows...")
updated = 0
errors = 0
for cp_id, item_id, item_name, our_price, comp_price, comp_name, comp_src, score in updates:
    body = {"item_id": item_id}
    if our_price:
        body["our_price"] = our_price
    if our_price and comp_price:
        body["price_gap_percent"] = round((our_price - comp_price) / comp_price, 4)
    ok, resp = curl_patch(f"{SUPABASE_URL}/rest/v1/competitor_prices?id=eq.{cp_id}", body)
    if ok:
        updated += 1
    else:
        errors += 1
        if errors <= 3:
            print(f"  ERROR: {resp[:100]}")

print(f"\nDONE: updated={updated}, errors={errors}")