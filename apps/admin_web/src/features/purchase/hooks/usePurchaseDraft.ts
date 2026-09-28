import { useEffect, useMemo, useRef, useState } from 'react';
import type { PurchaseDraftSnapshot, PurchaseFormSnapshot, PurchaseRetryAttempt } from '../types';

export const createPurchaseIdempotencyKey = () =>
  `pr_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

export function usePurchaseDraft(
  tenantId: string | null,
  storeId: string | null,
  getFormSnapshot: () => PurchaseFormSnapshot,
  applyFormSnapshot: (snapshot: Partial<PurchaseFormSnapshot>) => void
) {
  const purchaseDraftKey = useMemo(
    () => (tenantId && storeId ? `lucky-store:purchase-draft:${tenantId}:${storeId}` : null),
    [storeId, tenantId]
  );

  const [draftRestored, setDraftRestored] = useState(false);
  const [purchaseIdempotencyKey, setPurchaseIdempotencyKey] = useState(createPurchaseIdempotencyKey);
  const [retryAttempt, setRetryAttempt] = useState<PurchaseRetryAttempt | null>(null);

  const draftHydratedRef = useRef(false);
  const skipDraftPersistenceRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate form state from localStorage on load */
  useEffect(() => {
    if (!purchaseDraftKey || typeof window === 'undefined') return;

    draftHydratedRef.current = false;
    try {
      const raw = window.localStorage.getItem(purchaseDraftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<PurchaseDraftSnapshot>;
        if (typeof draft.idempotencyKey === 'string' && draft.idempotencyKey) {
          setPurchaseIdempotencyKey(draft.idempotencyKey);
        }
        if (draft.retryAttempt?.idempotencyKey && draft.retryAttempt.args) {
          setRetryAttempt(draft.retryAttempt);
        }
        applyFormSnapshot(draft);
        setDraftRestored(true);
      } else {
        setDraftRestored(false);
      }
    } catch (e) {
      console.error('Failed to load purchase draft from localStorage:', e);
      setDraftRestored(false);
    } finally {
      draftHydratedRef.current = true;
    }
  }, [purchaseDraftKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persistDraft = (overrides?: Partial<PurchaseDraftSnapshot>) => {
    if (!purchaseDraftKey || !draftHydratedRef.current || skipDraftPersistenceRef.current || typeof window === 'undefined') {
      return;
    }
    const currentForm = getFormSnapshot();
    const payload: PurchaseDraftSnapshot = {
      ...currentForm,
      idempotencyKey: purchaseIdempotencyKey,
      retryAttempt: retryAttempt ?? undefined,
      ...overrides,
    };
    try {
      window.localStorage.setItem(purchaseDraftKey, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save purchase draft:', e);
    }
  };

  const clearDraft = () => {
    if (purchaseDraftKey && typeof window !== 'undefined') {
      window.localStorage.removeItem(purchaseDraftKey);
    }
    setPurchaseIdempotencyKey(createPurchaseIdempotencyKey());
    setRetryAttempt(null);
    setDraftRestored(false);
  };

  return {
    purchaseDraftKey,
    draftRestored,
    purchaseIdempotencyKey,
    setPurchaseIdempotencyKey,
    retryAttempt,
    setRetryAttempt,
    persistDraft,
    clearDraft,
    skipDraftPersistenceRef,
    draftHydratedRef,
  };
}
