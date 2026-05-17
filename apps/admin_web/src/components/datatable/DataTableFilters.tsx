import React from 'react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface DataTableFiltersProps {
  filters: FilterDef[];
  onClear?: () => void;
  isFiltered?: boolean;
}

export function DataTableFilters({ filters, onClear, isFiltered }: DataTableFiltersProps) {
  if (!filters || filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-2">
          <label htmlFor={`filter-${filter.id}`} className="text-sm font-medium text-text-secondary hidden sm:block">
            {filter.label}
          </label>
          <select
            id={`filter-${filter.id}`}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="input py-1.5 text-sm min-w-[140px]"
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      
      {isFiltered && onClear && (
        <button
          onClick={onClear}
          className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
