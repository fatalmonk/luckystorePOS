import React from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';

export interface TableFiltersProps {
  /** Array of filter definitions */
  filters: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
  }[];
  /** Search input value (enables search when provided with onSearchChange) */
  searchValue?: string;
  /** Callback when search input changes */
  onSearchChange?: (value: string) => void;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Callback to clear all filters and search */
  onClear?: () => void;
  /** Whether any filter or search is active (controls clear button visibility) */
  isFiltered?: boolean;
  /** Additional elements rendered after filters */
  children?: React.ReactNode;
  className?: string;
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onClear,
  isFiltered,
  children,
  className,
}) => {
  return (
    <div className={clsx('flex flex-wrap gap-4 items-center', className)}>
      {/* Search input */}
      {searchValue !== undefined && onSearchChange && (
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="search-input"
            style={{
              width: '100%',
              paddingLeft: '40px',
              paddingRight: searchValue ? '32px' : undefined,
            }}
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown filters */}
      {filters.map((filter, idx) => (
        <div key={idx} className="flex items-center space-x-2">
          <label className="text-sm font-medium text-text-main">{filter.label}</label>
          <select
            value={filter.value}
            onChange={e => filter.onChange(e.target.value)}
            className="rounded-md border border-border-light bg-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {filter.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Children slot for custom elements */}
      {children}

      {/* Clear button */}
      {onClear && isFiltered && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-main"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
};