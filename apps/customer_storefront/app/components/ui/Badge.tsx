import React, { type HTMLAttributes, type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'sale' | 'warning' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent';

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-warm-accent text-warm-accent-text hover:bg-warm-accent-hover',
    secondary: 'border border-warm-border bg-warm-surface text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent',
    outline: 'border border-warm-border text-warm-fg hover:bg-warm-surface',
    sale: 'product-badge-sale uppercase font-display font-black tracking-wide',
    warning: 'product-badge-warning uppercase font-display font-black tracking-wide',
    neutral: 'product-badge-neutral uppercase font-display font-black tracking-wide',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
