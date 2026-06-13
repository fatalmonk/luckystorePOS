import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { SocialPostStatusBadge } from './SocialPostStatusBadge';

type PostStatus = 'draft' | 'pending' | 'published' | 'failed';

interface SocialPostHistoryItemProps {
  id: string;
  content: string;
  link: string | null;
  status: PostStatus;
  post_id: string | null;
  created_at: string;
  fbPageId: string | undefined;
}

export function SocialPostHistoryItem({
  id,
  content,
  link,
  status,
  post_id,
  created_at,
  fbPageId,
}: SocialPostHistoryItemProps) {
  return (
    <div key={id} className="bg-warm-surface border border-warm-border-warm rounded-xl p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <SocialPostStatusBadge status={status} />
        <span className="text-[11px] text-warm-muted">
          {formatDistanceToNow(parseISO(created_at), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm text-warm-fg whitespace-pre-wrap">{content}</p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-warm-accent hover:underline"
        >
          <ExternalLink size={12} />
          {link}
        </a>
      )}
      {status === 'published' && fbPageId && post_id && (
        <a
          href={`https://facebook.com/${post_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-warm-accent hover:underline"
        >
          <ExternalLink size={12} />
          View on Facebook
        </a>
      )}
    </div>
  );
}