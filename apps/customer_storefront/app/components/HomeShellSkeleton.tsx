import { SkeletonHeader, SkeletonHero, SkeletonCarousel } from './SkeletonGrid';
import { PromoGridSkeleton } from './PromoGrid';
import { SocialCarouselSkeleton } from './SocialCarousel';

export function HomeShellSkeleton() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 xl:px-10">
          <SkeletonHero />
          <div className="mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="flex gap-2 overflow-x-auto py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 px-6 py-2 rounded-full bg-gray-200 animate-pulse min-h-[44px]" />
              ))}
            </div>
          </div>
          <PromoGridSkeleton />
          <SkeletonCarousel count={4} />
          <SocialCarouselSkeleton count={5} />
        </div>
      </main>
    </>
  );
}
