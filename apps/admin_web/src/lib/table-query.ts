import { SortState } from '../components/datatable';

export interface QueryOptions<T> {
  data: T[] | undefined;
  search?: string;
  searchFields?: (keyof T | string)[]; 
  sort?: SortState | null;
  filters?: Record<string, any>;
}

function getNestedValue(obj: any, path: string) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function processTableData<T>(options: QueryOptions<T>): T[] {
  if (!options.data) return [];
  
  let result = [...options.data];

  // 1. Filtering (Exact match or array includes)
  if (options.filters) {
    const filterKeys = Object.keys(options.filters);
    if (filterKeys.length > 0) {
      result = result.filter(item => {
        return filterKeys.every(key => {
          const filterVal = options.filters![key];
          // Skip empty filters
          if (filterVal === undefined || filterVal === null || filterVal === '') return true;
          
          const itemVal = getNestedValue(item, key);
          
          if (Array.isArray(filterVal)) {
            if (filterVal.length === 0) return true;
            return filterVal.includes(itemVal);
          }
          
          return itemVal === filterVal;
        });
      });
    }
  }

  // 2. Search (Case-insensitive partial match)
  if (options.search && options.search.trim() && options.searchFields && options.searchFields.length > 0) {
    const query = options.search.toLowerCase().trim();
    result = result.filter(item => {
      return options.searchFields!.some(field => {
        const val = getNestedValue(item, field as string);
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }

  // 3. Sort
  if (options.sort) {
    const { id, desc } = options.sort;
    result.sort((a, b) => {
      let valA = getNestedValue(a, id);
      let valB = getNestedValue(b, id);

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return desc ? -1 : 1;
      if (valB === undefined || valB === null) return desc ? 1 : -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return desc ? valB - valA : valA - valB;
      }

      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return desc ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
      }
      
      // Date fallback
      if (valA instanceof Date && valB instanceof Date) {
        return desc ? valB.getTime() - valA.getTime() : valA.getTime() - valB.getTime();
      }
      
      return desc 
        ? String(valB).localeCompare(String(valA)) 
        : String(valA).localeCompare(String(valB));
    });
  }

  return result;
}
