import Link from 'next/link';
import { ArrowRight, MagnifyingGlass, Fire, Star, Package } from '@phosphor-icons/react/dist/ssr';
import { CATEGORY_GROUPS, type CategoryGroup } from '../lib/types';

interface CategoryGridProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

interface FeaturedChip {
  href: string;
  label: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary';
}

function FeaturedCollection({ href, label, icon, variant }: FeaturedChip) {
  const isPrimary = variant === 'primary';
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
        isPrimary
          ? 'bg-warm-fg text-warm-accent shadow-warm-sm hover:bg-warm-fg/90'
          : 'border border-warm-border bg-warm-surface text-warm-fg hover:border-warm-accent hover:bg-warm-bg'
      }`}
    >
      <span className="text-warm-accent">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function CategoryTile({ group }: { group: CategoryGroup }) {
  return (
    <Link
      href={`/category/${group.slug}`}
      className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-warm-border/60 bg-warm-surface p-4 shadow-warm-sm transition-all duration-200 hover:-translate-y-1 hover:border-warm-accent hover:shadow-warm-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent active:scale-[0.96] min-h-[120px] sm:min-h-[140px]"
    >
      <span className="text-4xl sm:text-5xl" aria-hidden="true">
        {group.emoji}
      </span>
      <span className="text-center text-xs font-extrabold leading-tight text-warm-fg sm:text-sm">
        {group.label}
      </span>
      <ArrowRight
        weight="bold"
        size={16}
        className="absolute right-3 top-3 text-warm-muted opacity-0 transition-all group-hover:text-warm-accent group-hover:opacity-100 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export function CategoryGrid({ searchParams }: CategoryGridProps) {
  const searchQuery = typeof searchParams?.q === 'string' ? searchParams.q : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header + Search */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-black tracking-tight text-warm-fg sm:text-2xl">
            Browse Categories
          </h1>
          <p className="text-sm text-warm-muted">
            Find everyday essentials by category at Lucky Store.
          </p>
        </div>

        <form
          action="/category"
          method="GET"
          className="relative"
          role="search"
        >
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search products, brands, essentials..."
            className="h-12 w-full rounded-full border border-warm-border bg-warm-surface pl-12 pr-4 text-sm font-semibold text-warm-fg shadow-warm-sm outline-none placeholder:text-warm-muted focus:border-warm-accent focus:ring-2 focus:ring-warm-accent/20"
            aria-label="Search products"
          />
          <MagnifyingGlass
            weight="bold"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted"
            aria-hidden="true"
          />
        </form>
      </div>

      {/* Featured collections strip */}
      <div className="space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-warm-muted">
          Featured Collections
        </span>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <FeaturedCollection
            href="/category"
            label="All Products"
            icon={<Package weight="fill" size={16} />}
            variant="primary"
          />
          <FeaturedCollection
            href="/category?theme=deals"
            label="Hot Deals"
            icon={<Fire weight="fill" size={16} />}
            variant="secondary"
          />
          <FeaturedCollection
            href="/category?theme=bestsellers"
            label="Best Sellers"
            icon={<Star weight="fill" size={16} />}
            variant="secondary"
          />
        </div>
      </div>

      {/* Category grid */}
      <section aria-labelledby="category-grid-heading" className="space-y-3">
        <h2 id="category-grid-heading" className="text-[11px] font-extrabold uppercase tracking-wider text-warm-muted">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {CATEGORY_GROUPS.map((group) => (
            <CategoryTile key={group.slug} group={group} />
          ))}
        </div>
      </section>
    </div>
  );
}
