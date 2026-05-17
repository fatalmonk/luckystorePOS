import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SortState } from '../components/datatable';

export type ViewPreference = 'table' | 'cards' | 'compact' | 'comfortable';

export interface TableState {
  search: string;
  sort: SortState | null;
  page: number;
  pageSize: number;
  filters: Record<string, any>;
  selectedRows: string[];
  columnVisibility: Record<string, boolean>;
  viewPreference: ViewPreference;
}

export interface UsePersistedTableStateOptions {
  tableId: string;
  defaultState?: Partial<TableState>;
}

const DEFAULT_STATE: TableState = {
  search: '',
  sort: null,
  page: 1,
  pageSize: 25,
  filters: {},
  selectedRows: [],
  columnVisibility: {},
  viewPreference: 'table'
};

export function usePersistedTableState({ tableId, defaultState = {} }: UsePersistedTableStateOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 1. Load initial state: URL > LocalStorage > Default
  const getInitialState = (): TableState => {
    const defaultCombined = { ...DEFAULT_STATE, ...defaultState };
    
    // Try localStorage
    let storedState = {};
    try {
      const stored = localStorage.getItem(`table_state_${tableId}`);
      if (stored) {
        storedState = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored table state', e);
    }
    
    const combined = { ...defaultCombined, ...storedState } as TableState;
    
    // Override with URL params if present
    if (searchParams.has('q')) combined.search = searchParams.get('q') || '';
    if (searchParams.has('page')) combined.page = parseInt(searchParams.get('page') || '1', 10);
    if (searchParams.has('pageSize')) combined.pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    if (searchParams.has('sort')) {
      const [id, descStr] = searchParams.get('sort')!.split(':');
      if (id) {
        combined.sort = { id, desc: descStr === 'desc' };
      }
    }
    if (searchParams.has('filters')) {
      try {
        combined.filters = JSON.parse(searchParams.get('filters') || '{}');
      } catch (e) {
        // ignore
      }
    }
    
    return combined;
  };

  const [state, setState] = useState<TableState>(getInitialState);

  // 2. Sync state changes to URL and LocalStorage
  useEffect(() => {
    // Save to localStorage
    try {
      localStorage.setItem(`table_state_${tableId}`, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save table state', e);
    }
    
    // Save minimal viable state to URL
    const params = new URLSearchParams(searchParams);
    
    if (state.search) params.set('q', state.search);
    else params.delete('q');
    
    if (state.page > 1) params.set('page', state.page.toString());
    else params.delete('page');
    
    if (state.pageSize !== 25) params.set('pageSize', state.pageSize.toString());
    else params.delete('pageSize');
    
    if (state.sort) params.set('sort', `${state.sort.id}:${state.sort.desc ? 'desc' : 'asc'}`);
    else params.delete('sort');
    
    if (Object.keys(state.filters).length > 0) params.set('filters', JSON.stringify(state.filters));
    else params.delete('filters');
    
    setSearchParams(params, { replace: true });
  }, [state, tableId, setSearchParams]);

  // Specific updaters
  const setSearch = useCallback((search: string) => {
    setState(prev => ({ ...prev, search, page: 1 }));
  }, []);

  const setSort = useCallback((sort: SortState | null) => {
    setState(prev => ({ ...prev, sort }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  const setFilters = useCallback((filters: Record<string, any>) => {
    setState(prev => ({ ...prev, filters, page: 1 }));
  }, []);

  const setFilter = useCallback((key: string, value: any) => {
    setState(prev => {
      const newFilters = { ...prev.filters };
      if (value === undefined || value === null || value === '') {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return { ...prev, filters: newFilters, page: 1 };
    });
  }, []);

  const setSelectedRows = useCallback((selectedRows: string[] | ((prev: string[]) => string[])) => {
    setState(prev => ({
      ...prev,
      selectedRows: typeof selectedRows === 'function' ? selectedRows(prev.selectedRows) : selectedRows
    }));
  }, []);

  const setViewPreference = useCallback((viewPreference: ViewPreference) => {
    setState(prev => ({ ...prev, viewPreference }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: {}, search: '', page: 1 }));
  }, []);

  return {
    state,
    setSearch,
    setSort,
    setPage,
    setFilters,
    setFilter,
    setSelectedRows,
    setViewPreference,
    clearFilters
  };
}
