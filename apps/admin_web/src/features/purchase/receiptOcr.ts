import { createWorker } from 'tesseract.js';

export type ReceiptOcrSupplier = {
  id: string;
  name: string;
};

export type ReceiptOcrItem = {
  name: string;
  quantity: number | undefined;
  unitPrice?: number;
  total?: number;
  packSize?: string | null;
  unit?: string | null;
  confidence?: 'high' | 'medium' | 'low';
  warnings?: string[];
};

export type OcrExtractionMethod = 'vision' | 'tesseract' | 'filename';

export type ReceiptOcrResult = {
  invoiceNumber: string | null;
  invoiceTotal: string | null;
  subtotal?: number | null;
  discount?: number | null;
  vat?: number | null;
  invoiceDate?: string | null;
  supplier: ReceiptOcrSupplier | null;
  items: ReceiptOcrItem[];
  rawText?: string;
  confidence?: 'high' | 'medium' | 'low';
  warnings?: string[];
  extractionMethod?: OcrExtractionMethod;
};


export function validateOcrResult(result: ReceiptOcrResult): ReceiptOcrResult {
  if (!result.warnings) result.warnings = [];

  let calculatedLinesTotal = 0;

  for (const item of result.items) {
    if (!item.warnings) item.warnings = [];

    if (item.quantity != null && item.unitPrice != null) {
      const expectedTotal = item.quantity * item.unitPrice;
      if (item.total != null) {
        if (Math.abs(expectedTotal - item.total) > 0.05) {
          item.warnings.push(`Quantity × unit price (${expectedTotal.toFixed(2)}) differs from extracted total (${item.total.toFixed(2)}).`);
        }
      } else {
        item.warnings.push(`Line total was not extracted; quantity × unit price is ${expectedTotal.toFixed(2)}.`);
      }
    }

    if (item.total != null) {
      calculatedLinesTotal += item.total;
    }
  }

  const allLineTotalsPresent = result.items.length > 0 && result.items.every((item) => item.total != null);
  const extractedSubtotal = result.subtotal == null ? null : Number(result.subtotal);
  if (result.invoiceTotal != null) {
    const rawInvTotal = parseFloat(String(result.invoiceTotal).replace(/[^0-9.-]+/g, ''));
    if (!isNaN(rawInvTotal)) {
      const subtotal = result.subtotal != null ? parseFloat(String(result.subtotal)) : calculatedLinesTotal;
      const discount = result.discount != null ? parseFloat(String(result.discount)) : 0;
      const vat = result.vat != null ? parseFloat(String(result.vat)) : 0;

      const expectedInvoiceTotal = subtotal - discount + vat;

      if (result.items.length > 0 && Math.abs(expectedInvoiceTotal - rawInvTotal) > 5.0) {
        result.warnings.push(`Extracted lines total (${subtotal.toFixed(2)}) - discount + tax differs from invoice total (${rawInvTotal.toFixed(2)}).`);
      }
      if (allLineTotalsPresent && Math.abs(calculatedLinesTotal - rawInvTotal) > 0.05) {
        result.warnings.push(`Sum of extracted line totals (${calculatedLinesTotal.toFixed(2)}) differs from invoice total (${rawInvTotal.toFixed(2)}).`);
      }
    }
  }
  if (allLineTotalsPresent && extractedSubtotal != null && Number.isFinite(extractedSubtotal)
      && Math.abs(calculatedLinesTotal - extractedSubtotal) > 0.05) {
    result.warnings.push(`Sum of extracted line totals (${calculatedLinesTotal.toFixed(2)}) differs from extracted subtotal (${extractedSubtotal.toFixed(2)}).`);
  }
  return result;
}

export function parseReceiptFilename(
  name: string,
  suppliers: ReceiptOcrSupplier[]
): {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: ReceiptOcrSupplier | null;
  invoiceTotal: string | null;
} {
  let decodedName = name;
  try {
    decodedName = decodeURIComponent(name);
  } catch {
    // Browser-provided filenames can contain literal, unescaped percent signs.
  }
  const cleanName = decodedName.replace(/\.[a-zA-Z0-9]+$/, '').trim();
  if (/^(?:receipt|image|photo|scan|screenshot)(?:[\s_-]+(?:photo|image|scan))?$/i.test(cleanName)) {
    return { invoiceNumber: null, invoiceDate: null, supplier: null, invoiceTotal: null };
  }

  // Pattern: [Invoice] [Date] [Supplier] [Amount]
  // Accepts hyphens (-), underscores (_), slashes (/), or spaces as separators
  const match = cleanName.match(
    /^([a-zA-Z0-9]{2,10})[\s_-]+([0-9]{1,4}[/_.-][0-9]{1,2}[/_.-][0-9]{1,4})[\s_-]+([a-zA-Z\u0980-\u09FF\s]+?)[\s_-]+([0-9]+(?:\.[0-9]{1,2})?)(?:BDT|tk|taka)?$/i
  );

  if (match) {
    const invoiceNumber = match[1].toUpperCase();
    const invoiceDate = normalizeFilenameDate(match[2]);
    const rawSupplierName = match[3].trim();
    const invoiceTotal = match[4];

    const matchedSupplier = resolveSupplierName(rawSupplierName, suppliers) ?? { id: '', name: rawSupplierName };

    return {
      invoiceNumber,
      invoiceDate,
      supplier: matchedSupplier,
      invoiceTotal,
    };
  }

  if (/^(?:receipt|image|photo|scan|screenshot)(?:$|[\s_-])/i.test(cleanName)) {
    return { invoiceNumber: null, invoiceDate: null, supplier: null, invoiceTotal: null };
  }

  // Fallback: tokenize and identify parts
  let invoiceNumber: string | null = null;
  let invoiceDate: string | null = null;
  let supplier: ReceiptOcrSupplier | null = null;
  let invoiceTotal: string | null = null;

  // Extract amount with BDT/tk or trailing number
  const totalMatch = cleanName.match(/([0-9]+(?:\.[0-9]{1,2})?)(?:BDT|tk|taka)/i) ?? cleanName.match(/[\s_-]([0-9]{3,7}(?:\.[0-9]{1,2})?)(?:[\s_-]|$)/);
  if (totalMatch) {
    invoiceTotal = totalMatch[1];
  }

  // Extract date
  const dateMatch = cleanName.match(/([0-9]{1,4}[/_.-][0-9]{1,2}[/_.-][0-9]{1,4})/);
  if (dateMatch) {
    invoiceDate = normalizeFilenameDate(dateMatch[1]);
  }

  // Extract invoice (first alphanumeric word e.g. LS69)
  const invMatch = cleanName.match(/^([a-zA-Z0-9]{2,10})/);
  if (invMatch) {
    invoiceNumber = invMatch[1].toUpperCase();
  }

  // Find supplier from known suppliers or remaining letters
  const filenameSupplierMatches = suppliers.filter((candidate) => cleanName.toLowerCase().includes(candidate.name.toLowerCase()));
  if (filenameSupplierMatches.length === 1) supplier = filenameSupplierMatches[0];

  if (!supplier && (invoiceDate || invoiceTotal)) {
    // Strip matched numbers and invoice, keep remaining letters as supplier name
    let rest = cleanName;
    if (invoiceNumber) rest = rest.replace(new RegExp('^' + invoiceNumber, 'i'), '');
    if (invoiceTotal) rest = rest.replace(invoiceTotal, '');
    if (invoiceDate) rest = rest.replace(invoiceDate, '');
    rest = rest.replace(/(?:BDT|tk|taka)/gi, '').replace(/[\s\-_/.]+/g, ' ').trim();
    if (rest.length >= 2) {
      supplier = { id: '', name: rest };
    }
  }

  return { invoiceNumber, invoiceDate, supplier, invoiceTotal };
}

function resolveSupplierName(name: string, suppliers: ReceiptOcrSupplier[]): ReceiptOcrSupplier | null {
  const normalized = name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;
  const matches = suppliers.filter((supplier) => {
    const candidate = supplier.name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
  });
  return matches.length === 1 ? matches[0] : null;
}

function normalizeFilenameDate(value: string): string {
  const parts = value.split(/[/.\-_]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  let year: number, month: number, day: number;
  if (parts[0] >= 1000) [year, month, day] = parts;
  else if (parts[2] >= 1000) [day, month, year] = parts;
  else {
    [day, month] = parts;
    year = parts[2] >= 70 ? 1900 + parts[2] : 2000 + parts[2];
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return value;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toGoogleDriveDownloadUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const fileId = url.pathname.match(/\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    if (!fileId || !/(^|\.)drive\.google\.com$/.test(url.hostname)) return null;
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  } catch {
    return null;
  }
}

const bengaliDigits: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

function normalizeDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => bengaliDigits[d] ?? d);
}

const compact = (value: string) => value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

function findSupplier(text: string, suppliers: ReceiptOcrSupplier[]): ReceiptOcrSupplier | null {
  const normalizedReceipt = compact(text);
  const headerLines = text.split(/\r?\n/).slice(0, 8);
  const normalizedHeader = compact(headerLines.join(' '));
  const matches = suppliers.filter((supplier) => {
    const fullName = compact(supplier.name);
    const tokens = supplier.name.toLowerCase().split(/[\s_/-]+/).filter((token) => token.length >= 3);
    return fullName.length >= 3 && (normalizedReceipt.includes(fullName)
      || normalizedHeader.includes(fullName)
      || tokens.some((token) => normalizedReceipt.includes(token) || normalizedHeader.includes(token)));
  });
  return matches.length === 1 ? matches[0] : null;
}

function findInvoiceNumber(text: string): string | null {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/(?:invoice|challan|memo|bill|চালান|মেমো|বিল|ক্যাশমেমো)\s*(?:no\.?|number|#|নং)?\s*[:#-]?\s*([a-z0-9][a-z0-9/-]{2,})/i);
  if (match?.[1]) return match[1].toUpperCase();

  // Date as fallback reference (e.g. তারিখ: ১৬.০৪.২০২৬)
  const dateMatch = normalized.match(/(?:date|তারিখ)\s*[:#-]?\s*([0-9]{1,4}[-/.\\ ][0-9]{1,2}[-/.\\ ][0-9]{1,4})/i);
  if (dateMatch?.[1]) return `MEMO-${dateMatch[1].trim().replace(/\s+/g, '-')}`;

  return null;
}

function findTotal(text: string): string | null {
  const normalized = normalizeDigits(text);
  const totalKeywords = /(?:সাব\s*টোটাল|টোটাল|সর্বমোট|নিট\s*(?:দেয়|বিল)?|মোট\s*(?:টাকা|বিল)?|grand\s*total|net\s*(?:payable|amount)|sub\s*total|total\s*(?:amount|payable)?|amount\s*due)/i;
  const lines = normalized.split(/\r?\n/);

  const totalLineCandidates: string[] = [];
  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const matches = Array.from(line.matchAll(/(?:৳|tk\.?|bdt|rs\.?|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi));
      const val = matches.at(-1)?.[1]?.replace(/,/g, '');
      if (val && Number.isFinite(Number(val)) && Number(val) > 0) {
        totalLineCandidates.push(val);
      }
    }
  }

  if (totalLineCandidates.length > 0) {
    return totalLineCandidates.at(-1)!;
  }

  // Fallback: search for numbers > 100 in bottom 25% of receipt text
  const bottomLines = lines.slice(Math.floor(lines.length * 0.75)).join('\n');
  const allNumbers = Array.from(bottomLines.matchAll(/\b([0-9]{3,7}(?:\.[0-9]{1,2})?)\b/g))
    .map((m) => m[1])
    .filter((n) => Number(n) > 50);

  if (allNumbers.length > 0) {
    return allNumbers.at(-1)!;
  }

  return null;
}

function findItems(text: string): ReceiptOcrItem[] {
  const normalized = normalizeDigits(text);
  const lines = normalized.split(/\r?\n/);
  const items: ReceiptOcrItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 4) continue;

    // Skip header/footer lines
    if (/(?:sl\.?|নাম|পণ্য|বিবরণ|ক্রয়\s*মূল্য|পরিমাণ|দর|কার্টুন|মোট\s*টাকা|টোটাল|ডিসকাউন্ট|সাব\s*টোটাল|ক্রেতার|বিক্রেতার|হিল\s*ভিউ)/i.test(trimmed)) {
      continue;
    }

    // Pattern: [Item Name / Description] [Qty] [Unit Price/Rate] [Total Amount]
    // or line with product name followed by numbers
    const match = trimmed.match(/^([0-9]{1,2}[.\s-])?\s*([a-zA-Z\u0980-\u09FF\s.'()/ -]+?)\s+([0-9]{1,4})\s+([0-9]{1,5}(?:\.[0-9]{1,2})?)(?:\s+([0-9]{1,6}(?:\.[0-9]{1,2})?))?/);
    if (match) {
      const name = match[2].trim().replace(/^[.\s-]+|[.\s-]+$/g, '');
      const qty = parseInt(match[3], 10);
      const unitPrice = match[4] ? parseFloat(match[4]) : undefined;
      const total = match[5] ? parseFloat(match[5]) : (unitPrice && qty ? qty * unitPrice : undefined);

      if (
        name.length >= 4 &&
        /[a-zA-Z\u0980-\u09FF]/.test(name) && // must contain at least one letter
        !isNaN(qty) &&
        qty > 0 &&
        qty < 10000 // sanity cap
      ) {
        items.push({
          name,
          quantity: qty,
          unitPrice,
          total,
        });
      }
    }
  }

  return items;
}

// Preprocess image in browser to increase contrast, grayscale and binarize for OCR
async function preprocessImageForOcr(source: File | Blob): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return source;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(source);
          return;
        }

        // Scale image if too large (keep width around 1600-2000 for optimal OCR)
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const maxDim = 2000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;

        // Grayscale + Adaptive Contrast Enhancement
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Contrast stretch
          const adjusted = gray < 130 ? Math.max(0, gray * 0.7) : Math.min(255, gray * 1.25);
          d[i] = adjusted;
          d[i + 1] = adjusted;
          d[i + 2] = adjusted;
        }

        ctx.putImageData(imgData, 0, 0);

        canvas.toBlob(
          (blob) => resolve(blob || source),
          'image/png',
          1.0
        );
      } catch {
        resolve(source);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(source);
    };

    img.src = url;
  });
}

export async function scanReceiptImage(
  source: File | string,
  suppliers: ReceiptOcrSupplier[],
  onProgress?: (progress: number, status: string) => void,
  authToken?: string
): Promise<ReceiptOcrResult> {
  let imageSource: File | Blob;

  if (typeof source === 'string') {
    try {
      const sourceUrl = new URL(source);
      if (sourceUrl.protocol !== 'https:') throw new Error('Receipt image URLs must use HTTPS.');
      const response = await fetch(source, {
        method: 'GET',
        redirect: 'error',
      });

      if (!response.ok) {
        throw new Error(`Failed to download receipt: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType && !contentType.startsWith('image/')) {
        throw new Error(
          `Expected a receipt image but received ${contentType}.`,
        );
      }

      imageSource = await response.blob();
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error(
          'Cannot download image directly due to browser security (CORS). Please download the image to your device and use the "Upload" button.',
        );
      }
      throw err;
    }
  } else {
    imageSource = source;
  }


  const fileMeta = source instanceof File ? parseReceiptFilename(source.name, suppliers) : null;
  const sourceType = source instanceof File ? source.type || 'image/jpeg' : 'image/jpeg';

  if (!authToken) throw new Error('NO_FALLBACK: Sign in again to scan a receipt securely.');

  if (authToken) {
    if (onProgress) onProgress(10, 'Analyzing image with secure vision AI...');
    try {
      const buffer = await imageSource.arrayBuffer();
      // btoa chunking
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + 8192)));
      }
      const imageBase64 = btoa(binary);

      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-receipt-vision`;
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ imageBase64, mimeType: sourceType }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null) as { error?: string; code?: string } | null;
        const providerUnavailable = errorBody?.code === 'PROVIDER_CREDITS_EXHAUSTED'
          || errorBody?.code === 'PROVIDER_NOT_CONFIGURED'
          || errorBody?.code === 'PROVIDER_AUTH_FAILED'
          || errorBody?.code === 'PROVIDER_INVALID_RESPONSE'
          || errorBody?.code === 'PROVIDER_REQUEST_REJECTED';
        if (providerUnavailable || res.status === 501) {
          throw new Error(`NO_FALLBACK: ${errorBody?.error || 'Vision extraction is unavailable. Contact an administrator.'}`);
        }
        if (res.status === 401 || res.status === 403) throw new Error('NO_FALLBACK: Unauthorized access to AI extraction');
        if (res.status === 413) throw new Error('NO_FALLBACK: Image file is too large');
        if (res.status === 415 || res.status === 400) throw new Error(`NO_FALLBACK: Invalid image or format (HTTP ${res.status})`);
        if (errorBody?.code === 'PROVIDER_RATE_LIMIT') {
          throw new Error('NO_FALLBACK: Vision provider is rate limited. Retry the scan shortly.');
        }
        throw new Error(`AI Provider Error: HTTP ${res.status}`);
      }

      const resultJson = await res.json();
      if (resultJson.success && resultJson.data) {
        const aiResult = resultJson.data;

        const matchSupplier = fileMeta?.supplier
          ?? resolveSupplierName(aiResult.supplierName || '', suppliers)
          ?? { id: '', name: aiResult.supplierName || '' };

        if (onProgress) onProgress(100, 'Vision AI extraction complete');

        return validateOcrResult({
          invoiceNumber: fileMeta?.invoiceNumber ?? aiResult.invoiceNumber ?? null,
          invoiceTotal: fileMeta?.invoiceTotal ?? (aiResult.invoiceTotal != null ? String(aiResult.invoiceTotal) : null),
          invoiceDate: aiResult.invoiceDate ?? fileMeta?.invoiceDate ?? null,
          subtotal: aiResult.subtotal,
          discount: aiResult.discount,
          vat: aiResult.vat,
          supplier: matchSupplier.name ? matchSupplier : null,
          confidence: aiResult.confidence,
          extractionMethod: 'vision',
          items: (aiResult.items || []).map((it: any) => ({
            name: it.name,
            quantity: typeof it.quantity === 'number' ? it.quantity : undefined,
            unitPrice: typeof it.unitPrice === 'number' ? it.unitPrice : undefined,
            total: typeof it.total === 'number' ? it.total : undefined,
            packSize: it.packSize,
            unit: it.unit,
            confidence: it.confidence,
            warnings: []
          }))
        });
      }
    } catch (e: any) {
      if (e.message && e.message.includes('NO_FALLBACK')) {
        throw e;
      }
      console.warn('Vision extraction failed, falling back to Tesseract OCR', e);
    }
  }

  if (onProgress) onProgress(20, 'Falling back to local OCR extraction...');

  const processedSource = await preprocessImageForOcr(imageSource);

  const ocrAssetBase = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.origin).href;
  const worker = await createWorker(['eng', 'ben'], undefined, {
    workerPath: `${ocrAssetBase}worker.min.js`,
    corePath: `${ocrAssetBase}core/`,
    langPath: `${ocrAssetBase}lang`,
    gzip: true,
    logger: (m) => {
      if (onProgress && m.status) {
        onProgress(Math.round((m.progress || 0) * 100), m.status);
      }
    },
  });

  try {
    const { data } = await worker.recognize(processedSource);

    // If source is a File, parse its filename first (e.g. LS69-16/04/26-Savoy-9534BDT)
    return validateOcrResult({
      invoiceNumber: fileMeta?.invoiceNumber || findInvoiceNumber(data.text),
      invoiceDate: fileMeta?.invoiceDate || null,
      invoiceTotal: fileMeta?.invoiceTotal || findTotal(data.text),
      supplier: fileMeta?.supplier?.name ? (suppliers.find(s => s.name.toLowerCase() === fileMeta.supplier?.name.toLowerCase()) || fileMeta.supplier) : findSupplier(data.text, suppliers),
      items: findItems(data.text),
      rawText: data.text,
      extractionMethod: 'tesseract',
    });
  } finally {
    await worker.terminate();
  }
}
