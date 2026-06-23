import fs from 'fs';
import path from 'path';
import https from 'https';

const LOCAL_DIR = "/Users/mac.alvi/Desktop/item-images";
const URLS_FILE = "./urls_to_download.txt";
const ENV_FILE = "./.env";

if (!fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

function getServiceRoleKey() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error(`.env file not found`);
    return null;
  }
  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)["']?/);
  return match ? match[1] : null;
}

async function run() {
  const serviceKey = getServiceRoleKey();
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not found in .env");
    process.exit(1);
  }

  if (!fs.existsSync(URLS_FILE)) {
    console.error(`Error: ${URLS_FILE} not found.`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(URLS_FILE, 'utf-8');
  const urls = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('http'));

  console.log(`Found ${urls.length} URLs in ${URLS_FILE}. Downloading using service role key...`);

  let success = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      
      const publicIndex = urlObj.pathname.indexOf('/public/');
      if (publicIndex === -1) {
        console.log(`Skipping invalid URL path: ${url}`);
        continue;
      }
      
      const relativePath = urlObj.pathname.substring(publicIndex + '/public/'.length);
      const filePath = path.join(LOCAL_DIR, relativePath);
      
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      if (fs.existsSync(filePath)) {
        console.log(`Skip existing: ${relativePath}`);
        success++;
        continue;
      }

      await new Promise((resolve, reject) => {
        const options = {
          headers: {
            'Authorization': `Bearer ${serviceKey}`
          }
        };

        https.get(url, options, (res) => {
          if (res.statusCode === 200) {
            const file = fs.createWriteStream(filePath);
            res.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
            file.on('error', (err) => {
              fs.unlink(filePath, () => {});
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
