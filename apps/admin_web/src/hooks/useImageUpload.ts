import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getProductImageSnapshot, publishProductImage } from '../lib/r2';
import { useNotify } from '@/components';
import { uploadProcessedImage } from '../lib/images';
import { useAuth } from '../lib/AuthContext';

/**
 * Hook for uploading product images.
 * Publishes image changes through the server-side image-version CAS gate.
 */
export function useImageUpload() {
  const queryClient = useQueryClient();
  const { notify } = useNotify();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      itemId,
      storeId,
      sku,
      barcode,
    }: {
      file: File;
      itemId: string;
      storeId: string;
      sku?: string | null;
      barcode?: string | null;
    }) => {
      const source = await getProductImageSnapshot(itemId);
      const publicUrl = await uploadProcessedImage({
        file,
        sku,
        barcode,
        itemId,
        tenantId,
      });

      await publishProductImage({ itemId, storeId, sourceImageKey: source.imageKey, sourceImageVersion: source.imageVersion, newImageUrl: publicUrl });

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
      const source = await getProductImageSnapshot(vars.itemId);
      await publishProductImage({ itemId: vars.itemId, storeId: vars.storeId, sourceImageKey: source.imageKey, sourceImageVersion: source.imageVersion, newImageUrl: null });
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
