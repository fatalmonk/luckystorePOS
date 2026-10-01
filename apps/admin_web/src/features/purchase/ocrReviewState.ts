import type { PendingOcrItem } from './types';

/** A review candidate is valid only for the receipt scan that created it. */
export function candidatesForReceiptScan(
  candidates: PendingOcrItem[] | undefined,
  scanId: string | null,
): PendingOcrItem[] {
  if (!scanId || !Array.isArray(candidates)) return [];
  return candidates.filter(candidate => candidate.scanId === scanId);
}

/** Replacing a scan generation never mutates or merges the existing generation. */
export function replaceReceiptScanCandidates(
  _previous: PendingOcrItem[],
  next: PendingOcrItem[],
  scanId: string,
): PendingOcrItem[] {
  return next.filter(candidate => candidate.scanId === scanId);
}

export function clearPendingOcrCandidates(_previous: PendingOcrItem[]): PendingOcrItem[] {
  return [];
}

export function receiptPostingBlockReason(input: {
  isDraft: boolean;
  duplicateCheckPending: boolean;
  warnings: string[];
  reviewAcknowledged: boolean;
}): string | null {
  if (input.isDraft) return null;
  if (input.duplicateCheckPending) {
    return 'Checking whether this supplier invoice was already recorded. Try posting again shortly.';
  }
  if (input.warnings.length > 0 && !input.reviewAcknowledged) {
    return 'Review the scanned receipt warnings and confirm them before posting.';
  }
  return null;
}
