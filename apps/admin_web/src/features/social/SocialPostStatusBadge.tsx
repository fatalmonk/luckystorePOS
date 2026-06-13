import { clsx } from 'clsx';

type PostStatus = 'draft' | 'pending' | 'published' | 'failed';

const STATUS_CONFIG: Record<PostStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-warm-muted/20 text-warm-muted' },
  pending: { label: 'Pending', classes: 'bg-warm-accent/20 text-warm-accent' },
  published: { label: 'Published', classes: 'bg-warm-success/15 text-warm-success' },
  failed: { label: 'Failed', classes: 'bg-warm-danger/10 text-warm-danger' },
};

interface SocialPostStatusBadgeProps {
  status: PostStatus;
}

export function SocialPostStatusBadge({ status }: SocialPostStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={clsx(
        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md',
        cfg.classes
      )}
    >
      {cfg.label}
    </span>
  );
}