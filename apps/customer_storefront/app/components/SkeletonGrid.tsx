'use client';

export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/5" />
        <div className="h-10 bg-gray-200 rounded-full animate-pulse mt-2" />
      </div>
    </div>
  );
}

export function SkeletonCardCompact() {
  return (
    <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="h-8 bg-gray-200 rounded-full animate-pulse mt-2 w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCarousel({ count = 4 }: { count?: number }) {
  return (
    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide scroll-edge-mask">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-40 sm:w-48 flex-shrink-0 snap-start">
          <SkeletonCardCompact />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <header className="sticky top-0 z-50 h-[68px] bg-[#FFF34D] border-b border-yellow-300 flex items-center px-4 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-white/50 animate-pulse" />
        <div className="w-32 h-6 bg-white/50 rounded animate-pulse hidden sm:block" />
      </div>
      <div className="flex-1 max-w-2xl mx-2">
        <div className="relative">
          <div className="w-full h-11 bg-white/50 rounded-full animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-white/50 animate-pulse" />
        <div className="w-10 h-10 rounded-lg bg-white/50 animate-pulse" />
      </div>
    </header>
  );
}

export function SkeletonCategoryGrid() {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask py-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 px-4 py-2 rounded-full bg-gray-200 animate-pulse"
          style={{ width: `${60 + Math.random() * 40}px` }}
        />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <section className="mx-4 my-2 rounded-xl overflow-hidden relative h-32 sm:h-40 bg-gray-200 animate-pulse" />
  );
}