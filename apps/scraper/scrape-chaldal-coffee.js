import { scrapeChaldalCategory } from './lib/browser.js';
scrapeChaldalCategory({ url: 'https://chaldal.com/coffees', label: 'coffee', filename: 'chaldal_coffee_products.json' });