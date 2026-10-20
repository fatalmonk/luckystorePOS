/**
 * Lucky Store — JEV Receipt Verification & Advisory Layer
 *
 * Architecture:
 * 1. AI Extraction (Databricks / OCR) -> Advisory
 * 2. JEV Verification -> Evidence assessment & contradiction detection (Advisory)
 * 3. Deterministic Validator -> Independent arithmetic & business rules (Validation)
 * 4. Lucky Store Admin -> Human review & approval (Authorized Approval)
 * 5. Supabase / Ledger -> Transaction execution (Never accessible to JEV)
 *
 * Rules:
 * - Never authorize inventory mutations
 * - Never authorize ledger postings
 * - Never treat JEV confidence as financial proof
 * - Strictly enforce BDT 0.05 reconciliation tolerance
 * - Require source image verification before PASS
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unit_price: number;
  line_total?: number | null;
  sku?: string;
  notes?: string;
}

export interface ReceiptInput {
  receipt_id: string;
  supplier_name?: string | null;
  supplier_id?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_total?: number | null;
  currency?: string;
  doc_type?: string;
  line_items: ReceiptLineItem[];
  source_image_verified?: boolean;
  ocr_raw_text?: string | null;
  extraction_confidence?: number | null;
  tenant_id?: string | null;
}

export interface JevQuestionResult {
  id: string;
  question: string;
  answer: boolean | string | number;
  confidence?: number;
  evidence_found?: boolean;
  notes?: string;
}

export interface DeterministicReconciliation {
  calculated_total: number;
  invoice_total: number;
  reconciliation_difference: number;
  line_items_valid: boolean;
  tolerance_applied: number;
  totals_match: boolean;
  missing_fields: string[];
  arithmetic_status: 'PASS' | 'FAIL';
  errors: string[];
}

export interface JevEvidenceEvaluation {
  grounded_in_source: boolean;
  contradictions: string[];
  hallucinations_detected: string[];
  field_warnings: string[];
  duplicate_invoice_risk: boolean;
  extraction_confidence: number | null;
  evaluated_questions: JevQuestionResult[];
  eval_source: 'jev_cli' | 'jev_api' | 'advisory_engine';
}

export interface ReceiptVerificationReport {
  receipt_id: string;
  supplier: string;
  invoice_number: string;
  extracted_total: number;
  calculated_total: number;
  reconciliation_difference: number;
  missing_fields: string[];
  contradictions: string[];
  source_verification_status: 'VERIFIED' | 'NOT_COMPLETED';
  advisory_recommendation: 'PASS' | 'REVIEW' | 'FAIL';
  required_human_action: string;
  safety: {
    advisory_only: true;
    posting_authorized: false;
    inventory_mutation_authorized: false;
  };
  deterministic: DeterministicReconciliation;
  jev_evidence: JevEvidenceEvaluation;
  timestamp: string;
}

export interface VerifyReceiptOptions {
  /** Trusted caller supplies a human review, never copied from OCR/receipt JSON. */
  sourceReview?: {
    receiptSha256: string;
    sourcePath: string;
    sourceSha256: string;
    reviewedBy: string;
    reviewedAt: string;
  };
  knownInvoicesForSupplier?: string[];
  callerTenantId?: string;
  forceOffline?: boolean;
}

export class SecurityAuthorizationViolationError extends Error {
  constructor(message: string) {
    super(`[SECURITY VIOLATION] ${message}`);
    this.name = 'SecurityAuthorizationViolationError';
  }
}

/**
 * Enforce strict non-posting boundary.
 * Throws immediately if an agent or automated script attempts to execute financial mutations via JEV.
 */
export function preventUnauthorizedPosting(callerContext: { role?: string; isAutomated?: boolean }): never {
  throw new SecurityAuthorizationViolationError(
    'Direct ledger posting and inventory mutation from JEV advisory verification layer is prohibited. Manual human approval by an authorized manager or admin is strictly required.'
  );
}

/**
 * Decimal coefficients avoid binary floating-point tolerance and rounding errors.
 */
function decimalParts(value: number): [bigint, number] {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  return [BigInt(whole + fraction), fraction.length - Number(exponent)];
}

function decimalCents(...values: number[]): bigint {
  let coefficient = 1n;
  let scale = -2;
  for (const value of values) {
    const [digits, places] = decimalParts(value);
    coefficient *= digits;
    scale += places;
  }
  if (scale <= 0) return coefficient * 10n ** BigInt(-scale);
  const divisor = 10n ** BigInt(scale);
  return (coefficient + divisor / 2n) / divisor;
}

const nonBlank = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const validAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100;
const abs = (value: bigint): bigint => value < 0n ? -value : value;

/** Compare the original extracted decimal with calculated paisa, without rounding it. */
function differenceFromCents(value: number, cents: bigint): { amount: number; withinTolerance: boolean } {
  const [coefficient, places] = decimalParts(value);
  const scale = Math.max(places, 2);
  const paisaScale = 10n ** BigInt(scale - 2);
  const difference = abs(coefficient * 10n ** BigInt(scale - places) - cents * paisaScale);
  return {
    amount: Number(`${difference}e-${scale}`),
    withinTolerance: difference <= 5n * paisaScale,
  };
}

/** Binds a separate source review to this exact extraction. */
export function receiptEvidenceHash(receipt: ReceiptInput): string {
  return createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
}

function hasReviewedSource(receipt: ReceiptInput, options: VerifyReceiptOptions): boolean {
  const review = options.sourceReview;
  if (!review || !nonBlank(review.reviewedBy) || !nonBlank(review.reviewedAt) ||
      !Number.isFinite(Date.parse(review.reviewedAt)) || Date.parse(review.reviewedAt) > Date.now() ||
      review.receiptSha256 !== receiptEvidenceHash(receipt) || !nonBlank(review.sourcePath)) return false;
  try {
    const source = readFileSync(review.sourcePath);
    return /^[a-f0-9]{64}$/.test(review.sourceSha256) &&
      source.length > 0 && createHash('sha256').update(source).digest('hex') === review.sourceSha256;
  } catch {
    return false;
  }
}

/**
 * Safely resolve TYPESAFE_API_KEY from environment, ~/.config/jev/credentials, or .env.secrets.
 */
function getTypesafeApiKey(): string | null {
  if (process.env.TYPESAFE_API_KEY && process.env.TYPESAFE_API_KEY.trim()) {
    return process.env.TYPESAFE_API_KEY.trim();
  }
  try {
    const credsPath = resolve(process.env.HOME || '', '.config/jev/credentials');
    if (existsSync(credsPath)) {
      const content = readFileSync(credsPath, 'utf-8');
      for (const line of content.split('\n')) {
        if (line.trim().startsWith('TYPESAFE_API_KEY=')) {
          const val = line.trim().split('=')[1]?.trim().replace(/['"]/g, '');
          if (val) return val;
        }
      }
    }
  } catch {}
  try {
    const repoSecrets = resolve(process.cwd(), '.env.secrets');
    if (existsSync(repoSecrets)) {
      const content = readFileSync(repoSecrets, 'utf-8');
      for (const line of content.split('\n')) {
        if (line.trim().startsWith('TYPESAFE_API_KEY=')) {
          const val = line.trim().split('=')[1]?.trim().replace(/['"]/g, '');
          if (val) return val;
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Execute deterministic financial arithmetic and schema validation.
 */
export function executeDeterministicReconciliation(receipt: ReceiptInput): DeterministicReconciliation {
  const missing_fields: string[] = [];
  const errors: string[] = [];

  // Metadata verification
  if (!nonBlank(receipt.supplier_name)) {
    missing_fields.push('supplier_name');
    errors.push('Supplier name is missing or blank');
  }

  if (!nonBlank(receipt.invoice_number)) {
    missing_fields.push('invoice_number');
    errors.push('Invoice number is missing or blank');
  }

  if (!nonBlank(receipt.invoice_date)) {
    missing_fields.push('invoice_date');
    errors.push('Invoice date is missing or blank');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt.invoice_date) ||
      !Number.isFinite(Date.parse(receipt.invoice_date)) ||
      new Date(receipt.invoice_date).toISOString().slice(0, 10) !== receipt.invoice_date) {
    errors.push('Invoice date must be a valid YYYY-MM-DD calendar date');
  }

  if (!validAmount(receipt.invoice_total)) {
    missing_fields.push('invoice_total');
    errors.push('Invoice total is missing or not a valid number');
  } else if (receipt.invoice_total < 0) {
    errors.push('Invoice total cannot be negative');
  }

  // Line items verification
  let calculatedCents = 0n;
  let line_items_valid = true;

  if (!receipt.line_items || !Array.isArray(receipt.line_items) || receipt.line_items.length === 0) {
    missing_fields.push('line_items');
    errors.push('Receipt does not contain any line items');
    line_items_valid = false;
  } else {
    for (let i = 0; i < receipt.line_items.length; i++) {
      const item = receipt.line_items[i];
      const idx = i + 1;

      if (!item || typeof item !== 'object') {
        line_items_valid = false;
        errors.push(`Line item #${idx} must be an object`);
        continue;
      }

      if (!nonBlank(item.name)) {
        line_items_valid = false;
        errors.push(`Line item #${idx} missing name description`);
      }

      if (!validAmount(item.quantity) || item.quantity <= 0) {
        line_items_valid = false;
        errors.push(`Line item #${idx} ("${item.name}") has invalid non-positive quantity: ${item.quantity}`);
      }

      if (!validAmount(item.unit_price)) {
        line_items_valid = false;
        errors.push(`Line item #${idx} ("${item.name}") has invalid negative unit price: ${item.unit_price}`);
      }

      if (!validAmount(item.quantity) || item.quantity <= 0 || !validAmount(item.unit_price)) continue;
      const expectedCents = decimalCents(item.quantity, item.unit_price);
      const expectedItemTotal = Number(expectedCents) / 100;
      calculatedCents += expectedCents;

      if (item.line_total !== null && item.line_total !== undefined) {
        if (!validAmount(item.line_total)) {
          line_items_valid = false;
          errors.push(`Line item #${idx} ("${item.name}") has negative or non-numeric line total: ${item.line_total}`);
        } else {
          const itemDiff = differenceFromCents(item.line_total, expectedCents);
          if (!itemDiff.withinTolerance) {
            line_items_valid = false;
            errors.push(
              `Line item #${idx} ("${item.name}") arithmetic mismatch: qty(${item.quantity}) * unit_price(${item.unit_price}) = ${expectedItemTotal}, but extracted line_total is ${item.line_total}`
            );
          }
        }
      }
    }
  }

  if (calculatedCents > BigInt(Number.MAX_SAFE_INTEGER)) errors.push('Calculated total exceeds safe monetary range');
  const calculated_total = Number(calculatedCents) / 100;
  const invoiceTotal = validAmount(receipt.invoice_total) ? receipt.invoice_total : 0;
  const difference = differenceFromCents(invoiceTotal, calculatedCents);
  const reconciliation_difference = difference.amount;
  const totals_match = errors.length === 0 && line_items_valid && difference.withinTolerance;

  return {
    calculated_total,
    invoice_total: invoiceTotal,
    reconciliation_difference,
    line_items_valid,
    tolerance_applied: 0.05,
    totals_match,
    missing_fields,
    arithmetic_status: totals_match ? 'PASS' : 'FAIL',
    errors,
  };
}

/**
 * Execute JEV Evidence & Contradiction Evaluation (Advisory).
 */
export async function evaluateJevEvidence(
  receipt: ReceiptInput,
  options: VerifyReceiptOptions = {}
): Promise<JevEvidenceEvaluation> {
  const contradictions: string[] = [];
  const hallucinations: string[] = [];
  const warnings: string[] = [];
  const evaluated_questions: JevQuestionResult[] = [];

  // Check currency
  if (receipt.currency && (!nonBlank(receipt.currency) || receipt.currency.toUpperCase() !== 'BDT')) {
    contradictions.push(`Extracted currency is ${receipt.currency}, but Lucky Store operates in BDT`);
  }

  // Check document type
  if (receipt.doc_type && receipt.doc_type !== 'purchase_invoice') {
    contradictions.push(
      `Document classified as "${receipt.doc_type}", not an authorized purchase invoice`
    );
  }

  // Check for duplicate invoice number under tenant
  let duplicateRisk = false;
  if (nonBlank(receipt.invoice_number) && options.knownInvoicesForSupplier) {
    if (options.knownInvoicesForSupplier.includes(receipt.invoice_number.trim())) {
      duplicateRisk = true;
      warnings.push(`Invoice #${receipt.invoice_number} matches an existing registered invoice for this supplier`);
    }
  }

  // Raw OCR source grounding and hallucination check
  let groundedInSource = nonBlank(receipt.ocr_raw_text);
  if (nonBlank(receipt.ocr_raw_text)) {
    const rawLower = receipt.ocr_raw_text.toLowerCase();

    // Check supplier grounding
    if (nonBlank(receipt.supplier_name)) {
      const supplierKeywords = receipt.supplier_name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const supplierFound = supplierKeywords.some(kw => rawLower.includes(kw));
      if (!supplierFound) {
        contradictions.push(
          `Extracted supplier "${receipt.supplier_name}" not found in raw source document text`
        );
        groundedInSource = false;
      }
    }

    // Check item hallucinations
    if (receipt.line_items && receipt.line_items.length > 0) {
      for (const item of receipt.line_items) {
        if (!item || !nonBlank(item.name)) continue;
        const itemWords = item.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matchFound = itemWords.length === 0 || itemWords.some(w => rawLower.includes(w));
        if (!matchFound) {
          hallucinations.push(
            `Extracted line item "${item.name}" has no corresponding mention in source text (potential hallucination)`
          );
          groundedInSource = false;
        }
      }
    }
  }


  // TypeSafe System One (Jev) native API evaluation
  let evalSource: 'jev_cli' | 'jev_api' | 'advisory_engine' = 'advisory_engine';
  const typesafeKey = !options.forceOffline ? getTypesafeApiKey() : null;

  if (typesafeKey) {
    try {
      const stateObj = {
        receipt_id: receipt.receipt_id,
        supplier: receipt.supplier_name,
        invoice_number: receipt.invoice_number,
        invoice_total: receipt.invoice_total,
        item_count: receipt.line_items?.length || 0,
        raw_text_preview: receipt.ocr_raw_text ? receipt.ocr_raw_text.slice(0, 500) : null,
      };

      const questions = {
        has_contradictions: {
          type: 'noul',
          instructions: 'Does this receipt extract contain internal contradictions, arithmetic mismatches, or unsupported claims compared to the raw preview?',
        },
        is_valid_procurement_invoice: {
          type: 'noul',
          instructions: 'Is this document an authentic purchase invoice or delivery challan for store procurement?',
        },
        legibility_score: {
          type: 'score',
          instructions: 'Rate the legibility of the document text.',
          criteria: [
            'Completely unreadable or blurry',
            'Partially readable, key totals faint or cut off',
            'Legible, totals and items clear',
            'Crystal clear high contrast printed text',
          ],
        },
      };

      const res = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${typesafeKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'LuckyStore-TypeScript-Verifier/1.0',
        },
        body: JSON.stringify({
          state: stateObj,
          model: 'jev-latest',
          questions,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        evalSource = 'jev_api';
        const answers = data.answers || {};

        if (answers.has_contradictions) {
          const val = answers.has_contradictions.noul ?? 0;
          evaluated_questions.push({
            id: 'has_contradictions',
            question: questions.has_contradictions.instructions,
            answer: val > 0.5,
            confidence: Math.abs(val - 0.5) * 2,
          });
          if (val > 0.65) {
            contradictions.push(`TypeSafe Jev flagged high contradiction probability (${Math.round(val * 100)}%) in receipt data`);
          }
        }

        if (answers.is_valid_procurement_invoice) {
          const val = answers.is_valid_procurement_invoice.noul ?? 1.0;
          evaluated_questions.push({
            id: 'is_valid_procurement_invoice',
            question: questions.is_valid_procurement_invoice.instructions,
            answer: val >= 0.5,
            confidence: Math.abs(val - 0.5) * 2,
          });
          if (val < 0.35) {
            warnings.push(`TypeSafe Jev assessed low probability (${Math.round(val * 100)}%) of being an authentic procurement invoice`);
          }
        }

        if (answers.legibility_score) {
          evaluated_questions.push({
            id: 'legibility_score',
            question: questions.legibility_score.instructions,
            answer: answers.legibility_score.score,
          });
        }
      }
    } catch {
      evalSource = 'advisory_engine';
    }
  } else if (!options.forceOffline && process.env.JEV_CLI_API_KEY) {
    try {
      const stateObj = {
        receipt_id: receipt.receipt_id,
        supplier: receipt.supplier_name,
        invoice_number: receipt.invoice_number,
        invoice_total: receipt.invoice_total,
        item_count: receipt.line_items?.length || 0,
        raw_text_preview: receipt.ocr_raw_text ? receipt.ocr_raw_text.slice(0, 300) : null,
      };

      const questions = {
        has_contradictions: {
          type: 'boolean',
          instructions: 'Does the extracted receipt data contain internal contradictions or unsupported claims?',
        },
      };

      const proc = spawnSync('jev-cli', ['eval', '-s', JSON.stringify(stateObj), '-q', JSON.stringify(questions)], {
        encoding: 'utf-8',
        timeout: 4000,
      });

      if (proc.status === 0 && proc.stdout) {
        const parsed = JSON.parse(proc.stdout.trim());
        evalSource = 'jev_cli';
        evaluated_questions.push({
          id: 'has_contradictions',
          question: questions.has_contradictions.instructions,
          answer: parsed.has_contradictions?.answer ?? false,
          confidence: parsed.has_contradictions?.confidence,
        });
      }
    } catch {
      evalSource = 'advisory_engine';
    }
  }

  return {
    grounded_in_source: groundedInSource,
    contradictions,
    hallucinations_detected: hallucinations,
    field_warnings: warnings,
    duplicate_invoice_risk: duplicateRisk,
    extraction_confidence: receipt.extraction_confidence ?? null,
    evaluated_questions,
    eval_source: evalSource,
  };
}

/**
 * Main verification entrypoint.
 * Synthesizes deterministic arithmetic and JEV evidence into a structured advisory assessment.
 */
export async function verifyReceipt(
  receipt: ReceiptInput,
  options: VerifyReceiptOptions = {}
): Promise<ReceiptVerificationReport> {
  // Tenant Boundary Check
  if (options.callerTenantId && receipt.tenant_id && receipt.tenant_id !== options.callerTenantId) {
    throw new SecurityAuthorizationViolationError(
      `Tenant boundary mismatch: Caller tenant "${options.callerTenantId}" does not match receipt tenant "${receipt.tenant_id}". Cross-tenant receipt verification is rejected.`
    );
  }

  const deterministic = executeDeterministicReconciliation(receipt);
  const jevEvidence = await evaluateJevEvidence(receipt, options);

  const missingFields = [...deterministic.missing_fields];
  const contradictions = [...jevEvidence.contradictions, ...jevEvidence.hallucinations_detected];

  const sourceVerified = hasReviewedSource(receipt, options);
  const sourceVerificationStatus = sourceVerified ? 'VERIFIED' : 'NOT_COMPLETED';

  // Determine Advisory Recommendation: PASS | REVIEW | FAIL
  let recommendation: 'PASS' | 'REVIEW' | 'FAIL';
  let requiredAction: string;

  if (
    !deterministic.totals_match ||
    !deterministic.line_items_valid ||
    missingFields.length > 0 ||
    contradictions.length > 0
  ) {
    recommendation = 'FAIL';
    requiredAction =
      'Quarantine receipt. Resolve arithmetic mismatches, missing fields, or source contradictions before re-submission.';
  } else if (!sourceVerified || jevEvidence.field_warnings.length > 0 || jevEvidence.duplicate_invoice_risk) {
    recommendation = 'REVIEW';
    requiredAction = !sourceVerified
      ? 'Manual document verification required: Inspect source receipt image in Lucky Store Admin to confirm item details.'
      : 'Review potential duplicate invoice warning or field warnings with purchasing manager.';
  } else {
    recommendation = 'PASS';
    requiredAction =
      'Arithmetic and source evidence verified. Ready for authorized manual manager/admin approval.';
  }

  return {
    receipt_id: receipt.receipt_id,
    supplier: receipt.supplier_name || 'UNKNOWN_SUPPLIER',
    invoice_number: receipt.invoice_number || 'UNKNOWN_INVOICE',
    extracted_total: deterministic.invoice_total,
    calculated_total: deterministic.calculated_total,
    reconciliation_difference: deterministic.reconciliation_difference,
    missing_fields: missingFields,
    contradictions,
    source_verification_status: sourceVerificationStatus,
    advisory_recommendation: recommendation,
    required_human_action: requiredAction,
    safety: {
      advisory_only: true,
      posting_authorized: false,
      inventory_mutation_authorized: false,
    },
    deterministic,
    jev_evidence: jevEvidence,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format report into human-readable BDT currency summary.
 */
export function formatReportHumanReadable(report: ReceiptVerificationReport): string {
  const diffFormatted = `৳${report.reconciliation_difference.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 20 })}`;
  const calcFormatted = `৳${report.calculated_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const invFormatted = `৳${report.extracted_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return [
    `Lucky Store JEV Receipt Verification Report`,
    `============================================`,
    `Receipt ID: ${report.receipt_id}`,
    `Supplier: ${report.supplier}`,
    `Invoice Number: ${report.invoice_number}`,
    `Extracted Total: ${invFormatted}`,
    `Calculated Total: ${calcFormatted}`,
    `Reconciliation Difference: ${diffFormatted}`,
    `Arithmetic Reconciliation: ${report.deterministic.arithmetic_status}`,
    `Source Image Verification: ${report.source_verification_status === 'VERIFIED' ? 'Verified' : 'Not completed'}`,
    `Posting Authorization: Not granted (Advisory only)`,
    `Advisory Recommendation: ${report.advisory_recommendation}`,
    `Required Action: ${report.required_human_action}`,
    report.missing_fields.length > 0 ? `Missing Fields: ${report.missing_fields.join(', ')}` : null,
    report.contradictions.length > 0 ? `Contradictions: ${report.contradictions.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
