import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { downloadCSV } from '../lib/format';
import type { InventoryItem } from '../types/inventory';

export function useInventoryBulkActions(
  storeId: string | null,
  tenantId: string | null,
  inventory: InventoryItem[] | undefined
) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const bulkStockMutation = useMutation({
    mutationFn: async (data: { value: number; mode: 'add' | 'set'; reason: string; notes?: string }) => {
      const promises = Array.from(selectedIds).map((id) => {
        if (data.mode === 'add') {
          return api.inventory.update(storeId, id, data.value, data.reason, data.notes);
        } else {
          return api.inventory.set(storeId, id, data.value, data.reason, data.notes);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      setSelectedIds(new Set());
    },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: async (data: {
      sellingPrice?: { value: number; isPercentage: boolean };
      mrp?: { value: number; isPercentage: boolean };
      costPrice?: { value: number; isPercentage: boolean };
    }) => {
      const promises = Array.from(selectedIds).map(async (id) => {
        const item = inventory?.find((p) => p.id === id);
        if (!item) return;

        const updates: any = {};
        if (data.sellingPrice) {
          updates.price = data.sellingPrice.isPercentage && item.price
            ? item.price * (1 + data.sellingPrice.value / 100)
            : data.sellingPrice.value;
        }
        if (data.mrp) {
          updates.mrp = data.mrp.isPercentage && item.mrp
            ? item.mrp * (1 + data.mrp.value / 100)
            : data.mrp.value;
        }
        if (data.costPrice) {
          updates.cost = data.costPrice.isPercentage && item.cost
            ? item.cost * (1 + data.costPrice.value / 100)
            : data.costPrice.value;
        }
        return api.products.update(id, updates, tenantId);
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedIds(new Set());
    },
  });

  const handleExportSelected = () => {
    const selectedItems = inventory?.filter((p) => selectedIds.has(p.id)) || [];
    const sanitizeCSVCell = (value: string) => (/^[=+\-@]/.test(value) ? `'${value}` : value);
    const rows = selectedItems.map((item) => ({
      name: sanitizeCSVCell(item.name),
      sku: sanitizeCSVCell(item.sku || ''),
      currentStock: item.current_qty,
      status: item.reorder_status,
      price: item.price || 0,
      value: (item.price || 0) * item.current_qty,
      lastUpdated: item.last_updated || '',
    }));
    downloadCSV(rows, `inventory-selected-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const toggleSelectAll = useCallback((ids: string[], isAllSelected: boolean) => {
    if (!isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    bulkStockMutation,
    bulkPriceMutation,
    handleExportSelected,
    toggleSelectAll,
    toggleSelect,
  };
}
