import json, subprocess, os

token = os.environ.get("SUPABASE_TOKEN", "")
if not token:
    raise SystemExit("Set SUPABASE_TOKEN env var")
url = "https://api.supabase.com/v1/projects/hvmyxyccfnkrbxqbhlnm/database/query"
migrations_dir = "/Users/mac.alvi/Desktop/Projects/Lucky Store/supabase/migrations"

files = sorted([f for f in os.listdir(migrations_dir) if f.startswith("20260611")])

for fname in files:
    fpath = os.path.join(migrations_dir, fname)
    with open(fpath, "r") as f:
        sql = f.read()
    
    print("\n=== Running " + fname + " ===")
    auth_header = "Authorization: Bearer *** + token
    cmd = [
        "curl", "-s", "-X", "POST", url,
        "-H", auth_header,
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": sql})
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print(r.stdout[:500])
    if r.stderr:
        print("STDERR:", r.stderr[:200])
