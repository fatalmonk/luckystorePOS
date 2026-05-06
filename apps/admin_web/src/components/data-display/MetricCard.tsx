import React from 'react';
import clsx from 'clsx';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  /** color variant: primary, secondary, tertiary, success, danger, warning, info, neutral */
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  /** visual variant: 'solid' fills background, 'light' uses subtle tinted background with colored text */
  variant?: 'solid' | 'light';
  /** optional badge text displayed next to the value */
  badge?: string;
  className?: string;
}

const SOLID_BG: Record<string, string> = {
  primary: 'bg-primary text-white',
  secondary: 'bg-secondary text-white',
  tertiary: 'text-white',
  success: 'bg-emerald-500 text-white',
  danger: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
  neutral: 'bg-white text-text-main',
};

const LIGHT_COLORS: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'rgba(79, 70, 229, 0.1)', text: 'var(--color-primary)' },
  secondary: { bg: 'rgba(109, 40, 217, 0.1)', text: 'var(--color-secondary)' },
  tertiary: { bg: 'rgba(168, 85, 247, 0.1)', text: 'var(--color-tertiary)' },
  success: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--color-success)' },
  danger: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--color-danger)' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--color-warning)' },
  info: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--color-info)' },
  neutral: { bg: 'transparent', text: 'var(--text-main)' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  variant = 'solid',
  badge,
  className,
}) => {
  const trendIcon =
    trend === 'up' ? (
      <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
    ) : trend === 'down' ? (
      <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    ) : null;

  if (variant === 'light') {
    const colors = LIGHT_COLORS[color] || LIGHT_COLORS.neutral;
    return (
      <div
        className={clsx('rounded-xl shadow-card p-4 flex items-center', className)}
        style={{ backgroundColor: colors.bg }}
      >
        {icon && <div className="mr-3">{icon}</div>}
        <div className="flex-1">
          <div className="text-sm font-medium text-text-muted">{title}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: colors.text }}>{value}</span>
            {badge && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}
              >
                {badge}
              </span>
            )}
          </div>
        </div>
        {trendIcon && <div className="ml-2">{trendIcon}</div>}
      </div>
    );
  }

  // solid variant (default)
  const bgClass = SOLID_BG[color] || SOLID_BG.primary;
  return (
    <div
      className={clsx('rounded-xl shadow-card p-4 flex items-center', bgClass, className)}
      style={color === 'tertiary' ? { backgroundColor: 'var(--color-tertiary)' } : undefined}
    >
      {icon && <div className="mr-3">{icon}</div>}
      <div className="flex-1">
        <div className="text-sm font-medium opacity-80">{title}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {badge && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
      {trendIcon && <div className="ml-2">{trendIcon}</div>}
    </div>
  );
};