import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/import-inventory`;
const JWT = process.env.TEMP_JWT; // Pass via env

const chunksDir = path.join(process.cwd(), 'data', 'inventory', 'inventory_chunks');

async function importChunks() {
  const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.csv')).sort();
  console.log(`Found ${files.length} chunks to import...`);

  for (const file of files) {
    console.log(`\n📄 Importing: ${file}`);
    const filePath = path.join(chunksDir, file);
    
    let csvText = fs.readFileSync(filePath, 'utf-8');
    const lines = csvText.split('\n');
    if (lines.length > 0) {
       lines[0] = lines[0].trim() + ',store_code';
       for (let i = 1; i < lines.length; i++) {
           if (lines[i].trim() !== '') {
               lines[i] = lines[i].replace(/\r$/, '') + ',MAIN';
           }
       }
    }
    const newCsvText = lines.join('\n');
    const fileBlob = new Blob([newCsvText], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', fileBlob, file);
    
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT}`,
          'apikey': ANON_KEY
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error(`❌ Error importing ${file}: HTTP ${response.status}`);
        console.error(result);
      } else {
        console.log(`✅ Success for ${file}!`);
        console.log(`   Items inserted: ${result.items_inserted}`);
        console.log(`   Items updated: ${result.items_updated}`);
        console.log(`   Stock created: ${result.stock_created}`);
        console.log(`   Stock updated: ${result.stock_updated}`);
        if (result.errors && result.errors.length > 0) {
          console.log(`   ⚠️ Warnings/Errors on rows:`, result.errors.slice(0, 3));
        }
      }
    } catch (e) {
      console.error(`❌ Request failed:`, e);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

importChunks();
