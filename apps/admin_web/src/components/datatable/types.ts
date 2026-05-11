import { ReactNode } from 'react';

export interface ColumnDef<T> {
  id?: string; // Optional unique id for the column, defaults to accessor if string
  header: ReactNode | ((props: { column: ColumnDef<T> }) => ReactNode);
  accessor?: keyof T | ((row: T) => unknown);
  render?: (value: unknown, row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string | number;
}

export interface SortState {
  id: string;
  desc: boolean;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  
  // Row Identification
  getRowId?: (row: T, index: number) => string;
  
  // UI States
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  
  // Sorting (Controlled)
  sortBy?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  
  // Selection (Controlled)
  selectedRowIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  
  // Click
  onRowClick?: (row: T, index: number) => void;
  
  // Slots
  toolbar?: ReactNode;
  pagination?: ReactNode;
  emptyState?: ReactNode;
  
  // Styling
  className?: string;
}
