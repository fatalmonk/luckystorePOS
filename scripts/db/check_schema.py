import json, subprocess, os

token = os.environ.get("SUPABASE_TOKEN", "")
if not token:
    raise SystemExit("Set SUPABASE_TOKEN env var")
queries = [
    ("search_items_pos_all", "SELECT proname, proargnames, proargtypes::regtype::text as arg_types FROM pg_proc WHERE proname = 'search_items_pos';"),
    ("items_more_cols", "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'items' AND table_schema = 'public' ORDER BY ordinal_position;"),
    ("stock_levels_cols", "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stock_levels' AND table_schema = 'public' ORDER BY ordinal_position;"),
    ("categories_more", "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories' AND table_schema = 'public' ORDER BY ordinal_position;"),
    ("wishlist_check", "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlist';"),
    ("items_image_url", "SELECT column_name FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'image_url';"),
]

for name, query in queries:
    cmd = [
        'curl', '-s', '-X', 'POST',
        'https://api.supabase.com/v1/projects/hvmyxyccfnkrbxqbhlnm/database/query',
        '-H', 'Authorization: Bearer *** + token,
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({"query": query})
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print('\n=== {} ==='.format(name))
    print(r.stdout[:1000])
