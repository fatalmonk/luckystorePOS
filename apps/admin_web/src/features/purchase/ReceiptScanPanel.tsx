import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardCopy, FileScan, ImageIcon, LoaderCircle, Upload } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { deleteReceiptImage, uploadReceiptImage } from '../../lib/images';
import { type ReceiptOcrResult, type ReceiptOcrSupplier, parseReceiptFilename, scanReceiptImage } from './receiptOcr';

type ReceiptScanPanelProps = {
  suppliers: ReceiptOcrSupplier[];
  onApply: (result: ReceiptOcrResult) => void;
  onScanStart?: () => void;
  onImageUploaded?: (result: { url: string; key: string }) => void;
  onImageRemoved?: () => void;
};

export function ReceiptScanPanel({ suppliers, onApply, onScanStart, onImageUploaded, onImageRemoved }: ReceiptScanPanelProps) {
  const { session, tenantId } = useAuth();
  const accessToken = session?.access_token;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanIdRef = useRef(0);
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

    const scanId = ++scanIdRef.current;
    onScanStart?.();
    const fileMeta = source instanceof File ? parseReceiptFilename(source.name, suppliers) : null;
    setResult(fileMeta && (fileMeta.invoiceNumber || fileMeta.supplier || fileMeta.invoiceTotal)
      ? {
          ...fileMeta,
          items: [],
          extractionMethod: 'filename',
          fieldSources: {
            ...(fileMeta.supplier ? { supplier: 'filename' as const } : {}),
            ...(fileMeta.invoiceNumber ? { invoiceNumber: 'filename' as const } : {}),
            ...(fileMeta.invoiceDate ? { invoiceDate: 'filename' as const } : {}),
            ...(fileMeta.invoiceTotal ? { invoiceTotal: 'filename' as const } : {}),
          },
        }
      : null);
    setShowRawText(false);
    setError(null);
    if (source instanceof File) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(source));

    }

    setIsScanning(true);
    setStatusText('Reading text from receipt…');

    let uploadError: string | null = null;
    try {
      // Upload receipt image immediately when a File is provided
      if (source instanceof File && tenantId) {
        setStatusText('Uploading image…');
        try {
          const uploadResult = await uploadReceiptImage({ file: source, tenantId });
          if (scanId !== scanIdRef.current) {
            void deleteReceiptImage(uploadResult.key);
            return;
          }
          onImageUploaded?.(uploadResult);
        } catch (err) {
          console.error('Image upload failed:', err);
          uploadError = err instanceof Error ? err.message : 'Upload failed.';
        }
      }

      const ocrResult = await scanReceiptImage(source, suppliers, (progress, status) => {
        if (scanId !== scanIdRef.current) return;
        if (status === 'recognizing text') {
          setStatusText(`Reading image (${progress}%)`);
        } else if (status.includes('loading') || status.includes('initializing')) {
          setStatusText('Loading OCR engine…');
        } else {
          setStatusText(status);
        }
      }, accessToken);

      // The OCR result already resolves filename/vision conflicts and records field sources.
      if (scanId === scanIdRef.current) {
        setResult(ocrResult);
        if (uploadError) setError(`OCR succeeded, but image upload failed: ${uploadError}`);
      }
    } catch (error) {
      console.error('Receipt OCR failed:', error);
      if (scanId === scanIdRef.current) {
        const ocrErr = error instanceof Error ? error.message : 'Receipt scanning failed for an unknown reason.';
        setError(uploadError ? `Upload failed: ${uploadError}. Also, OCR failed: ${ocrErr}` : ocrErr);
      }
    } finally {
      if (scanId === scanIdRef.current) {
        setIsScanning(false);
        setStatusText('');
        if (source instanceof File && fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  }, [accessToken, onImageUploaded, onScanStart, previewUrl, suppliers, tenantId]);

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
    if (isScanning) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void scan(file);
  };

  const removeReceipt = () => {
    scanIdRef.current += 1;
    onScanStart?.();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setIsScanning(false);
    setStatusText('');
    onImageRemoved?.();
  };

  const applyFilenameMetadata = (value: string) => {
    const meta = parseReceiptFilename(value, suppliers);
    if (!meta.invoiceNumber && !meta.supplier && !meta.invoiceTotal) return;
    const wasScanning = isScanning;
    // Supersede both the panel's in-flight OCR result and the parent's scan generation.
    scanIdRef.current += 1;
    onScanStart?.();
    setIsScanning(false);
    setStatusText('');
    setError(null);
    setResult(previous => {
      const completedScan = wasScanning ? null : previous;
      const visionTotal = completedScan?.fieldConflicts?.invoiceTotal?.visionValue
        ?? (completedScan?.fieldSources?.invoiceTotal === 'vision' ? completedScan.invoiceTotal : null);
      const filenameTotal = meta.invoiceTotal ?? completedScan?.fieldConflicts?.invoiceTotal?.filenameValue ?? null;
      const totalConflict = visionTotal != null && filenameTotal != null
        && Number.isFinite(Number(visionTotal)) && Number.isFinite(Number(filenameTotal))
        && Math.abs(Number(visionTotal) - Number(filenameTotal)) > 0.5;
      const totalConflictReason = totalConflict
        ? `Filename total (${filenameTotal}) differs from vision-read total (${visionTotal}); the form uses the filename value. Verify both against the receipt.`
        : null;
      const otherReviewReason = completedScan?.reviewReason
        ?.replace(/Filename total \([^)]*\) differs from vision-read total \([^)]*\); the form uses the (?:filename|vision(?:-read)?) value\. Verify both against the receipt\.\s*/g, '')
        .trim() || undefined;
      return {
        ...completedScan,
        invoiceNumber: meta.invoiceNumber ?? completedScan?.invoiceNumber ?? null,
        invoiceDate: meta.invoiceDate ?? completedScan?.invoiceDate ?? null,
        invoiceTotal: meta.invoiceTotal ?? completedScan?.invoiceTotal ?? null,
        supplier: meta.supplier ?? completedScan?.supplier ?? null,
        items: completedScan?.items ?? [],
        extractionMethod: completedScan?.extractionMethod ?? 'filename',
        fieldSources: {
          ...completedScan?.fieldSources,
          ...(meta.supplier ? { supplier: 'filename' as const } : {}),
          ...(meta.invoiceNumber ? { invoiceNumber: 'filename' as const } : {}),
          ...(meta.invoiceDate ? { invoiceDate: 'filename' as const } : {}),
          ...(meta.invoiceTotal ? { invoiceTotal: 'filename' as const } : {}),
        },
        reviewRequired: Boolean(otherReviewReason || totalConflict || (completedScan?.reviewRequired && !completedScan?.fieldConflicts?.invoiceTotal)),
        reviewReason: [otherReviewReason, totalConflictReason].filter(Boolean).join(' ') || undefined,
        fieldConflicts: totalConflict && visionTotal != null && filenameTotal != null
          ? {
              ...completedScan?.fieldConflicts,
              invoiceTotal: { filenameValue: filenameTotal, visionValue: visionTotal, selectedSource: 'filename' as const },
            }
          : completedScan?.fieldConflicts?.invoiceTotal
            ? { ...completedScan.fieldConflicts, invoiceTotal: undefined }
            : completedScan?.fieldConflicts,
      };
    });
  };

  return (
    <section
      className={`card p-4 transition-colors ${isDragging ? 'border-primary border-dashed bg-primary/5 shadow-md' : ''}`}
      aria-labelledby="receipt-scan-title"
      onDragOver={(e) => {
        if (isScanning) return;
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
          className="button-outline flex shrink-0 items-center gap-2 transition-transform active:scale-[0.96]"
        >
          {isScanning ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
          {isScanning ? (statusText || 'Scanning…') : 'Upload Receipt'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-3 min-h-11 w-full cursor-pointer rounded-lg border border-dashed border-border-color px-4 py-3 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]"
        aria-label="Click to upload a receipt image"
        disabled={isScanning}
      >
        <p className="text-xs text-text-muted flex items-center justify-center gap-1.5">
          <ImageIcon size={14} aria-hidden="true" />
          <span>
            Click to upload, drag &amp; drop, or <strong>paste image (⌘+V / Ctrl+V)</strong>
          </span>
        </p>
      </button>

      <div className="mt-3 flex gap-2">
        <label htmlFor="receipt-title-input" className="sr-only">Receipt title or filename</label>
        <input
          id="receipt-title-input"
          type="text"
          placeholder="Or paste receipt title: e.g. LS69-16/04/26-Savoy-9534BDT"
          className="input flex-1 text-xs py-1.5"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault();
              applyFilenameMetadata(e.currentTarget.value);
            }
          }}
          onChange={(e) => {
            const val = e.target.value.trim();
            if (val.length >= 8 && (val.includes('-') || val.includes('_'))) {
              applyFilenameMetadata(val);
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
                  removeReceipt();
                }}
                className="text-xs font-medium text-color-danger hover:underline px-1.5 py-0.5"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="p-2 flex justify-center rounded-xl bg-[var(--color-border-light)]">
            <img
              src={previewUrl}
              alt="Receipt full preview"
              className="max-h-[500px] w-auto max-w-full rounded-lg object-contain shadow-md outline outline-1 outline-black/10 dark:outline-white/10"
            />
          </div>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">{statusText || (result ? 'Receipt scan complete.' : '')}</p>
      {error && <p className="mt-3 text-sm text-color-danger" role="alert">{error}</p>}

      {result && (
        <div className="mt-4 rounded-lg border border-border-color p-3 text-sm shadow-sm">
          <p className="font-medium text-text-main">Review scanned values</p>
          {result.reviewRequired && (
            <div
              className="mt-2 rounded-md border px-3 py-2 text-xs font-medium"
              style={{ borderColor: 'var(--color-warning-strong)', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
              role="alert"
            >
              <p className="font-semibold">Manual review required</p>
              <p className="mt-1">{result.reviewReason || 'Verify all extracted values against the receipt before posting. Applying this scan only fills the editable form.'}</p>
            </div>
          )}
          {result.extractionMethod && (
            <p className="mt-1 text-xs text-text-muted">Extraction: {result.extractionMethod === 'vision' ? 'Vision' : result.extractionMethod === 'tesseract' ? 'Tesseract fallback' : 'Filename metadata'}</p>
          )}
          <dl className="mt-2 grid grid-cols-2 gap-2 text-text-muted sm:grid-cols-4">
            <div>
              <dt className="text-xs">Supplier</dt>
              <dd className="text-text-main font-semibold">{result.supplier?.name ?? 'No match'}{result.fieldSources?.supplier && <span className="ml-1 text-[10px] font-normal text-text-muted">· {result.fieldSources.supplier} source</span>}</dd>
            </div>
            <div>
              <dt className="text-xs">Invoice #</dt>
              <dd className="text-text-main font-semibold">{result.invoiceNumber ?? 'Not found'}{result.fieldSources?.invoiceNumber && <span className="ml-1 text-[10px] font-normal text-text-muted">· {result.fieldSources.invoiceNumber} source</span>}</dd>
            </div>
            <div>
              <dt className="text-xs">Date</dt>
              <dd className="text-text-main font-semibold">{result.invoiceDate ?? 'Not found'}{result.fieldSources?.invoiceDate && <span className="ml-1 text-[10px] font-normal text-text-muted">· {result.fieldSources.invoiceDate} source</span>}</dd>
            </div>
            <div>
              <dt className="text-xs">Total</dt>
              <dd className="text-text-main font-semibold tabular-nums">{result.invoiceTotal ? `৳ ${result.invoiceTotal}` : 'Not found'}{result.fieldSources?.invoiceTotal && <span className="ml-1 text-[10px] font-normal text-text-muted">· {result.fieldSources.invoiceTotal} source</span>}</dd>
            </div>
          </dl>

          {result.warnings && result.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-[var(--color-warning)]" role="status">
              {result.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}
            </ul>
          )}

          {result.items && result.items.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border-color">
              <p className="text-xs font-medium text-text-muted mb-2">
                Detected Line Items ({result.items.length})
                {result.fieldSources?.items && <span className="ml-1 font-normal">· {result.fieldSources.items} source</span>}
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {result.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[var(--color-border-light)] shadow-xs"
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
                aria-expanded={showRawText}
                aria-controls="receipt-raw-ocr-text"
                onClick={() => setShowRawText(v => !v)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors w-full"
              >
                {showRawText ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showRawText ? 'Hide' : 'Show'} raw OCR text
                <span className="ml-auto text-[10px] opacity-60">reference while adding items manually</span>
              </button>

              <div id="receipt-raw-ocr-text" hidden={!showRawText} className="mt-2 relative">
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
            </div>
          )}

          <button type="button" onClick={() => onApply(result)} className="button-primary mt-3 transition-transform active:scale-[0.96]">
            Apply to form
          </button>
        </div>
      )}
    </section>
  );
}
