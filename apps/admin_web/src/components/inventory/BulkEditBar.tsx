import { X, Package, DollarSign, Download } from 'lucide-react';
import { clsx } from 'clsx';

interface BulkEditBarProps {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  onUpdatePrices: () => void;
  onUpdateStock: () => void;
  onExport: () => void;
}

export function BulkEditBar({
  selectedCount,
  totalCount: _totalCount,
  onClear,
  onUpdatePrices,
  onUpdateStock,
  onExport,
}: BulkEditBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg animate-slideUp">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-default text-white text-xs font-medium flex items-center justify-center">
              {selectedCount}
            </span>
            <span className="text-sm text-slate-700">
              {selectedCount === 1 ? 'product' : 'products'} selected
            </span>
          </div>
          <button
            onClick={onClear}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Clear
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            disabled={selectedCount === 0}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              selectedCount > 0
                ? 'text-slate-700 hover:bg-slate-100'
                : 'text-slate-400 cursor-not-allowed'
            )}
          >
            <Download size={16} />
            Export
          </button>

          <button
            onClick={onUpdateStock}
            disabled={selectedCount === 0}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              selectedCount > 0
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            <Package size={16} />
            Update Stock
          </button>

          <button
            onClick={onUpdatePrices}
            disabled={selectedCount === 0}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              selectedCount > 0
                ? 'bg-primary-default text-white hover:bg-primary-hover'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            <DollarSign size={16} />
            Update Prices
          </button>
        </div>
      </div>
    </div>
  );
}
