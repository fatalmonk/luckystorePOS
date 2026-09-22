import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardCopy, FileScan, ImageIcon, LoaderCircle, Upload } from 'lucide-react';
import { type ReceiptOcrResult, type ReceiptOcrSupplier, parseReceiptFilename, scanReceiptImage } from './receiptOcr';

type ReceiptScanPanelProps = {
  suppliers: ReceiptOcrSupplier[];
  onApply: (result: ReceiptOcrResult) => void;
};

export function ReceiptScanPanel({ suppliers, onApply }: ReceiptScanPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [showRawText, setShowRawText] = useState(false);
  const [copied, setCopied] = useState(false);

  const scan = useCallback(async (source: File | string) => {
    if (source instanceof File && !source.type.startsWith('image/')) {
      setError('Choose a receipt image (JPG, PNG, or WebP).');
      return;
    }

    if (source instanceof File) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(source));

      // Instantly parse filename metadata before OCR finishes
      const fileMeta = parseReceiptFilename(source.name, suppliers);
      if (fileMeta.invoiceNumber || fileMeta.supplier || fileMeta.invoiceTotal) {
        setResult({
          invoiceNumber: fileMeta.invoiceNumber,
          invoiceDate: fileMeta.invoiceDate,
          invoiceTotal: fileMeta.invoiceTotal,
          supplier: fileMeta.supplier,
          items: [],
        });
      }
    }

    setError(null);
    setIsScanning(true);
    setStatusText('Reading text from receipt…');
    try {
      const ocrResult = await scanReceiptImage(source, suppliers, (progress, status) => {
        if (status === 'recognizing text') {
          setStatusText(`Reading image (${progress}%)`);
        } else if (status.includes('loading') || status.includes('initializing')) {
          setStatusText('Loading OCR engine…');
        } else {
          setStatusText(status);
        }
      });

      // Merge: Keep filename invoice/supplier/total if present, overlay extracted items
      setResult((prev) => ({
        invoiceNumber: prev?.invoiceNumber || ocrResult.invoiceNumber,
        invoiceDate: prev?.invoiceDate || ocrResult.invoiceDate,
        invoiceTotal: prev?.invoiceTotal || ocrResult.invoiceTotal,
        supplier: prev?.supplier || ocrResult.supplier,
        items: ocrResult.items?.length ? ocrResult.items : (prev?.items || []),
        rawText: ocrResult.rawText,
      }));
    } catch (error) {
      console.error('Receipt OCR failed:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Receipt scanning failed for an unknown reason.',
      );
    } finally {
      setIsScanning(false);
      setStatusText('');
      if (source instanceof File && fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [previewUrl, suppliers]);

  // Clipboard paste support (e.g. Cmd+V copied screenshot/image from Google Drive)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void scan(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [scan]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void scan(file);
  };

  return (
    <section
      className={`card p-4 transition-colors ${isDragging ? 'border-primary border-dashed bg-primary/5' : ''}`}
      aria-labelledby="receipt-scan-title"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="receipt-scan-title" className="font-semibold text-text-main flex items-center gap-2">
            <FileScan size={18} /> Scan receipt
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Auto-extracts supplier, invoice no, and total from image.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void scan(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="button-outline shrink-0 flex items-center gap-2"
        >
          {isScanning ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
          {isScanning ? (statusText || 'Scanning…') : 'Upload Receipt'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-3 w-full cursor-pointer rounded-lg border border-dashed border-border-color py-3 px-4 text-center hover:border-text-muted transition-colors"
        aria-label="Click to upload a receipt image"
      >
        <p className="text-xs text-text-muted flex items-center justify-center gap-1.5">
          <ImageIcon size={14} aria-hidden="true" />
          <span>
            Click to upload, drag &amp; drop, or <strong>paste image (⌘+V / Ctrl+V)</strong>
          </span>
        </p>
      </button>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Or paste receipt title: e.g. LS69-16/04/26-Savoy-9534BDT"
          className="input flex-1 text-xs py-1.5"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault();
              const meta = parseReceiptFilename(e.currentTarget.value, suppliers);
              setResult({
                invoiceNumber: meta.invoiceNumber,
                invoiceDate: meta.invoiceDate,
                invoiceTotal: meta.invoiceTotal,
                supplier: meta.supplier,
                items: result?.items || [],
              });
            }
          }}
          onChange={(e) => {
            const val = e.target.value.trim();
            if (val.length >= 8 && (val.includes('-') || val.includes('_'))) {
              const meta = parseReceiptFilename(val, suppliers);
              if (meta.invoiceNumber || meta.supplier || meta.invoiceTotal) {
                setResult(prev => ({
                  invoiceNumber: meta.invoiceNumber || prev?.invoiceNumber || null,
                  invoiceDate: meta.invoiceDate || prev?.invoiceDate || null,
                  invoiceTotal: meta.invoiceTotal || prev?.invoiceTotal || null,
                  supplier: meta.supplier || prev?.supplier || null,
                  items: prev?.items || [],
                }));
              }
            }
          }}
        />
      </div>

      {previewUrl && (
        <div className="mt-4 rounded-xl border border-border-color overflow-hidden bg-[var(--color-border-light)] shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-color bg-[var(--color-surface-hover)]">
            <span className="text-xs font-medium text-text-main">Receipt Preview</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted">
                {isScanning ? statusText : (result ? 'Scanned' : 'Ready')}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setResult(null);
                  setError(null);
                }}
                className="text-xs font-medium text-color-danger hover:underline px-1.5 py-0.5"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="p-2 flex justify-center bg-[var(--color-border-light)]">
            <img
              src={previewUrl}
              alt="Receipt full preview"
              className="max-h-[500px] w-auto max-w-full rounded-lg object-contain shadow-md border border-border-color"
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-color-danger">{error}</p>}

      {result && (
        <div className="mt-4 rounded-lg border border-border-color p-3 text-sm">
          <p className="font-medium text-text-main">Review scanned values</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-text-muted sm:grid-cols-4">
            <div>
              <dt className="text-xs">Supplier</dt>
              <dd className="text-text-main font-semibold">{result.supplier?.name ?? 'No match'}</dd>
            </div>
            <div>
              <dt className="text-xs">Invoice #</dt>
              <dd className="text-text-main font-semibold">{result.invoiceNumber ?? 'Not found'}</dd>
            </div>
            <div>
              <dt className="text-xs">Date</dt>
              <dd className="text-text-main font-semibold">{result.invoiceDate ?? 'Not found'}</dd>
            </div>
            <div>
              <dt className="text-xs">Total</dt>
              <dd className="text-text-main font-semibold">{result.invoiceTotal ? `৳ ${result.invoiceTotal}` : 'Not found'}</dd>
            </div>
          </dl>

          {result.items && result.items.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border-color">
              <p className="text-xs font-medium text-text-muted mb-2">
                Detected Line Items ({result.items.length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {result.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[var(--color-border-light)]"
                  >
                    <span className="font-medium text-text-main truncate max-w-[200px] sm:max-w-xs">
                      {item.name}
                    </span>
                    <span className="text-text-muted shrink-0">
                      Qty: <strong className="text-text-main">{item.quantity}</strong>
                      {item.unitPrice ? ` @ ৳${item.unitPrice}` : ''}
                      {item.total ? ` = ৳${item.total}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.rawText && (
            <div className="mt-3 pt-3 border-t border-border-color">
              <button
                type="button"
                onClick={() => setShowRawText(v => !v)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors w-full"
              >
                {showRawText ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showRawText ? 'Hide' : 'Show'} raw OCR text
                <span className="ml-auto text-[10px] opacity-60">reference while adding items manually</span>
              </button>

              {showRawText && (
                <div className="mt-2 relative">
                  <pre className="text-[11px] leading-relaxed text-text-muted bg-[var(--color-border-light)] rounded-lg p-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono border border-border-color">
                    {result.rawText}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(result.rawText!);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[var(--color-surface-hover)] border border-border-color hover:border-text-muted transition-colors text-text-muted"
                  >
                    <ClipboardCopy size={11} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={() => onApply(result)} className="button-primary mt-3">
            Apply to form
          </button>
        </div>
      )}
    </section>
  );
}
