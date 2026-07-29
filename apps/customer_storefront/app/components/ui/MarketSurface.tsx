import React, { type HTMLAttributes, type ReactNode } from 'react';

type MarketTone = 'night' | 'accent' | 'paper';
type StockState = 'available' | 'limited' | 'unavailable';

interface MarketPanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tone?: MarketTone;
}

/**
 * Shared top-level merchandising container. Tone changes material, while the
 * edge treatment keeps campaign, catalog, and offer regions in one visual world.
 */
export function MarketPanel({
  children,
  tone = 'paper',
  className = '',
  ...props
}: MarketPanelProps) {
  return (
    <section
      data-market-tone={tone}
      className={`market-panel ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

interface MarketCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  stockState?: StockState;
  interactive?: boolean;
}

/**
 * Reusable merchandise surface with a compact stock-state edge. Interaction
 * changes border and shadow only, so dense grids remain stable.
 */
export function MarketCard({
  children,
  stockState = 'available',
  interactive = false,
  className = '',
  ...props
}: MarketCardProps) {
  return (
    <div
      data-stock-state={stockState}
      data-interactive={interactive || undefined}
      className={`market-product-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
