import React from 'react';
import clsx from 'clsx';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  /** color variant for the icon badge and accent */
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  /** optional badge text displayed next to the value */
  badge?: string;
  className?: string;
}

const COLOR_MAP: Record<string, { icon: string; value: string; badge: string }> = {
  primary:   { icon: 'bg-primary/10 text-primary',   value: 'text-primary',          badge: 'bg-primary/10 text-primary' },
  secondary: { icon: 'bg-secondary/10 text-secondary', value: 'text-secondary',      badge: 'bg-secondary/10 text-secondary' },
  success:   { icon: 'bg-success/10 text-success',   value: 'text-success-dark',     badge: 'bg-success/10 text-success-dark' },
  danger:    { icon: 'bg-danger/10 text-danger',     value: 'text-danger',           badge: 'bg-danger/10 text-danger' },
  warning:   { icon: 'bg-warning/10 text-warning-dark', value: 'text-warning-dark',  badge: 'bg-warning/10 text-warning-dark' },
  info:      { icon: 'bg-primary/10 text-primary',   value: 'text-primary',          badge: 'bg-primary/10 text-primary' },
  neutral:   { icon: 'bg-background text-text-secondary', value: 'text-text-primary', badge: 'bg-background text-text-secondary' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  badge,
  className,
}) => {
  const colors = COLOR_MAP[color] || COLOR_MAP.primary;

  const trendIcon =
    trend === 'up' ? (
      <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : trend === 'down' ? (
      <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : null;

  return (
    <div
      className={clsx(
        'bg-surface rounded-md border border-border-default shadow-level-1 p-4',
        'flex flex-col gap-3',
        'transition-shadow hover:shadow-level-2',
        className
      )}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <div className={clsx('w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0', colors.icon)}>
            {icon}
          </div>
        )}
        {trendIcon && <div>{trendIcon}</div>}
      </div>

      <div>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className={clsx('text-2xl font-bold font-mono', colors.value)}>{value}</span>
          {badge && (
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', colors.badge)}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};