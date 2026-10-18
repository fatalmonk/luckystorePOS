# Typesafe Cookies — Cookbook

Verified from official Next.js source: `cookies()` from `next/headers`.

## Pattern

```typescript
import { cookies } from 'next/headers';

export async function getCookie() {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme');
  return theme?.value;
}
```

## Key Rules
- Async: `await cookies()` (Next.js v15+). Never call synchronously in production paths.
- Read (`.get()`, `.getAll()`, `.has()`) works in Server Components; `.set()` / `.delete()` requires Server Actions or Route Handlers (not render-time SC).
- Use `secure: true`, `httpOnly: true`, `sameSite` ('lax' / 'strict'), and `maxAge` / `expires` for security.

See Next.js docs: https://nextjs.org/docs/app/api-reference/functions/cookies
