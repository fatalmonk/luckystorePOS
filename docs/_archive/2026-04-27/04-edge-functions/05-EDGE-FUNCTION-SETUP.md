# Supabase Edge Function Setup Guide

## Prerequisites

- Supabase account and project created
- Supabase CLI installed
- Node.js 18+ installed
- Git repository initialized

---

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

---

## Step 3: Link Your Project

Get your project reference ID from Supabase dashboard → Settings → General

```bash
supabase link --project-ref <your-project-ref>
```

Example:
```bash
supabase link --project-ref abcdefghijklmnop
```

---

## Step 4: Initialize Functions Directory

```bash
supabase functions new import-inventory
```

This creates: `supabase/functions/import-inventory/`

---

## Step 5: Create Function File

Create/edit: `supabase/functions/import-inventory/index.ts`

Copy the Edge Function code from `docs/03-import-system/04-CSV-IMPORT-SETUP.md`

---

## Step 6: Configure Deno Dependencies

The function uses Deno's import system. Dependencies are imported via URLs:
- `@supabase/supabase-js` - Supabase client
- `xlsx` - Excel/CSV parsing
- Standard Deno HTTP server

No `package.json` needed - dependencies are in import statements.

---

## Step 7: Set Environment Variables

In Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secrets:
   - `SUPABASE_URL` (auto-set)
   - `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

Or set via CLI:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-key>
```

---

## Step 8: Test Locally (Optional)

```bash
supabase functions serve import-inventory
```

Test with curl:
```bash
curl -X POST http://localhost:54321/functions/v1/import-inventory \
  -H "Authorization: Bearer <anon-key>" \
  -F "file=@test.csv"
```

---

## Step 9: Deploy Function

```bash
supabase functions deploy import-inventory
```

Verify deployment:
- Check Supabase Dashboard → Edge Functions
- Function should appear in list

---

## Step 10: Get Function URL

After deployment, your function URL is:
```
https://<project-ref>.supabase.co/functions/v1/import-inventory
```

---

## Step 11: Test Deployed Function

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/import-inventory \
  -H "Authorization: Bearer <anon-key>" \
  -H "apikey: <anon-key>" \
  -F "file=@test.csv"
```

---

## Function Structure

```
supabase/
├─ functions/
│  └─ import-inventory/
│     └─ index.ts          (main function code)
├─ config.toml             (project config)
└─ .gitignore
```

---

## Common Issues & Solutions

### Issue: "Function not found"
**Solution:** Verify function is deployed and URL is correct

### Issue: "Unauthorized"
**Solution:** Check Authorization header includes valid JWT token

### Issue: "XLSX module not found"
**Solution:** Verify import URL is correct: `https://esm.sh/xlsx@0.18.5`

### Issue: "Service role key missing"
**Solution:** Set secret via dashboard or CLI

---

## Monitoring & Logs

View function logs:
```bash
supabase functions logs import-inventory
```

Or in Supabase Dashboard:
- Go to Edge Functions → import-inventory → Logs

---

## Updating Function

1. Edit `supabase/functions/import-inventory/index.ts`
2. Deploy: `supabase functions deploy import-inventory`
3. Function updates immediately (no downtime)

---

## Function Permissions

The function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.
- Use for admin operations only
- Secure the service role key
- Consider adding additional validation

---

## Next Steps

1. Deploy function
2. Test with sample CSV
3. Integrate with frontend
4. Set up error monitoring
5. Document API for team

