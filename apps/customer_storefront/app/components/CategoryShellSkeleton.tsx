import { SkeletonHeader, SkeletonGrid } from '../components/SkeletonGrid';
import { BottomNav } from '../components/BottomNav';

export function CategoryShellSkeleton() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-8">
          <SkeletonGrid count={8} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
