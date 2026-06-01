# Admin Portal Login Guide

## 🔗 Quick Access

| Environment | URL |
|-------------|-----|
| Vercel Deployed | `https://luckystore-admin.vercel.app` |
| Development | `http://localhost:5173` |
| Login Path | `/login` |

---

## 👤 Login Credentials

### Supabase Authentication (Not Hardcoded)

**Admin Portal uses Supabase Auth — passwords are NOT stored in code or `.env` files.**

| Email | Role | Created Via |
|-------|------|-------------|
| `mac@luckystore.com` | admin | Supabase Dashboard → Authentication → Users |
| `anwar@ktlbd.com` | admin | Supabase Dashboard → Authentication → Users |
| `admin@luckystore.com` | admin | Supabase Dashboard → Authentication → Users |

**Password:** Set during user creation in Supabase Dashboard. Not in repo.

---

## 🔧 How Users Are Created

### Method 1: Supabase Dashboard (Recommended)

1. Go to: https://hvmyxyccfnkrbxqbhlnm.supabase.co
2. Authentication → Users → Add User
3. Set email + password
4. Manually insert role in `public.users` table:
   ```sql
   INSERT INTO public.users (auth_id, email, role)
   VALUES ('AUTH-UID-HERE', 'user@email.com', 'admin');
   ```

### Method 2: SQL (Existing Auth User)

```sql
-- After auth user created via Supabase
INSERT INTO public.users (auth_id, email, role, full_name, store_id)
VALUES (
  'replace-with-auth-uid',
  'admin@luckystore.com',
  'admin',
  'Full Name',
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'  -- Lucky Store ID
);
```

---

## 🔐 Login Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ LoginPage   │────▶│ Supabase    │────▶│ users table │
│ /login      │     │ Auth        │     │ role check  │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Code:** `apps/admin_web/src/app/LoginPage.tsx`
```typescript
const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

---

## 📁 Where Roles Are Stored

### 1. Supabase Auth (auth.users)
- Email, password hash, metadata
- **Not in codebase** — managed via dashboard

### 2. App Users Table (public.users)

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id text REFERENCES auth.users(id),
  email text NOT NULL,
  role text CHECK (role IN ('admin','manager','cashier','stock')),
  store_id uuid REFERENCES stores(id),
  full_name text,
  created_at timestamptz DEFAULT now()
);
```

**Related:** `schema_dump.sql` line 5031

---

## ⚠️ Security Notes

- **No hardcoded passwords** in repo
- **No `.env.local` passwords** — file doesn't exist
- Users authenticate via Supabase Auth, not local DB passwords
  - See: `AuthContext.tsx` for session handling

---

## 🚨 Forgot Password?

1. **Supabase Dashboard** → Authentication → Users
2. Click user → Send Password Reset
3. Or: Use Supabase's built-in Password Reset email

**Contact:** System Admin (no self-service in app yet)

---

## 📊 Recent Users Activity

_Last checked: May 2026_

- 3 admin users configured
- No recent password changes in code
- Recent commit `ed94ca6`: "fix: 6 security violations" (not login-related)

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `apps/admin_web/src/app/LoginPage.tsx` | Login UI + form |
| `apps/admin_web/src/lib/AuthContext.tsx` | Session management |
| `docs/01-getting-started/QUICK-ACCESS.md` | Local dev URLs |
| `supabase/migrations/*create_users_table*` | DB schema |

---

**Last Updated:** May 21, 2026  
**Project:** Lucky Store POS (hvmyxyccfnkrbxqbhlnm)
