/**
 * R2 image storage client — routes through Cloudflare Worker.
 *
 * The Worker (images.luckystore1947.com) handles R2 uploads/deletes server-side
 * with file validation, rate limiting, and CORS. No R2 credentials are exposed
 * to the browser.
 *
 * Env vars (admin_web):
 *   VITE_R2_PUBLIC_URL        — public Worker URL for reading/uploading images
 */
import { supabase } from './supabase';

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';
async function issueUploadToken(key: string, itemId?: string | null): Promise<string> {
  const { data, error } = await supabase.functions.invoke('issue-image-upload-ticket', {
    body: { key, itemId: itemId ?? undefined, contentType: 'image/webp' },
  });
  if (error || !data?.token) throw new Error('Unable to authorize image upload');
  return data.token as string;
}

async function issueDeleteToken(key: string, itemId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('issue-image-upload-ticket', {
    body: { key, itemId, operation: 'delete' },
  });
  if (error || !data?.token) throw new Error('Unable to authorize image deletion');
  return data.token as string;
}

/**
 * Upload image to R2 via Worker. Returns the public URL.
 */
export async function uploadToR2(file: File, key: string, itemId?: string | null): Promise<string> {
  if (!R2_PUBLIC_URL) {
    throw new Error('VITE_R2_PUBLIC_URL not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);
  const uploadToken = await issueUploadToken(key, itemId);

  const response = await fetch(`${R2_PUBLIC_URL}/upload`, {
    method: 'POST',
    body: formData,
    headers: { 'X-Upload-Token': uploadToken },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 upload failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json() as { url: string; key: string };
  return data.url;
}

/**
 * Delete image from R2 via Worker.
 */
export async function deleteFromR2(key: string, itemId: string): Promise<void> {
  if (!R2_PUBLIC_URL) {
    throw new Error('VITE_R2_PUBLIC_URL not configured');
  }
  const deleteToken = await issueDeleteToken(key, itemId);

  const response = await fetch(`${R2_PUBLIC_URL}/${key}`, {
    method: 'DELETE',
    headers: { 'X-Delete-Token': deleteToken },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 delete failed: ${response.status}`);
  }
}

/**
 * Extract the R2 object key from a public image URL.
 * Returns null if the URL is not from our R2 Worker.
 */
export function extractR2Key(url: string): string | null {
  if (!R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL)) return null;
  return url.slice(R2_PUBLIC_URL.length + 1); // strip "https://...com/"
}

/**
 * Check if R2 is configured.
 */
export function isR2Configured(): boolean {
  return !!R2_PUBLIC_URL;
}

export async function getProductImageSnapshot(itemId: string): Promise<{ imageKey: string | null; imageVersion: number }> {
  const { data, error } = await supabase.from('items').select('image_key, image_version').eq('id', itemId).single();
  if (error || !data) throw new Error('Unable to read current product image version');
  return { imageKey: data.image_key, imageVersion: data.image_version };
}

export async function publishProductImage(input: {
  itemId: string;
  storeId: string;
  sourceImageKey: string | null;
  sourceImageVersion: number;
  newImageUrl: string | null;
  newImageChecksum?: string | null;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('publish-product-image', { body: input });
  if (error) {
    const response = (error as { context?: Response }).context;
    const details = response ? await response.clone().json().catch(() => null) as { code?: unknown } | null : null;
    const code = details?.code;
    if (code === 'IMAGE_VERSION_CONFLICT') throw new Error('Product image changed while upload was in progress. Refresh and try again.');
    throw new Error(error.message || 'Unable to publish product image');
  }
  if (data?.code === 'IMAGE_VERSION_CONFLICT') throw new Error('Product image changed while upload was in progress. Refresh and try again.');
}
