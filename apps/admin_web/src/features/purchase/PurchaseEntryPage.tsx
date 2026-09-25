import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  candidates?: Item[];
  selectedMatchId?: string;
};

type PurchaseDraftSnapshot = {
  idempotencyKey?: string;
  retryAttempt?: PurchaseRetryAttempt;
  supplierSearch: string;
  selectedSupplier: Supplier | null;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTotal: string;
  lines: ReceiptLine[];
  amountPaid: string;
  paymentMethod: PaymentMethod;
  itemSearch: string;
  quickQty: number;
  quickCost: string;
  pendingOcrItems: PendingOcrItem[];
};

type PurchaseFormSnapshot = Omit<PurchaseDraftSnapshot, 'idempotencyKey' | 'retryAttempt'>;
type PurchaseRpcArgs = {
  p_idempotency_key: string;
  p_tenant_id: string | null;
  p_store_id: string | null;
  p_supplier_id: string;
  p_invoice_number: string | null;
  p_invoice_total: number | null;
  p_items: Array<{ item_id: string; quantity: number; unit_cost: number }>;
  p_amount_paid: number;
  p_payment_account_id: string | null;
  p_payable_account_id: string | null;
  p_status: 'draft' | 'posted';
  p_notes: string | null;
};
type PurchaseRetryAttempt = {
  idempotencyKey: string;
  form: PurchaseFormSnapshot;
  args: PurchaseRpcArgs;
};

type PaymentMethod = 'Cash' | 'Bank transfer' | 'Bkash';

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
};

const OCR_CONFIDENCE_STYLES: Record<'high' | 'medium' | 'low', React.CSSProperties> = {
  high: { color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' },
  medium: { color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' },
  low: { color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' },
};

const createPurchaseIdempotencyKey = () =>
  `pr_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

function normalizeReceiptDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split(/[-/._]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  const [first, second, third] = parts;
  const [day, month, year] = first >= 1000
    ? [third, second, first]
    : [first, second, third < 1000 ? 2000 + third : third];
  if (month < 1 || month > 12 || day < 1 || day > 31) return value;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return value;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

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
  const supplierDialogRef = useRef<HTMLDivElement>(null);
  const itemDialogRef = useRef<HTMLDivElement>(null);
  const dialogOpenerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = showAddSupplier ? supplierDialogRef.current : showAddItem ? itemDialogRef.current : null;
    if (!dialog) return;
    const opener = dialogOpenerRef.current;
    const getControls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    getControls()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddSupplier) setShowAddSupplier(false);
        else setShowAddItem(false);
      } else if (event.key === 'Tab') {
        const controls = getControls();
        if (!controls.length) return;
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls[controls.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
          event.preventDefault();
          controls[0].focus();
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) getControls()[0]?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      if (opener?.isConnected) opener.focus();
    };
  }, [showAddSupplier, showAddItem]);
  const [pendingOcrItems, setPendingOcrItems] = useState<PendingOcrItem[]>([]);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);

  // Auth context
  const { tenantId, storeId } = useAuth();
  const queryClient = useQueryClient();
  const purchaseDraftKey = useMemo(
    () => tenantId && storeId ? `lucky-store:purchase-draft:${tenantId}:${storeId}` : null,
    [storeId, tenantId],
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const [purchaseIdempotencyKey, setPurchaseIdempotencyKey] = useState(createPurchaseIdempotencyKey);
  const [retryAttempt, setRetryAttempt] = useState<PurchaseRetryAttempt | null>(null);
  const receiptScanGenerationRef = useRef(0);
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
        if (typeof draft.idempotencyKey === 'string' && draft.idempotencyKey) setPurchaseIdempotencyKey(draft.idempotencyKey);
        if (draft.retryAttempt?.idempotencyKey && draft.retryAttempt.args) setRetryAttempt(draft.retryAttempt);
        if (typeof draft.supplierSearch === 'string') setSupplierSearch(draft.supplierSearch);
        if (draft.selectedSupplier) setSelectedSupplier(draft.selectedSupplier);
        if (typeof draft.invoiceNumber === 'string') setInvoiceNumber(draft.invoiceNumber);
        if (typeof draft.invoiceDate === 'string') setInvoiceDate(draft.invoiceDate);
        if (typeof draft.invoiceTotal === 'string') setInvoiceTotal(draft.invoiceTotal);
        if (Array.isArray(draft.lines)) setLines(draft.lines);
        if (typeof draft.amountPaid === 'string') setAmountPaid(draft.amountPaid);
        if (draft.paymentMethod === 'Cash' || draft.paymentMethod === 'Bank transfer' || draft.paymentMethod === 'Bkash') {
          setPaymentMethod(draft.paymentMethod);
        }
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
      idempotencyKey: purchaseIdempotencyKey,
      retryAttempt: retryAttempt ?? undefined,
      supplierSearch,
      selectedSupplier,
      invoiceNumber,
      invoiceDate,
      invoiceTotal,
      lines,
      amountPaid,
      paymentMethod,
      itemSearch,
      quickQty,
      quickCost,
      pendingOcrItems,
    };

    try {
      const hasWork = Boolean(
        supplierSearch || selectedSupplier || invoiceNumber || invoiceDate || invoiceTotal ||
        lines.length || pendingOcrItems.length || itemSearch || quickCost || amountPaid !== '0' || paymentMethod !== 'Cash',
      );
      if (hasWork) {
        window.localStorage.setItem(purchaseDraftKey, JSON.stringify(snapshot));
      } else {
        window.localStorage.removeItem(purchaseDraftKey);
      }
    } catch {
      // Local draft recovery is best-effort and must never block receiving.
    }
  }, [amountPaid, invoiceDate, invoiceNumber, invoiceTotal, itemSearch, lines, paymentMethod, pendingOcrItems, purchaseDraftKey, purchaseIdempotencyKey, quickCost, quickQty, retryAttempt, selectedSupplier, supplierSearch]);

  const currentFormSnapshot: PurchaseFormSnapshot = {
    supplierSearch, selectedSupplier, invoiceNumber, invoiceDate, invoiceTotal, lines,
    amountPaid, paymentMethod, itemSearch, quickQty, quickCost, pendingOcrItems,
  };
  const currentFormSnapshotRef = useRef(currentFormSnapshot);
  useLayoutEffect(() => {
    currentFormSnapshotRef.current = currentFormSnapshot;
  });

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

  const { data: accounts = [] } = useQuery({
    queryKey: ['purchase-ledger-accounts', storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ledger_accounts')
        .select('id, code, name, account_type')
        .eq('store_id', storeId!)
        .order('code');
      if (error) throw error;
      return (data || []) as Account[];
    },
  });

  const payableAccount = accounts.find(account => account.code === '2000_ACCOUNTS_PAYABLE');
  const paymentAccount = useMemo(() => {
    const accountCodeByMethod: Record<PaymentMethod, string> = {
      Cash: '1000_CASH',
      'Bank transfer': '1010_BANK',
      Bkash: '1010_BANK',
    };
    return accounts.find(account => account.code === accountCodeByMethod[paymentMethod]);
  }, [accounts, paymentMethod]);

  const paymentAccountId = paymentAccount?.id || '';

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
    dialogOpenerRef.current = document.activeElement as HTMLElement | null;
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
        barcode: newItemBarcode.trim() || null,
        sku: newItemSku.trim() || null,
        brand: newItemBrand.trim() || null,
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
        addItem(completeItem, quickQty, costNum);
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
    const scanGeneration = receiptScanGenerationRef.current;
    if (result.warnings) setOcrWarnings(result.warnings);
    else setOcrWarnings([]);
    if (result.supplier) {
      if (result.supplier.id) {
        selectSupplier(result.supplier);
      } else {
        // Unregistered supplier name from receipt/filename
        setSelectedSupplier(null);
        setSupplierSearch(result.supplier.name);
      }
    }
    if (result.invoiceNumber) {
      setInvoiceNumber(result.invoiceNumber);
      if (tenantId && result.supplier?.id) {
        const fetchDuplicate = async () => {
          const { data } = await supabase
            .from('purchase_receipts')
            .select('id, supplier_id, invoice_number, created_at')
            .eq('tenant_id', tenantId)
            .eq('supplier_id', result.supplier!.id)
            .eq('invoice_number', result.invoiceNumber!)
            .limit(1);
          if (data && data.length > 0 && scanGeneration === receiptScanGenerationRef.current) {
            setOcrWarnings(prev => [
              ...prev,
              `The invoice number "${result.invoiceNumber}" already exists for this supplier (recorded on ${new Date(data[0].created_at).toLocaleDateString()}). Please verify this isn't a duplicate.`
            ]);
          }
        };
        void fetchDuplicate();
      }
    }
    if (result.invoiceDate) {
      setInvoiceDate(normalizeReceiptDate(result.invoiceDate));
    }
    if (result.invoiceTotal) setInvoiceTotal(result.invoiceTotal);

    if (result.items && result.items.length > 0) {
      // Look up existing items, but keep unknown OCR candidates out of inventory
      // until staff explicitly completes the item form and saves it.
      const pendingCandidates: PendingOcrItem[] = [];
      for (const scannedItem of result.items) {
        const rawName = scannedItem.name.trim();
        if (!rawName) continue;
        let matched: Item | null = null;

        const escapedName = rawName.replace(/[\\%_]/g, '\\$&');
        const { data } = await supabase
          .from('items')
          .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
          .ilike('name', escapedName)
          .eq('is_active', true);

        if (data) {
          if (data.length === 1) {
            matched = data[0] as unknown as Item;
          }
        }

        pendingCandidates.push({
          ...scannedItem,
          match: matched || undefined,
          candidates: data as unknown as Item[] | undefined,
        });
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

  const addItem = (item: Item, quantityOverride?: number, unitCostOverride?: number) => {
    const cost = unitCostOverride ?? (quickCost ? parseFloat(quickCost) : (item.cost ?? item.price ?? 0));
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

  const handleDiscardRetryAttempt = () => {
    if (loading) return;
    setRetryAttempt(null);
    setPurchaseIdempotencyKey(createPurchaseIdempotencyKey());
  };

  // ── Submit ──────────────────────────────────────────────────────
  const submit = async (asDraft: boolean) => {
    setError('');
    setSuccess('');
    let attempt = retryAttempt;
    if (!attempt) {
      if (!selectedSupplier) { setError('Please select a supplier'); return; }
      if (lines.length === 0) { setError('Add at least one item'); return; }
      if (!asDraft && hasIncompleteLines) { setError('Complete category and selling price for every receipt line before posting'); return; }
      if (paid > totalCost) { setError('Amount paid cannot exceed total cost'); return; }
      if (!asDraft && paid > 0 && !paymentAccountId) {
        setError(`${paymentMethod} account is not configured for this tenant`);
        return;
      }
      if (!asDraft && payable > 0 && !payableAccount?.id) {
        setError('Accounts Payable account is not configured for this tenant');
        return;
      }

      const idempotencyKey = purchaseIdempotencyKey;
      const args: PurchaseRpcArgs = {
        p_idempotency_key: idempotencyKey,
        p_tenant_id: tenantId,
        p_store_id: storeId,
        p_supplier_id: selectedSupplier.id,
        p_invoice_number: invoiceNumber || null,
        p_invoice_total: invoiceTotal ? parseFloat(invoiceTotal) : null,
        p_items: lines.map(line => ({ item_id: line.item.id, quantity: line.quantity, unit_cost: line.unitCost })),
        p_amount_paid: paid,
        p_payment_account_id: paid > 0 ? paymentAccountId : null,
        p_payable_account_id: payable > 0 ? payableAccount?.id ?? null : null,
        p_status: asDraft ? 'draft' : 'posted',
        p_notes: invoiceDate ? `Invoice Date: ${invoiceDate}` : null,
      };
      attempt = { idempotencyKey, form: currentFormSnapshot, args };
      setRetryAttempt(attempt);
    }

    setLoading(true);
    if (purchaseDraftKey && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(purchaseDraftKey, JSON.stringify({
          ...attempt.form,
          idempotencyKey: attempt.idempotencyKey,
          retryAttempt: attempt,
        } satisfies PurchaseDraftSnapshot));
      } catch {
        // Retain the immutable attempt in component state if storage is unavailable.
      }
    }

    let error: { message: string } | null = null;
    try {
      ({ error } = await supabase.rpc('record_purchase_v2', attempt.args));
    } catch (requestError) {
      error = { message: requestError instanceof Error ? requestError.message : 'Submission failed. Retry safely.' };
    }

    setLoading(false);
    if (error) {
      setError(error.message || 'Submission failed');
    } else {
      receiptScanGenerationRef.current += 1;
      const currentFormUnchanged = JSON.stringify(currentFormSnapshotRef.current) === JSON.stringify(attempt.form);
      setSuccess(currentFormUnchanged
        ? (attempt.args.p_status === 'draft' ? 'Draft saved!' : 'Purchase posted successfully!')
        : `${attempt.args.p_status === 'draft' ? 'Draft saved' : 'Purchase posted'} from the earlier submission. Your newer edits were kept.`);
      setRetryAttempt(null);
      if (currentFormUnchanged) {
        if (purchaseDraftKey && typeof window !== 'undefined') {
          window.localStorage.removeItem(purchaseDraftKey);
          skipDraftPersistenceRef.current = true;
          setDraftRestored(false);
        }
        setSelectedSupplier(null);
        setSupplierSearch('');
        setInvoiceNumber('');
        setInvoiceDate('');
        setInvoiceTotal('');
        setLines([]);
        setPendingOcrItems([]);
        setOcrWarnings([]);
        setAmountPaid('0');
        setPaymentMethod('Cash');
      }
      setPurchaseIdempotencyKey(createPurchaseIdempotencyKey());
    }
  };

  return (
    <div className={clsx('app-warm mx-auto max-w-6xl p-4 pb-28 sm:p-6 lg:pb-6')}>
      <PageHeader
        title="Purchase Receiving"
        subtitle="Record incoming stock from suppliers."
      />

      {draftRestored && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text-muted" role="status">
          Unsaved purchase work was restored from this store on this device.
        </div>
      )}
      {retryAttempt && (
        <div className="mb-4 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-text-main flex flex-wrap items-center justify-between gap-2" role="status">
          <span className="flex-1">
            A previous {retryAttempt.args.p_status === 'draft' ? 'draft save' : 'receipt post'} may have completed. Retry sends that exact submission with its original idempotency key. Changes made since then are kept separately.
          </span>
          <button
            type="button"
            onClick={handleDiscardRetryAttempt}
            disabled={loading}
            className="text-xs font-semibold underline hover:no-underline text-text-main shrink-0"
          >
            Discard retry &amp; start new attempt
          </button>
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

          <ReceiptScanPanel
            suppliers={suppliers}
            onApply={applyReceiptScan}
            onScanStart={() => { receiptScanGenerationRef.current += 1; }}
          />

          {/* Supplier */}
          <section className="card p-4" aria-labelledby="purchase-supplier-heading">
            <div className="flex items-center justify-between mb-2">
              <h2 id="purchase-supplier-heading" className="text-sm font-semibold text-text-main">Supplier</h2>
              <button
                type="button"
                onClick={event => { dialogOpenerRef.current = event.currentTarget; setShowAddSupplier(true); setNewSupplierName(supplierSearch); setAddSupplierError(''); }}
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]"
              >
                <Plus size={13} /> Add new
              </button>
            </div>
            <div className="relative" ref={supplierComboRef}>
              <div className="input flex items-center gap-2 px-3">
                <Search size={16} strokeWidth={1.5} className="text-text-muted" aria-hidden="true" />
                <input
                  id="supplier-search"
                  type="text"
                  aria-label="Supplier"
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
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
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
                      className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-text-muted text-sm">{s.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Invoice Info */}
          <section className="card p-4" aria-labelledby="invoice-details-heading">
            <h2 id="invoice-details-heading" className="mb-4 text-sm font-semibold text-text-main">Invoice details</h2>
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
          </section>

          {/* Item Quick Add */}
          <section className="card p-4" aria-labelledby="purchase-items-heading">
            <div className="flex justify-between items-center mb-2">
              <h2 id="purchase-items-heading" className="text-sm font-semibold text-text-main">Add items</h2>
              <button
                type="button"
                onClick={() => openAddItemModal()}
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]"
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
                  aria-label="Add items by barcode, SKU, or name"
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
                        className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                      >
                        <div>
                          <div className="font-medium text-text-main">{item.name}</div>
                          <div className="text-text-muted text-xs">{item.sku || ''} {item.barcode || ''}</div>
                        </div>
                        <div className="ml-3 shrink-0 font-bold tabular-nums text-text-main">৳ {item.cost ?? item.price ?? 0}</div>
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

            {ocrWarnings.length > 0 && (
              <div className="card p-4 mb-4" style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }} role="status" aria-live="polite" aria-atomic="true">
                <h3 className="font-medium mb-2" style={{ color: 'var(--color-warning)' }}>Invoice Reconciliation Warnings</h3>
                <ul className="list-disc pl-5 text-sm font-semibold space-y-1" style={{ color: 'var(--color-warning)' }}>
                  {ocrWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {pendingOcrItems.length > 0 && (
              <div className="card p-4" style={{ borderColor: 'var(--color-warning-strong)', backgroundColor: 'var(--color-warning-bg)' }} role="region" aria-label="Receipt items awaiting review">
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
                  {pendingOcrItems.map((candidate, candidateIndex) => {
                    const hasReviewedValues = Number.isInteger(candidate.quantity) && Number(candidate.quantity) > 0
                      && candidate.unitPrice != null && Number.isFinite(candidate.unitPrice) && candidate.unitPrice >= 0;
                    const selectedMatch = candidate.match
                      ?? candidate.candidates?.find((item) => item.id === candidate.selectedMatchId);
                    return <div key={`${candidate.name}-${candidateIndex}`} className="flex items-center justify-between gap-3 rounded-lg border border-border-color px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-text-main">{candidate.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <label className="flex items-center gap-1">Qty
                            <input aria-label={`Quantity for ${candidate.name}`} type="number" min="1" step="1" value={candidate.quantity ?? ''}
                              onChange={(event) => setPendingOcrItems(previous => previous.map((item, index) => index === candidateIndex ? { ...item, quantity: event.target.value === '' ? undefined : Number(event.target.value) } : item))}
                              className="input w-20 py-1" />
                          </label>
                          <label className="flex items-center gap-1">Unit cost ৳
                            <input aria-label={`Unit cost for ${candidate.name}`} type="number" min="0" step="0.01" value={candidate.unitPrice ?? ''}
                              onChange={(event) => setPendingOcrItems(previous => previous.map((item, index) => index === candidateIndex ? { ...item, unitPrice: event.target.value === '' ? undefined : Number(event.target.value) } : item))}
                              className="input w-24 py-1" />
                          </label>
                        </div>
                        {candidate.warnings && candidate.warnings.length > 0 && (
                          <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-warning)' }}>
                            {candidate.warnings.join(' ')}
                          </div>
                        )}
                        {candidate.confidence && (
                          <div className="text-xs mt-0.5 font-medium px-1.5 py-0.5 rounded-full inline-block" style={OCR_CONFIDENCE_STYLES[candidate.confidence]}>
                            Confidence: {candidate.confidence}
                          </div>
                        )}
                      </div>
                      {candidate.candidates && candidate.candidates.length > 1 && (
                        <label className="sr-only" htmlFor={`ocr-item-match-${candidateIndex}`}>Choose inventory match for {candidate.name}</label>
                      )}
                      {candidate.candidates && candidate.candidates.length > 1 && (
                        <select id={`ocr-item-match-${candidateIndex}`} aria-label={`Inventory match for ${candidate.name}`}
                          className="input max-w-56 text-sm"
                          value={candidate.selectedMatchId || ''}
                          onChange={(event) => setPendingOcrItems(previous => previous.map((item, index) => index === candidateIndex ? { ...item, selectedMatchId: event.target.value || undefined } : item))}>
                          <option value="">Select matching SKU…</option>
                          {candidate.candidates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ''}</option>)}
                        </select>
                      )}
                      {candidate.match || (candidate.candidates && candidate.candidates.length > 1) ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasReviewedValues || !selectedMatch) return;
                            addItem(selectedMatch, candidate.quantity, candidate.unitPrice);
                            setPendingOcrItems(previous => previous.filter(item => item !== candidate));
                          }}
                          disabled={!hasReviewedValues || !selectedMatch}
                          className="shrink-0 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Add existing item
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { if (hasReviewedValues) openAddItemModal(candidate.name, undefined, candidate.unitPrice, candidate.quantity); }}
                          disabled={!hasReviewedValues}
                          className="shrink-0 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Complete item
                        </button>
                      )}
                    </div>;
                  })}
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
          </section>

          {/* Receipt Lines */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-border-color">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-text-main">Receipt lines</h2>
                <span className="rounded-full bg-[var(--bg-input)] px-2.5 py-1 text-xs font-semibold tabular-nums text-text-muted">{lines.length}</span>
              </div>
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
                      <div className="text-text-muted text-sm tabular-nums">
                        {l.quantity} × ৳{l.unitCost} = ৳{(l.quantity * l.unitCost).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openAddItemModal(undefined, l.item)} className="inline-flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-[var(--bg-input)] hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]" aria-label={`Edit ${l.item.name}`}><Pencil size={16} /></button>
                      <button type="button" onClick={() => removeLine(i)} className="inline-flex size-10 items-center justify-center rounded-md text-color-danger transition-colors hover:bg-[var(--color-danger-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-danger/40 active:scale-[0.96]" aria-label={`Remove ${l.item.name}`}><Trash2 size={16} /></button>
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
                <span className="font-bold tabular-nums">৳ {totalCost.toFixed(2)}</span>
              </div>

              <div>
                <label htmlFor="payment-method" className="block text-text-muted mb-1 font-medium">Payment Method</label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="input w-full mb-3"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank transfer">Bank Transfer</option>
                  <option value="Bkash">bKash</option>
                </select>
                <label htmlFor="cash-paid" className="block text-text-muted mb-1 font-medium">Paid Now (৳)</label>
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
                <span className={clsx("font-bold tabular-nums", payable > 0 ? 'text-color-danger' : 'text-color-success')}>
                  ৳ {payable.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {retryAttempt ? <>
                <button
                  title="Retry the exact earlier submission"
                  onClick={() => submit(retryAttempt.args.p_status === 'draft')}
                  disabled={loading}
                  className="button-primary flex w-full items-center justify-center gap-2 py-3 transition-transform active:scale-[0.96]"
                >
                  {retryAttempt.args.p_status === 'draft' ? <Save size={18} /> : <Send size={18} />}
                  {loading ? 'Retrying…' : retryAttempt.args.p_status === 'draft' ? 'RETRY EARLIER DRAFT' : 'RETRY EARLIER POST'}
                </button>
                <button
                  type="button"
                  title="Discard saved retry attempt and edit current form values with a new idempotency key"
                  onClick={handleDiscardRetryAttempt}
                  disabled={loading}
                  className="button-outline flex w-full items-center justify-center gap-2 py-2 text-xs transition-transform active:scale-[0.96]"
                >
                  Discard Retry &amp; Edit Form
                </button>
              </> : <>
              <button
                title="Post purchase receipt to ledger"
                onClick={() => submit(false)}
                disabled={loading}
                className="button-primary flex w-full items-center justify-center gap-2 py-3 transition-transform active:scale-[0.96]"
              >
                <Send size={18} />
                {loading ? 'Posting...' : 'POST RECEIPT'}
              </button>
              <button
                title="Save purchase as draft"
                onClick={() => submit(true)}
                disabled={loading}
                className="button-outline flex w-full items-center justify-center gap-2 py-3 transition-transform active:scale-[0.96]"
              >
                <Save size={18} />
                Save as Draft
              </button>
              </>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky action bar (shown only below lg) ──────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border-color bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md lg:hidden">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-muted">Total</div>
          <div className="font-bold text-text-main tabular-nums">৳ {totalCost.toFixed(2)}</div>
        </div>
        {retryAttempt ? <>
          <button
            aria-label="Retry the exact earlier submission"
            title="Retry the exact earlier submission"
            onClick={() => submit(retryAttempt.args.p_status === 'draft')}
            disabled={loading}
            className="button-primary flex shrink-0 items-center gap-2 px-4 py-2 transition-transform active:scale-[0.96]"
            style={{ width: 'auto' }}
          >
            {retryAttempt.args.p_status === 'draft' ? <Save size={16} /> : <Send size={16} />}
            {loading ? 'Retrying…' : retryAttempt.args.p_status === 'draft' ? 'RETRY DRAFT' : 'RETRY POST'}
          </button>
          <button
            type="button"
            aria-label="Discard saved retry attempt"
            title="Discard saved attempt and edit current form"
            onClick={handleDiscardRetryAttempt}
            disabled={loading}
            className="button-outline flex shrink-0 items-center gap-2 px-3 py-2 text-xs transition-transform active:scale-[0.96]"
          >
            Discard Retry
          </button>
        </> : <>
        <button
          aria-label="Save purchase as draft"
          title="Save purchase as draft"
          onClick={() => submit(true)}
          disabled={loading}
          className="button-outline flex shrink-0 items-center gap-2 px-4 py-2 transition-transform active:scale-[0.96]"
        >
          <Save size={16} />
          <span className="hidden sm:inline">Draft</span>
        </button>
        <button
          aria-label="Post purchase receipt to ledger"
          title="Post purchase receipt to ledger"
          onClick={() => submit(false)}
          disabled={loading}
          className="button-primary flex shrink-0 items-center gap-2 px-4 py-2 transition-transform active:scale-[0.96]"
          style={{ width: 'auto' }}
        >
          <Send size={16} />
          {loading ? 'Posting\u2026' : 'POST'}
        </button>
        </>}
      </div>

      {/* ── Add Supplier Modal ─────────────────────────────────────── */}
      {showAddSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddSupplier(false); }}
        >
          <div ref={supplierDialogRef} role="dialog" aria-modal="true" aria-labelledby="add-supplier-title" tabIndex={-1} className="bg-card border border-border-color rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 id="add-supplier-title" className="font-semibold text-text-main text-base">Add New Supplier</h3>
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
                <label htmlFor="new-supplier-name" className="block text-xs text-text-muted mb-1.5 font-medium">Name *</label>
                <input
                  id="new-supplier-name"
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
                <label htmlFor="new-supplier-phone" className="block text-xs text-text-muted mb-1.5 font-medium">Phone (optional)</label>
                <input
                  id="new-supplier-phone"
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
          <div ref={itemDialogRef} role="dialog" aria-modal="true" aria-labelledby="add-item-title" tabIndex={-1} className="bg-card border border-border-color rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 id="add-item-title" className="font-semibold text-text-main text-base">Add New Item</h3>
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
                <label htmlFor="new-item-name" className="block text-xs text-text-muted mb-1.5 font-medium">Item Name *</label>
                <input
                  id="new-item-name"
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
                <label htmlFor="new-item-barcode" className="block text-xs text-text-muted mb-1.5 font-medium">Barcode (optional)</label>
                <input
                  id="new-item-barcode"
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
                  <label htmlFor="new-item-sku" className="block text-xs text-text-muted mb-1.5 font-medium">SKU (optional)</label>
                  <input id="new-item-sku" type="text" value={newItemSku} onChange={e => setNewItemSku(e.target.value)} placeholder="GEN-XXXXX if blank" className="input w-full" />
                </div>
                <div>
                  <label htmlFor="new-item-brand" className="block text-xs text-text-muted mb-1.5 font-medium">Brand (optional)</label>
                  <input id="new-item-brand" type="text" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} placeholder="e.g. Nestlé" className="input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-item-cost" className="block text-xs text-text-muted mb-1.5 font-medium">Unit Cost (৳) *</label>
                  <input
                    id="new-item-cost"
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
                  <label htmlFor="new-item-price" className="block text-xs text-text-muted mb-1.5 font-medium">Selling Price (৳) *</label>
                  <input
                    id="new-item-price"
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
                  <label htmlFor="new-item-mrp" className="block text-xs text-text-muted mb-1.5 font-medium">MRP (optional)</label>
                  <input id="new-item-mrp" type="number" min="0" step="0.01" value={newItemMrp} onChange={e => setNewItemMrp(e.target.value)} placeholder="0.00" className="input w-full" />
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
