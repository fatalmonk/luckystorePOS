'use client'; // animated skeleton placeholders with random widths (avoids hydration mismatch)

export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
      <div className="h-36 sm:h-40 lg:h-44 bg-gray-200 animate-pulse" />
      <div className="p-2.5 sm:p-3 space-y-1.5">
        <div className="h-7 bg-gray-200 rounded animate-pulse w-24" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-9 bg-gray-200 rounded-full animate-pulse mt-1" />
      </div>
    </div>
  );
}

export function SkeletonCardCompact() {
  return (
    <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
      <div className="h-36 sm:h-40 bg-gray-200 animate-pulse" />
      <div className="p-2.5 sm:p-3 space-y-1.5">
        <div className="h-5 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="h-9 bg-gray-200 rounded-full animate-pulse mt-1 w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        compact ? <SkeletonCardCompact key={i} /> : <SkeletonCard key={i} />
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
    <header className="sticky top-0 z-50 flex-shrink-0">
      <div className="h-[64px] bg-[#fffdf5] border-b border-[#e7e5e4] flex items-center px-4 gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#ffe302]/50 animate-pulse" />
          <div className="w-28 h-5 bg-gray-200 rounded animate-pulse hidden sm:block" />
        </div>
        <div className="flex-1 max-w-xl">
          <div className="w-full h-10 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
      <div className="h-[44px] bg-[#ffe302] flex items-center px-4 gap-2">
        <div className="w-16 h-6 rounded-full bg-white/50 animate-pulse" />
        <div className="w-20 h-6 rounded-full bg-white/50 animate-pulse" />
        <div className="w-14 h-6 rounded-full bg-white/50 animate-pulse" />
      </div>
    </header>
  );
}

export function SkeletonCategoryGrid() {
  const widths = [56, 68, 44, 72, 52, 80, 48, 64]; // deterministic widths — avoids hydration mismatch
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask py-2">
      {widths.map((w, i) => (
        <div
          key={i}
          className="flex-shrink-0 py-2 rounded-full bg-gray-200 animate-pulse"
          style={{ width: `${w}px` }}
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