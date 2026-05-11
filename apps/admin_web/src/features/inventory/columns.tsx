import React from 'react';
import { ColumnDef } from '../../components/datatable';
import { InventoryListRow } from '../../types/rpc';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const getInventoryColumns = (
  onUpdate: (row: InventoryListRow) => void
): ColumnDef<InventoryListRow>[] => [
  {
    header: 'Product',
    accessor: 'name',
    render: (_, row) => (
      <div className="flex flex-col">
        <span className="font-semibold text-text-primary">{row.name}</span>
        <span className="text-xs text-text-muted">SKU: {row.sku || 'N/A'}</span>
      </div>
    ),
  },
  {
    header: 'Current Stock',
    accessor: 'current_stock',
    render: (val) => (
      <span className="text-lg font-bold font-mono">{val as number}</span>
    ),
  },
  {
    header: 'Status',
    accessor: 'status',
    render: (_, row) => {
      let status = 'OK';
      let variant: 'success' | 'warning' | 'danger' = 'success';
      if (row.current_stock <= 0) {
        status = 'OUT';
        variant = 'danger';
      } else if (row.current_stock <= row.min_stock_level) {
        status = 'LOW';
        variant = 'warning';
      }
      return (
        <Badge variant={variant} className="font-bold px-2 py-0.5">
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    accessor: 'id',
    align: 'right',
    sortable: false,
    render: (_, row) => (
      <Button
        size="sm"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          onUpdate(row);
        }}
      >
        Update
      </Button>
    ),
  },
];
