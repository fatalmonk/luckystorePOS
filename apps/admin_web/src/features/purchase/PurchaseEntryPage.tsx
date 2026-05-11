import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Send, Search, Package } from 'lucide-react';
import { SkeletonBlock } from '../../components/PageState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../layouts/PageHeader';
import { PageContainer } from '../../layouts/PageContainer';
import { useDebounce } from '../../hooks/useDebounce';
import { useNotify } from '../../components/NotificationContext';
import { clsx } from 'clsx';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '../../lib/zodResolver';
import { purchaseEntrySchema, PurchaseEntryData } from '../../schemas/purchase.schema';
import { useCreatePurchase } from '../../hooks/mutations/useCreatePurchase';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

type Supplier = {
  id: string;
  name: string;
  phone?: string;
};

type Item = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
};

export const PurchaseEntryPage: React.FC = () => {
  const { notify } = useNotify();
  const createMutation = useCreatePurchase();

  const form = useForm<PurchaseEntryData>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      supplierId: '',
      invoiceNumber: '',
      amountPaid: 0,
      lines: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines'
  });

  useUnsavedChangesGuard(form.formState.isDirty);

  // Supplier Search State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [suppliersLoading, setSuppliersLoading] = useState(true);

  // Item Search State
  const [itemSearch, setItemSearch] = useState('');
  const debouncedItemSearch = useDebounce(itemSearch, 300);
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [quickQty, setQuickQty] = useState(1);
  const [quickCost, setQuickCost] = useState('');

  // Calculations
  const lines = form.watch('lines');
  const amountPaid = form.watch('amountPaid');
  const totalCost = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  const payable = Math.max(0, totalCost - amountPaid);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setSuppliersLoading(true);
    const { data, error } = await supabase
      .from('parties')
      .select('id, name, phone')
      .eq('type', 'supplier')
      .order('name');
    if (!error && data) setSuppliers(data as Supplier[]);
    setSuppliersLoading(false);
  };

  const filteredSuppliers = supplierSearch.length < 2
    ? suppliers
    : suppliers.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (s.phone && s.phone.includes(supplierSearch))
      );

  const selectSupplier = (s: Supplier) => {
    form.setValue('supplierId', s.id, { shouldValidate: true, shouldDirty: true });
    setSupplierSearch(s.name);
    setShowSupplierDropdown(false);
  };

  useEffect(() => {
    if (debouncedItemSearch.length < 2) {
      setItemResults([]);
      return;
    }
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, sku, barcode, price')
        .or(`name.ilike.%${debouncedItemSearch}%,sku.ilike.%${debouncedItemSearch}%,barcode.ilike.%${debouncedItemSearch}%`)
        .limit(8);
      if (!error && data) setItemResults(data as Item[]);
    };
    fetchItems();
  }, [debouncedItemSearch]);

  const addItem = (item: Item) => {
    const cost = quickCost ? parseFloat(quickCost) : item.price;
    const existingIndex = lines.findIndex(l => l.itemId === item.id);
    
    if (existingIndex >= 0) {
      const existing = lines[existingIndex];
      form.setValue(`lines.${existingIndex}.quantity`, existing.quantity + quickQty, { shouldDirty: true, shouldValidate: true });
      form.setValue(`lines.${existingIndex}.unitCost`, cost, { shouldDirty: true, shouldValidate: true });
    } else {
      append({
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        quantity: quickQty,
        unitCost: cost
      });
    }

    setItemSearch('');
    setItemResults([]);
    setQuickQty(1);
    setQuickCost('');
  };

  const onSubmit = (data: PurchaseEntryData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        notify('Purchase posted successfully!', 'success');
        form.reset();
        setSupplierSearch('');
      },
      onError: (err: any) => {
        notify(err.message || 'Submission failed', 'error');
      }
    });
  };

  return (
    <PageContainer className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Purchase Receiving"
        description="Record incoming stock from suppliers."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Supplier */}
          <div className="card p-4">
            <label htmlFor="supplier-search" className="block text-sm text-text-muted mb-2 font-medium">Supplier</label>
            <div className="relative">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-white/30" />
                <input
                  id="supplier-search"
                  type="text"
                  value={supplierSearch}
                  onChange={e => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Search supplier by name or phone..."
                  className={clsx(
                    "flex-1 bg-transparent border-none outline-none text-sm w-full py-2",
                    form.formState.errors.supplierId ? "text-color-danger" : ""
                  )}
                />
              </div>
              {form.formState.errors.supplierId && (
                <p className="text-color-danger text-xs mt-1">{form.formState.errors.supplierId.message}</p>
              )}
              {showSupplierDropdown && (
                <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-card border border-border-color rounded-xl max-h-48 overflow-y-auto shadow-lg">
                  {suppliersLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-4 py-3">
                        <SkeletonBlock className="w-3/5 h-4" />
                        <SkeletonBlock className="w-2/5 h-3 mt-2" />
                      </div>
                    ))
                  ) : filteredSuppliers.length === 0 ? (
                    <div className="p-4 text-white/30 text-sm text-center">No suppliers found</div>
                  ) : filteredSuppliers.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectSupplier(s)}
                      className="w-full text-left px-4 py-3 hover:bg-border-light flex justify-between items-center transition-colors"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-text-muted text-sm">{s.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Info */}
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-2 font-medium">Invoice # (optional)</label>
                <input
                  type="text"
                  {...form.register('invoiceNumber')}
                  placeholder="INV-2026-001"
                  className="input w-full"
                />
              </div>
              <div>
                {/* Legacy total display replaced by auto calculation below, but keeping layout consistent if needed */}
              </div>
            </div>
          </div>

          {/* Item Quick Add */}
          <div className="card p-4">
            <label htmlFor="item-search" className="block text-sm text-text-muted mb-2 font-medium">Add Items (barcode / SKU / name)</label>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Search size={16} className="text-text-muted absolute left-3" />
                <input
                  id="item-search"
                  type="text"
                  value={itemSearch}
                  onChange={e => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  placeholder="Scan barcode or search item..."
                  className="input w-full pl-10"
                />
              </div>
              {form.formState.errors.lines && (
                <p className="text-color-danger text-xs mt-1 mb-2">{form.formState.errors.lines.message}</p>
              )}
              {showItemDropdown && itemResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border-color rounded-xl max-h-48 overflow-y-auto shadow-lg">
                  {itemResults.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item)}
                      className="w-full text-left px-4 py-3 hover:bg-border-light flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-text-muted text-xs">{item.sku} {item.barcode}</div>
                      </div>
                      <div className="font-bold">৳ {item.price}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label htmlFor="quick-qty" className="block text-xs text-text-muted mb-1 font-medium">Qty</label>
                <input
                  id="quick-qty"
                  type="number"
                  value={quickQty}
                  onChange={e => setQuickQty(parseInt(e.target.value) || 1)}
                  className="input w-full"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="quick-cost" className="block text-xs text-text-muted mb-1 font-medium">Unit Cost (৳)</label>
                <input
                  id="quick-cost"
                  type="number"
                  value={quickCost}
                  onChange={e => setQuickCost(e.target.value)}
                  placeholder="Auto"
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Receipt Lines */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-border-color">
              <h3 className="font-semibold text-text-main">Receipt Lines ({fields.length})</h3>
            </div>
            {fields.length === 0 ? (
              <EmptyState 
                icon={<Package size={32} />}
                title="No items added yet"
                description="Search or scan items above."
              />
            ) : (
              <div className="divide-y divide-border-color">
                {fields.map((field, i) => (
                  <div key={field.id} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{field.itemName}</div>
                      <div className="text-text-muted text-sm">
                        {lines[i]?.quantity} × ৳{lines[i]?.unitCost} = ৳{((lines[i]?.quantity || 0) * (lines[i]?.unitCost || 0)).toFixed(2)}
                      </div>
                    </div>
                    <button type="button" onClick={() => remove(i)} className="text-color-danger hover:opacity-80 transition-opacity" aria-label="Remove item">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary + Actions */}
        <div className="space-y-6">
          <div className="card p-4 sticky top-6">
            <h3 className="font-semibold text-text-main mb-4">Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Total Cost</span>
                <span className="font-bold">৳ {totalCost.toFixed(2)}</span>
              </div>

              <div>
                <label htmlFor="cash-paid" className="block text-text-muted mb-1 font-medium">Cash Paid Now (৳)</label>
                <input
                  id="cash-paid"
                  type="number"
                  {...form.register('amountPaid', { valueAsNumber: true })}
                  className="input w-full"
                />
                {form.formState.errors.amountPaid && (
                  <p className="text-color-danger text-xs mt-1">{form.formState.errors.amountPaid.message}</p>
                )}
              </div>

              <div className="flex justify-between pt-3 border-t border-border-color">
                <span className="text-text-muted">Payable (Remaining)</span>
                <span className={clsx("font-bold", payable > 0 ? 'text-color-danger' : 'text-color-success')}>
                  ৳ {payable.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="button-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {createMutation.isPending ? 'Posting...' : 'POST RECEIPT'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </PageContainer>
  );
};
