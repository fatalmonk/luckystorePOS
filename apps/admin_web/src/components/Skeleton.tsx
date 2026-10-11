import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Card skeleton loader - matches ProductCard dimensions
 * Use for inventory/product grid loading states
 */
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'bg-card rounded-md shadow-sm border border-border overflow-hidden',
        className
      )}
    >
      {/* Image area - 1:1 aspect ratio */}
      <Skeleton className="w-full aspect-square rounded-none" />
      
      {/* Content area */}
      <div className="p-3 flex flex-col gap-2">
        {/* Title */}
        <Skeleton className="h-4 w-3/4" />
        
        {/* Stock row */}
        <div className="flex items-center justify-between mt-1">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-4 w-12" />
        </div>
        
        {/* Button */}
        <Skeleton className="h-8 w-full mt-1" />
      </div>
    </div>
  );
};

/**
 * Table row skeleton for inventory list view
 */
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
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
    <div className="bg-card rounded-md shadow-sm border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="size-10 rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
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
  return <Skeleton className={cn('rounded', className)} />;
};
