import { SkeletonHeader, SkeletonHero, SkeletonGrid } from '../components/SkeletonGrid';
import { PromoGridSkeleton } from '../components/PromoGrid';

export function CategoryShellSkeleton() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
          <div className="flex gap-6 lg:gap-8">
            <div className="hidden lg:block w-60 flex-shrink-0">
              <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-5" />
              <SkeletonGrid count={8} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
