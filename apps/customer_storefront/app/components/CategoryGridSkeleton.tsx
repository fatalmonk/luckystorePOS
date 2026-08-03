export function CategoryGridSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 animate-pulse">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-warm-border/60 sm:h-8" />
          <div className="h-4 w-64 rounded bg-warm-border/40" />
        </div>
        <div className="h-12 w-full rounded-full bg-warm-border/40" />
      </div>

      <div className="flex items-center gap-2 pb-1">
        <div className="h-10 w-32 rounded-2xl bg-warm-border/60" />
        <div className="h-10 w-28 rounded-2xl bg-warm-border/40" />
        <div className="h-10 w-32 rounded-2xl bg-warm-border/40" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border border-warm-border/40 bg-warm-surface p-4 sm:min-h-[140px]"
          >
            <div className="h-10 w-10 rounded-full bg-warm-border/40 sm:h-12 sm:w-12" />
            <div className="h-4 w-20 rounded bg-warm-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
