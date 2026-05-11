import React from 'react';
import { ColumnDef } from '../../components/datatable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Edit2 } from 'lucide-react';
import { formatCurrency } from '../../lib/format';

export const getProductColumns = (
  onEdit: (row: any) => void
): ColumnDef<any>[] => [
  {
    id: 'name',
    header: 'Product',
    accessor: 'name',
    sortable: true,
    width: '28%',
    render: (_, row) => (
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-text-primary truncate">{row.name}</span>
        <span className="text-xs text-text-muted truncate">{row.categories?.name || 'No Category'}</span>
      </div>
    ),
  },
  {
    id: 'sku',
    header: 'SKU / Barcode',
    accessor: 'sku',
    sortable: false,
    width: '18%',
    render: (_, row) => (
      <div className="flex flex-col min-w-0 text-sm">
        <span className="text-text-primary truncate">{row.sku}</span>
        <span className="text-xs text-text-muted truncate">{row.barcode}</span>
      </div>
    ),
  },
  {
    id: 'price',
    header: 'Price',
    accessor: 'price',
    sortable: true,
    width: '12%',
    render: (val) => (
      <span className="font-mono font-bold text-text-primary whitespace-nowrap">৳{val as number}</span>
    ),
  },
  {
    id: 'stock',
    header: 'Stock',
    accessor: 'stock',
    sortable: true,
    align: 'center',
    width: '12%',
    render: (val, row) => (
      <span className={`font-mono font-bold ${(val as number) <= (row.min_stock_level || 5) ? 'text-danger' : 'text-text-primary'}`}>
        {val as number || 0}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'active',
    sortable: false,
    width: '12%',
    render: (val) => (
      <Badge variant={val ? 'success' : 'neutral'}>
        {val ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    accessor: 'id',
    align: 'right',
    sortable: false,
    width: '18%',
    render: (_, row) => (
      <Button
        size="sm"
        variant="secondary"
        icon={<Edit2 size={16} />}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(row);
        }}
      >
        Edit
      </Button>
    ),
  },
];
