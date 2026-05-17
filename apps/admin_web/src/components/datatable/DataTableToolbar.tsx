import React from 'react';
import { Search } from 'lucide-react';

interface DataTableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  selectedCount?: number;
  bulkActions?: React.ReactNode;
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  actions,
  selectedCount = 0,
  bulkActions,
}: DataTableToolbarProps) {
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
      <div className="flex-1 flex items-center gap-4 w-full sm:w-auto min-w-[200px]">
        {onSearchChange && (
          <div className="relative w-full sm:max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="input w-full pl-10"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {selectedCount > 0 && bulkActions && (
          <div className="flex items-center gap-3 mr-2 animate-in fade-in slide-in-from-right-4 duration-200">
            <span className="text-sm font-semibold text-brand-main">
              {selectedCount} selected
            </span>
            <div className="h-6 w-px bg-border-default mx-1"></div>
            {bulkActions}
          </div>
        )}
        
        {/* Only show primary actions if no rows are selected, or keep them depending on preference */}
        {selectedCount === 0 && actions && (
           <div className="flex items-center gap-3">
             {actions}
           </div>
        )}
      </div>
    </div>
  );
}
