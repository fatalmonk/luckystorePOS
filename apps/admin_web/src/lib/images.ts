import { supabase } from './supabase';
import { uploadToR2, isR2Configured } from './r2';

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
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = options;

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
 * and uploads it to Cloudflare R2 (falling back to Supabase Storage if R2 is not configured).
 * Returns the final public URL with a cache-busting timestamp.
 */
export async function uploadProcessedImage({
  file,
  sku,
  barcode,
  itemId,
}: {
  file: File;
  sku?: string | null;
  barcode?: string | null;
  itemId?: string | null;
}): Promise<string> {
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
  const sanitizedIdentifier = identifier.toUpperCase().replace(/[^A-Z0-9\-]/g, '_');
  const fileName = `products/${sanitizedIdentifier}.webp`;

  // 3. Create a File object from the blob
  const webpFile = new File([webpBlob], `${sanitizedIdentifier}.webp`, {
    type: 'image/webp',
  });

  // 4. Upload to R2 (Primary) or Supabase (Fallback)
  let publicUrl: string;
  if (isR2Configured()) {
    try {
      publicUrl = await uploadToR2(webpFile, fileName);
    } catch (err) {
      console.warn('R2 upload failed, falling back to Supabase:', err);
      publicUrl = await uploadToSupabaseFallback(webpFile, fileName);
    }
  } else {
    publicUrl = await uploadToSupabaseFallback(webpFile, fileName);
  }

  // 5. Append cache-busting parameter
  return `${publicUrl}?t=${Date.now()}`;
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

  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(key);

  return publicUrlData.publicUrl;
}