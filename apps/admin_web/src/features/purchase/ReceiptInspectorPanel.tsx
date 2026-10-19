import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileScan,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
} from 'lucide-react';
import { clsx } from 'clsx';
import { type ReceiptOcrResult } from './receiptOcr';
import { performClientDeterministicReconciliation } from './jevVerification';

export interface ReceiptInspectorPanelProps {
  receiptUrl: string | null;
  isScanning?: boolean;
  statusText?: string;
  ocrResult?: ReceiptOcrResult | null;
  onRemoveReceipt?: () => void;
  onClose?: () => void;
  className?: string;
}

export function ReceiptInspectorPanel({
  receiptUrl,
  isScanning = false,
  statusText,
  ocrResult,
  onRemoveReceipt,
  onClose,
  className,
}: ReceiptInspectorPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const [prevReceiptUrl, setPrevReceiptUrl] = useState(receiptUrl);
  if (prevReceiptUrl !== receiptUrl) {
    setPrevReceiptUrl(receiptUrl);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  const jevSummary = React.useMemo(() => {
    return ocrResult ? performClientDeterministicReconciliation(ocrResult) : null;
  }, [ocrResult]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  return (
    <div
      className={clsx(
        'flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden shadow-xs transition-all duration-200',
        isFullscreen && 'fixed inset-4 z-50 shadow-2xl border-primary/30',
        className
      )}
    >
      {/* iOS-inspired Header bar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/80 bg-muted/30 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <FileScan size={15} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
              Receipt Inspector
              {isScanning && (
                <span className="inline-block size-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {isScanning ? (statusText || 'Analyzing receipt...') : (receiptUrl ? 'High-resolution scan' : 'Awaiting image')}
            </p>
          </div>
        </div>

        {/* Viewport & Zoom Controls */}
        {receiptUrl && (
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border/60 rounded-full px-1.5 py-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors active:scale-95"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-1 text-[11px] font-medium tabular-nums text-muted-foreground hover:text-foreground transition-colors"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors active:scale-95"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <div className="h-3 w-px bg-border/60 mx-0.5" />
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors active:scale-95"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            {onRemoveReceipt && (
              <button
                type="button"
                onClick={onRemoveReceipt}
                className="p-1 rounded-full text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95 ml-0.5"
                aria-label="Remove receipt"
                title="Remove receipt"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md"
          >
            Hide
          </button>
        )}
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className={clsx(
          'relative flex-1 min-h-[360px] bg-muted/20 overflow-hidden flex items-center justify-center p-3 select-none',
          zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {receiptUrl ? (
          <div
            className="transition-transform duration-75 origin-center will-change-transform flex items-center justify-center max-h-full max-w-full"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            }}
          >
            <img
              src={receiptUrl}
              alt="Receipt high resolution preview"
              className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-lg ring-1 ring-border/80 bg-background"
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <FileScan size={24} className="opacity-60 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground">No Receipt in Inspector</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
              Upload or scan a receipt to inspect items and verify values side-by-side with your form.
            </p>
          </div>
        )}

        {/* Floating Quick Stats when Scanned */}
        {ocrResult && (
          <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
              {jevSummary && (
                <div
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md shadow-xs border',
                    jevSummary.recommendation === 'PASS' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                    jevSummary.recommendation === 'REVIEW' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
                    jevSummary.recommendation === 'FAIL' && 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  )}
                >
                  {jevSummary.recommendation === 'PASS' && <CheckCircle2 size={12} />}
                  {jevSummary.recommendation === 'REVIEW' && <AlertTriangle size={12} />}
                  {jevSummary.recommendation === 'FAIL' && <XCircle size={12} />}
                  <span>JEV: {jevSummary.recommendation}</span>
                  {jevSummary.difference > 0 && (
                    <span className="font-mono text-[10px] opacity-80">
                      (৳{jevSummary.difference})
                    </span>
                  )}
                </div>
              )}

              {ocrResult.invoiceTotal && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-background/90 text-foreground backdrop-blur-md shadow-xs border border-border">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold tabular-nums">৳ {ocrResult.invoiceTotal}</span>
                </div>
              )}
            </div>

            {ocrResult.rawText && (
              <button
                type="button"
                onClick={() => setShowRawText(prev => !prev)}
                className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-background/90 text-muted-foreground hover:text-foreground backdrop-blur-md shadow-xs border border-border transition-colors active:scale-95"
              >
                <FileText size={12} />
                <span>{showRawText ? 'Hide OCR Text' : 'View Text'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Raw OCR Text Drawer */}
      {showRawText && ocrResult?.rawText && (
        <div className="border-t border-border/80 bg-muted/40 p-3 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
              Extracted Raw OCR Text
            </span>
            <span className="text-[10px] text-muted-foreground">
              {ocrResult.extractionMethod === 'vision' ? 'AI Vision' : 'OCR Engine'}
            </span>
          </div>
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words leading-relaxed select-text bg-background/70 p-2 rounded-lg border border-border/50">
            {ocrResult.rawText}
          </pre>
        </div>
      )}
    </div>
  );
}
