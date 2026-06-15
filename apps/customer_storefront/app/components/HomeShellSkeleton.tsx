import { SkeletonHeader, SkeletonHero, SkeletonCarousel } from './SkeletonGrid';
import { PromoGridSkeleton } from './updated/PromoGrid';

export function HomeShellSkeleton() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-8">
          {/* Delivery progress */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="w-1/3 bg-gray-200 h-2 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="flex gap-3 overflow-x-auto py-1 scrollbar-hide scroll-edge-mask">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          </div>

          <SkeletonHero />
          <PromoGridSkeleton />
          <SkeletonCarousel count={4} />

          {/* Trust reassurance */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
