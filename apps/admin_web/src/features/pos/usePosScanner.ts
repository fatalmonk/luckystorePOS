import { useState, useCallback, useEffect } from 'react';
import { api } from '../../lib/api';
import { createDebugLogger } from '../../lib/debug';
import type { PosProduct } from '../../lib/api/types';

const debugLog = createDebugLogger('QuickPosPage');

interface UsePosScannerReturn {
  scanValue: string;
  setScanValue: (value: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
  handleScanKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function usePosScanner(
  storeId: string | undefined,
  onProductFound: (product: PosProduct) => void,
  onError: (msg: string) => void,
  isPaymentModalOpen: boolean = false,
): UsePosScannerReturn {
  const [scanValue, setScanValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleScanKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value.trim();
      if (!value) return;

      debugLog('Scanning barcode', value);

      try {
        if (!storeId) return;
        const product = await api.pos.lookupByScan(value, storeId);
        if (product) {
          onProductFound(product);
          setScanValue('');
        } else {
          onError(`Item not found: ${value}`);
          setScanValue('');
        }
      } catch (err: any) {
        onError(`Scan error: ${err.message}`);
        setScanValue('');
      }
    }
  }, [storeId, onProductFound, onError]);

  // Global scanner listener (no-click scanning)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (isPaymentModalOpen) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter' && buffer.length > 0) {
        e.preventDefault();
        const value = buffer.trim();
        buffer = '';
        debugLog('Global scan detected', value);

        try {
          if (!storeId) return;
          const product = await api.pos.lookupByScan(value, storeId);
          if (product) {
            onProductFound(product);
          } else {
            onError(`Item not found: ${value}`);
          }
        } catch (err: any) {
          onError(`Scan error: ${err.message}`);
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [storeId, onProductFound, onError, isPaymentModalOpen]);

  return {
    scanValue,
    setScanValue,
    isScanning,
    setIsScanning,
    handleScanKeyDown,
  };
}