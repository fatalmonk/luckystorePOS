'use client';

import { useCartSheet as useCartSheetInternal } from '../components/providers/CartSheetProvider';

export function useCartSheet() {
  return useCartSheetInternal();
}
