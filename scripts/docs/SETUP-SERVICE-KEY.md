# Setting Up Service Role Key - Secure Storage

## 📍 Where to Store It

Create a `.env` file in the **project root** (same level as `package.json`):

```
Lucky Store/
├── .env                    ← Create this file here
├── .gitignore             ← Already ignores .env
├── package.json
└── scripts/
```

## 📝 Format

The `.env` file should contain:

```env
SUPABASE_SERVICE_ROLE_KEY=your-full-service-role-key-here
```

## 🔑 How to Get the Key

1. Go to: https://app.supabase.com/project/cckschiexzvysvdracvc/settings/api
2. Scroll to **Project API keys**
3. Find the **`service_role`** key (it's marked as "secret")
4. Click **Reveal** or **Copy** to get the full key
5. The key should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long)

## ✅ Example .env File

```env
# Supabase Service Role Key (Server-Side Only)
# ⚠️ NEVER commit this file to git!
# Get from: Supabase Dashboard → Settings → API → service_role key


```

## 🔒 Security

- ✅ `.env` is already in `.gitignore` - it won't be committed
- ✅ Never share this key publicly
- ✅ Only use in server-side scripts (not frontend)
- ✅ The key has full database access - keep it secret!

## 🧪 Test It

After creating `.env` with your key, test the import:

```bash
node scripts/import-competitor-data.js
```

If you see "Invalid API key", double-check:
1. The key is the **full** service_role key (starts with `eyJ`)
2. No extra spaces or quotes around the key
3. The `.env` file is in the project root

## 📋 Quick Setup

1. Create `.env` file:
   ```bash
   touch .env
   ```

2. Add your key:
   ```bash
   echo "SUPABASE_SERVICE_ROLE_KEY=your-key-here" >> .env
   ```

3. Or edit manually:
   ```bash
   nano .env
   # or
   code .env
   ```

## ⚠️ Important Notes

- The service role key is **different** from the anon key
- Service role key: Full access, bypasses RLS (server-side only)
- Anon key: Limited access, respects RLS (safe for frontend)
- Never use service role key in frontend code!

