import { supabase } from './supabase';
import { uploadToR2, isR2Configured } from './r2';

/**
 * Generates an optimized image URL for Cloudflare Worker / CDN.
 * For images served from images.luckystore1947.com, appends width & quality query params
 * or Cloudflare image resizing params.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: { width?: number; height?: number; quality?: number; format?: 'webp' | 'avif' } = {}
): string {
  if (!url) return '';
  const { width, quality = 80 } = options;

  try {
    const parsed = new URL(url, window.location.origin);
    // If hosted on Lucky Store Cloudflare Worker R2 bucket
    if (parsed.hostname.includes('images.luckystore1947.com') || parsed.hostname.includes('luckystore1947.com')) {
      if (width) parsed.searchParams.set('w', width.toString());
      if (quality) parsed.searchParams.set('q', quality.toString());
      return parsed.toString();
    }
  } catch {
    // Return original if invalid URL string
  }
  return url;
}

/**
 * Generate standard responsive srcset string for thumbnail display.
 */
export function getImageSrcSet(url: string | null | undefined, baseWidth = 112): string {
  if (!url) return '';
  const isCdn = url.includes('images.luckystore1947.com') || url.includes('luckystore1947.com');
  if (!isCdn) return '';

  const w1x = baseWidth;
  const w2x = baseWidth * 2;
  const w3x = baseWidth * 3;

  const url1x = getOptimizedImageUrl(url, { width: w1x, quality: 80 });
  const url2x = getOptimizedImageUrl(url, { width: w2x, quality: 80 });
  const url3x = getOptimizedImageUrl(url, { width: w3x, quality: 75 });

  return `${url1x} 1x, ${url2x} 2x, ${url3x} 3x`;
}

/**
 * Convert an image File/Blob to WebP format.
 * Resizes if oversized, encodes at specified quality.
 */
export async function convertToWebP(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<Blob> {
  const { maxWidth = 480, maxHeight = 480, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      URL.revokeObjectURL(img.src);

      // Scale down if too large
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert image to WebP'));
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Converts an image file to WebP client-side, renames it based on SKU (or fallback),
 * and uploads it to Cloudflare R2 when configured (with Supabase fallback only when R2 is not configured).
 * Returns the final public URL with a cache-busting timestamp.
 */
export async function uploadProcessedImage({
  file,
  sku,
  barcode,
  itemId,
  tenantId,
}: {
  file: File;
  sku?: string | null;
  barcode?: string | null;
  itemId?: string | null;
  tenantId?: string | null;
}): Promise<string> {
  const result = await uploadProcessedImageWithMetadata({ file, sku, barcode, itemId, tenantId });
  return result.url;
}

export async function uploadProcessedImageWithMetadata({
  file,
  sku,
  barcode,
  itemId,
  tenantId,
}: {
  file: File;
  sku?: string | null;
  barcode?: string | null;
  itemId?: string | null;
  tenantId?: string | null;
}): Promise<{ url: string; checksum: string }> {
  // 1. Convert file to WebP blob
  let webpBlob: Blob;
  try {
    webpBlob = await convertToWebP(file);
  } catch (err) {
    console.error('Failed to convert image to WebP:', err);
    throw new Error('Failed to convert image to WebP format. Please upload a valid image file.');
  }

  // 2. Generate filename based on SKU, fallback to barcode, itemId, or random UUID
  const identifier = (sku || barcode || itemId || crypto.randomUUID()).trim();
  const sanitizedIdentifier = identifier.toUpperCase().replace(/[^A-Z0-9-]/g, '_');
  // Product uploads must never share an object key: the database CAS protects
  // the row, but it cannot undo an R2 overwrite performed before publication.
  const fileName = `products/${tenantId || 'unscoped'}/${sanitizedIdentifier}-${crypto.randomUUID()}.webp`;

  // 3. Create a File object from the blob
  const webpFile = new File([webpBlob], `${sanitizedIdentifier}.webp`, {
    type: 'image/webp',
  });

  // 4. Upload to R2 (Primary) or Supabase (Fallback)
  let publicUrl: string;
  if (isR2Configured()) {
    try {
      publicUrl = await uploadToR2(webpFile, fileName, itemId);
    } catch (err) {
      console.error('R2 upload failed:', err);
      throw err;
    }
  } else {
    // publish-product-image accepts only the R2 namespace. Fail before writing
    // a fallback object that can never be attached to the product.
    throw new Error('Product image storage is not configured');
  }

  // 5. Append cache-busting parameter
  const digest = await crypto.subtle.digest('SHA-256', await webpBlob.arrayBuffer());
  const checksum = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return { url: `${publicUrl}?t=${Date.now()}`, checksum };
}

/**
 * Upload a category thumbnail image to R2 (or Supabase fallback).
 * Stores at `categories/{storeId}/{categoryId}.webp`.
 */
export async function uploadCategoryImage({
  file,
  storeId,
  categoryId,
}: {
  file: File;
  storeId: string;
  categoryId: string;
}): Promise<string> {
  // 1. Convert file to WebP blob
  let webpBlob: Blob;
  try {
    webpBlob = await convertToWebP(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
  } catch (err) {
    console.error('Failed to convert image to WebP:', err);
    throw new Error('Failed to convert image to WebP format. Please upload a valid image file.');
  }

  // 2. Generate filename
  const sanitizedStoreId = storeId.replace(/[^a-zA-Z0-9-]/g, '_');
  const fileName = `categories/${sanitizedStoreId}/${categoryId}.webp`;

  // 3. Create a File object from the blob
  const webpFile = new File([webpBlob], `${categoryId}.webp`, {
    type: 'image/webp',
  });

  // 4. Upload to R2 (Primary) or Supabase (Fallback)
  let publicUrl: string;
  if (isR2Configured()) {
    try {
      publicUrl = await uploadToR2(webpFile, fileName);
    } catch (err) {
      console.error('R2 upload failed:', err);
      throw err;
    }
  } else {
    publicUrl = await uploadToSupabaseFallback(webpFile, fileName);
  }

  // 5. Append cache-busting parameter
  return `${publicUrl}?t=${Date.now()}`;
}

export async function uploadReceiptImage({
  file,
  tenantId,
}: {
  file: File;
  tenantId: string;
}): Promise<{ url: string; key: string }> {
  let webpBlob: Blob;
  try {
    // Keep max dimensions higher for OCR readability, slightly lower quality
    webpBlob = await convertToWebP(file, { maxWidth: 2000, maxHeight: 2000, quality: 0.75 });
  } catch (err) {
    throw new Error('Failed to convert receipt image to WebP format.');
  }

  const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9-]/g, '_');
  const key = `${sanitizedTenantId}/receipt_${crypto.randomUUID()}.webp`;

  const webpFile = new File([webpBlob], `receipt.webp`, { type: 'image/webp' });

  let url: string;
  if (isR2Configured()) {
    try {
      url = await uploadToR2(webpFile, key);
    } catch (err) {
      console.error('R2 upload failed for receipt:', err);
      throw err;
    }
  } else {
    url = await uploadReceiptToSupabase(webpFile, key);
  }

  return { url, key };
}

/**
 * Fallback to Supabase private bucket for receipts. 
 * Since the bucket is private, we upload and then create a signed URL so it can be previewed/accessed temporarily.
 */
async function uploadReceiptToSupabase(file: File, key: string): Promise<string> {
  const { data: _data, error: uploadError } = await supabase.storage
    .from('purchase-receipts')
    .upload(key, file, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // Use a signed URL since the bucket is private
  // 315360000 = 10 years (effectively static but secure since unguessable)
  // or a shorter timeframe if preferred. 1 hour (3600), 1 week (604800)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('purchase-receipts')
    .createSignedUrl(key, 315360000); 

  if (signedUrlError) {
    throw new Error(signedUrlError.message);
  }

  return signedUrlData.signedUrl;
}

export async function deleteReceiptImage(key: string): Promise<void> {
  // R2 configuration belongs to the Vite-aware R2 client; do not read process.env in browser code.
  if (isR2Configured()) {
    // R2 receipt objects are immutable and require a server-side record-bound
    // cleanup capability. Keep them until the retention cleanup job runs.
  }

  // Always try to delete from Supabase private bucket
  const { error } = await supabase.storage.from('purchase-receipts').remove([key]);
  if (error) {
    console.error('Supabase receipt deletion failed:', error);
  }
}

async function uploadToSupabaseFallback(file: File, key: string): Promise<string> {
  const { data: _data, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(key, file, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // Since the bucket is public, we can just return the public URL directly based on the key
  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(key);
    
  return publicUrlData.publicUrl;
}
