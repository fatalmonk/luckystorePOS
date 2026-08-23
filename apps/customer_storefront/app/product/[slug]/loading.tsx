import { SkeletonHeader } from '../../components/SkeletonGrid';

const pulse = 'animate-pulse rounded bg-warm-image-well';

export default function ProductDetailLoading() {
  return (
    <>
      <SkeletonHeader />
      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto mt-2 min-h-full max-w-[var(--container-storefront)] rounded-t-warm-panel bg-warm-bg px-[var(--space-page-x)] md:mt-6">
          <div className="pt-2 md:pt-0">
            <div className={`${pulse} h-11 w-56`} />
          </div>

          <div className="grid gap-6 py-5 md:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] md:items-start md:gap-8 lg:gap-10">
            <div className="mx-auto w-full max-w-[420px] md:sticky md:top-24 md:max-w-none">
              <div className="aspect-square animate-pulse rounded-warm-sheet border border-warm-image-well-border bg-warm-image-well" />
            </div>

            <div className="rounded-warm-panel border border-warm-border bg-warm-bg p-4 shadow-warm-panel sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className={`${pulse} h-8 w-3/4`} />
                  <div className={`${pulse} h-4 w-20`} />
                </div>
                <div className={`${pulse} h-7 w-24 rounded-warm-control`} />
              </div>

              <div className={`${pulse} mt-5 h-10 w-32`} />

              <div className="mt-6 space-y-4">
                <div className="flex gap-2">
                  <div className={`${pulse} h-4 w-24`} />
                  <div className={`${pulse} h-4 w-20`} />
                </div>
                <div className={`${pulse} h-12 w-40 rounded-warm-control`} />
              </div>
            </div>
          </div>

          <div className="border-t border-warm-border px-4 py-5 sm:px-6 lg:px-8">
            <div className={`${pulse} mb-3 h-5 w-28`} />
            <div className="space-y-2">
              <div className={`${pulse} h-4 w-full`} />
              <div className={`${pulse} h-4 w-3/4`} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
