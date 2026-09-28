-- Migration: Create purchase-receipts storage bucket
-- Goal: Secure storage of financial receipt images
-- Bucket config: Private (public=false), file size limit, allowed mime types

-- Insert the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'purchase-receipts',
    'purchase-receipts',
    false,
    10485760, -- 10MB limit
    '{image/jpeg, image/png, image/webp}'
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove existing policies if they exist (allows safe re-run)
DROP POLICY IF EXISTS "Allow authenticated users to read their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own receipts" ON storage.objects;

-- Create secure policies: Tenants can only access their own files
-- Note: 'path_tokens[1]' refers to the first part of the file path, which for this bucket should be the tenant_id

CREATE POLICY "Allow authenticated users to read their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'purchase-receipts' AND 
    (public.get_current_user_tenant_id() = (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Allow authenticated users to insert their own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'purchase-receipts' AND 
    (public.get_current_user_tenant_id() = (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Allow authenticated users to update their own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'purchase-receipts' AND 
    (public.get_current_user_tenant_id() = (storage.foldername(name))[1]::uuid)
)
WITH CHECK (
    bucket_id = 'purchase-receipts' AND 
    (public.get_current_user_tenant_id() = (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Allow authenticated users to delete their own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'purchase-receipts' AND 
    (public.get_current_user_tenant_id() = (storage.foldername(name))[1]::uuid)
);
