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

        <div className="flex gap-3 overflow-x-auto py-4 px-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[72px] h-[72px] rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          ))}
        </div>

        <div className="px-3 sm:px-4 lg:px-6 py-4">
          <SkeletonGrid count={8} />
        </div>
      </main>
    </>
  );
}
