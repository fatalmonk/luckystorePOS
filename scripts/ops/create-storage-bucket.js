/**
 * Script to create the item-images storage bucket in Supabase
 * Run with: node scripts/ops/create-storage-bucket.js
 */

import { createSupabaseClient, getSupabaseUrl } from '../lib/supabase-client.js';

const supabaseUrl = getSupabaseUrl();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error(
    '   Set VITE_SUPABASE_URL in repo root or apps/frontend/.env.local; set SUPABASE_SERVICE_ROLE_KEY in repo root .env / .env.local or your shell.'
  );
  process.exit(1);
}

const supabase = createSupabaseClient(supabaseServiceKey);

async function createStorageBucket() {
  console.log('🪣 Creating storage bucket: item-images');
  
  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }
    
    const existingBucket = buckets.find(b => b.name === 'item-images');
    
    if (existingBucket) {
      console.log('✅ Bucket "item-images" already exists');
      console.log(`   Public: ${existingBucket.public ? 'Yes' : 'No'}`);
      
      if (!existingBucket.public) {
        console.log('⚠️  Bucket is not public. Making it public...');
        // Note: Supabase JS client doesn't have a direct method to update bucket settings
        // You'll need to do this in the dashboard or use the REST API
        console.log('   Please set bucket to public in Supabase Dashboard:');
        console.log(`   https://app.supabase.com/project/${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}/storage/buckets`);
      }
      return;
    }
    
    // Create bucket
    const { data, error } = await supabase.storage.createBucket('item-images', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      console.log('\n💡 You may need to create it manually in the Supabase Dashboard:');
      console.log(`   https://app.supabase.com/project/${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}/storage/buckets`);
      console.log('   - Name: item-images');
      console.log('   - Public: Yes');
      return;
    }
    
    console.log('✅ Storage bucket "item-images" created successfully!');
    console.log('   Public: Yes');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.log('\n💡 Please create the bucket manually in Supabase Dashboard:');
    console.log(`   https://app.supabase.com/project/${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}/storage/buckets`);
  }
}

createStorageBucket();

