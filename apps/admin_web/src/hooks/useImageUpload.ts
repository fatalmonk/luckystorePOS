import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useNotify } from '../components/NotificationContext';

/**
 * Upload image to Supabase Storage and return the public URL
 */
async function uploadProductImage(
  file: File,
  itemId: string,
  storeId: string
): Promise<string> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${storeId}/${itemId}_${Date.now()}.${fileExtension}`;

  // Upload to Supabase Storage
  const { data: _data, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/**
 * Hook for uploading product images
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
      const publicUrl = await uploadProductImage(file, itemId, storeId);
      
      // Update the product with the new image URL
      const { error } = await supabase
        .from('items')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) {
        throw new Error(error.message);
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
 * Remove product image
 */
export function useRemoveImage() {
  const queryClient = useQueryClient();
  const { notify } = useNotify();

  return useMutation({
    mutationFn: async (vars: { itemId: string; storeId: string }) => {
      // Update product to remove image URL
      const { error } = await supabase
        .from('items')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', vars.itemId);

      if (error) {
        throw new Error(error.message);
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
