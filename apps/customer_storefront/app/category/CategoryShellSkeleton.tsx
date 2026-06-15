import { SkeletonHeader, SkeletonHero, SkeletonGrid } from '../components/SkeletonGrid';
import { PromoGridSkeleton } from '../components/PromoGrid';

export function CategoryShellSkeleton() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
        <SkeletonHero />
        <div className="mt-2">
          <PromoGridSkeleton />
        </div>

        <div className="px-3 sm:px-4 lg:px-6 py-2">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide scroll-edge-mask">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[44px] w-24 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>

        <div className="px-3 sm:px-4 lg:px-6 py-2">
          <div className="h-32 sm:h-40 rounded-xl bg-gray-200 animate-pulse mb-4" />
        </div>

        <div className="px-3 sm:px-4 lg:px-6 py-4">
          <SkeletonGrid count={8} />
        </div>
      </main>
    </>
  );
}
