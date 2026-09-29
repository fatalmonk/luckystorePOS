import { describe, expect, it } from 'vitest';
import type { PendingOcrItem, ReceiptLine } from './types';
import { candidatesForReceiptScan, clearPendingOcrCandidates, replaceReceiptScanCandidates } from './ocrReviewState';

const candidate = (scanId: string, name: string): PendingOcrItem => ({
  scanId,
  name,
  quantity: 1,
  unitPrice: 10,
});

describe('receipt OCR candidate ownership', () => {
  it('replaces Scan A candidates with only Scan B candidates', () => {
    const scanA = [candidate('scan-a', 'A1'), candidate('scan-a', 'A2')];
    const scanB = [candidate('scan-b', 'B1'), candidate('scan-b', 'B2')];

    const afterScanB = replaceReceiptScanCandidates(scanA, scanB, 'scan-b');

    expect(afterScanB.map(item => item.name)).toEqual(['B1', 'B2']);
    expect(afterScanB.some(item => item.name === 'A1' || item.name === 'A2')).toBe(false);
  });

  it('rescan supersedes the prior generation even when product names repeat', () => {
    const firstGeneration = [candidate('scan-1', 'Same product')];
    const secondGeneration = [candidate('scan-2', 'Same product')];

    expect(replaceReceiptScanCandidates(firstGeneration, secondGeneration, 'scan-2')).toEqual(secondGeneration);
  });

  it('does not treat candidates from another receipt identity as current', () => {
    const candidates = [candidate('receipt-a', 'Old receipt'), candidate('receipt-b', 'Current receipt')];

    expect(candidatesForReceiptScan(candidates, 'receipt-b').map(item => item.name)).toEqual(['Current receipt']);
    expect(candidatesForReceiptScan(candidates, null)).toEqual([]);
  });

  it('rehydrates only candidates owned by the persisted current scan', () => {
    const savedDraft = {
      receiptScanId: 'current-scan',
      pendingOcrItems: [candidate('old-scan', 'Stale'), candidate('current-scan', 'Pending')],
    };

    expect(candidatesForReceiptScan(savedDraft.pendingOcrItems, savedDraft.receiptScanId).map(item => item.name)).toEqual(['Pending']);
    expect(candidatesForReceiptScan([candidate('legacy', 'No ownership metadata')], null)).toEqual([]);
  });

  it('clears unresolved candidates without changing confirmed purchase lines', () => {
    const confirmedLines: ReceiptLine[] = [{
      item: { id: 'item-1', name: 'Confirmed item' },
      quantity: 3,
      unitCost: 12,
    }];
    const pending = [candidate('scan-a', 'Unresolved item')];

    const cleared = clearPendingOcrCandidates(pending);

    expect(cleared).toEqual([]);
    expect(confirmedLines).toEqual([{ item: { id: 'item-1', name: 'Confirmed item' }, quantity: 3, unitCost: 12 }]);
  });

  it('keeps confirmed purchase lines when a later scan replaces OCR candidates', () => {
    const confirmedLines: ReceiptLine[] = [{
      item: { id: 'item-1', name: 'Confirmed item' },
      quantity: 3,
      unitCost: 12,
    }];
    const firstScan = [candidate('scan-a', 'A1')];
    const secondScan = [candidate('scan-b', 'B1')];

    const nextPending = replaceReceiptScanCandidates(firstScan, secondScan, 'scan-b');

    expect(nextPending.map(item => item.name)).toEqual(['B1']);
    expect(confirmedLines).toHaveLength(1);
    expect(confirmedLines[0].item.id).toBe('item-1');
  });
});
