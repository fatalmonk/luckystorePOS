# Supabase Credentials Reference

## ⚠️ SECURITY WARNING

**DO NOT commit this file or .env.local to git!**

This file contains sensitive credentials. Keep it secure.

---

## Project Information

- **Project Name:** Lucky Store (Production)
- **Project ID:** hvmyxyccfnkrbxqbhlnm
- **Project URL:** https://hvmyxyccfnkrbxqbhlnm.supabase.co
- **Region:** ap-northeast-1 (Asia Pacific - Tokyo)

---

## Frontend Credentials (Safe for Client-Side)

### Project URL
```
https://cckschiexzvysvdracvc.supabase.co
```

### Anon/Public Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3NjaGlleHp2eXN2ZHJhY3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDA3NjMsImV4cCI6MjA3ODk3Njc2M30.1htIKuXVNs9mtRSktS2cBk2QvAriXpYgipIYuVuI3T8
```

**Usage in React:**
```typescript
const supabaseUrl = 'https://cckschiexzvysvdracvc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

## Database Credentials (Server-Side Only)

### Connection String
```
postgresql://postgres.hvmyxyccfnkrbxqbhlnm:FsmHPpbIU4SYVPk2@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### Individual Values
- **Host:** aws-1-ap-northeast-1.pooler.supabase.com
- **Port:** 5432
- **Database:** postgres
- **User:** postgres.hvmyxyccfnkrbxqbhlnm
- **Password:** FsmHPpbIU4SYVPk2
- **Pool Mode:** session

**⚠️ NEVER use these in frontend code!**

---

## Service Role Key

**Get from:** Supabase Dashboard → Settings → API → service_role key

**⚠️ NEVER expose in frontend - server-side only!**

Used for:
- Edge Functions
- Admin operations
- Bypassing RLS (use carefully)

---

## Edge Function URLs

After deploying Edge Functions, they will be available at:

```
https://cckschiexzvysvdracvc.supabase.co/functions/v1/process-sale
https://cckschiexzvysvdracvc.supabase.co/functions/v1/import-inventory
```

---

## Environment Variables Setup

### For React App (.env.local)

```env
VITE_SUPABASE_URL=https://cckschiexzvysvdracvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_PROCESS_SALE_EDGE_URL=https://cckschiexzvysvdracvc.supabase.co/functions/v1/process-sale
VITE_IMPORT_INVENTORY_EDGE_URL=https://cckschiexzvysvdracvc.supabase.co/functions/v1/import-inventory
```

### For Node.js Scripts (.env)

```env
SUPABASE_DB_HOST=aws-1-ap-southeast-2.pooler.supabase.com
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.cckschiexzvysvdracvc
SUPABASE_DB_PASSWORD=wQsvALS1M4ELtE8s
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Quick Access Links

- **Dashboard:** https://app.supabase.com/project/cckschiexzvysvdracvc
- **API Docs:** https://app.supabase.com/project/cckschiexzvysvdracvc/api
- **SQL Editor:** https://app.supabase.com/project/cckschiexzvysvdracvc/sql
- **Storage:** https://app.supabase.com/project/cckschiexzvysvdracvc/storage
- **Edge Functions:** https://app.supabase.com/project/cckschiexzvysvdracvc/functions

---

## Security Best Practices

1. ✅ **DO** use anon key in frontend (it's safe)
2. ❌ **DON'T** use service role key in frontend
3. ❌ **DON'T** use database password in frontend
4. ✅ **DO** use environment variables
5. ✅ **DO** add .env.local to .gitignore
6. ❌ **DON'T** commit credentials to git
7. ✅ **DO** use RLS policies for security

---

## Getting Service Role Key

1. Go to Supabase Dashboard
2. Project Settings → API
3. Find "service_role" key (secret)
4. Copy and store securely
5. Use only in server-side code/Edge Functions

---

## Testing Connection

### Test from React App

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cckschiexzvysvdracvc.supabase.co',
  'your-anon-key'
)

// Test connection
const { data, error } = await supabase.from('items').select('count')
console.log('Connected:', !error)
```

### Test Database Connection

```bash
psql "postgresql://postgres.cckschiexzvysvdracvc:wQsvALS1M4ELtE8s@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
```

---

**Last Updated:** Credentials configured for Lucky Store project  
**Project ID:** cckschiexzvysvdracvc  
**Status:** Ready to use

