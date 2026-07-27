import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const indexPath = path.resolve('apps/customer_storefront/public/.well-known/agent-skills/index.json');
const baseDir = path.resolve('apps/customer_storefront/public/.well-known/agent-skills');

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function updateIndex() {
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

  data.skills = data.skills.map((skill) => {
    // 1. Fix domain URL to production luckystore1947.com
    let updatedUrl = skill.url.replace('https://lucky-store-six.vercel.app', 'https://luckystore1947.com');

    // 2. Compute SHA256 hash
    let relPath = skill.url.replace('https://lucky-store-six.vercel.app/.well-known/agent-skills/', '').replace('https://luckystore1947.com/.well-known/agent-skills/', '');
    const localFilePath = path.join(baseDir, relPath);
    const hashVal = sha256(localFilePath);

    if (hashVal) {
      console.log(`✓ Hash for ${skill.name}: ${hashVal}`);
      return {
        ...skill,
        url: updatedUrl,
        sha256: hashVal,
      };
    } else {
      console.warn(`⚠️ File missing for ${skill.name} at ${localFilePath}`);
      return {
        ...skill,
        url: updatedUrl,
      };
    }
  });

  fs.writeFileSync(indexPath, JSON.stringify(data, null, 2) + '\n');
  console.log('\n✨ Updated agent-skills/index.json with production domain and SHA256 hashes!');
}

updateIndex();
