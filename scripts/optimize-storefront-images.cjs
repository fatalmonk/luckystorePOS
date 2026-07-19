const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imgDir = path.resolve(__dirname, '../apps/customer_storefront/public/images');

async function optimizeImages() {
  if (!fs.existsSync(imgDir)) {
    console.error(`❌ Images directory not found: ${imgDir}`);
    return;
  }

  const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.webp'));
  console.log(`📦 Found ${files.length} WebP images to check and optimize.\n`);

  console.log('| File | Old Size (KB) | New Size (KB) | Saved (%) | Dimensions (Old -> New) |');
  console.log('| --- | --- | --- | --- | --- |');

  let totalOld = 0;
  let totalNew = 0;

  for (const file of files) {
    const filePath = path.join(imgDir, file);
    const tempPath = filePath + '.tmp';
    const stats = fs.statSync(filePath);
    const oldSize = stats.size;
    totalOld += oldSize;

    try {
      const image = sharp(filePath);
      const meta = await image.metadata();
      
      let width = meta.width;
      let height = meta.height;
      let resize = false;

      // Resizing rules
      if (file.includes('banner') || file.includes('hero')) {
        // Banners: Max width 1440px
        if (meta.width > 1440) {
          width = 1440;
          height = Math.round((1440 / meta.width) * meta.height);
          resize = true;
        }
      } else {
        // Standard promo cards: Max width 600px
        if (meta.width > 600) {
          width = 600;
          height = Math.round((600 / meta.width) * meta.height);
          resize = true;
        }
      }

      let pipeline = image;
      if (resize) {
        pipeline = pipeline.resize(width, height);
      }

      // Convert/Compress WebP with quality 80
      await pipeline.webp({ quality: 80, effort: 6 }).toFile(tempPath);

      const newStats = fs.statSync(tempPath);
      const newSize = newStats.size;

      // Only overwrite if the new file is actually smaller
      if (newSize < oldSize) {
        fs.renameSync(tempPath, filePath);
        totalNew += newSize;
        const savedPercent = (((oldSize - newSize) / oldSize) * 100).toFixed(1);
        console.log('| ' + file + ' | ' + (oldSize/1024).toFixed(1) + ' | ' + (newSize/1024).toFixed(1) + ' | ' + savedPercent + '% | ' + meta.width + 'x' + meta.height + ' -> ' + width + 'x' + height + ' |');
      } else {
        // Keep the old one if compression didn't help
        fs.unlinkSync(tempPath);
        totalNew += oldSize;
        console.log('| ' + file + ' | ' + (oldSize/1024).toFixed(1) + ' | ' + (oldSize/1024).toFixed(1) + ' | 0.0% (Skipped) | ' + meta.width + 'x' + meta.height + ' (Unchanged) |');
      }
    } catch (e) {
      console.log('| ' + file + ' | Error: ' + e.message + ' | | | |');
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }

  const savedTotal = (((totalOld - totalNew) / totalOld) * 100).toFixed(1);
  console.log(`\n📊 **Total Old Size:** ${(totalOld/1024/1024).toFixed(2)} MB`);
  console.log(`📊 **Total New Size:** ${(totalNew/1024/1024).toFixed(2)} MB`);
  console.log(`📊 **Total Savings:** ${savedTotal}% (${((totalOld - totalNew)/1024).toFixed(1)} KB saved)`);
}

optimizeImages().catch(console.error);
