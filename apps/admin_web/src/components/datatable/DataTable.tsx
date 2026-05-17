import React from 'react';
import { clsx } from 'clsx';
import { DataTableProps, ColumnDef } from './types';
import { DataTableSkeleton } from './DataTableSkeleton';
import { DataTableEmpty } from './DataTableEmpty';
import { ArrowDown, ArrowUp } from 'lucide-react';

const ALIGN_MAP = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<T extends object>({
  data,
  columns,
  getRowId = (_, idx) => String(idx),
  isLoading,
  isError,
  error,
  sortBy,
  onSortChange,
  selectedRowIds,
  onSelectionChange,
  onRowClick,
  toolbar,
  pagination,
  emptyState,
  className,
}: DataTableProps<T>) {
  // Helper to extract id from column
  const getColId = (col: ColumnDef<T>, idx: number) => 
    col.id || (typeof col.accessor === 'string' ? col.accessor : String(idx));

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      const allIds = new Set(data.map((r, i) => getRowId(r, i)));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange || !selectedRowIds) return;
    const next = new Set(selectedRowIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };

  // Sort handler
  const handleSort = (colId: string, isSortable: boolean) => {
    if (!onSortChange || !isSortable) return;
    
    if (sortBy?.id === colId) {
      if (sortBy.desc) {
        // Third click clears sorting
        onSortChange(null);
      } else {
        onSortChange({ id: colId, desc: true });
      }
    } else {
      onSortChange({ id: colId, desc: false });
    }
  };

  const allSelected = data.length > 0 && selectedRowIds?.size === data.length;
  const someSelected = (selectedRowIds?.size ?? 0) > 0 && !allSelected;

  return (
    <div className={clsx("flex flex-col w-full", className)}>
      {/* Toolbar Slot */}
      {toolbar && <div className="mb-4">{toolbar}</div>}

      <div className="w-full rounded-xl border border-border-default bg-surface shadow-level-1 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-left">
          <thead className="bg-background-subtle border-b border-border-default">
            <tr>
              {/* Checkbox Header */}
              {onSelectionChange && (
                <th className="px-4 py-3 w-12 text-center border-r border-border-light/50">
                  <input 
                    type="checkbox" 
                    className="checkbox" 
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    disabled={isLoading || data.length === 0}
                  />
                </th>
              )}

              {/* Columns */}
              {columns.map((col, idx) => {
                const colId = getColId(col, idx);
                const isSorted = sortBy?.id === colId;
                
                return (
                  <th
                    key={colId}
                    className={clsx(
                      'px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider select-none',
                      ALIGN_MAP[col.align ?? 'left'],
                      col.sortable !== false && onSortChange ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors' : '',
                    )}
                    style={{ width: col.width }}
                    onClick={() => handleSort(colId, col.sortable !== false)}
                  >
                    <div className={clsx("flex items-center gap-1", 
                      col.align === 'right' ? 'justify-end' : 
                      col.align === 'center' ? 'justify-center' : 'justify-start'
                    )}>
                      {typeof col.header === 'function' ? col.header({ column: col }) : col.header}
                      
                      {/* Sort Icon */}
                      {col.sortable !== false && onSortChange && (
                        <div className="flex flex-col opacity-30 w-3 h-4 items-center justify-center -ml-0.5">
                          {isSorted ? (
                            sortBy.desc ? <ArrowDown size={12} className="opacity-100 text-brand-main" /> : <ArrowUp size={12} className="opacity-100 text-brand-main" />
                          ) : (
                            <ArrowUp size={12} className="opacity-0 group-hover:opacity-50" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default bg-surface">
            {isLoading ? (
              <DataTableSkeleton columns={columns} showSelection={!!onSelectionChange} />
            ) : isError ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="p-0">
                  <div className="p-8 text-center text-color-danger bg-danger/5">
                    <p className="font-semibold">{error?.message || 'Failed to load data.'}</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="p-0">
                  {emptyState || <DataTableEmpty />}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const rowId = getRowId(row, rowIdx);
                const isSelected = selectedRowIds?.has(rowId) ?? false;

                return (
                  <tr
                    key={rowId}
                    className={clsx(
                      'transition-colors hover:bg-background-subtle group',
                      isSelected && 'bg-brand-main/5',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row, rowIdx)}
                  >
                    {/* Checkbox Cell */}
                    {onSelectionChange && (
                      <td className="px-4 py-3 w-12 text-center border-r border-border-light/50" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                        />
                      </td>
                    )}

                    {/* Data Cells */}
                    {columns.map((col, colIdx) => {
                      const value = typeof col.accessor === 'function' 
                        ? col.accessor(row) 
                        : col.accessor ? (row as any)[col.accessor as string] : undefined;
                        
                      const cellContent = col.render ? col.render(value, row, rowIdx) : (value as React.ReactNode);

                      return (
                        <td
                          key={getColId(col, colIdx)}
                          className={clsx(
                            'px-4 py-3 text-sm text-text-primary whitespace-nowrap',
                            ALIGN_MAP[col.align ?? 'left']
                          )}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="md:hidden flex flex-col divide-y divide-border-default bg-surface">
          {isLoading ? (
            <DataTableSkeleton columns={columns} showSelection={!!onSelectionChange} mobile />
          ) : isError ? (
            <div className="p-8 text-center text-color-danger bg-danger/5">
              <p className="font-semibold">{error?.message || 'Failed to load data.'}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="p-0">
              {emptyState || <DataTableEmpty />}
            </div>
          ) : (
            data.map((row, rowIdx) => {
              const rowId = getRowId(row, rowIdx);
              const isSelected = selectedRowIds?.has(rowId) ?? false;

              return (
                <div 
                  key={rowId} 
                  className={clsx(
                    "p-4 flex flex-col gap-3 transition-colors",
                    isSelected ? 'bg-brand-main/5' : 'hover:bg-background-subtle',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row, rowIdx)}
                >
                  {/* Mobile Card Header / Checkbox */}
                  {onSelectionChange && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-light/50" onClick={e => e.stopPropagation()}>
                      <span className="text-sm font-semibold text-text-secondary uppercase">Select Row</span>
                      <input 
                        type="checkbox" 
                        className="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                      />
                    </div>
                  )}

                  {/* Mobile Card Cells */}
                  {columns.map((col, colIdx) => {
                    const value = typeof col.accessor === 'function' 
                      ? col.accessor(row) 
                      : col.accessor ? (row as any)[col.accessor as string] : undefined;
                      
                    const cellContent = col.render ? col.render(value, row, rowIdx) : (value as React.ReactNode);
                    const headerLabel = typeof col.header === 'function' ? col.header({ column: col }) : col.header;

                    return (
                      <div key={getColId(col, colIdx)} className="flex justify-between items-start gap-4">
                        <span className="text-sm font-medium text-text-secondary shrink-0">{headerLabel}</span>
                        <div className={clsx("text-sm text-text-primary text-right overflow-hidden break-words", ALIGN_MAP[col.align ?? 'left'])}>
                          {cellContent}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination Slot */}
      {pagination && (
        <div className="mt-4 flex items-center justify-between border-t border-border-default pt-4">
          {pagination}
        </div>
      )}
    </div>
  );
}
