import type { ProductGalleryImage } from './productEnrichmentTypes';

const R2_POLAR_BASE = 'https://images.luckystore1947.com/products/polar';

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
    { url: `${R2_POLAR_BASE}/coffee-tub.webp`, alt: 'Polar Coffee ice cream tub, 1 liter' },
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
    { url: `${R2_POLAR_BASE}/red-velvet-tub.webp`, alt: 'Polar Red Velvet ice cream tub, 1 liter' },
  ],
  '2c367e44': [
    { url: `${R2_POLAR_BASE}/robusto-salted-caramel.webp`, alt: 'Polar Robusto Salted Caramel ice cream bar' },
  ],
  'fe31ca90': [
    { url: `${R2_POLAR_BASE}/cool-shell-n-core.webp`, alt: 'Polar Cool Shell N Core ice cream stick' },
  ],
  '2233c416': [
    { url: `${R2_POLAR_BASE}/shor-malai.webp`, alt: 'Polar Shor Malai ice cream stick' },
  ],
  'fcefa591': [
    { url: `${R2_POLAR_BASE}/tornado-strawberry.webp`, alt: 'Polar Tornado Strawberry ice cream stick' },
  ],
  'be49558d': [
    { url: `${R2_POLAR_BASE}/zafran-malai-tub.webp`, alt: 'Polar Zafran Malai ice cream tub, 1 liter' },
  ],
  '4ca03fce': [
    { url: `${R2_POLAR_BASE}/chocodelight-cone.webp`, alt: 'Polar Chocodelight cone ice cream' },
  ],
  '236b5858': [
    { url: `${R2_POLAR_BASE}/mango-cup.webp`, alt: 'Polar Mango Cup ice cream' },
  ],
  'f6d581d5': [
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
};

export function getProductGalleryImages(productId: string): ProductGalleryImage[] | undefined {
  const prefix = productId.replace(/[^a-f\d]/gi, '').slice(0, 8).toLowerCase();
  return PRODUCT_GALLERY_IMAGES[prefix];
}
