import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

/* ============================================================
   Shared page-state components using Tailwind + CSS vars.
   No inline styles — all styling via utility classes + CSS custom
   properties defined in tokens.css / components.css.
   ============================================================ */

// ── Empty State ──────────────────────────────────────────────
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="page-state-root">
      <div className="page-state-icon">{icon}</div>
      <p className="page-state-title">{title}</p>
      {description && <p className="page-state-desc">{description}</p>}
      {action}
    </div>
  );
}

// ── Error State ──────────────────────────────────────────────
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="page-state-root page-state-error">
      <AlertCircle size={48} className="page-state-icon-el" />
      <p className="page-state-title">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="page-state-retry-btn">
          <RefreshCw size={14} /> Try Again
        </button>
      )}
    </div>
  );
}

// ── Skeleton primitives ──────────────────────────────────────
/** Generic animated skeleton block. Width/height set via Tailwind on usage. */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-block ${className}`} />;
}

/** Stat-card skeleton — for dashboard-style metric cards. */
export function SkeletonCard() {
  return (
    <div className="card flex flex-col gap-2">
      <SkeletonBlock className="w-3/5 h-3.5" />
      <SkeletonBlock className="w-2/5 h-6" />
    </div>
  );
}

/** Table-row skeleton — cols controls number of <td>s. */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-[var(--border-color)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonBlock
            className={
              i === 0
                ? 'w-[150px] h-[18px]'
                : i < cols - 1
                  ? 'w-[90px] h-[18px]'
                  : 'w-[60px] h-[18px]'
            }
          />
        </td>
      ))}
    </tr>
  );
}

/** Full-width skeleton line for flexible usage. */
export function SkeletonLine({ className = '' }: { className?: string }) {
  return <SkeletonBlock className={`h-[18px] ${className}`} />;
}

/** Skeleton for a single list item row (reminders-style). */
export function SkeletonListItem() {
  return <SkeletonBlock className="h-[72px] w-full rounded-lg" />;
}