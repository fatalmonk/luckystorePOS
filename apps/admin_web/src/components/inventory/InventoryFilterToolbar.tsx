import { ArrowUpDown, LayoutGrid, List, ScanLine, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          aria-label="Search inventory by name or SKU"
          placeholder="Search name or SKU..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-3 py-1.5 rounded-md border border-input bg-background text-foreground text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs placeholder:text-muted-foreground transition-colors"
        />
      </div>

      {/* Controls Group */}
      <div className="flex w-full sm:w-auto items-center gap-1.5 sm:gap-2 sm:flex-shrink-0">
        {/* Sort Dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            id="inventory-sort-by"
            aria-label="Sort inventory items"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-9 w-full pl-7 pr-7 py-1.5 rounded-md border border-input bg-background text-foreground text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none cursor-pointer shadow-xs sm:max-w-[180px] truncate font-medium transition-colors"
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
            <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>

        {/* Grid / List view toggle button group */}
        {onViewChange && (
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(val) => {
              if (val === 'card' || val === 'table') {
                onViewChange(val);
              }
            }}
            aria-label="View layout mode"
            className="p-0.5 bg-muted/40 rounded-md border border-input h-9 gap-0.5"
          >
            <ToggleGroupItem
              value="card"
              aria-label="Card View"
              title="Card View"
              className="h-8 px-2 sm:px-2.5 rounded-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs text-muted-foreground hover:text-foreground"
            >
              <LayoutGrid size={15} />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="table"
              aria-label="Table View"
              title="Table View"
              className="h-8 px-2 sm:px-2.5 rounded-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs text-muted-foreground hover:text-foreground"
            >
              <List size={15} />
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        {/* Desktop Scan Button (hidden on mobile) */}
        <Button
          variant="outline"
          onClick={onOpenBarcode}
          title="Scan Barcode"
          className="shadow-xs h-9 px-3 hidden md:flex text-xs sm:text-sm font-medium"
        >
          <ScanLine size={16} data-icon="inline-start" />
          <span className="hidden sm:inline">Scan</span>
        </Button>

        {/* Floating Mobile Barcode Scan FAB (visible only < 768px) */}
        <button
          onClick={onOpenBarcode}
          className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Scan Barcode"
          aria-label="Scan Barcode"
        >
          <ScanLine size={24} />
        </button>
      </div>
    </div>
  );
}
