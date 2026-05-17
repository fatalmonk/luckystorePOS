import React from 'react';
import { ColumnDef } from './types';
import { SkeletonBlock } from '../PageState'; // we'll use existing SkeletonBlock or standard tailwind pulse

interface DataTableSkeletonProps<T> {
  columns: ColumnDef<T>[];
  showSelection?: boolean;
  rowCount?: number;
  mobile?: boolean;
}

export function DataTableSkeleton<T>({ 
  columns, 
  showSelection = false, 
  rowCount = 5,
  mobile = false
}: DataTableSkeletonProps<T>) {
  if (mobile) {
    return (
      <>
        {Array.from({ length: rowCount }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-4 flex flex-col gap-4 bg-surface animate-pulse border-b border-border-default/50">
            {showSelection && (
              <div className="flex justify-between items-center pb-2 border-b border-border-light/50">
                <div className="w-16 h-4 rounded bg-border-default"></div>
                <div className="w-4 h-4 rounded bg-border-default"></div>
              </div>
            )}
            {columns.map((_, colIdx) => (
              <div key={colIdx} className="flex justify-between items-center">
                <div className="w-1/3 h-4 rounded bg-border-default"></div>
                <div className={`h-4 rounded bg-border-default ${colIdx === 0 ? 'w-1/2' : 'w-1/4'}`}></div>
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <tr key={rowIdx} className="bg-surface animate-pulse border-b border-border-default/50 last:border-0">
          {showSelection && (
            <td className="px-4 py-3 w-12 border-r border-border-light/50">
              <div className="w-4 h-4 rounded bg-border-default"></div>
            </td>
          )}
          {columns.map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className={`h-4 rounded bg-border-default ${colIdx === 0 ? 'w-3/4' : 'w-1/2'}`}></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
