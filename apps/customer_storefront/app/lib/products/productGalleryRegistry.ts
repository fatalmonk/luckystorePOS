import type { ProductGalleryImage } from './productEnrichmentTypes';

/** Verified local catalogue images for Polar products with curated gallery assets. */
const PRODUCT_GALLERY_IMAGES: Record<string, ProductGalleryImage[]> = {
  // Double Sundae remains unresolved; Kheer 500 ml uses the verified 1/2L overlay below.
  '70a322a1': [],
  '79e0ece1': [
    {
      url: '/products/polar/kheer-500ml-1-2l.png',
      alt: 'Polar Kheer ice cream tub with a 1/2L size label',
    },
  ],
  '5830390b': [
    { url: '/products/polar/carnival-butterscotch.webp', alt: 'Polar Carnival Butterscotch cone ice cream' },
  ],
  '1ba3a780': [
    { url: '/products/polar/carnival-hazelnut.webp', alt: 'Polar Carnival Hazelnut cone ice cream' },
    { url: '/products/polar/carnival-hazelnut-product.webp', alt: 'Polar Carnival Hazelnut cone with hazelnut ice cream' },
  ],
  'e8771528': [
    { url: '/products/polar/carnival-vanilla.webp', alt: 'Polar Carnival Vanilla cone ice cream' },
  ],
  '6df59696': [
    { url: '/products/polar/carnival-strawberry.webp', alt: 'Polar Carnival Strawberry cone ice cream' },
  ],
  '2e948079': [
    { url: '/products/polar/coffee-tub.webp', alt: 'Polar Coffee ice cream tub, 1 liter' },
  ],
  '8f7ce150': [
    { url: '/products/polar/crunchy-stick.webp', alt: 'Polar Crunchy ice cream stick' },
  ],
  '54a7520e': [
    { url: '/products/polar/doi-tub.webp', alt: 'Polar Doi ice cream tub, 1 liter' },
  ],
  '604e6bb0': [
    { url: '/products/polar/ice-lolly-lemon.webp', alt: 'Polar Lemon Ice Lolly' },
  ],
  'c1895793': [
    { url: '/products/polar/kheer-tub.webp', alt: 'Polar Kheer ice cream tub, 1 liter' },
  ],
  'b77e2fe6': [
    { url: '/products/polar/malai-stick.webp', alt: 'Polar Malai ice cream stick' },
  ],
  'f2d567f0': [
    { url: '/products/polar/mango-tub.webp', alt: 'Polar Mango ice cream tub, 1 liter' },
  ],
  'bc7de70f': [
    { url: '/products/polar/red-velvet-tub.webp', alt: 'Polar Red Velvet ice cream tub, 1 liter' },
  ],
  '2c367e44': [
    { url: '/products/polar/robusto-salted-caramel.webp', alt: 'Polar Robusto Salted Caramel ice cream bar' },
  ],
  'fe31ca90': [
    { url: '/products/polar/cool-shell-n-core.webp', alt: 'Polar Cool Shell N Core ice cream stick' },
  ],
  '2233c416': [
    { url: '/products/polar/shor-malai.webp', alt: 'Polar Shor Malai ice cream stick' },
  ],
  'fcefa591': [
    { url: '/products/polar/tornado-strawberry.webp', alt: 'Polar Tornado Strawberry ice cream stick' },
  ],
  'be49558d': [
    { url: '/products/polar/zafran-malai-tub.webp', alt: 'Polar Zafran Malai ice cream tub, 1 liter' },
  ],
  '4ca03fce': [
    { url: '/products/polar/chocodelight-cone.webp', alt: 'Polar Chocodelight cone ice cream' },
  ],
  '236b5858': [
    { url: '/products/polar/mango-cup.webp', alt: 'Polar Mango Cup ice cream' },
  ],
  f6d581d5: [
    { url: '/products/polar/chocolate-cup-front.webp', alt: 'Polar Chocolate Cup ice cream, 100 ml package' },
    { url: '/products/polar/chocolate-cup-back.webp', alt: 'Polar Chocolate Cup ingredients and product information' },
    { url: '/products/polar/chocolate-cup-side.webp', alt: 'Polar Chocolate Cup packaging side view' },
  ],
};

export function getProductGalleryImages(productId: string): ProductGalleryImage[] | undefined {
  const prefix = productId.replace(/[^a-f\d]/gi, '').slice(0, 8).toLowerCase();
  return PRODUCT_GALLERY_IMAGES[prefix];
}
