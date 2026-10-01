import { useMemo, useState } from 'react';
import type { Item, PaymentMethod, PendingOcrItem, PurchaseFormSnapshot, ReceiptLine, Supplier } from '../types';
import { candidatesForReceiptScan } from '../ocrReviewState';

export function usePurchaseFormState() {
  // Supplier selection
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Invoice header
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');

  // Receipt lines
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [amountPaid, setAmountPaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  // Quick item addition
  const [itemSearch, setItemSearch] = useState('');
  const [quickQty, setQuickQty] = useState(1);
  const [quickCost, setQuickCost] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // OCR state
  const [pendingOcrItems, setPendingOcrItems] = useState<PendingOcrItem[]>([]);
  const [receiptScanId, setReceiptScanId] = useState<string | null>(null);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [scannedReceiptUrl, setScannedReceiptUrl] = useState<string | null>(null);
  const [scannedReceiptKey, setScannedReceiptKey] = useState<string | null>(null);

  // Calculated totals
  const totalCost = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
    [lines]
  );

  const totalUnits = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );

  const parsedTotal = parseFloat(invoiceTotal) || totalCost;
  const parsedPaid = parseFloat(amountPaid) || 0;
  const balanceDue = Math.max(0, parsedTotal - parsedPaid);

  const addLine = (item: Item, quantity = 1, unitCost?: number) => {
    const cost = unitCost ?? item.cost ?? 0;
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.item.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + quantity,
          unitCost: unitCost ?? updated[idx].unitCost,
        };
        return updated;
      }
      return [...prev, { item, quantity, unitCost: cost }];
    });
  };

  const removeLine = (itemId: string) => {
    setLines((prev) => prev.filter((l) => l.item.id !== itemId));
  };

  const updateLineQty = (itemId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => (l.item.id === itemId ? { ...l, quantity: Math.max(1, quantity) } : l))
    );
  };

  const updateLineCost = (itemId: string, unitCost: number) => {
    setLines((prev) =>
      prev.map((l) => (l.item.id === itemId ? { ...l, unitCost: Math.max(0, unitCost) } : l))
    );
  };

  const applyFormSnapshot = (snapshot: Partial<PurchaseFormSnapshot>) => {
    if (typeof snapshot.supplierSearch === 'string') setSupplierSearch(snapshot.supplierSearch);
    if (snapshot.selectedSupplier !== undefined) setSelectedSupplier(snapshot.selectedSupplier);
    if (typeof snapshot.invoiceNumber === 'string') setInvoiceNumber(snapshot.invoiceNumber);
    if (typeof snapshot.invoiceDate === 'string') setInvoiceDate(snapshot.invoiceDate);
    if (typeof snapshot.invoiceTotal === 'string') setInvoiceTotal(snapshot.invoiceTotal);
    if (Array.isArray(snapshot.lines)) setLines(snapshot.lines);
    if (typeof snapshot.amountPaid === 'string') setAmountPaid(snapshot.amountPaid);
    if (snapshot.paymentMethod) setPaymentMethod(snapshot.paymentMethod);
    if (typeof snapshot.itemSearch === 'string') setItemSearch(snapshot.itemSearch);
    if (typeof snapshot.quickQty === 'number') setQuickQty(snapshot.quickQty);
    if (typeof snapshot.quickCost === 'string') setQuickCost(snapshot.quickCost);
    if (snapshot.receiptScanId !== undefined) setReceiptScanId(snapshot.receiptScanId ?? null);
    if (Array.isArray(snapshot.pendingOcrItems)) {
      setPendingOcrItems(candidatesForReceiptScan(snapshot.pendingOcrItems, snapshot.receiptScanId ?? null));
    }
    if (typeof snapshot.scannedReceiptUrl === 'string') setScannedReceiptUrl(snapshot.scannedReceiptUrl);
    if (typeof snapshot.scannedReceiptKey === 'string') setScannedReceiptKey(snapshot.scannedReceiptKey);
  };

  const getFormSnapshot = (): PurchaseFormSnapshot => ({
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
    receiptScanId,
    scannedReceiptUrl,
    scannedReceiptKey,
  });

  const clearForm = () => {
    setSupplierSearch('');
    setSelectedSupplier(null);
    setInvoiceNumber('');
    setInvoiceDate('');
    setInvoiceTotal('');
    setLines([]);
    setAmountPaid('0');
    setPaymentMethod('Cash');
    setItemSearch('');
    setQuickQty(1);
    setQuickCost('');
    setPendingOcrItems([]);
    setReceiptScanId(null);
    setOcrWarnings([]);
    setScannedReceiptUrl(null);
    setScannedReceiptKey(null);
  };

  return {
    supplierSearch,
    setSupplierSearch,
    selectedSupplier,
    setSelectedSupplier,
    showSupplierDropdown,
    setShowSupplierDropdown,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    invoiceTotal,
    setInvoiceTotal,
    lines,
    setLines,
    amountPaid,
    setAmountPaid,
    paymentMethod,
    setPaymentMethod,
    itemSearch,
    setItemSearch,
    quickQty,
    setQuickQty,
    quickCost,
    setQuickCost,
    showItemDropdown,
    setShowItemDropdown,
    pendingOcrItems,
    setPendingOcrItems,
    receiptScanId,
    setReceiptScanId,
    ocrWarnings,
    setOcrWarnings,
    scannedReceiptUrl,
    setScannedReceiptUrl,
    scannedReceiptKey,
    setScannedReceiptKey,
    totalCost,
    totalUnits,
    parsedTotal,
    parsedPaid,
    balanceDue,
    addLine,
    removeLine,
    updateLineQty,
    updateLineCost,
    applyFormSnapshot,
    getFormSnapshot,
    clearForm,
  };
}
