import React from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PaginationState } from './types';

interface DataTablePaginationProps {
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  pageCount: number;
  totalRows?: number;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

export function DataTablePagination({
  pagination,
  onPaginationChange,
  pageCount,
  totalRows,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false,
}: DataTablePaginationProps) {
  const { pageIndex, pageSize } = pagination;
  
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPaginationChange({
      pageIndex: 0, // reset to first page
      pageSize: Number(e.target.value),
    });
  };

  const handlePageChange = (newPageIndex: number) => {
    if (newPageIndex >= 0 && newPageIndex < pageCount) {
      onPaginationChange({
        ...pagination,
        pageIndex: newPageIndex,
      });
    }
  };

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  // Derive start/end index for display
  const startIndex = pageIndex * pageSize + 1;
  const endIndex = totalRows ? Math.min((pageIndex + 1) * pageSize, totalRows) : (pageIndex + 1) * pageSize;

  return (
    <div className="flex flex-col sm:flex-row w-full items-center justify-between gap-4 px-2">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        {totalRows !== undefined ? (
          <span>
            Showing <span className="font-medium text-text-primary">{startIndex}</span> to <span className="font-medium text-text-primary">{endIndex}</span> of <span className="font-medium text-text-primary">{totalRows}</span> results
          </span>
        ) : (
          <span>
            Page <span className="font-medium text-text-primary">{pageIndex + 1}</span> of <span className="font-medium text-text-primary">{Math.max(1, pageCount)}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium hidden sm:block text-text-secondary">Rows per page</p>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={disabled}
            className="input py-1 px-2 h-8 text-sm w-20"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(0)}
            disabled={!canPreviousPage || disabled}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-secondary"
            aria-label="Go to first page"
          >
            <ChevronsLeft size={20} />
          </button>
          <button
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={!canPreviousPage || disabled}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-secondary"
            aria-label="Go to previous page"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center justify-center text-sm font-medium text-text-primary px-2 min-w-[3rem]">
            {pageIndex + 1}
          </div>

          <button
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={!canNextPage || disabled}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-secondary"
            aria-label="Go to next page"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={!canNextPage || disabled}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-secondary"
            aria-label="Go to last page"
          >
            <ChevronsRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
