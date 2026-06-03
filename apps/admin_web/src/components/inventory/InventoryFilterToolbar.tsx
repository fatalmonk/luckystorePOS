import { X, Filter, ArrowUpDown, ScanLine, LayoutGrid, List as ListIcon, Search } from 'lucide-react';
import { Button } from '../ui/Button';

interface InventoryFilterToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  stockFilter: string;
  onStockFilterChange: (filter: string) => void;
  minPrice: string;
  onMinPriceChange: (price: string) => void;
  maxPrice: string;
  onMaxPriceChange: (price: string) => void;
  onClearFilters: () => void;
  onOpenBarcode: () => void;
}

export function InventoryFilterToolbar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  stockFilter,
  onStockFilterChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  onClearFilters,
  onOpenBarcode,
}: InventoryFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Toggle Filters Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-warm-surface border-warm-border-warm text-warm-fg'
              : 'bg-surface border-border-default text-text-muted hover:bg-background-subtle'
          }`}
        >
          <Filter size={14} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {(hasActiveFilters && !showFilters) && (
            <span className="w-1.5 h-1.5 rounded-full bg-warm-accent" />
          )}
        </button>
        {showFilters && (
          <span className="text-[11px] text-text-muted">Filter by stock status & price range</span>
        )}
      </div>

      {/* Collapsible Filter Bar */}
      {showFilters && (
        <div className="rounded-lg border border-warm-border-warm bg-warm-surface p-3 transition-all">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Stock Status Filter */}
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <label className="block text-[11px] font-medium text-warm-muted uppercase tracking-wider mb-1">
                Stock Status
              </label>
              <select
                value={stockFilter}
                onChange={(e) => onStockFilterChange(e.target.value)}
                className="w-full rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warm-accent appearance-none cursor-pointer"
              >
                <option value="all">All Stock</option>
                <option value="in_stock">In Stock (&gt;0)</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            {/* Min Price */}
            <div className="w-full sm:w-28">
              <label className="block text-[11px] font-medium text-warm-muted uppercase tracking-wider mb-1">
                Min Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={minPrice}
                onChange={(e) => onMinPriceChange(e.target.value)}
                className="w-full rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warm-accent placeholder-warm-muted/50"
              />
            </div>

            {/* Max Price */}
            <div className="w-full sm:w-28">
              <label className="block text-[11px] font-medium text-warm-muted uppercase tracking-wider mb-1">
                Max Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="9999"
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                className="w-full rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warm-accent placeholder-warm-muted/50"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex items-end h-full pt-0 sm:pt-5 w-full sm:w-auto">
                <button
                  onClick={onClearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-warm-border-warm text-warm-muted hover:text-warm-fg hover:bg-warm-dim transition-colors w-full sm:w-auto justify-center"
                >
                  <X size={14} />
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search inventory by name or SKU..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-md border border-border-default bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer shadow-sm"
            >
              <option value="name-asc">Name A→Z</option>
              <option value="name-desc">Name Z→A</option>
              <option value="stock-asc">Stock ↑ Low→High</option>
              <option value="stock-desc">Stock ↓ High→Low</option>
              <option value="margin-asc">Margin ↑ Low→High</option>
              <option value="margin-desc">Margin ↓ High→Low</option>
              <option value="value-asc">Value ↑ Low→High</option>
              <option value="value-desc">Value ↓ High→Low</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <Button
            variant="secondary"
            icon={<ScanLine size={18} />}
            onClick={onOpenBarcode}
            title="Scan Barcode"
            className="shadow-sm"
          >
            <span className="hidden sm:inline">Scan</span>
          </Button>

          <div className="flex rounded-md border border-border-default overflow-hidden flex-shrink-0 shadow-sm">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`px-3 py-2 flex items-center justify-center transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-primary-on' : 'bg-surface text-text-secondary hover:bg-background-subtle'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`px-3 py-2 flex items-center justify-center transition-colors ${
                viewMode === 'list' ? 'bg-primary text-primary-on' : 'bg-surface text-text-secondary hover:bg-background-subtle'
              }`}
              title="List View"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
