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
