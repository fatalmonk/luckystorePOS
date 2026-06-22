import { SkeletonHeader, SkeletonGrid } from '../components/SkeletonGrid';
import { BottomNav } from '../components/BottomNav';

export function CategoryShellSkeleton() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-5" />
          <SkeletonGrid count={8} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
