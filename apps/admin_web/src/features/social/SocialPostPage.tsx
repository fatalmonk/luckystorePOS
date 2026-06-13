import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { SkeletonCard, ErrorState } from '../../components/PageState';
import { Send, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { SocialPostHistoryItem } from './SocialPostHistoryItem';

const ALLOWED_ROLES = new Set(['owner', 'manager', 'admin']);

type PostStatus = 'draft' | 'pending' | 'published' | 'failed';

interface SocialPost {
  id: string;
  tenant_id: string;
  store_id: string;
  user_id: string | null;
  platform: string;
  content: string;
  link: string | null;
  status: PostStatus;
  post_id: string | null;
  created_at: string;
  updated_at: string;
}

function useCanPost() {
  const { user } = useAuth();
  return !!user?.role && ALLOWED_ROLES.has(user.role);
}

export function SocialPostPage() {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const canPost = useCanPost();

  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const maxChars = 5000;

  // ─── Fetch post history ───
  const {
    data: history = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<SocialPost[]>({
    queryKey: ['social-posts', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('social_posts')
        .select('id, tenant_id, store_id, user_id, platform, content, link, status, post_id, created_at, updated_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as SocialPost[];
    },
    enabled: !!storeId,
  });

  // ─── Publish mutation ───
  const publishMutation = useMutation({
    mutationFn: async ({ text, url }: { text: string; url?: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-facebook`;
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text, link: url || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      setResult({ type: 'success', message: 'Post published successfully!' });
      setContent('');
      setLink('');
      queryClient.invalidateQueries({ queryKey: ['social-posts', storeId] });
    },
    onError: (err: Error) => {
      setResult({ type: 'error', message: err.message || 'Failed to publish post.' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      notify('Post content cannot be empty.', 'error');
      return;
    }
    setResult(null);
    publishMutation.mutate({ text: content.trim(), url: link.trim() || undefined });
  };

  const fbPageId = import.meta.env.VITE_FACEBOOK_PAGE_ID;

  return (
    <div className="space-y-6">
      <PageHeader title="Social Post" subtitle="Publish updates to your Facebook page and view post history." />

      {/* Permission gate */}
      {!canPost && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warm-danger/10 text-warm-danger border border-warm-border-warm">
          <AlertCircle size={20} />
          <p className="text-sm font-semibold">
            You do not have permission to publish social posts. Only owners, managers, and admins can post.
          </p>
        </div>
      )}

      {/* Composer form */}
      {canPost && (
        <form onSubmit={handleSubmit} className="bg-warm-surface border border-warm-border-warm rounded-xl p-4 space-y-4 shadow-sm">
          {result && (
            <div
              className={clsx(
                'flex items-center gap-2 p-3 rounded-lg text-sm font-semibold',
                result.type === 'success'
                  ? 'bg-warm-success/15 text-warm-success'
                  : 'bg-warm-danger/10 text-warm-danger'
              )}
            >
              {result.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {result.message}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="post-content" className="text-xs font-bold text-warm-fg uppercase tracking-wider">
              Post Content
            </label>
            <textarea
              id="post-content"
              rows={5}
              maxLength={maxChars}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to share?"
              className="w-full rounded-lg bg-warm-bg border border-warm-border-warm p-3 text-sm text-warm-fg placeholder:text-warm-muted focus:outline-none focus:ring-2 focus:ring-warm-accent resize-none"
            />
            <div className="flex justify-end">
              <span
                className={clsx(
                  'text-xs font-medium',
                  content.length >= maxChars ? 'text-warm-danger' : 'text-warm-muted'
                )}
              >
                {content.length} / {maxChars}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post-link" className="text-xs font-bold text-warm-fg uppercase tracking-wider">
              Link <span className="text-warm-muted font-normal normal-case">(optional)</span>
            </label>
            <input
              id="post-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg bg-warm-bg border border-warm-border-warm p-3 text-sm text-warm-fg placeholder:text-warm-muted focus:outline-none focus:ring-2 focus:ring-warm-accent"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={publishMutation.isPending || !content.trim()}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors',
                publishMutation.isPending || !content.trim()
                  ? 'bg-warm-border-warm text-warm-muted cursor-not-allowed'
                  : 'bg-warm-accent text-white hover:bg-warm-accent-light shadow-sm'
              )}
            >
              <Send size={16} />
              {publishMutation.isPending ? 'Publishing…' : 'Publish to Facebook'}
            </button>
          </div>
        </form>
      )}

      {/* Post history */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-warm-fg uppercase tracking-wider">Recent Posts</h2>

        {isLoading && (
          <div className="grid gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {isError && <ErrorState message="Failed to load post history." onRetry={refetch} />}

        {!isLoading && !isError && history.length === 0 && (
          <p className="text-sm text-warm-muted">No posts yet.</p>
        )}

        {!isLoading &&
          !isError &&
          history.map((post) => (
            <SocialPostHistoryItem
              key={post.id}
              id={post.id}
              content={post.content}
              link={post.link}
              status={post.status}
              post_id={post.post_id}
              created_at={post.created_at}
              fbPageId={fbPageId}
            />
          ))}
      </div>
    </div>
  );
}
