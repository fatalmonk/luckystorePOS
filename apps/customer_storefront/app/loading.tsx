import { SkeletonHeader } from './components/SkeletonGrid';

export default function RootLoading() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Hero banner skeleton */}
          <div className="h-32 sm:h-40 bg-warm-border-light rounded-xl animate-pulse" />

          {/* Category pills skeleton */}
          <div className="flex gap-3 overflow-x-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-16 h-16 rounded-2xl bg-warm-border-light animate-pulse" />
            ))}
          </div>

          {/* Product carousel skeleton */}
          <div className="bg-warm-surface rounded-2xl p-4 border border-warm-border shadow-warm-sm">
            <div className="h-6 w-32 bg-warm-border-light rounded animate-pulse mb-4" />
            <div className="flex gap-4 overflow-x-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-40 sm:w-48 flex-shrink-0">
                  <div className="h-32 bg-warm-border-light rounded-[14px] animate-pulse mb-2" />
                  <div className="h-4 w-20 bg-warm-border-light rounded animate-pulse mb-1" />
                  <div className="h-4 w-3/4 bg-warm-border-light rounded animate-pulse mb-2" />
                  <div className="h-9 w-full bg-warm-border-light rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
