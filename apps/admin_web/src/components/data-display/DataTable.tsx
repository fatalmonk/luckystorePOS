import React from 'react';
import { clsx } from "clsx";

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  /** optional render function */
  render?: (value: unknown, row: T) => React.ReactNode;
  /** optional alignment: 'left' | 'center' | 'right' */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Accessible name for the table when its surrounding section does not provide one. */
  tableLabel?: string;
  /** Keep the first column visible while the table scrolls horizontally. */
  pinFirstColumn?: boolean;
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
  tableLabel,
  pinFirstColumn = false,
  onRowClick,
  className,
  emptyMessage = 'No data to display.',
}: DataTableProps<T>) {
  return (
    <div className={clsx('w-full overflow-x-auto rounded-xl border border-warm-border-warm bg-warm-surface', className)}>
      <table aria-label={tableLabel} className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="bg-warm-border-warm/50 border-b border-warm-border-warm">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={clsx(
                  'px-4 py-3 text-xs font-semibold text-warm-muted uppercase tracking-wider',
                  ALIGN_MAP[col.align ?? 'left'],
                  pinFirstColumn && idx === 0 && 'sticky left-0 z-20 w-[40vw] min-w-32 max-w-56 bg-warm-border-warm'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-warm-surface divide-y divide-warm-border-warm">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-warm-dim"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={clsx(
                  'transition-colors duration-200',
                  onRowClick && 'cursor-pointer hover:bg-warm-border-warm/30'
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
                        'px-4 py-3 text-sm text-warm-fg',
                        ALIGN_MAP[col.align ?? 'left'],
                        pinFirstColumn && colIdx === 0
                          ? 'sticky left-0 z-10 w-[40vw] min-w-32 max-w-56 whitespace-normal [overflow-wrap:anywhere] bg-warm-surface'
                          : 'whitespace-nowrap'
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
