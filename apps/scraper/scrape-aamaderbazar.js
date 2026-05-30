import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const hasChrome = fs.existsSync(defaultChromePath);

  const browser = await puppeteer.launch({ 
    headless: process.env.CI ? "new" : "new",
    executablePath: hasChrome ? defaultChromePath : undefined,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  console.log("Navigating to https://aamaderbazar.com/ ...");
  
  // They might have anti-bot, so let's set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
  
  await page.goto('https://aamaderbazar.com/', { waitUntil: 'networkidle2', timeout: 60000 });
  
  // scroll to load lazy images
  await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= scrollHeight || totalHeight > 5000) {
                  clearInterval(timer);
                  resolve();
              }
          }, 100);
      });
  });
  
  await new Promise(r => setTimeout(r, 2000)); // wait for images to load
  
  const imgUrls = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => img.src).filter(src => src && src.startsWith('http'));
  });
  
  console.log(`Found ${imgUrls.length} image URLs`);
  fs.writeFileSync('aamaderbazar_urls.json', JSON.stringify(imgUrls, null, 2));
  
  await browser.close();
})();
