import type { ReceiptOcrResult } from './receiptOcr';

export interface JevVerificationSummary {
  recommendation: 'PASS' | 'REVIEW' | 'FAIL';
  calculatedTotal: number;
  extractedTotal: number;
  difference: number;
  totalsMatch: boolean;
  missingFields: string[];
  contradictions: string[];
  sourceImageVerified: boolean;
  requiredAction: string;
  report?: any;
}

/**
 * Deterministic client-side evaluation fallback.
 * Strictly checks BDT 0.05 tolerance, line item quantity * price, and missing metadata.
 */
export function performClientDeterministicReconciliation(ocr: ReceiptOcrResult): JevVerificationSummary {
  const missingFields: string[] = [];
  const contradictions: string[] = [];

  if (!ocr.supplier?.name?.trim()) missingFields.push('supplier');
  if (!ocr.invoiceNumber?.trim()) missingFields.push('invoice_number');

  const rawTotal = ocr.invoiceTotal;
  const parsedTotal = typeof rawTotal === 'number'
    ? rawTotal
    : (rawTotal ? parseFloat(String(rawTotal).replace(/[^0-9.]/g, '')) : null);
  const invoiceTotal = (parsedTotal !== null && !isNaN(parsedTotal)) ? parsedTotal : null;

  if (invoiceTotal === null) {
    missingFields.push('invoice_total');
  }

  let calculatedTotal = 0;
  let lineItemsValid = true;

  if (!ocr.items || ocr.items.length === 0) {
    missingFields.push('line_items');
    lineItemsValid = false;
  } else {
    for (let i = 0; i < ocr.items.length; i++) {
      const item = ocr.items[i];
      if (!item.name?.trim()) lineItemsValid = false;
      if (typeof item.quantity !== 'number' || item.quantity <= 0) lineItemsValid = false;
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) lineItemsValid = false;

      const expectedItemTotal = Math.round(((item.quantity || 0) * (item.unitPrice || 0) + Number.EPSILON) * 100) / 100;
      if (item.total !== null && item.total !== undefined) {
        if (Math.abs(item.total - expectedItemTotal) > 0.05) {
          lineItemsValid = false;
          contradictions.push(`Item "${item.name}" math mismatch: ${item.quantity} * ${item.unitPrice} != ${item.total}`);
        }
        calculatedTotal = Math.round((calculatedTotal + item.total + Number.EPSILON) * 100) / 100;
      } else {
        calculatedTotal = Math.round((calculatedTotal + expectedItemTotal + Number.EPSILON) * 100) / 100;
      }
    }
  }

  const effectiveInvoiceTotal = invoiceTotal ?? 0;
  const diff = Math.round((Math.abs(effectiveInvoiceTotal - calculatedTotal) + Number.EPSILON) * 100) / 100;
  const totalsMatch = missingFields.length === 0 && lineItemsValid && diff <= 0.05;

  let recommendation: 'PASS' | 'REVIEW' | 'FAIL';
  let requiredAction: string;

  if (!totalsMatch || !lineItemsValid || missingFields.length > 0 || contradictions.length > 0) {
    recommendation = 'FAIL';
    requiredAction = 'Quarantine receipt. Resolve arithmetic mismatches, missing fields, or line total errors.';
  } else if (!ocr.rawText || (ocr.warnings && ocr.warnings.length > 0)) {
    recommendation = 'REVIEW';
    requiredAction = 'Inspect source receipt image and confirm all items and totals before posting.';
  } else {
    recommendation = 'PASS';
    requiredAction = 'Arithmetic and source evidence verified. Ready for manual approval.';
  }

  return {
    recommendation,
    calculatedTotal,
    extractedTotal: effectiveInvoiceTotal,
    difference: diff,
    totalsMatch,
    missingFields,
    contradictions,
    sourceImageVerified: Boolean(ocr.rawText),
    requiredAction,
  };
}

/**
 * Invokes the protected Supabase Edge Function 'verify-receipt-jev' with local fallback.
 */
export async function verifyReceiptWithJev(
  ocr: ReceiptOcrResult,
  options: { tenantId?: string | null; receiptId?: string }
): Promise<JevVerificationSummary> {
  const localSummary = performClientDeterministicReconciliation(ocr);

  try {
    const { supabase } = await import('../../lib/supabase');
    const { data, error } = await supabase.functions.invoke('verify-receipt-jev', {
      body: {
        receipt_id: options.receiptId || `SCAN-${Date.now()}`,
        supplier_name: ocr.supplier?.name,
        supplier_id: ocr.supplier?.id,
        invoice_number: ocr.invoiceNumber,
        invoice_date: ocr.invoiceDate,
        invoice_total: localSummary.extractedTotal,
        currency: 'BDT',
        line_items: ocr.items.map(it => ({
          name: it.name,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          line_total: it.total,
        })),
        source_image_verified: Boolean(ocr.rawText),
        ocr_raw_text: ocr.rawText,
        tenant_id: options.tenantId,
      },
    });

    if (error || !data) {
      return localSummary;
    }

    return {
      recommendation: data.advisory_recommendation,
      calculatedTotal: data.calculated_total,
      extractedTotal: data.extracted_total,
      difference: data.reconciliation_difference,
      totalsMatch: data.deterministic?.totals_match ?? localSummary.totalsMatch,
      missingFields: data.missing_fields || [],
      contradictions: data.contradictions || [],
      sourceImageVerified: data.source_verification_status === 'VERIFIED',
      requiredAction: data.required_human_action || localSummary.requiredAction,
      report: data,
    };
  } catch {
    return localSummary;
  }
}
