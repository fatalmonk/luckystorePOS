import { ArrowUpDown, LayoutGrid, List, ScanLine, Search } from 'lucide-react';
import { Button } from '../ui/Button';

interface InventoryFilterToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onOpenBarcode: () => void;
  view?: 'card' | 'table';
  onViewChange?: (view: 'card' | 'table') => void;
}

export function InventoryFilterToolbar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  onOpenBarcode,
  view = 'card',
  onViewChange,
}: InventoryFilterToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
      {/* Search Bar - expands to fill space */}
      <div className="relative w-full sm:flex-1 min-w-0">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          aria-label="Search inventory by name or SKU"
          placeholder="Search name or SKU..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-3 py-1.5 rounded-lg border border-border bg-surface text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-xs placeholder:text-text-muted"
        />
      </div>

      {/* Controls Group */}
      <div className="flex w-full sm:w-auto items-center gap-1.5 sm:gap-2 sm:flex-shrink-0">
        {/* Sort Dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <select
            id="inventory-sort-by"
            aria-label="Sort inventory items"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-9 w-full pl-7 pr-7 py-1.5 rounded-lg border border-border bg-surface text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer shadow-xs sm:max-w-[180px] truncate font-medium"
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
          <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>

        {/* Grid / List view toggle button group */}
        {onViewChange && (
          <div
            role="group"
            aria-label="View layout mode"
            className="flex items-center p-0.5 bg-surface rounded-lg border border-border shadow-xs h-9"
          >
            <button
              type="button"
              onClick={() => onViewChange('card')}
              aria-label="Card View"
              aria-pressed={view === 'card'}
              title="Card View"
              className={`h-full px-2 sm:px-2.5 rounded-md flex items-center justify-center transition-colors ${
                view === 'card'
                  ? 'bg-surface-raised text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => onViewChange('table')}
              aria-label="Table View"
              aria-pressed={view === 'table'}
              title="Table View"
              className={`h-full px-2 sm:px-2.5 rounded-md flex items-center justify-center transition-colors ${
                view === 'table'
                  ? 'bg-surface-raised text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <List size={15} />
            </button>
          </div>
        )}

        {/* Desktop Scan Button (hidden on mobile) */}
        <Button
          variant="secondary"
          icon={<ScanLine size={16} />}
          onClick={onOpenBarcode}
          title="Scan Barcode"
          className="shadow-xs h-9 px-3 hidden md:flex text-xs sm:text-sm font-medium"
        >
          <span className="hidden sm:inline">Scan</span>
        </Button>

        {/* Floating Mobile Barcode Scan FAB (visible only < 768px) */}
        <button
          onClick={onOpenBarcode}
          className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary text-primary-on rounded-full flex items-center justify-center shadow-level-3 active:scale-95 transition-transform"
          title="Scan Barcode"
          aria-label="Scan Barcode"
        >
          <ScanLine size={24} />
        </button>
      </div>
    </div>
  );
}
