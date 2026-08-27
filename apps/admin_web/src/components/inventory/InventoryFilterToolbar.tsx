import { ArrowUpDown, ScanLine, Search } from 'lucide-react';
import { Button } from '../ui/Button';

interface InventoryFilterToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onOpenBarcode: () => void;
}

export function InventoryFilterToolbar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  onOpenBarcode,
}: InventoryFilterToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Search inventory by name or SKU"
            placeholder="Search inventory by name or SKU..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-md border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <select
              id="inventory-sort-by"
              aria-label="Sort inventory items"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-md border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer shadow-sm"
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

          {/* Desktop Scan Button (hidden on mobile) */}
          <Button
            variant="secondary"
            icon={<ScanLine size={18} />}
            onClick={onOpenBarcode}
            title="Scan Barcode"
            className="shadow-sm hidden md:flex"
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
