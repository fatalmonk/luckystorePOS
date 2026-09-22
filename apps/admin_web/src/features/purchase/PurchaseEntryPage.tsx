import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Save, Send, Search, Package, Plus, X, Pencil, Upload } from 'lucide-react';
import { SkeletonBlock } from '@/components';
import { PageHeader } from '@/components';
import { useDebounce } from '@/hooks';
import { clsx } from 'clsx';
import { ReceiptScanPanel } from './ReceiptScanPanel';
import { type ReceiptOcrResult } from './receiptOcr';
import { uploadProcessedImage } from '../../lib/images';

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
  cost?: number;
  price?: number;
  mrp?: number;
  brand?: string;
  category_id?: string | null;
  image_url?: string | null;
};

type Category = {
  id: string;
  name: string | null;
  category: string;
  parent_id: string | null;
  active: boolean | null;
};

type ReceiptLine = {
  item: Item;
  quantity: number;
  unitCost: number;
};

type PendingOcrItem = ReceiptOcrResult['items'][number] & {
  match?: Item;
};

type PurchaseDraftSnapshot = {
  supplierSearch: string;
  selectedSupplier: Supplier | null;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTotal: string;
  lines: ReceiptLine[];
  amountPaid: string;
  itemSearch: string;
  quickQty: number;
  quickCost: string;
  pendingOcrItems: PendingOcrItem[];
};

export const PurchaseEntryPage: React.FC = () => {
  // Form state
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [amountPaid, setAmountPaid] = useState('0');

  // Item search
  const [itemSearch, setItemSearch] = useState('');
  const debouncedItemSearch = useDebounce(itemSearch, 300);
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [quickQty, setQuickQty] = useState(1);
  const [quickCost, setQuickCost] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add supplier modal
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [addSupplierError, setAddSupplierError] = useState('');

  // Add item modal
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemMrp, setNewItemMrp] = useState('');
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [newItemImagePreview, setNewItemImagePreview] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');
  const [pendingOcrItems, setPendingOcrItems] = useState<PendingOcrItem[]>([]);

  // Auth context
  const { tenantId, storeId } = useAuth();
  const queryClient = useQueryClient();
  const purchaseDraftKey = useMemo(
    () => tenantId && storeId ? `lucky-store:purchase-draft:${tenantId}:${storeId}` : null,
    [storeId, tenantId],
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const draftHydratedRef = useRef(false);
  const skipDraftPersistenceRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate the form from external localStorage state. */
  useEffect(() => {
    if (!purchaseDraftKey || typeof window === 'undefined') return;

    draftHydratedRef.current = false;
    try {
      const raw = window.localStorage.getItem(purchaseDraftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<PurchaseDraftSnapshot>;
        if (typeof draft.supplierSearch === 'string') setSupplierSearch(draft.supplierSearch);
        if (draft.selectedSupplier) setSelectedSupplier(draft.selectedSupplier);
        if (typeof draft.invoiceNumber === 'string') setInvoiceNumber(draft.invoiceNumber);
        if (typeof draft.invoiceDate === 'string') setInvoiceDate(draft.invoiceDate);
        if (typeof draft.invoiceTotal === 'string') setInvoiceTotal(draft.invoiceTotal);
        if (Array.isArray(draft.lines)) setLines(draft.lines);
        if (typeof draft.amountPaid === 'string') setAmountPaid(draft.amountPaid);
        if (typeof draft.itemSearch === 'string') setItemSearch(draft.itemSearch);
        if (typeof draft.quickQty === 'number' && Number.isFinite(draft.quickQty)) setQuickQty(draft.quickQty);
        if (typeof draft.quickCost === 'string') setQuickCost(draft.quickCost);
        if (Array.isArray(draft.pendingOcrItems)) setPendingOcrItems(draft.pendingOcrItems);
        setDraftRestored(true);
      }
    } catch {
      window.localStorage.removeItem(purchaseDraftKey);
    } finally {
      draftHydratedRef.current = true;
    }
  }, [purchaseDraftKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!purchaseDraftKey || !draftHydratedRef.current || typeof window === 'undefined') return;
    if (skipDraftPersistenceRef.current) {
      skipDraftPersistenceRef.current = false;
      return;
    }

    const snapshot: PurchaseDraftSnapshot = {
      supplierSearch,
      selectedSupplier,
      invoiceNumber,
      invoiceDate,
      invoiceTotal,
      lines,
      amountPaid,
      itemSearch,
      quickQty,
      quickCost,
      pendingOcrItems,
    };

    try {
      const hasWork = Boolean(
        supplierSearch || selectedSupplier || invoiceNumber || invoiceDate || invoiceTotal ||
        lines.length || pendingOcrItems.length || itemSearch || quickCost || amountPaid !== '0',
      );
      if (hasWork) {
        window.localStorage.setItem(purchaseDraftKey, JSON.stringify(snapshot));
      } else {
        window.localStorage.removeItem(purchaseDraftKey);
      }
    } catch {
      // Local draft recovery is best-effort and must never block receiving.
    }
  }, [amountPaid, invoiceDate, invoiceNumber, invoiceTotal, itemSearch, lines, pendingOcrItems, purchaseDraftKey, quickCost, quickQty, selectedSupplier, supplierSearch]);

  // Outside-click ref for supplier combobox
  const supplierComboRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (supplierComboRef.current && !supplierComboRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Outside-click ref for item combobox
  const itemComboRef = useRef<HTMLDivElement>(null);
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (itemComboRef.current && !itemComboRef.current.contains(e.target as Node)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // ── Load suppliers ──────────────────────────────────────────────
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parties')
        .select('id, name, phone')
        .eq('type', 'supplier')
        .order('name');
      if (error) throw error;
      return (data || []) as Supplier[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['purchase-categories', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, category, parent_id, active')
        // Categories seeded before tenant isolation are shared (tenant_id IS NULL).
        // Include them with this tenant's own categories so children can retain a
        // shared parent and the selector does not orphan them.
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .or('active.is.null,active.eq.true')
        .order('display_order')
        .order('name');
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  const categoryOptions = useMemo(() => {
    const childrenByParent = new Map<string, Category[]>();
    const roots: Category[] = [];
    for (const category of categories) {
      if (category.parent_id) {
        const children = childrenByParent.get(category.parent_id) || [];
        children.push(category);
        childrenByParent.set(category.parent_id, children);
      } else {
        roots.push(category);
      }
    }
    return { roots, childrenByParent };
  }, [categories]);

  // ── Supplier search ─────────────────────────────────────────────
  const filteredSuppliers = useMemo(() =>
    supplierSearch.length < 2
      ? suppliers
      : suppliers.filter(s =>
          s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          (s.phone && s.phone.includes(supplierSearch))
        ),
    [suppliers, supplierSearch]
  );

  const selectSupplier = (s: Supplier) => {
    setSelectedSupplier(s);
    setSupplierSearch(s.name);
    setShowSupplierDropdown(false);
  };

  const saveNewSupplier = async () => {
    if (!newSupplierName.trim()) { setAddSupplierError('Name is required'); return; }
    setAddingSupplier(true);
    setAddSupplierError('');
    const { data, error } = await supabase
      .from('parties')
      .insert({ name: newSupplierName.trim(), phone: newSupplierPhone.trim() || null, type: 'supplier', tenant_id: tenantId })
      .select('id, name, phone')
      .single();
    setAddingSupplier(false);
    if (error) { setAddSupplierError(error.message); return; }
    if (data) {
      await queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] });
      selectSupplier(data as Supplier);
    }
    setShowAddSupplier(false);
    setNewSupplierName('');
    setNewSupplierPhone('');
  };

  const openAddItemModal = (prefillName?: string, existingItem?: Item, prefillCost?: number, prefillQuantity?: number) => {
    const raw = (prefillName ?? existingItem?.name ?? itemSearch).trim();
    const isDigits = /^\d{5,}$/.test(raw);
    setEditingItemId(existingItem?.id || null);
    setNewItemName(existingItem?.name || (isDigits ? '' : raw));
    setNewItemBarcode(existingItem?.barcode || (isDigits ? raw : ''));
    setNewItemSku(existingItem?.sku || '');
    setNewItemBrand(existingItem?.brand || '');
    setNewItemCategoryId(existingItem?.category_id || '');
    setNewItemCost(existingItem?.cost?.toString() || prefillCost?.toString() || quickCost || '');
    setNewItemPrice(existingItem?.price?.toString() || '');
    setNewItemMrp(existingItem?.mrp?.toString() || '');
    setNewItemImage(null);
    setNewItemImagePreview(existingItem?.image_url || null);
    if (prefillQuantity) setQuickQty(prefillQuantity);
    setAddItemError('');
    setShowItemDropdown(false);
    setShowAddItem(true);
  };

  const saveNewItem = async () => {
    const costNum = Number(newItemCost);
    const priceNum = Number(newItemPrice);
    const mrpNum = newItemMrp === '' ? null : Number(newItemMrp);
    if (!newItemName.trim() || !newItemCategoryId || newItemCost === '' || newItemPrice === '') {
      setAddItemError('Name, category, unit cost, and selling price are required');
      return;
    }
    if (!Number.isFinite(costNum) || costNum < 0 || !Number.isFinite(priceNum) || priceNum <= 0 || (mrpNum !== null && (!Number.isFinite(mrpNum) || mrpNum < 0))) {
      setAddItemError('Enter valid non-negative cost/MRP and a selling price greater than zero');
      return;
    }
    setAddingItem(true);
    setAddItemError('');
    try {
      let created = await api.products.findOrCreate(tenantId, {
        id: editingItemId,
        name: newItemName.trim(),
        barcode: newItemBarcode.trim() || undefined,
        sku: newItemSku.trim() || undefined,
        brand: newItemBrand.trim() || undefined,
        category_id: newItemCategoryId,
        cost: costNum,
        price: priceNum,
        mrp: mrpNum,
      });

      if (newItemImage) {
        const image_url = await uploadProcessedImage({
          file: newItemImage,
          sku: created.sku,
          barcode: created.barcode,
          itemId: created.id,
        });
        created = await api.products.findOrCreate(tenantId, {
          id: created.id,
          name: created.name,
          image_url,
          cost: created.cost,
          price: created.price,
          mrp: created.mrp,
          category_id: created.category_id,
        });
      }

      const completeItem: Item = {
        id: created.id,
        name: created.name,
        sku: created.sku || undefined,
        barcode: created.barcode || undefined,
        cost: created.cost ?? costNum ?? 0,
        price: created.price ?? priceNum ?? 0,
        mrp: created.mrp ?? undefined,
        brand: created.brand ?? undefined,
        category_id: created.category_id,
        image_url: created.image_url,
      };
      if (editingItemId) {
        setLines(previous => previous.map(line => line.item.id === editingItemId ? { ...line, item: completeItem } : line));
      } else {
        addItem(completeItem);
      }
      setPendingOcrItems(previous => previous.filter(candidate => candidate.name.trim().toLowerCase() !== completeItem.name.trim().toLowerCase()));

      await queryClient.invalidateQueries({ queryKey: ['items'] });
      setShowAddItem(false);
      setNewItemName('');
      setNewItemBarcode('');
      setNewItemSku('');
      setNewItemBrand('');
      setNewItemCategoryId('');
      setNewItemCost('');
      setNewItemPrice('');
      setNewItemMrp('');
      setNewItemImage(null);
      setNewItemImagePreview(null);
      setEditingItemId(null);
    } catch (err: any) {
      setAddItemError(err?.message || 'Failed to create item');
    } finally {
      setAddingItem(false);
    }
  };

  const applyReceiptScan = async (result: ReceiptOcrResult) => {
    if (result.supplier) {
      if (result.supplier.id) {
        selectSupplier(result.supplier);
      } else {
        // Unregistered supplier name from receipt/filename
        setSupplierSearch(result.supplier.name);
      }
    }
    if (result.invoiceNumber) setInvoiceNumber(result.invoiceNumber);
    if (result.invoiceDate) {
      // Normalise date to YYYY-MM-DD for the date input (accepts DD/MM/YY, YY/MM/DD etc.)
      const parts = result.invoiceDate.split(/[-/._]/);
      if (parts.length === 3) {
        const [dd, mm, yy] = parts.map(Number); // filename format: DD-MM-YY
        const yyyy = yy < 100 ? 2000 + yy : yy;
        setInvoiceDate(`${String(yyyy).padStart(4,'0')}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`);
      } else {
        setInvoiceDate(result.invoiceDate);
      }
    }
    if (result.invoiceTotal) setInvoiceTotal(result.invoiceTotal);

    if (result.items && result.items.length > 0) {
      // Look up existing items, but keep unknown OCR candidates out of inventory
      // until staff explicitly completes the item form and saves it.
      const pendingCandidates: PendingOcrItem[] = [];
      for (const scannedItem of result.items) {
        const rawName = scannedItem.name.trim();
        if (!rawName) continue;
        const queryTerm = rawName.slice(0, 20);
        let matched: Item | null = null;

        const { data } = await supabase
          .from('items')
          .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
          .ilike('name', `%${queryTerm}%`)
          .eq('is_active', true)
          .limit(1);

        if (data && data.length > 0) {
          matched = data[0] as unknown as Item;
        } else {
          pendingCandidates.push(scannedItem);
        }

        pendingCandidates.push({ ...scannedItem, match: matched || undefined });
      }
      if (pendingCandidates.length > 0) {
        setPendingOcrItems(previous => {
          const existing = new Set(previous.map(candidate => candidate.name.trim().toLowerCase()));
          return [...previous, ...pendingCandidates.filter(candidate => !existing.has(candidate.name.trim().toLowerCase()))];
        });
      }
    }
  };

  // ── Item search ─────────────────────────────────────────────────
  useEffect(() => {
    if (debouncedItemSearch.length < 2) {
      return;
    }
    let cancelled = false;
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
        .or(`name.ilike.%${debouncedItemSearch}%,sku.ilike.%${debouncedItemSearch}%,barcode.ilike.%${debouncedItemSearch}%`)
        .eq('is_active', true)
        .limit(10);
      if (!cancelled && !error && data) {
        setItemResults(data as unknown as Item[]);
      }
    };
    fetchItems();
    return () => { cancelled = true; };
  }, [debouncedItemSearch]);

  const addItem = (item: Item, quantityOverride?: number) => {
    const cost = quickCost ? parseFloat(quickCost) : (item.cost ?? item.price ?? 0);
    const quantity = quantityOverride || quickQty;
    setLines(prev => {
      const existing = prev.findIndex(l => l.item.id === item.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + quantity,
          unitCost: cost,
        };
        return updated;
      }
      return [...prev, { item, quantity, unitCost: cost }];
    });
    setItemSearch('');
    setItemResults([]);
    setQuickQty(1);
    setQuickCost('');
  };

  const removeLine = (index: number) =>
    setLines(prev => prev.filter((_, i) => i !== index));

  // ── Calculations ────────────────────────────────────────────────
  const totalCost = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  const paid = parseFloat(amountPaid) || 0;
  const payable = Math.max(0, totalCost - paid);
  const hasIncompleteLines = lines.some(line => !line.item.category_id || !line.item.price || line.item.price <= 0);

  // ── Submit ──────────────────────────────────────────────────────
  const submit = async (asDraft: boolean) => {
    setError('');
    setSuccess('');
    if (!selectedSupplier) { setError('Please select a supplier'); return; }
    if (lines.length === 0) { setError('Add at least one item'); return; }
    if (hasIncompleteLines) { setError('Complete category and selling price for every receipt line before posting'); return; }
    if (paid > totalCost) { setError('Amount paid cannot exceed total cost'); return; }

    setLoading(true);
    const itemsJson = lines.map(l => ({
      item_id: l.item.id,
      quantity: l.quantity,
      unit_cost: l.unitCost,
    }));

    const { error } = await supabase.rpc('record_purchase_v2', {
      p_idempotency_key: `pr_${Date.now()}_${selectedSupplier.id}`,
      p_tenant_id: tenantId,
      p_store_id: storeId,
      p_supplier_id: selectedSupplier.id,
      p_invoice_number: invoiceNumber || null,
      p_invoice_total: invoiceTotal ? parseFloat(invoiceTotal) : null,
      p_items: itemsJson,
      p_amount_paid: paid,
      p_status: asDraft ? 'draft' : 'posted',
      p_notes: invoiceDate ? `Invoice Date: ${invoiceDate}` : null,
    });

    setLoading(false);
    if (error) {
      setError(error.message || 'Submission failed');
    } else {
      setSuccess(asDraft ? 'Draft saved!' : 'Purchase posted successfully!');
      if (purchaseDraftKey && typeof window !== 'undefined') {
        window.localStorage.removeItem(purchaseDraftKey);
        skipDraftPersistenceRef.current = true;
        setDraftRestored(false);
      }
      // Reset form
      setSelectedSupplier(null);
      setSupplierSearch('');
      setInvoiceNumber('');
      setInvoiceDate('');
      setInvoiceTotal('');
      setLines([]);
      setAmountPaid('0');
    }
  };

  return (
    <div className={clsx('app-warm p-6 max-w-5xl mx-auto pb-24 lg:pb-6')}>
      <PageHeader
        title="Purchase Receiving"
        subtitle="Record incoming stock from suppliers."
      />

      {draftRestored && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text-muted" role="status">
          Unsaved purchase work was restored from this store on this device.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-xl"
          style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-strong)', color: 'var(--color-danger)' }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="mb-4 p-4 rounded-xl"
          style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-strong)', color: 'var(--color-success)' }}
        >
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">

          <ReceiptScanPanel suppliers={suppliers} onApply={applyReceiptScan} />

          {/* Supplier */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="supplier-search" className="text-sm text-text-muted font-medium">Supplier</label>
              <button
                type="button"
                onClick={() => { setShowAddSupplier(true); setNewSupplierName(supplierSearch); setAddSupplierError(''); }}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <Plus size={13} /> Add new
              </button>
            </div>
            <div className="relative" ref={supplierComboRef}>
              <div className="flex items-center gap-2">
                <Search size={16} className="text-text-muted" aria-hidden="true" />
                <input
                  id="supplier-search"
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSupplierDropdown}
                  aria-haspopup="listbox"
                  aria-controls="supplier-listbox"
                  aria-activedescendant={undefined}
                  value={supplierSearch}
                  onChange={e => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Search supplier by name or phone..."
                  className="flex-1 bg-transparent border-none outline-none text-sm w-full py-2"
                />
              </div>
              {showSupplierDropdown && (
                <div
                  id="supplier-listbox"
                  role="listbox"
                  aria-label="Suppliers"
                  className="absolute z-10 top-full left-0 right-0 mt-2 bg-card border border-border-color rounded-xl max-h-48 overflow-y-auto shadow-lg"
                >
                  {suppliersLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-4 py-3">
                        <SkeletonBlock className="w-3/5 h-4" />
                        <SkeletonBlock className="w-2/5 h-3 mt-2" />
                      </div>
                    ))
                  ) : filteredSuppliers.length === 0 ? (
                    <div role="option" aria-selected="false" className="p-4 text-text-muted text-sm text-center">No suppliers found</div>
                  ) : filteredSuppliers.map(s => (
                    <button
                      key={s.id}
                      role="option"
                      aria-selected={selectedSupplier?.id === s.id}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="invoice-number" className="block text-sm text-text-muted mb-2 font-medium">Invoice # (optional)</label>
                <input
                  id="invoice-number"
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="INV-2026-001"
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="invoice-date" className="block text-sm text-text-muted mb-2 font-medium">Invoice Date</label>
                <input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="invoice-total" className="block text-sm text-text-muted mb-2 font-medium">Invoice Total (৳)</label>
                <input
                  id="invoice-total"
                  type="number"
                  value={invoiceTotal}
                  onChange={e => setInvoiceTotal(e.target.value)}
                  placeholder="0.00"
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Item Quick Add */}
          <div className="card p-4">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="item-search" className="text-sm text-text-muted font-medium">Add Items (barcode / SKU / name)</label>
              <button
                type="button"
                onClick={() => openAddItemModal()}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <Plus size={13} /> Add new item
              </button>
            </div>
            <div className="relative" ref={itemComboRef}>
              <div className="flex items-center gap-2 mb-3">
                <Search size={16} className="text-text-muted absolute left-3" aria-hidden="true" />
                <input
                  id="item-search"
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showItemDropdown && debouncedItemSearch.length >= 2}
                  aria-haspopup="listbox"
                  aria-controls="item-listbox"
                  value={itemSearch}
                  onChange={e => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => {
                    if (itemSearch.trim().length >= 2) setShowItemDropdown(true);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && debouncedItemSearch.trim().length >= 2 && itemResults.length === 0) {
                      e.preventDefault();
                      openAddItemModal(debouncedItemSearch.trim());
                    }
                  }}
                  placeholder="Scan barcode or search item..."
                  className="input w-full pl-10"
                />
              </div>
              {showItemDropdown && debouncedItemSearch.length >= 2 && (
                <div
                  id="item-listbox"
                  role="listbox"
                  aria-label="Items"
                  className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border-color rounded-xl max-h-56 overflow-y-auto shadow-lg divide-y divide-border-color/40"
                >
                  {itemResults.length === 0 ? (
                    <div className="p-3 text-center text-text-muted text-sm">
                      No matching items in database
                    </div>
                  ) : (
                    itemResults.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => addItem(item)}
                        className="w-full text-left px-4 py-3 hover:bg-border-light flex justify-between items-center transition-colors"
                      >
                        <div>
                          <div className="font-medium text-text-main">{item.name}</div>
                          <div className="text-text-muted text-xs">{item.sku || ''} {item.barcode || ''}</div>
                        </div>
                        <div className="font-bold shrink-0 ml-3 text-text-main">৳ {item.cost ?? item.price ?? 0}</div>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => openAddItemModal(debouncedItemSearch.trim())}
                    className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center gap-2 text-primary text-sm font-medium transition-colors"
                  >
                    <Plus size={15} />
                    <span>Add &ldquo;{debouncedItemSearch.trim()}&rdquo; as new item</span>
                  </button>
                </div>
              )}
            </div>

            {pendingOcrItems.length > 0 && (
              <div className="card p-4 border-amber-300/40 bg-amber-50/5" role="region" aria-label="Receipt items awaiting review">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-text-main">Receipt items awaiting review</h3>
                    <p className="mt-1 text-sm text-text-muted">
                      These OCR candidates were not found in inventory. Complete each item before adding it to this receipt.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {pendingOcrItems.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {pendingOcrItems.map((candidate) => (
                    <div key={`${candidate.name}-${candidate.quantity}`} className="flex items-center justify-between gap-3 rounded-lg border border-border-color px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-text-main">{candidate.name}</div>
                        <div className="text-xs text-text-muted">
                          Qty: {candidate.quantity}{candidate.unitPrice ? ` · Cost: ৳${candidate.unitPrice}` : ''}
                        </div>
                      </div>
                      {candidate.match ? (
                        <button
                          type="button"
                          onClick={() => {
                            addItem(candidate.match!, candidate.quantity);
                            setPendingOcrItems(previous => previous.filter(item => item !== candidate));
                          }}
                          className="shrink-0 text-sm font-medium text-primary hover:underline"
                        >
                          Add existing item
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAddItemModal(candidate.name, undefined, candidate.unitPrice, candidate.quantity)}
                          className="shrink-0 text-sm font-medium text-primary hover:underline"
                        >
                          Complete item
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-3">
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
              <h3 className="font-semibold text-text-main">Receipt Lines ({lines.length})</h3>
            </div>
            {lines.length === 0 ? (
              <div className="p-8 text-center">
                <Package size={32} className="mx-auto text-text-muted mb-3 opacity-50" />
                <p className="text-text-muted text-sm">No items added yet. Search or scan items above.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-color">
                {lines.map((l, i) => (
                  <div key={l.item.id} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {l.item.name}
                        {(!l.item.category_id || !l.item.price || l.item.price <= 0) && (
                          <button type="button" onClick={() => openAddItemModal(undefined, l.item)} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200">Needs details</button>
                        )}
                      </div>
                      <div className="text-text-muted text-sm">
                        {l.quantity} × ৳{l.unitCost} = ৳{(l.quantity * l.unitCost).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openAddItemModal(undefined, l.item)} className="text-text-muted hover:text-text-main transition-colors" aria-label={`Edit ${l.item.name}`}><Pencil size={16} /></button>
                      <button type="button" onClick={() => removeLine(i)} className="text-color-danger hover:opacity-80 transition-opacity" aria-label={`Remove ${l.item.name}`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary + Actions — desktop sidebar */}
        <div className="hidden lg:block space-y-6">
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
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="input w-full"
                />
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
                title="Post purchase receipt to ledger"
                onClick={() => submit(false)}
                disabled={loading}
                className="button-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {loading ? 'Posting...' : 'POST RECEIPT'}
              </button>
              <button
                title="Save purchase as draft"
                onClick={() => submit(true)}
                disabled={loading}
                className="button-outline w-full py-3 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky action bar (shown only below lg) ──────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border-color px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-muted">Total</div>
          <div className="font-bold text-text-main tabular-nums">৳ {totalCost.toFixed(2)}</div>
        </div>
        <button
          title="Save purchase as draft"
          onClick={() => submit(true)}
          disabled={loading}
          className="button-outline px-4 py-2 flex items-center gap-2 shrink-0"
        >
          <Save size={16} />
          <span className="hidden sm:inline">Draft</span>
        </button>
        <button
          title="Post purchase receipt to ledger"
          onClick={() => submit(false)}
          disabled={loading}
          className="button-primary px-4 py-2 flex items-center gap-2 shrink-0"
          style={{ width: 'auto' }}
        >
          <Send size={16} />
          {loading ? 'Posting\u2026' : 'POST'}
        </button>
      </div>

      {/* ── Add Supplier Modal ─────────────────────────────────────── */}
      {showAddSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddSupplier(false); }}
        >
          <div className="bg-card border border-border-color rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-text-main text-base">Add New Supplier</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowAddSupplier(false)}
                className="text-text-muted hover:text-text-main transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-medium">Name *</label>
                <input
                  type="text"
                  autoFocus
                  value={newSupplierName}
                  onChange={e => setNewSupplierName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void saveNewSupplier(); }}
                  placeholder="e.g. Savoy Ice Cream"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-medium">Phone (optional)</label>
                <input
                  type="tel"
                  value={newSupplierPhone}
                  onChange={e => setNewSupplierPhone(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void saveNewSupplier(); }}
                  placeholder="01XXXXXXXXX"
                  className="input w-full"
                />
              </div>
              {addSupplierError && (
                <p className="text-xs text-color-danger">{addSupplierError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddSupplier(false)}
                className="button-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveNewSupplier()}
                disabled={addingSupplier}
                className="button-primary flex-1"
              >
                {addingSupplier ? 'Saving…' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Item Modal ─────────────────────────────────────────── */}
      {showAddItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddItem(false); }}
        >
          <div className="bg-card border border-border-color rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-text-main text-base">Add New Item</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowAddItem(false)}
                className="text-text-muted hover:text-text-main transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3 rounded-xl border border-dashed border-border-color p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-border-light">
                  {newItemImagePreview ? <img src={newItemImagePreview} alt="Product preview" className="h-full w-full object-cover" /> : <Package className="m-5 text-text-muted" size={24} aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <input ref={itemImageInputRef} type="file" accept="image/*" className="hidden" onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) { setAddItemError('Choose a valid image file'); return; }
                    setNewItemImage(file);
                    setNewItemImagePreview(URL.createObjectURL(file));
                  }} />
                  <button type="button" onClick={() => itemImageInputRef.current?.click()} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Upload size={14} /> {newItemImagePreview ? 'Change image' : 'Upload image'}</button>
                  <p className="mt-1 text-xs text-text-muted">Optional. Converted to WebP before upload.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-medium">Item Name *</label>
                <input
                  type="text"
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void saveNewItem(); }}
                  placeholder="e.g. Milk 1L or Coca-Cola 500ml"
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="new-item-category" className="block text-xs text-text-muted mb-1.5 font-medium">Category *</label>
                <select id="new-item-category" value={newItemCategoryId} onChange={event => setNewItemCategoryId(event.target.value)} className="input w-full">
                  <option value="">Select a category</option>
                  {categoryOptions.roots.map(root => {
                    const children = categoryOptions.childrenByParent.get(root.id) || [];
                    const label = root.name || root.category;
                    return children.length ? <optgroup key={root.id} label={label}>{children.map(child => <option key={child.id} value={child.id}>{child.name || child.category}</option>)}</optgroup> : <option key={root.id} value={root.id}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-medium">Barcode (optional)</label>
                <input
                  type="text"
                  value={newItemBarcode}
                  onChange={e => setNewItemBarcode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void saveNewItem(); }}
                  placeholder="Scan or enter barcode"
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 font-medium">SKU (optional)</label>
                  <input type="text" value={newItemSku} onChange={e => setNewItemSku(e.target.value)} placeholder="GEN-XXXXX if blank" className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 font-medium">Brand (optional)</label>
                  <input type="text" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} placeholder="e.g. Nestlé" className="input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 font-medium">Unit Cost (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newItemCost}
                    onChange={e => setNewItemCost(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void saveNewItem(); }}
                    placeholder="0"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 font-medium">Selling Price (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void saveNewItem(); }}
                    placeholder="0"
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 font-medium">MRP (optional)</label>
                  <input type="number" min="0" step="0.01" value={newItemMrp} onChange={e => setNewItemMrp(e.target.value)} placeholder="0.00" className="input w-full" />
                </div>
                <div className="rounded-lg bg-border-light px-3 py-2">
                  <div className="text-xs text-text-muted">Gross margin</div>
                  <div className="font-semibold text-text-main">{newItemCost !== '' && newItemPrice !== '' && Number(newItemPrice) > 0 ? `${(((Number(newItemPrice) - Number(newItemCost)) / Number(newItemPrice)) * 100).toFixed(1)}%` : '—'}</div>
                </div>
              </div>
              {addItemError && (
                <p className="text-xs text-color-danger">{addItemError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="button-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveNewItem()}
                disabled={addingItem || !newItemName.trim() || !newItemCategoryId || newItemCost === '' || newItemPrice === ''}
                className="button-primary flex-1"
              >
                {addingItem ? 'Saving…' : editingItemId ? 'Save details' : 'Add to Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
