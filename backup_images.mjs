import fs from 'fs';
import path from 'path';
import https from 'https';

const LOCAL_DIR = "/Users/mac.alvi/Desktop/item-images";
const URLS_FILE = "./urls_to_download.txt";

if (!fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

async function run() {
  if (!fs.existsSync(URLS_FILE)) {
    console.error(`Error: ${URLS_FILE} not found.`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(URLS_FILE, 'utf-8');
  const urls = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('http'));

  console.log(`Found ${urls.length} URLs in ${URLS_FILE}`);

  let success = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      
      // Get the path after '/public/'
      const publicIndex = urlObj.pathname.indexOf('/public/');
      if (publicIndex === -1) {
        console.log(`Skipping invalid URL path: ${url}`);
        continue;
      }
      
      const relativePath = urlObj.pathname.substring(publicIndex + '/public/'.length);
      const filePath = path.join(LOCAL_DIR, relativePath);
      
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      if (fs.existsSync(filePath)) {
        console.log(`Skip existing: ${relativePath}`);
        success++;
        continue;
      }

      await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode === 200) {
            const file = fs.createWriteStream(filePath);
            res.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
            file.on('error', (err) => {
              fs.unlink(filePath, () => {}); // clean up partial file
              reject(err);
            });
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        }).on('error', reject);
      });

      console.log(`Downloaded: ${relativePath}`);
      success++;
    } catch (e) {
      console.log(`Failed ${url}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nBackup Complete. Success: ${success}, Failed: ${failed}`);
}

run().catch(console.error);
