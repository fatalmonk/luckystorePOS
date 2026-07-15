import React from 'react';
import { clsx } from "clsx";

export interface FinanceMetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  trendLabel?: string;
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  className?: string;
}

const COLOR_MAP: Record<string, { icon: string; value: string }> = {
  primary:   { icon: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',   value: 'text-[var(--color-accent)]' },
  secondary: { icon: 'bg-[var(--color-secondary-default)]/10 text-[var(--color-secondary-default)]',   value: 'text-[var(--color-secondary-default)]' },
  tertiary:  { icon: 'bg-[var(--color-secondary-default)]/10 text-[var(--color-secondary-default)]',   value: 'text-[var(--color-secondary-default)]' },
  success:   { icon: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',   value: 'text-[var(--color-success)]' },
  danger:    { icon: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',   value: 'text-[var(--color-danger)]' },
  warning:   { icon: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',   value: 'text-[var(--color-warning)]' },
  info:      { icon: 'bg-[var(--color-info-default)]/10 text-[var(--color-info-default)]',   value: 'text-[var(--color-info-default)]' },
  neutral:   { icon: 'bg-[var(--color-border)] text-[var(--color-muted)]',         value: 'text-[var(--color-foreground)]' },
};

export const FinanceMetricCard: React.FC<FinanceMetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'primary',
  className,
}) => {
  const colors = COLOR_MAP[color] || COLOR_MAP.primary;

  const trendIcon =
    trend === 'up' ? (
      <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : trend === 'down' ? (
      <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : null;

  const renderValue = () => {
    if (typeof value === 'string' || typeof value === 'number') {
      return (
        <span className={clsx('text-2xl font-bold font-mono', colors.value)}>
          {value}
        </span>
      );
    }
    return value;
  };

  return (
    <div
      className={clsx(
        'bg-[var(--color-paper)] rounded-[1.25rem] p-1.5 border border-[var(--color-border)]',
        'hover:border-[var(--color-accent)]/30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        className
      )}
    >
      <div className="bg-[var(--color-surface)] rounded-[calc(1.25rem-0.375rem)] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between mb-3">
          {icon && (
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors.icon)}>
              {icon}
            </div>
          )}
          {trendLabel && (
            <div className={clsx(
              'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
              trend === 'up' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
            )}>
              {trendIcon}
              <span>{trendLabel}</span>
            </div>
          )}
          {!trendLabel && trendIcon && <div>{trendIcon}</div>}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            {renderValue()}
          </div>
        </div>
      </div>
    </div>
  );
};
