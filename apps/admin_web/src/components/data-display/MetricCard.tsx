import React from 'react';
import clsx from 'clsx';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  /** color variant: primary, secondary, tertiary, success, danger, warning, info */
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary',
}) => {
  const bgClass = {
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    tertiary: 'text-white',
    success: 'bg-emerald-500 text-white',
    danger: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white',
  }[color];

  const trendIcon =
    trend === 'up' ? (
      <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
    ) : trend === 'down' ? (
      <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    ) : null;

  return (
    <div
      className={clsx('rounded-xl shadow-card p-4 flex items-center', bgClass)}
      style={color === 'tertiary' ? { backgroundColor: 'var(--color-tertiary)' } : undefined}
    >
      {icon && <div className="mr-3">{icon}</div>}
      <div className="flex-1">
        <div className="text-sm font-medium opacity-80">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
      {trendIcon && <div className="ml-2">{trendIcon}</div>}
    </div>
  );
};
