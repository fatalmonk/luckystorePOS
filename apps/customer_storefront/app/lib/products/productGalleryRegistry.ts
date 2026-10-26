import type { ProductGalleryImage } from './productEnrichmentTypes';

const R2_POLAR_BASE = 'https://images.luckystore1947.com/products/polar';
const R2_RADHUNI_BASE = 'https://images.luckystore1947.com/products/radhuni';

/** Verified catalogue images for Polar products with curated gallery assets hosted in Cloudflare R2. */
const PRODUCT_GALLERY_IMAGES: Record<string, ProductGalleryImage[]> = {
  // Double Sundae remains unresolved; Kheer 500 ml uses the verified 1/2L overlay below.
  '70a322a1': [],
  '79e0ece1': [
    {
      url: `${R2_POLAR_BASE}/kheer-500ml-1-2l.webp`,
      alt: 'Polar Kheer ice cream tub with a 1/2L size label',
    },
  ],
  'd6b58fa7': [
    {
      url: `${R2_POLAR_BASE}/2-in-1-vanilla-chocolate-tub.webp`,
      alt: 'Polar 2 in 1 Vanilla-Chocolate ice cream tub, 1 liter',
    },
  ],
  'cd267d71': [
    {
      url: `${R2_POLAR_BASE}/2-in-1-vanilla-mango-tub.webp`,
      alt: 'Polar 2 in 1 Vanilla-Mango ice cream tub, 1 liter',
    },
  ],
  '5830390b': [
    { url: `${R2_POLAR_BASE}/carnival-butterscotch.webp`, alt: 'Polar Carnival Butterscotch cone ice cream' },
  ],
  '1ba3a780': [
    { url: `${R2_POLAR_BASE}/carnival-hazelnut.webp`, alt: 'Polar Carnival Hazelnut cone ice cream' },
    { url: `${R2_POLAR_BASE}/carnival-hazelnut-product.webp`, alt: 'Polar Carnival Hazelnut cone with hazelnut ice cream' },
  ],
  'e8771528': [
    { url: `${R2_POLAR_BASE}/carnival-vanilla.webp`, alt: 'Polar Carnival Vanilla cone ice cream' },
  ],
  '6df59696': [
    { url: `${R2_POLAR_BASE}/carnival-strawberry.webp`, alt: 'Polar Carnival Strawberry cone ice cream' },
  ],
  '2e948079': [
    { url: `${R2_POLAR_BASE}/coffee-tub-front.webp`, alt: 'Polar Coffee ice cream tub, 1 liter' },
    { url: `${R2_POLAR_BASE}/coffee-tub.webp`, alt: 'Polar Coffee ice cream tub packaging angle' },
  ],
  '8f7ce150': [
    { url: `${R2_POLAR_BASE}/crunchy-stick.webp`, alt: 'Polar Crunchy ice cream stick' },
  ],
  '54a7520e': [
    { url: `${R2_POLAR_BASE}/doi-tub.webp`, alt: 'Polar Doi ice cream tub, 1 liter' },
  ],
  '604e6bb0': [
    { url: `${R2_POLAR_BASE}/ice-lolly-lemon.webp`, alt: 'Polar Lemon Ice Lolly' },
  ],
  'c1895793': [
    { url: `${R2_POLAR_BASE}/kheer-tub.webp`, alt: 'Polar Kheer ice cream tub, 1 liter' },
  ],
  'b77e2fe6': [
    { url: `${R2_POLAR_BASE}/malai-stick.webp`, alt: 'Polar Malai ice cream stick' },
  ],
  'f2d567f0': [
    { url: `${R2_POLAR_BASE}/mango-tub.webp`, alt: 'Polar Mango ice cream tub, 1 liter' },
  ],
  'bc7de70f': [
    { url: `${R2_POLAR_BASE}/red-velvet-tub-front.webp`, alt: 'Polar Red Velvet ice cream tub, 1 liter' },
    { url: `${R2_POLAR_BASE}/red-velvet-tub.webp`, alt: 'Polar Red Velvet ice cream tub packaging angle' },
  ],
  '2c367e44': [
    { url: `${R2_POLAR_BASE}/robusto-salted-caramel.webp`, alt: 'Polar Robusto Salted Caramel ice cream bar' },
  ],
  'fe31ca90': [
    { url: `${R2_POLAR_BASE}/cool-shell-n-core-front.webp`, alt: 'Polar Cool Shell N Core ice cream stick' },
    { url: `${R2_POLAR_BASE}/cool-shell-n-core-stick.webp`, alt: 'Polar Cool Shell N Core unwrapped ice cream bar' },
    { url: `${R2_POLAR_BASE}/cool-shell-n-core-duo.webp`, alt: 'Polar Cool Shell N Core package and ice cream bar' },
  ],
  '2233c416': [
    { url: `${R2_POLAR_BASE}/shor-malai-front.webp`, alt: 'Polar Shor Malai ice cream stick' },
    { url: `${R2_POLAR_BASE}/shor-malai-stick.webp`, alt: 'Polar Shor Malai unwrapped ice cream bar' },
    { url: `${R2_POLAR_BASE}/shor-malai-duo.webp`, alt: 'Polar Shor Malai package and ice cream bar' },
  ],
  'fcefa591': [
    { url: `${R2_POLAR_BASE}/tornado-strawberry-front.webp`, alt: 'Polar Tornado Strawberry ice cream stick' },
    { url: `${R2_POLAR_BASE}/tornado-strawberry-stick.webp`, alt: 'Polar Tornado Strawberry unwrapped ice cream bar' },
    { url: `${R2_POLAR_BASE}/tornado-strawberry-duo.webp`, alt: 'Polar Tornado Strawberry package and ice cream bar' },
  ],
  'be49558d': [
    { url: `${R2_POLAR_BASE}/zafran-malai-tub.webp`, alt: 'Polar Zafran Malai ice cream tub, 1 liter' },
  ],
  '4ca03fce': [
    { url: `${R2_POLAR_BASE}/chocodelight-cone.webp`, alt: 'Polar Chocodelight cone ice cream' },
  ],
  '236b5858': [
    { url: `${R2_POLAR_BASE}/mango-cup-front.webp`, alt: 'Polar Mango Cup ice cream, 100 ml cup' },
    { url: `${R2_POLAR_BASE}/mango-cup.webp`, alt: 'Polar Mango Cup ice cream' },
  ],
  'f6d581d5': [
    { url: `${R2_POLAR_BASE}/chocolate-cup.webp`, alt: 'Polar Chocolate Cup ice cream, 100 ml cup' },
    { url: `${R2_POLAR_BASE}/chocolate-cup-front.webp`, alt: 'Polar Chocolate Cup ice cream, 100 ml package' },
    { url: `${R2_POLAR_BASE}/chocolate-cup-back.webp`, alt: 'Polar Chocolate Cup ingredients and product information' },
    { url: `${R2_POLAR_BASE}/chocolate-cup-side.webp`, alt: 'Polar Chocolate Cup packaging side view' },
  ],
  'eca88367': [
    {
      url: `${R2_POLAR_BASE}/IC-POL-VAN-500.png`,
      alt: 'Polar Tub Regular Vanilla ice cream tub, 1/2 liter (500 ml)',
      badge: '1/2 L',
    },
  ],
  'd132ec9d': [
    { url: `${R2_POLAR_BASE}/IC-POL-ROY-front.webp`, alt: 'Polar Royal Sundae Cup ice cream, 100 ml front packaging' },
    { url: `${R2_POLAR_BASE}/IC-POL-ROY-INGREDIENTS.webp`, alt: 'Polar Royal Sundae Cup ingredients' },
    { url: `${R2_POLAR_BASE}/IC-POL-ROY-NUTRITION.webp`, alt: 'Polar Royal Sundae Cup nutrition facts' },
    { url: `${R2_POLAR_BASE}/IC-POL-ROY-BARCODE.webp`, alt: 'Polar Royal Sundae Cup barcode' },
  ],
  // Radhuni authentic packshots (Square Food & Beverage Ltd)
  '218e328e': [{ url: `${R2_RADHUNI_BASE}/radhuni-kacchi-biriyani-masala-40g.webp`, alt: 'Radhuni Kacchi Biriyani Masala 40g' }],
  'f083e180': [{ url: `${R2_RADHUNI_BASE}/radhuni-tehari-masala-40g.webp`, alt: 'Radhuni Tehari Masala 40g' }],
  'bb9416cd': [{ url: `${R2_RADHUNI_BASE}/radhuni-korma-masala-30g.webp`, alt: 'Radhuni Korma Masala 30g' }],
  '62b95597': [{ url: `${R2_RADHUNI_BASE}/radhuni-macher-masala-20g.webp`, alt: 'Radhuni Macher Masala 20g' }],
  '4228211b': [{ url: `${R2_RADHUNI_BASE}/radhuni-mezbani-gorur-masala-68g.webp`, alt: 'Radhuni Mezbani Gorur Masala 68g' }],
  'cbbc35e5': [{ url: `${R2_RADHUNI_BASE}/radhuni-biriyani-masala-40g.webp`, alt: 'Radhuni Biriyani Masala 40g' }],
  '35fdd44a': [{ url: `${R2_RADHUNI_BASE}/radhuni-biryani-masala-40g-pouch.webp`, alt: 'Radhuni Biryani Masala 40g' }],
  'c5dc41e8': [{ url: `${R2_RADHUNI_BASE}/radhuni-gorur-mangsho-masala-100g.webp`, alt: 'Radhuni Gorur Mangsho Masala 100g' }],
  '88fbb380': [{ url: `${R2_RADHUNI_BASE}/radhuni-mangsho-masala-100g.webp`, alt: 'Radhuni Mangsho Masala 100g' }],
  '4ef25400': [{ url: `${R2_RADHUNI_BASE}/radhuni-roast-masala-40g.webp`, alt: 'Radhuni Roast Masala 40g' }],
  'dffbe716': [{ url: `${R2_RADHUNI_BASE}/radhuni-fried-chicken-mix-75g.webp`, alt: 'Radhuni Fried Chicken Mix 75g' }],
  'a6b3e87a': [{ url: `${R2_RADHUNI_BASE}/radhuni-fried-rice-mix-8g.webp`, alt: 'Radhuni Fried Rice Mix 8g' }],
  'de116e79': [{ url: `${R2_RADHUNI_BASE}/radhuni-hasher-mangsho-33g.webp`, alt: 'Radhuni Hasher Mangsho 33g' }],
  '87d9bc54': [{ url: `${R2_RADHUNI_BASE}/radhuni-kasundi-285ml.webp`, alt: 'Radhuni Kasundi 285ml' }],
  '15b0ac41': [{ url: `${R2_RADHUNI_BASE}/radhuni-dhoniya-gura-100g.webp`, alt: 'Radhuni Dhoniya Gura 100g' }],
  '2c8787a2': [{ url: `${R2_RADHUNI_BASE}/radhuni-dhoniya-gura-15g.webp`, alt: 'Radhuni Dhoniya Gura 15g' }],
  '6797819a': [{ url: `${R2_RADHUNI_BASE}/radhuni-dhoniya-gura-200g.webp`, alt: 'Radhuni Dhoniya Gura 200g' }],
  '4ab28db1': [{ url: `${R2_RADHUNI_BASE}/radhuni-shorisha-oil-80ml.webp`, alt: 'Radhuni Shorisha Oil 80ml' }],
  '91416875': [{ url: `${R2_RADHUNI_BASE}/radhuni-chui-jhal-mangsho-masala-38g.webp`, alt: 'Radhuni Chui Jhal Mangsho Masala 38g' }],
  '3a451e3b': [{ url: `${R2_RADHUNI_BASE}/radhuni-bbq-masala-50g.webp`, alt: 'Radhuni BBQ Masala 50g' }],
  'a3ef36f3': [{ url: `${R2_RADHUNI_BASE}/radhuni-borhani-masala-50g.webp`, alt: 'Radhuni Borhani Masala 50g' }],
  'f08fb3f6': [{ url: `${R2_RADHUNI_BASE}/radhuni-chicken-tandoori-50g.webp`, alt: 'Radhuni Chicken Tandoori Masala 50g' }],
  'c0170ff3': [{ url: `${R2_RADHUNI_BASE}/radhuni-chotpoti-masala-50g.webp`, alt: 'Radhuni Chotpoti Masala 50g' }],
  'f1e2e59c': [{ url: `${R2_RADHUNI_BASE}/radhuni-gorur-masala-25g.webp`, alt: 'Radhuni Gorur Masala 25g' }],
  'eef17d71': [{ url: `${R2_RADHUNI_BASE}/radhuni-holud-gura-500g.webp`, alt: 'Radhuni Holud Gura 500g' }],
  '045df58d': [{ url: `${R2_RADHUNI_BASE}/radhuni-jira-gura-100g.webp`, alt: 'Radhuni Jira Gura 100g' }],
  '06613f3a': [{ url: `${R2_RADHUNI_BASE}/radhuni-jira-gura-15g.webp`, alt: 'Radhuni Jira Gura 15g' }],
  'bf72c058': [{ url: `${R2_RADHUNI_BASE}/radhuni-jira-gura-200g.webp`, alt: 'Radhuni Jira Gura 200g' }],
  'bdcf65f2': [{ url: `${R2_RADHUNI_BASE}/radhuni-jira-gura-50g.webp`, alt: 'Radhuni Jira Gura 50g' }],
  '3682155c': [{ url: `${R2_RADHUNI_BASE}/radhuni-kabab-masala-50g.webp`, alt: 'Radhuni Kabab Masala 50g' }],
  '9c7880a6': [{ url: `${R2_RADHUNI_BASE}/radhuni-kala-bhuna-80g.webp`, alt: 'Radhuni Kala Bhuna Masala 80g' }],
  'c0fe29c0': [{ url: `${R2_RADHUNI_BASE}/radhuni-morich-gura-100g.webp`, alt: 'Radhuni Morich Gura 100g' }],
  'e6b407a7': [{ url: `${R2_RADHUNI_BASE}/radhuni-morich-gura-200g.webp`, alt: 'Radhuni Morich Gura 200g' }],
  '70562c12': [{ url: `${R2_RADHUNI_BASE}/radhuni-morich-gura-25g.webp`, alt: 'Radhuni Morich Gura 25g' }],
  '44bfa194': [{ url: `${R2_RADHUNI_BASE}/radhuni-morich-gura-500g.webp`, alt: 'Radhuni Morich Gura 500g' }],
  '404d9aa4': [{ url: `${R2_RADHUNI_BASE}/radhuni-murgi-mangsho-20g.webp`, alt: 'Radhuni Murgi Mangsho 20g' }],
  'e621afcc': [{ url: `${R2_RADHUNI_BASE}/radhuni-premium-ghee-200g.webp`, alt: 'Radhuni Premium Ghee 200g' }],
  '602a8c45': [{ url: `${R2_RADHUNI_BASE}/radhuni-roast-masala-35g.webp`, alt: 'Radhuni Roast Masala 35g' }],
  '811c65a2': [{ url: `${R2_RADHUNI_BASE}/radhuni-shorisha-oil-1l.webp`, alt: 'Radhuni Pure Mustard Oil 1L' }],
  'c9a869d2': [{ url: `${R2_RADHUNI_BASE}/radhuni-shorisha-oil-250ml.webp`, alt: 'Radhuni Shorisha Oil 250ml' }],
  '38ee3e1a': [{ url: `${R2_RADHUNI_BASE}/radhuni-shorisha-oil-500ml.webp`, alt: 'Radhuni Pure Mustard Oil 500ml' }],
  'df37b129': [{ url: `${R2_RADHUNI_BASE}/radhuni-sunflower-oil-1l.webp`, alt: 'Radhuni Sunflower Oil 1L' }],
  '82ed979d': [{ url: `${R2_RADHUNI_BASE}/radhuni-vinegar-280ml.webp`, alt: 'Radhuni White Vinegar 280ml' }],
  '20aa95b4': [{ url: `${R2_RADHUNI_BASE}/radhuni-vinegar-540ml.webp`, alt: 'Radhuni White Vinegar 540ml' }],
};

export function getProductGalleryImages(productId: string): ProductGalleryImage[] | undefined {
  const prefix = productId.replace(/[^a-f\d]/gi, '').slice(0, 8).toLowerCase();
  return PRODUCT_GALLERY_IMAGES[prefix];
}
