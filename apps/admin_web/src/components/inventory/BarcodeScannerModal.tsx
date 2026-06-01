import { useState, useRef, useEffect } from 'react';
import { X, ScanLine } from 'lucide-react';
import { Button } from '../ui/Button';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setBarcode('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onScan(barcode.trim());
      setBarcode('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div className="flex items-center gap-2">
            <ScanLine className="text-primary" size={20} />
            <h3 className="font-semibold text-text-primary">Scan Barcode</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-text-secondary text-center">
            Scan a product barcode or enter it manually below.
          </p>
          <div className="relative">
            <ScanLine size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter barcode or SKU..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border-default rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
            />
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            className="w-full"
            disabled={!barcode.trim()}
          >
            Simulate Scan
          </Button>
        </form>
      </div>
    </div>
  );
}
