import { useState } from 'react';
import { Package, MoreVertical, History, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  current_qty: number;
  reorder_status: 'OK' | 'LOW' | 'OUT';
  last_updated?: string;
  price?: number;
  cost?: number;
  mrp?: number;
  category_id?: string;
  category_name?: string;
  image_url?: string;
}

interface InventoryListTableProps {
  items: InventoryItem[];
  onUpdateStock: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  OK: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  LOW: { bg: 'bg-amber-100', text: 'text-amber-700' },
  OUT: { bg: 'bg-red-100', text: 'text-red-700' },
};

export function InventoryListTable({
  items,
  onUpdateStock,
  onViewHistory,
  onEditProduct,
  onDelete,
}: InventoryListTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[600px] overflow-auto">
        <table className="w-full border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Barcode
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Cost
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                MRP
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {items.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">
                  No inventory items found. Add products to start tracking stock levels.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const statusStyle = STATUS_STYLES[item.reorder_status] || STATUS_STYLES.OK;
                const isLow = item.reorder_status === 'LOW' || item.reorder_status === 'OUT';
                
                return (
                  <tr
                    key={item.id}
                    className="bg-white border-b border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    {/* Product */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Package size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">
                            {item.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">
                        {item.category_name || item.category_id || '—'}
                      </span>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600 font-mono">
                        {item.sku || '—'}
                      </span>
                    </td>

                    {/* Barcode */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600 font-mono">
                        {item.barcode || '—'}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={clsx(
                          'text-base font-mono',
                          isLow ? 'font-bold text-red-600' : 'text-slate-700'
                        )}
                      >
                        {item.current_qty}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                          statusStyle.bg,
                          statusStyle.text
                        )}
                      >
                        {item.reorder_status}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono text-sm text-slate-900">
                        ৳{fmt(item.cost || 0)}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono text-sm text-slate-900">
                        ৳{fmt(item.price || 0)}
                      </span>
                    </td>

                    {/* MRP */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono text-sm text-slate-900">
                        ৳{fmt(item.mrp || 0)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onUpdateStock(item)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Update Stock"
                        >
                          <ArrowUpDown size={16} />
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-lg border border-slate-200 shadow-lg z-50 py-1">
                                <button
                                  onClick={() => {
                                    onViewHistory?.(item);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <History size={14} />
                                  View History
                                </button>
                                <button
                                  onClick={() => {
                                    onEditProduct?.(item);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Pencil size={14} />
                                  Edit Product
                                </button>
                                <hr className="my-1 border-slate-100" />
                                <button
                                  onClick={() => {
                                    onDelete?.(item);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
