import React from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationFooterProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Optional className */
  className?: string;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    onPageSizeChange(newSize);
  };

  return (
    <div
      className={clsx(
        'sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3',
        'bg-warm-surface border-t border-warm-border-warm rounded-b-xl',
        className
      )}
    >
      {/* Rows per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-warm-dim">Rows per page:</span>
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          className={clsx(
            'h-8 rounded-md border border-warm-border-warm bg-warm-surface',
            'px-2 py-1 text-sm text-warm-fg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'cursor-pointer hover:border-warm-muted transition-colors'
          )}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Items indicator */}
      <div className="text-sm text-warm-dim">
        <span className="font-medium text-warm-fg">{startItem}</span>
        {' - '}
        <span className="font-medium text-warm-fg">{endItem}</span>
        <span className="mx-1">of</span>
        <span className="font-medium text-warm-fg">{totalItems}</span>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
          className={clsx(
            'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
            'hover:bg-warm-border-warm/50 focus:outline-none focus:ring-2 focus:ring-primary',
            canGoPrevious
              ? 'text-warm-fg cursor-pointer'
              : 'text-warm-muted cursor-not-allowed opacity-50'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          className={clsx(
            'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
            'hover:bg-warm-border-warm/50 focus:outline-none focus:ring-2 focus:ring-primary',
            canGoNext
              ? 'text-warm-fg cursor-pointer'
              : 'text-warm-muted cursor-not-allowed opacity-50'
          )}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
