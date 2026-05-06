import puppeteer from 'puppeteer';
import fs from 'fs';
import { CHROME_PATH, USER_AGENT, SCROLL_MAX_HEIGHT, SCROLL_INTERVAL_MS, SCROLL_DISTANCE } from './constants.js';

export async function launchBrowser(options = {}) {
  const browser = await puppeteer.launch({
    headless: options.headless ?? 'new',
    executablePath: CHROME_PATH,
    ...(options.headless === false ? { args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] } : {}),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(USER_AGENT);
  return { browser, page };
}

export async function scrollToLoad(page, maxScroll = SCROLL_MAX_HEIGHT) {
  await page.evaluate(async (max) => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, SCROLL_DISTANCE);
        totalHeight += SCROLL_DISTANCE;
        if (totalHeight >= scrollHeight || totalHeight >= max) {
          clearInterval(timer);
          resolve();
        }
      }, SCROLL_INTERVAL_MS);
    });
  }, maxScroll);
}

export async function download(url, dest) {
  const protocol = url.startsWith('https') ? await import('https') : await import('http');
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

export async function scrapeChaldalCategory({ url, label, filename }) {
  const { browser, page } = await launchBrowser();
  try {
    console.log(`Navigating to ${url} ...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await scrollToLoad(page);
    await new Promise(r => setTimeout(r, 2000));

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div.productV2Catalog'));
      return items.map(item => {
        const nameEl = item.querySelector('div.pvName p.nameTextWithEllipsis') || item.querySelector('div.pvName');
        const imgEl = item.querySelector('div.imageWrapperWrapper > img') || item.querySelector('img');

        if (nameEl && imgEl) {
          let imageUrl = imgEl.src || imgEl.getAttribute('data-src') || '';
          try {
            const u = new URL(imageUrl);
            const src = u.searchParams.get('src');
            if (src) imageUrl = decodeURIComponent(src);
          } catch (_) {}

          return {
            name: (nameEl.textContent || '').trim().replace(/[^a-zA-Z0-9 _-]/g, ''),
            url: imageUrl,
          };
        }
        return null;
      }).filter(p => p !== null && p.url && p.url.startsWith('http'));
    });

    console.log(`Found ${products.length} ${label} products`);
    fs.writeFileSync(filename, JSON.stringify(products, null, 2));
    return products;
  } finally {
    await browser.close();
  }
}