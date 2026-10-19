import { Package, DollarSign, Download } from 'lucide-react';
import { Button } from '@/components/ui';

interface BulkEditBarProps {
  selectedCount: number;
  onClear: () => void;
  onUpdatePrices: () => void;
  onUpdateStock: () => void;
  onExport: () => void;
}

export function BulkEditBar({
  selectedCount,
  onClear,
  onUpdatePrices,
  onUpdateStock,
  onExport,
}: BulkEditBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg animate-in slide-in-from-bottom duration-200">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shadow-xs">
              {selectedCount}
            </span>
            <span className="text-sm font-medium text-foreground">
              {selectedCount === 1 ? 'product' : 'products'} selected
            </span>
          </div>
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            disabled={selectedCount === 0}
            className="text-muted-foreground hover:text-foreground"
          >
            <Download size={15} data-icon="inline-start" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onUpdateStock}
            disabled={selectedCount === 0}
          >
            <Package size={15} data-icon="inline-start" />
            Update Stock
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onUpdatePrices}
            disabled={selectedCount === 0}
          >
            <DollarSign size={15} data-icon="inline-start" />
            Update Prices
          </Button>
        </div>
      </div>
    </div>
  );
}
