import React from 'react';
import type { Item, PendingOcrItem } from '../types';

const OCR_CONFIDENCE_STYLES: Record<'high' | 'medium' | 'low', React.CSSProperties> = {
  high: { color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' },
  medium: { color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' },
  low: { color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' },
};

export type OcrReconciliationPanelProps = {
  pendingOcrItems: PendingOcrItem[];
  setPendingOcrItems: React.Dispatch<React.SetStateAction<PendingOcrItem[]>>;
  onAddExistingItem: (item: Item, quantity?: number, unitCost?: number) => void;
  onOpenAddItemModal: (name: string, barcode?: string, cost?: number, qty?: number) => void;
};

export const OcrReconciliationPanel: React.FC<OcrReconciliationPanelProps> = ({
  pendingOcrItems,
  setPendingOcrItems,
  onAddExistingItem,
  onOpenAddItemModal,
}) => {
  if (pendingOcrItems.length === 0) return null;

  return (
    <div
      className="card p-4"
      style={{ borderColor: 'var(--color-warning-strong)', backgroundColor: 'var(--color-warning-bg)' }}
      role="region"
      aria-label="Receipt items awaiting review"
    >
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
          const hasReviewedValues =
            Number.isInteger(candidate.quantity) &&
            Number(candidate.quantity) > 0 &&
            candidate.unitPrice != null &&
            Number.isFinite(candidate.unitPrice) &&
            candidate.unitPrice >= 0;

          const selectedMatch =
            candidate.match ?? candidate.candidates?.find((item) => item.id === candidate.selectedMatchId);

          return (
            <div
              key={`${candidate.name}-${candidateIndex}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-color px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-text-main">{candidate.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <label className="flex items-center gap-1">
                    Qty
                    <input
                      aria-label={`Quantity for ${candidate.name}`}
                      type="number"
                      min="1"
                      step="1"
                      value={candidate.quantity ?? ''}
                      onChange={(event) =>
                        setPendingOcrItems((previous) =>
                          previous.map((item, index) =>
                            index === candidateIndex
                              ? {
                                  ...item,
                                  quantity: event.target.value === '' ? undefined : Number(event.target.value),
                                }
                              : item
                          )
                        )
                      }
                      className="input w-20 py-1"
                    />
                  </label>

                  <label className="flex items-center gap-1">
                    Unit cost ৳
                    <input
                      aria-label={`Unit cost for ${candidate.name}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={candidate.unitPrice ?? ''}
                      onChange={(event) =>
                        setPendingOcrItems((previous) =>
                          previous.map((item, index) =>
                            index === candidateIndex
                              ? {
                                  ...item,
                                  unitPrice: event.target.value === '' ? undefined : Number(event.target.value),
                                }
                              : item
                          )
                        )
                      }
                      className="input w-24 py-1"
                    />
                  </label>
                </div>

                {candidate.warnings && candidate.warnings.length > 0 && (
                  <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-warning)' }}>
                    {candidate.warnings.join(' ')}
                  </div>
                )}

                {candidate.confidence && (
                  <div
                    className="text-xs mt-0.5 font-medium px-1.5 py-0.5 rounded-full inline-block"
                    style={OCR_CONFIDENCE_STYLES[candidate.confidence]}
                  >
                    Confidence: {candidate.confidence}
                  </div>
                )}
              </div>

              {candidate.candidates && candidate.candidates.length > 0 && (
                <label className="sr-only" htmlFor={`ocr-item-match-${candidateIndex}`}>
                  Choose inventory match for {candidate.name}
                </label>
              )}

              {candidate.candidates && candidate.candidates.length > 0 && (
                <select
                  id={`ocr-item-match-${candidateIndex}`}
                  aria-label={`Inventory match for ${candidate.name}`}
                  className="input max-w-56 text-sm"
                  value={candidate.selectedMatchId || ''}
                  onChange={(event) =>
                    setPendingOcrItems((previous) =>
                      previous.map((item, index) =>
                        index === candidateIndex
                          ? { ...item, selectedMatchId: event.target.value || undefined }
                          : item
                      )
                    )
                  }
                >
                  <option value="">Select matching SKU…</option>
                  <option value="no_match">No match (create new item)</option>
                  {candidate.candidates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.sku ? ` · ${item.sku}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {selectedMatch ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!hasReviewedValues || !selectedMatch) return;
                    onAddExistingItem(selectedMatch, candidate.quantity, candidate.unitPrice);
                    setPendingOcrItems((previous) => previous.filter((item) => item !== candidate));
                  }}
                  disabled={!hasReviewedValues || !selectedMatch}
                  className="shrink-0 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add existing item
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (hasReviewedValues) {
                      onOpenAddItemModal(candidate.name, undefined, candidate.unitPrice, candidate.quantity);
                    }
                  }}
                  disabled={!hasReviewedValues}
                  className="shrink-0 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Complete item
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
