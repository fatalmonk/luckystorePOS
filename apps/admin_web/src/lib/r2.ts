/**
 * R2 image storage client — routes through Cloudflare Worker.
 *
 * The Worker (images.luckystore1947.com) handles R2 uploads/deletes server-side
 * with file validation, rate limiting, and CORS. No R2 credentials are exposed
 * to the browser.
 *
 * Env vars (admin_web):
 *   VITE_R2_PUBLIC_URL        — public Worker URL for reading/uploading images
 *   VITE_IMAGE_DELETE_SECRET  — secret token for authorised DELETE requests
 *                               (admin-only; acceptable to expose in admin bundle)
 */

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';
const DELETE_SECRET = import.meta.env.VITE_IMAGE_DELETE_SECRET || '';

/**
 * Upload image to R2 via Worker. Returns the public URL.
 */
export async function uploadToR2(file: File, key: string): Promise<string> {
  if (!R2_PUBLIC_URL) {
    throw new Error('VITE_R2_PUBLIC_URL not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const response = await fetch(`${R2_PUBLIC_URL}/upload`, {
    method: 'POST',
    body: formData,
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
export async function deleteFromR2(key: string): Promise<void> {
  if (!R2_PUBLIC_URL) {
    throw new Error('VITE_R2_PUBLIC_URL not configured');
  }
  if (!DELETE_SECRET) {
    throw new Error('VITE_IMAGE_DELETE_SECRET not configured');
  }

  const response = await fetch(`${R2_PUBLIC_URL}/${key}`, {
    method: 'DELETE',
    headers: { 'X-Store-Id': DELETE_SECRET },
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