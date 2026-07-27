import { scrapeChaldalCategory } from './lib/browser.js';

const CATEGORIES = {
  biscuits: { url: 'https://chaldal.com/plain-biscuits', label: 'biscuits', filename: 'chaldal_biscuits_products.json' },
  chocolates: { url: 'https://chaldal.com/chocolates', label: 'chocolates', filename: 'chaldal_chocolates_products.json' },
  coffee: { url: 'https://chaldal.com/coffee', label: 'coffee', filename: 'chaldal_coffee_products.json' },
  cookies: { url: 'https://chaldal.com/cookies', label: 'cookies', filename: 'chaldal_cookies_products.json' },
  energy_boosters: { url: 'https://chaldal.com/health-energy-boosters', label: 'energy_boosters', filename: 'chaldal_energy_boosters_products.json' },
  juice: { url: 'https://chaldal.com/juice', label: 'juice', filename: 'chaldal_juice_products.json' },
  noodles: { url: 'https://chaldal.com/noodles', label: 'noodles', filename: 'chaldal_noodles_products.json' },
  powder_mixes: { url: 'https://chaldal.com/powder-mixes', label: 'powder_mixes', filename: 'chaldal_powder_mixes_products.json' },
  soft_drinks: { url: 'https://chaldal.com/soft-drinks', label: 'soft_drinks', filename: 'chaldal_soft_drinks_products.json' },
  soups: { url: 'https://chaldal.com/soup', label: 'soups', filename: 'chaldal_soups_products.json' },
  tea: { url: 'https://chaldal.com/tea', label: 'tea', filename: 'chaldal_tea_products.json' },
  wafers: { url: 'https://chaldal.com/wafers', label: 'wafers', filename: 'chaldal_wafers_products.json' },
};

const arg = (process.argv[2] || '').replace('--category=', '');
if (arg && CATEGORIES[arg]) {
  await scrapeChaldalCategory(CATEGORIES[arg]);
} else if (arg === 'all') {
  for (const cat of Object.values(CATEGORIES)) {
    console.log(`Scraping category: ${cat.label}...`);
    await scrapeChaldalCategory(cat);
  }
} else {
  console.log(`Usage: node scrape-chaldal-category.js <category|all>\nAvailable categories: ${Object.keys(CATEGORIES).join(', ')}`);
}
