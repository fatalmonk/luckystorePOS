import React from 'react';
import clsx from 'clsx';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  /** optional render function */
  render?: (value: unknown, row: T) => React.ReactNode;
  /** optional alignment: 'left' | 'center' | 'right' */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** optional row click handler */
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
}

const ALIGN_MAP = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  className,
  emptyMessage = 'No data to display.',
}: DataTableProps<T>) {
  return (
    <div className={clsx('w-full overflow-x-auto rounded-md border border-border-default shadow-level-1', className)}>
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="bg-background-subtle border-b border-border-default">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={clsx(
                  'px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider',
                  ALIGN_MAP[col.align ?? 'left']
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface divide-y divide-border-default">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={clsx(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-background-subtle'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, colIdx) => {
                  const value =
                    typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : (row as any)[col.accessor as string];
                  const cellContent = col.render ? col.render(value, row) : (value as React.ReactNode);
                  return (
                    <td
                      key={colIdx}
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
