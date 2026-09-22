import { createWorker } from 'tesseract.js';

export type ReceiptOcrSupplier = {
  id: string;
  name: string;
};

export type ReceiptOcrItem = {
  name: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
};

export type ReceiptOcrResult = {
  invoiceNumber: string | null;
  invoiceTotal: string | null;
  invoiceDate?: string | null;
  supplier: ReceiptOcrSupplier | null;
  items: ReceiptOcrItem[];
  rawText?: string;
};

export function parseReceiptFilename(
  name: string,
  suppliers: ReceiptOcrSupplier[]
): {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: ReceiptOcrSupplier | null;
  invoiceTotal: string | null;
} {
  const cleanName = decodeURIComponent(name).replace(/\.[a-zA-Z0-9]+$/, '').trim();

  // Pattern: [Invoice] [Date] [Supplier] [Amount]
  // Accepts hyphens (-), underscores (_), slashes (/), or spaces as separators
  const match = cleanName.match(
    /^([a-zA-Z0-9]{2,10})[\s_-]+([0-9]{1,4}[/_.-][0-9]{1,2}[/_.-][0-9]{1,4})[\s_-]+([a-zA-Z\u0980-\u09FF\s]+?)[\s_-]+([0-9]+(?:\.[0-9]{1,2})?)(?:BDT|tk|taka)?$/i
  );

  if (match) {
    const invoiceNumber = match[1].toUpperCase();
    const invoiceDate = match[2];
    const rawSupplierName = match[3].trim();
    const invoiceTotal = match[4];

    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase().includes(rawSupplierName.toLowerCase()) || rawSupplierName.toLowerCase().includes(s.name.toLowerCase())
    ) ?? { id: '', name: rawSupplierName };

    return {
      invoiceNumber,
      invoiceDate,
      supplier: matchedSupplier,
      invoiceTotal,
    };
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
    invoiceDate = dateMatch[1];
  }

  // Extract invoice (first alphanumeric word e.g. LS69)
  const invMatch = cleanName.match(/^([a-zA-Z0-9]{2,10})/);
  if (invMatch) {
    invoiceNumber = invMatch[1].toUpperCase();
  }

  // Find supplier from known suppliers or remaining letters
  for (const s of suppliers) {
    if (cleanName.toLowerCase().includes(s.name.toLowerCase())) {
      supplier = s;
      break;
    }
  }

  if (!supplier) {
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

  // 1. Direct substring match (longest first)
  const exactMatch = suppliers
    .filter((supplier) => compact(supplier.name).length >= 3 && normalizedReceipt.includes(compact(supplier.name)))
    .sort((a, b) => compact(b.name).length - compact(a.name).length)[0];
  if (exactMatch) return exactMatch;

  // 2. Token match (e.g. "FM" or "Distribution")
  for (const supplier of suppliers) {
    const tokens = supplier.name.toLowerCase().split(/[\s_/-]+/).filter((t) => t.length >= 2);
    for (const token of tokens) {
      if (normalizedReceipt.includes(token)) {
        return supplier;
      }
    }
  }

  // 3. Match from top header text
  const headerLines = text.split(/\r?\n/).slice(0, 8);
  for (const line of headerLines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 3) continue;
    const matched = suppliers.find((s) => 
      cleanLine.toLowerCase().includes(s.name.toLowerCase()) || 
      s.name.toLowerCase().includes(cleanLine.toLowerCase())
    );
    if (matched) return matched;
  }

  return null;
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
  onProgress?: (progress: number, status: string) => void
): Promise<ReceiptOcrResult> {
  let imageSource: File | Blob;

  if (typeof source === 'string') {
    try {
      const response = await fetch(source, {
        method: 'GET',
        redirect: 'follow',
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

  const processedSource = await preprocessImageForOcr(imageSource);

  const worker = await createWorker(['eng', 'ben'], undefined, {
    logger: (m) => {
      if (onProgress && m.status) {
        onProgress(Math.round((m.progress || 0) * 100), m.status);
      }
    },
  });

  try {
    const { data } = await worker.recognize(processedSource);

    // If source is a File, parse its filename first (e.g. LS69-16/04/26-Savoy-9534BDT)
    const fileMeta = source instanceof File ? parseReceiptFilename(source.name, suppliers) : null;

    return {
      invoiceNumber: fileMeta?.invoiceNumber || findInvoiceNumber(data.text),
      invoiceDate: fileMeta?.invoiceDate || null,
      invoiceTotal: fileMeta?.invoiceTotal || findTotal(data.text),
      supplier: fileMeta?.supplier?.name ? (suppliers.find(s => s.name.toLowerCase() === fileMeta.supplier?.name.toLowerCase()) || fileMeta.supplier) : findSupplier(data.text, suppliers),
      items: findItems(data.text),
      rawText: data.text,
    };
  } finally {
    await worker.terminate();
  }
}
