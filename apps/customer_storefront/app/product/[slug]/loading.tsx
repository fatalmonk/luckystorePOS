import { SkeletonHeader } from '../../components/SkeletonGrid';

export default function ProductDetailLoading() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        <div className="max-w-3xl mx-auto bg-white min-h-full">
          <div className="px-4 pt-6 pb-5 sm:px-6 lg:px-8">
            {/* Hero image skeleton */}
            <div className="relative w-full aspect-square max-w-[360px] mx-auto rounded-2xl bg-gray-200 animate-pulse mb-5" />

            {/* Title + stock badge */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-2">
                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-5">
              <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Add to cart button */}
            <div className="h-12 w-40 rounded-full bg-gray-200 animate-pulse" />
          </div>

          {/* Description */}
          <div className="border-t border-warm-border-light px-4 py-5 sm:px-6 lg:px-8">
            <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}