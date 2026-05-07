import React from 'react';
import clsx from 'clsx';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  /** optional render function */
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** optional row click handler */
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full table-auto border-collapse">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-4 py-2 text-left text-sm font-medium text-text-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={clsx(
                'border-t border-border-light',
                onRowClick && 'cursor-pointer hover:bg-gray-50'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col, colIdx) => {
                const value =
                  typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : row[col.accessor as string];
                const cellContent = col.render ? col.render(value, row) : value;
                return (
                  <td key={colIdx} className="px-4 py-2 text-sm text-text-main">
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
