import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { uploadToR2, deleteFromR2, isR2Configured, extractR2Key } from '../lib/r2';
import { useNotify } from '../components/NotificationContext';

/**
 * Upload image to R2 via Worker (primary) or Supabase Storage (fallback).
 * Returns the public URL.
 */
async function uploadProductImage(
  file: File,
  itemId: string,
  storeId: string
): Promise<string> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${storeId}/${itemId}_${Date.now()}.${fileExtension}`;

  // Primary: R2 via Worker
  if (isR2Configured()) {
    try {
      return await uploadToR2(file, fileName);
    } catch (err) {
      console.warn('R2 upload failed, falling back to Supabase:', err);
    }
  }

  // Fallback: Supabase Storage
  const { data: _data, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

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
    }: {
      file: File;
      itemId: string;
      storeId: string;
    }) => {
      // Fetch current image_url to delete old image after upload
      const { data: currentItem } = await supabase
        .from('items')
        .select('image_url')
        .eq('id', itemId)
        .single();

      const publicUrl = await uploadProductImage(file, itemId, storeId);

      // Update the product with the new image URL
      const { error } = await supabase
        .from('items')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) {
        throw new Error(error.message);
      }

      // Delete the old image from storage (non-fatal if it fails)
      if (currentItem?.image_url && currentItem.image_url !== publicUrl) {
        await deleteProductImage(currentItem.image_url);
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