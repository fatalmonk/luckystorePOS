import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { deleteFromR2, extractR2Key } from '../lib/r2';
import { useNotify } from '../components/NotificationContext';
import { uploadProcessedImage } from '../lib/images';

/**
 * Delete an image from R2 or Supabase Storage based on its URL.
 * Silently ignores 404s — the image may already be gone.
 */
async function deleteProductImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;

  // Check if it's an R2 URL
  const r2Key = extractR2Key(imageUrl);
  if (r2Key) {
    try {
      await deleteFromR2(r2Key);
    } catch (err) {
      // Non-fatal — log but don't throw
      console.warn('R2 delete failed (non-fatal):', err);
    }
    return;
  }

  // Otherwise try Supabase Storage — extract path from URL
  // Supabase URLs look like: https://xxx.supabase.co/storage/v1/object/public/product-images/path
  if (imageUrl.includes('supabase.co/storage')) {
    const match = imageUrl.match(/\/storage\/v1\/object\/public\/([^/]+\/.+)$/);
    if (match) {
      const [bucket, ...pathParts] = match[1].split('/');
      const path = pathParts.join('/');
      try {
        await supabase.storage.from(bucket).remove([path]);
      } catch (err) {
        console.warn('Supabase Storage delete failed (non-fatal):', err);
      }
    }
  }
}

/**
 * Hook for uploading product images.
 * Automatically deletes the previous image from R2 when replaced.
 */
export function useImageUpload() {
  const queryClient = useQueryClient();
  const { notify } = useNotify();

  return useMutation({
    mutationFn: async ({
      file,
      itemId,
      storeId,
      sku,
      barcode,
      oldImageUrl,
    }: {
      file: File;
      itemId: string;
      storeId: string;
      sku?: string | null;
      barcode?: string | null;
      oldImageUrl?: string | null;
    }) => {
      // Upload processed webp to R2
      const publicUrl = await uploadProcessedImage({
        file,
        sku,
        barcode,
        itemId,
      });

      // Update the product with the new image URL
      const { error } = await supabase
        .from('items')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) {
        throw new Error(error.message);
      }

      // Determine previous image URL
      let previousUrl = oldImageUrl;
      if (previousUrl === undefined) {
        const { data: currentItem } = await supabase
          .from('items')
          .select('image_url')
          .eq('id', itemId)
          .single();
        previousUrl = currentItem?.image_url;
      }

      // Delete the old image from storage if path has changed (prevents self-deletion)
      const getCleanPath = (url: string) => url.split('?')[0];
      if (previousUrl && getCleanPath(previousUrl) !== getCleanPath(publicUrl)) {
        await deleteProductImage(previousUrl);
      }

      return publicUrl;
    },
    onSuccess: (_data, variables) => {
      notify('Image uploaded successfully', 'success');
      // Invalidate the inventory cache to reflect the new image
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.storeId] });
    },
    onError: (error: Error) => {
      notify(error.message || 'Failed to upload image', 'error');
    },
  });
}

/**
 * Remove product image — nulls DB URL and deletes file from R2/Supabase.
 */
export function useRemoveImage() {
  const queryClient = useQueryClient();
  const { notify } = useNotify();

  return useMutation({
    mutationFn: async (vars: { itemId: string; storeId: string }) => {
      // Fetch current image_url before nulling
      const { data: currentItem } = await supabase
        .from('items')
        .select('image_url')
        .eq('id', vars.itemId)
        .single();

      // Update product to remove image URL
      const { error } = await supabase
        .from('items')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', vars.itemId);

      if (error) {
        throw new Error(error.message);
      }

      // Delete the old image from storage (non-fatal if it fails)
      if (currentItem?.image_url) {
        await deleteProductImage(currentItem.image_url);
      }
    },
    onSuccess: (_data, variables) => {
      notify('Image removed', 'info');
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.storeId] });
    },
    onError: (error: Error) => {
      notify(error.message || 'Failed to remove image', 'error');
    },
  });
}