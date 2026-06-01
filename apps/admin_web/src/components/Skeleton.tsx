import React from 'react';
import clsx from 'clsx';

/**
 * Card skeleton loader - matches ProductCard dimensions
 * Use for inventory/product grid loading states
 */
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={clsx(
        'bg-surface rounded-md shadow-level-1 border border-border-default overflow-hidden',
        className
      )}
    >
      {/* Image area - 1:1 aspect ratio */}
      <div className="relative w-full aspect-square bg-background-subtle animate-pulse" />
      
      {/* Content area */}
      <div className="p-3 flex flex-col gap-2">
        {/* Title */}
        <div className="h-4 bg-background-subtle rounded animate-pulse w-3/4" />
        
        {/* Stock row */}
        <div className="flex items-center justify-between mt-1">
          <div className="h-5 w-8 bg-background-subtle rounded animate-pulse" />
          <div className="h-4 w-12 bg-background-subtle rounded animate-pulse" />
        </div>
        
        {/* Button */}
        <div className="h-8 bg-background-subtle rounded animate-pulse mt-1" />
      </div>
    </div>
  );
};

/**
 * Table row skeleton for inventory list view
 */
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="border-b border-border-default">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-background-subtle rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
};

/**
 * Metric card skeleton for dashboard
 */
export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface rounded-md shadow-level-1 border border-border-default p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-md bg-background-subtle animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 bg-background-subtle rounded animate-pulse" />
        <div className="h-8 w-32 bg-background-subtle rounded animate-pulse" />
      </div>
    </div>
  );
};

/**
 * Grid of product card skeletons
 */
export const ProductCardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={clsx('bg-background-subtle animate-pulse rounded', className)} />;
};
