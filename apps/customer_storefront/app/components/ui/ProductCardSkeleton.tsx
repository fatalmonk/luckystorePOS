'use client';

export function ProductCardSkeleton() {
  return (
    <div 
      className="bg-warm-surface border border-warm-border rounded-[20px] overflow-hidden flex flex-col h-full animate-pulse p-0 shadow-warm-sm"
      aria-label="Loading product..."
    >
      {/* Image Skeleton */}
      <div className="w-full aspect-[4/3] bg-warm-border/40 shrink-0" />

      {/* Content Skeleton */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-2">
          {/* Price line skeleton */}
          <div className="h-5 bg-warm-border/50 rounded-md w-1/2" />
          
          {/* Unit / Savings line skeleton */}
          <div className="h-3 bg-warm-border/30 rounded w-1/3" />
          
          {/* Product Title skeleton (2 lines) */}
          <div className="space-y-1 pt-1">
            <div className="h-3.5 bg-warm-border/40 rounded w-full" />
            <div className="h-3.5 bg-warm-border/30 rounded w-4/5" />
          </div>
        </div>

        {/* Add to Cart button skeleton */}
        <div className="pt-2 mt-auto">
          <div className="h-10 bg-warm-border/50 rounded-full w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
