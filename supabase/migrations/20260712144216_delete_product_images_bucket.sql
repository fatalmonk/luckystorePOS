-- Migration: Delete product-images and item-images storage buckets and drop policies
-- Applied: 2026-07-12

-- Drop policies associated with the storage.objects table for product-images
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Delete the buckets from storage.buckets
DELETE FROM storage.buckets WHERE id = 'product-images';
DELETE FROM storage.buckets WHERE id = 'item-images';
