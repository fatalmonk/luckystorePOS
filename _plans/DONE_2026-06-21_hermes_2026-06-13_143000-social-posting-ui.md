# Social Media Posting UI Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a secure internal Facebook posting page to `admin_web` so the social media team can publish posts without handling tokens.

**Architecture:** A new Supabase Edge Function (`post-facebook`) holds the system user token server-side. The edge function derives a page access token via `/me/accounts`, publishes to the page, and logs the post. `admin_web` gets a protected page at `/social-post` with a text editor, preview, and post history fetched from a new `social_posts` table. Authentication uses existing `AuthContext`.

**Tech Stack:** React + TypeScript + Tailwind (`admin_web`), Supabase Edge Functions (Deno), existing `AuthContext`, existing warm design tokens.

---

## Assumptions verified

- `admin_web` uses `AuthContext` (`apps/admin_web/src/lib/AuthContext.tsx`) for session/profile; routes live in `apps/admin_web/src/app/App.tsx`.
- Edge functions live in `supabase/functions/` and use `serve` from Deno std.
- WhatsApp edge function (`supabase/functions/send-whatsapp-message/index.ts`) already shows the auth + logging pattern.
- Existing warm design token classes verified before implementation; invalid `border-warm-border-warm` corrected to `border-warm-border`, `bg-warm-bg` / `shadow-level-1` / color utility variants must be checked against `apps/admin_web/src/index.css` before use.

**Plan review fixes applied:** platform enum, NOT NULL tenant_id, anon-key auth client, admin client for writes, link URL validation, message whitespace normalization, CORS fallback to `luckystore1947.com`, Facebook page ID moved to env.

---

## Task 1: Database table for social post audit log

**Objective:** Create `social_posts` table to store every post attempt with metadata and status.

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_social_posts.sql`

**Step 1: Write migration**

```sql
CREATE TYPE social_platform AS ENUM ('facebook', 'instagram');

CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  platform social_platform NOT NULL DEFAULT 'facebook',
  content text NOT NULL,
  post_id text,
  status text NOT NULL CHECK (status IN ('pending', 'published', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_store_created
  ON social_posts(store_id, created_at DESC);

-- RLS: enable and restrict to authenticated users in same tenant
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts_tenant_isolation"
  ON social_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.tenant_id = social_posts.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.tenant_id = social_posts.tenant_id
    )
  );
```

**Step 2: Verify syntax locally**

Run: `npx supabase db reset --linked` (or apply via Mgmt API if CLI unavailable)
Expected: migration applies without errors.

**Step 3: Regenerate TypeScript types**

Run:
```bash
npx supabase gen types typescript --project-id hvmyxyccfnkrbxqbhlnm --schema public > apps/admin_web/src/lib/database.types.ts
```

Expected: `database.types.ts` updated to include `social_posts` and `social_platform` enum.

**Step 4: Commit**

```bash
git add supabase/migrations/YYYYMMDDHHMMSS_add_social_posts.sql apps/admin_web/src/lib/database.types.ts
git commit -m "feat(db): add social_posts audit table with RLS"
```
---

## Task 2: Edge function to publish Facebook posts

**Objective:** Create `supabase/functions/post-facebook/index.ts` that accepts `{ message, link? }`, validates the user, derives page token, posts, logs to `social_posts`, returns post ID.

**Files:**
- Create: `supabase/functions/post-facebook/index.ts`

**Step 1: Write edge function**

```typescript
// supabase/functions/post-facebook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const GRAPH_VERSION = 'v18.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://luckystore1947.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PostRequest {
  message: string
  link?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid Bearer token required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    let body: PostRequest
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const message = (body.message ?? '').trim().replace(/\s+/g, ' ')
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'message exceeds 5000 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (body.link) {
      let url: URL
      try {
        url = new URL(body.link.trim())
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid link URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return new Response(
          JSON.stringify({ success: false, error: 'Link must be http or https' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    const { data: profile, error: profileError } = await authClient
      .from('users')
      .select('id, tenant_id, store_id, role')
      .eq('auth_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const systemToken = Deno.env.get('FACEBOOK_SYSTEM_USER_TOKEN')
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID')

    if (!systemToken || !pageId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook integration not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Derive page access token from system user token
    const accountsRes = await fetch(
      `${GRAPH_BASE}/me/accounts?fields=id,name,access_token&access_token=${systemToken}`
    )
    const accountsData = await accountsRes.json()
    const page = accountsData?.data?.find((a: { id: string }) => a.id === pageId)

    if (!page?.access_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook page not accessible by system user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Insert pending audit row
    const { data: postRow, error: insertError } = await adminClient
      .from('social_posts')
      .insert({
        tenant_id: profile.tenant_id,
        store_id: profile.store_id,
        user_id: profile.id,
        platform: 'facebook',
        content: message,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError || !postRow) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create audit log' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Publish to Facebook
    const formData = new URLSearchParams()
    formData.set('message', message)
    formData.set('access_token', page.access_token)
    if (body.link) formData.set('link', body.link)

    const fbRes = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
      method: 'POST',
      body: formData,
    })
    const fbData = await fbRes.json()

    if (!fbRes.ok) {
      await adminClient
        .from('social_posts')
        .update({ status: 'failed', error_message: JSON.stringify(fbData) })
        .eq('id', postRow.id)

      return new Response(
        JSON.stringify({ success: false, error: fbData.error?.message || 'Facebook publish failed', detail: fbData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    await adminClient
      .from('social_posts')
      .update({ status: 'published', post_id: fbData.id })
      .eq('id', postRow.id)

    return new Response(
      JSON.stringify({ success: true, post_id: fbData.id, id: postRow.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('post-facebook error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

**Step 2: Add to `supabase/functions/deno.json` if needed**

Verify existing `deno.json` tasks. If edge functions are deployed individually, no change needed.

**Step 3: Commit**

```bash
git add supabase/functions/post-facebook/index.ts
git commit -m "feat(edge): add post-facebook edge function with audit log"
```

---

## Task 3: Configure Supabase secrets for edge function

**Objective:** Set `FACEBOOK_SYSTEM_USER_TOKEN` and `FACEBOOK_PAGE_ID` as Supabase secrets.

**Step 1: Set secrets**

Run:

```bash
supabase secrets set --env-file .env.local
# or explicitly:
supabase secrets set FACEBOOK_SYSTEM_USER_TOKEN=your_system_user_token FACEBOOK_PAGE_ID=your_facebook_page_id
```

Expected: both secrets stored in Supabase Vault.

**Step 2: Verify**

Run:

```bash
supabase secrets list
```

Expected: `FACEBOOK_SYSTEM_USER_TOKEN` and `FACEBOOK_PAGE_ID` listed.

**Step 3: Commit `.env.example` documentation only**

`apps/admin_web/.env.example` should include placeholders (do not commit real tokens):

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# Edge function secrets (server-side only)
FACEBOOK_SYSTEM_USER_TOKEN=your_system_user_token
FACEBOOK_PAGE_ID=your_facebook_page_id
# UI link to page
VITE_FACEBOOK_PAGE_ID=your_facebook_page_id
```

---

## Task 4: React page for composing posts

**Objective:** Create `apps/admin_web/src/features/social/SocialPostPage.tsx` with text editor, link input, character count, submit button, and recent posts list.

**Files:**
- Create: `apps/admin_web/src/features/social/SocialPostPage.tsx`
- Modify: `apps/admin_web/src/app/App.tsx:92` — add route
- Modify: `apps/admin_web/src/components/SidebarNew.tsx:97` — add nav item

**Step 1: Write page component**

```tsx
import React, { useState } from 'react';
import { Send, Link as LinkIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '@/lib/supabase';

const MAX_CHARS = 5000;

export function SocialPostPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-facebook`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: message.trim(), link: link.trim() || undefined }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish');
      }

      setResult({ type: 'success', text: `Published! Post ID: ${data.post_id}` });
      setMessage('');
      setLink('');
    } catch (err) {
      setResult({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-warm-fg mb-6">Social Post — Facebook</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-warm-surface border border-warm-border-warm rounded-xl p-5 shadow-level-1">
        <div>
          <label className="block text-xs font-semibold text-warm-muted mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
            rows={6}
            className="w-full rounded-lg border border-warm-border-warm bg-warm-bg p-3 text-sm text-warm-fg focus:outline-none focus:ring-2 focus:ring-warm-accent resize-none"
            placeholder="What's happening at Lucky Store?"
          />
          <div className={clsx('text-xs text-right mt-1', message.length > 4000 ? 'text-warm-danger' : 'text-warm-muted')}>
            {message.length}/{MAX_CHARS}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-muted mb-1.5">Link (optional)</label>
          <div className="flex items-center gap-2 rounded-lg border border-warm-border-warm bg-warm-bg px-3">
            <LinkIcon size={16} className="text-warm-muted" />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full bg-transparent py-2.5 text-sm text-warm-fg focus:outline-none"
              placeholder="https://luckystore1947.com/..."
            />
          </div>
        </div>

        {result && (
          <div className={clsx('flex items-start gap-2 rounded-lg p-3 text-sm', result.type === 'success' ? 'bg-warm-success/10 text-warm-success' : 'bg-warm-danger/10 text-warm-danger')}>
            {result.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{result.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !message.trim()}
          className={clsx('w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors', loading || !message.trim() ? 'bg-warm-accent/50 cursor-not-allowed' : 'bg-warm-accent hover:bg-warm-accent-light')}
        >
          <Send size={16} />
          {loading ? 'Publishing...' : 'Publish to Facebook'}
        </button>
      </form>

      {user?.name && (
        <p className="mt-4 text-xs text-warm-muted">Posting as {user.name}</p>
      )}
    </div>
  );
}
```

**Step 2: Add route in App.tsx**

After line 92 (after staff route):

```tsx
const LazySocialPostPage = React.lazy(() => import('../features/social/SocialPostPage').then(m => ({ default: m.SocialPostPage })));
```

Inside the `Layout` route:

```tsx
<Route path="social-post" element={<LazyRoute><LazySocialPostPage /></LazyRoute>} />
```

**Step 3: Add sidebar nav item**

In `apps/admin_web/src/components/SidebarNew.tsx` within the `system` group items:

```tsx
{ icon: Send, label: t('nav.socialPost', 'Social Post'), path: '/social-post' },
```

Import `Send` from `lucide-react`.

**Step 4: Add mobile bottom nav entry**

In `apps/admin_web/src/components/BottomNav.tsx`, add to `navItems`:

```tsx
import { Send } from 'lucide-react';

const navItems = [
  // ... existing items
  { icon: Send, label: 'Social', path: '/social-post' },
];
```

**Step 5: Run typecheck**

Run: `cd apps/admin_web && npm run build` (or `npx tsc -p tsconfig.app.json --noEmit`)
Expected: no TS errors.

**Step 5: Commit**

```bash
git add apps/admin_web/src/features/social/SocialPostPage.tsx apps/admin_web/src/app/App.tsx apps/admin_web/src/components/SidebarNew.tsx
git commit -m "feat(admin): add social post composer page"
```

---

## Task 5: Post history list on the same page

**Objective:** Fetch and display recent `social_posts` rows beneath the composer.

**Files:**
- Modify: `apps/admin_web/src/features/social/SocialPostPage.tsx`

**Step 1: Add history query**

At top of component add:

```tsx
import { useEffect, useState } from 'react';

interface SocialPost {
  id: string;
  content: string;
  status: 'pending' | 'published' | 'failed';
  post_id: string | null;
  error_message: string | null;
  created_at: string;
}
```

Inside component:

```tsx
const [history, setHistory] = useState<SocialPost[]>([]);
const [historyLoading, setHistoryLoading] = useState(false);

const fetchHistory = async () => {
  setHistoryLoading(true);
  const { data, error } = await supabase
    .from('social_posts')
    .select('id, content, status, post_id, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (!error && data) setHistory(data as SocialPost[]);
  setHistoryLoading(false);
};

useEffect(() => { fetchHistory(); }, []);
```

Call `fetchHistory()` after successful publish.

**Step 2: Render history**

```tsx
<div className="mt-8">
  <h2 className="text-sm font-bold text-warm-fg mb-3">Recent posts</h2>
  {historyLoading ? (
    <p className="text-sm text-warm-muted">Loading...</p>
  ) : history.length === 0 ? (
    <p className="text-sm text-warm-muted">No posts yet.</p>
  ) : (
    <div className="space-y-3">
      {history.map((post) => (
        <div key={post.id} className="bg-warm-surface border border-warm-border-warm rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={clsx('text-xs font-bold uppercase', post.status === 'published' ? 'text-warm-success' : post.status === 'failed' ? 'text-warm-danger' : 'text-warm-muted')}>
              {post.status}
            </span>
            <span className="text-xs text-warm-muted">{new Date(post.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-warm-fg whitespace-pre-wrap line-clamp-4">{post.content}</p>
          {post.post_id && (
            <a href={`https://www.facebook.com/${import.meta.env.VITE_FACEBOOK_PAGE_ID}/posts/${post.post_id.split('_')[1]}`} target="_blank" rel="noreferrer" className="text-xs text-warm-accent hover:underline mt-2 inline-block">
              View on Facebook
            </a>
          )}
          {post.error_message && (
            <p className="text-xs text-warm-danger mt-2">{post.error_message}</p>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

**Step 3: Typecheck + commit**

Run: `cd apps/admin_web && npm run build`
Expected: pass.

```bash
git add apps/admin_web/src/features/social/SocialPostPage.tsx
git commit -m "feat(admin): show social post history"
```

---

## Task 6: Permission gating (optional but recommended)

**Objective:** Restrict social posting to users with `manager`/`owner` role.

**Files:**
- Modify: `apps/admin_web/src/features/social/SocialPostPage.tsx`

**Step 1: Check role**

```tsx
const { user } = useAuth();
const canPost = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';
```

At top of rendered form:

```tsx
if (!canPost) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-warm-danger/10 text-warm-danger rounded-xl p-5 text-sm">
        You do not have permission to publish social posts.
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin_web/src/features/social/SocialPostPage.tsx
git commit -m "feat(admin): gate social posting by role"
```

---

## Task 7: End-to-end verification

**Step 1: Deploy edge function**

Run:

```bash
supabase functions deploy post-facebook
```

Expected: function deployed, URL printed.

**Step 2: Run admin_web dev**

```bash
cd apps/admin_web
npm run dev
```

**Step 3: Log in + navigate to `/social-post`**

Expected: composer renders, history loads.

**Step 4: Submit a test post**

Expected: success toast/alert, row inserted in `social_posts` with status `published`, post appears on Facebook page.

**Step 5: Verify audit log**

Run SQL:

```sql
SELECT id, content, status, post_id, created_at
FROM social_posts
ORDER BY created_at DESC
LIMIT 5;
```

Expected: recent row with `status = 'published'` and `post_id` set.

---

## Risks, tradeoffs, and open questions

| Risk | Mitigation |
|------|------------|
| System user token stored in Supabase secrets is powerful | Keep only `pages_manage_posts`; rotate quarterly; restrict edge function to authenticated users |
| Post content abuse | Rate limit per user; role gating; audit log |
| Edge function call from browser exposes URL | Requires valid Supabase JWT; CORS restricted to ALLOWED_ORIGIN |
| Long-term token expiry | System user tokens expire ~60 days; set calendar reminder or use non-expiring token from BM |
| No image/video upload yet | Phase 2: add `photoUrl`/`videoUrl` and signed upload to Supabase Storage |

**Open questions:**
1. Should we add role `social_media_manager` to `users.role` enum, or reuse `manager`?
2. Should posts be scheduled (queue table + cron), or publish immediately only?
3. Should we cross-post to Instagram from the same UI? (requires `instagram_content_publish` scope, which system user already has)

---

Plan saved and ready for execution.
