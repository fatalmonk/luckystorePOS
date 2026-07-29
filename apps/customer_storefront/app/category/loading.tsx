import { ProductGridSkeleton } from '../components/ui/ProductCardSkeleton';

export default function CategoryLoading() {
  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-7 max-w-xl">
        <div className="h-4 w-32 animate-pulse rounded bg-warm-border/60" />
        <div className="mt-3 h-8 w-64 animate-pulse rounded bg-warm-border/60" />
        <p className="sr-only" role="status">Loading products</p>
      </div>
      <ProductGridSkeleton count={8} />
    </main>
  );
}
