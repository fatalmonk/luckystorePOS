import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductClient from './ProductClient';
import { createProductId } from '../../../lib/products/types';
import { getEnrichedProductData } from '../../../lib/products/productEnrichment';
import { toProductSlug } from '../../../lib/products/slugify';
import { getCachedProductBySlug } from '../../../lib/products/getCachedProduct';
import { getCachedCrossSellProducts, getCachedRadhuniPackVariants, prepareCrossSell } from '../../../lib/products/getCachedCrossSell';
import ProductPage, { generateMetadata } from './page';

const mockAddToCart = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/products/getCachedProduct', () => ({ getCachedProductBySlug: vi.fn() }));
vi.mock('../../../lib/products/getCachedCrossSell', () => ({
  getCachedCrossSellProducts: vi.fn(), getCachedRadhuniPackVariants: vi.fn(), prepareCrossSell: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../../../components/updated/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('../../../components/product/ProductCarousel', () => ({
  ProductCarousel: () => null,
}));

vi.mock('../../../components/product/ProductImageGallery', () => ({
  ProductImageGallery: () => null,
}));

vi.mock('../../../components/BottomNav', () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

vi.mock('../../../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../components/CartProvider', () => ({
  useCartContext: () => ({
    cart: [],
    addToCart: mockAddToCart,
    updateQty: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ addViewed: vi.fn() }),
}));

vi.mock('../../../lib/analytics', () => ({
  trackViewItem: vi.fn(),
  trackViewItemList: vi.fn(),
}));

describe('ProductClient Brand Linking', () => {
  const mockProduct = {
    id: createProductId('p-ispahani-200g'),
    name: "Ispahani Blender's Choice Premium Black Tea 200g",
    brand: 'Ispahani',
    category: 'Tea & Coffee',
    price: 160,
    unit: '200g',
    stock: 5,
    description: 'Fresh black tea from Ispahani.',
    emoji: '☕',
  };

  it.each(['029b62d8', 'bdcf65f2'])('uses the current %s price in route metadata, visible price and server Product offer', async (id) => {
    const enrichment = getEnrichedProductData(id)!;
    for (const price of [83, 97]) {
      const product = { ...mockProduct, id: createProductId(id), name: enrichment.exactName, brand: enrichment.brand, price, unit: 'pc' };
      vi.mocked(getCachedProductBySlug).mockResolvedValue(product);
      vi.mocked(getCachedCrossSellProducts).mockResolvedValue([]);
      vi.mocked(getCachedRadhuniPackVariants).mockResolvedValue([]);
      vi.mocked(prepareCrossSell).mockReturnValue([]);
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: toProductSlug(product.name, product.id) }) });
      expect(metadata.title).toEqual({ absolute: expect.stringContaining(`৳${price}`) });
      expect(metadata.openGraph?.title).toContain(`৳${price}`);
      expect(metadata.twitter?.title).toContain(`৳${price}`);
      expect(metadata.description).toContain(id === '029b62d8' ? '100g' : '50gm');
      const page = await ProductPage({ params: Promise.resolve({ slug: toProductSlug(product.name, product.id) }) });
      const { container, unmount } = render(page);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(enrichment.exactName);
      expect(screen.getAllByText(`৳${price}`).length).toBeGreaterThan(0);
      const json = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
      expect(json.offers.price).toBe(price);
      expect(json.offers.priceCurrency).toBe('BDT');
      unmount();
    }
  });

  it('renders Cadbury metadata, H1 and Product JSON-LD with the catalog pack size', async () => {
    const id = '4dc60601';
    const enrichment = getEnrichedProductData(id)!;
    const product = {
      ...mockProduct,
      id: createProductId(id),
      name: 'Cadbury Dairy Milk Chocolate Bar, 13.2 g',
      brand: 'Cadbury',
      price: 45,
      unit: 'pc',
    };
    const slug = toProductSlug(product.name, product.id);
    vi.mocked(getCachedProductBySlug).mockResolvedValue(product);
    vi.mocked(getCachedCrossSellProducts).mockResolvedValue([]);
    vi.mocked(getCachedRadhuniPackVariants).mockResolvedValue([]);
    vi.mocked(prepareCrossSell).mockReturnValue([]);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    expect(metadata.title).toEqual({ absolute: expect.stringContaining('13.2 g') });
    expect((metadata.title as { absolute: string }).absolute).not.toMatch(/10\s?g/i);
    expect(metadata.description).toContain('Chawkbazar, Chattogram, Bangladesh');
    expect(metadata.description?.length).toBeLessThanOrEqual(160);

    const page = await ProductPage({ params: Promise.resolve({ slug }) });
    const { container, unmount } = render(page);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(enrichment.exactName);
    expect(screen.getByText(enrichment.summary)).toBeInTheDocument();
    const productJsonLd = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(productJsonLd.name).toBe(enrichment.exactName);
    expect(productJsonLd.offers.price).toBe(45);
    unmount();
  });

  it('keeps essential product details and JSON-LD in the server-rendered route body', async () => {
    const product = { ...mockProduct, id: createProductId('task-9-product') };
    const slug = toProductSlug(product.name, product.id);
    const canonicalUrl = `https://www.luckystore1947.com/product/${slug}`;
    vi.mocked(getCachedProductBySlug).mockResolvedValue(product);
    vi.mocked(getCachedCrossSellProducts).mockResolvedValue([]);
    vi.mocked(getCachedRadhuniPackVariants).mockResolvedValue([]);
    vi.mocked(prepareCrossSell).mockReturnValue([]);

    const page = await ProductPage({ params: Promise.resolve({ slug }) });
    const html = renderToStaticMarkup(page);
    const document = new DOMParser().parseFromString(html, 'text/html');
    const productJsonLd = JSON.parse(
      document.querySelector('script[type="application/ld+json"]')?.textContent || '{}',
    );

    expect(document.querySelector('h1')?.textContent).toContain(product.name);
    expect(document.querySelector('main')?.textContent).toContain(product.description);
    expect(document.querySelector('main')?.textContent).toContain('৳160');
    expect(productJsonLd).toMatchObject({
      '@type': 'Product',
      name: product.name,
      description: expect.stringContaining(product.name),
      offers: {
        price: product.price,
        priceCurrency: 'BDT',
        url: canonicalUrl,
      },
    });
  });

  it('keeps an out-of-stock product unavailable and offers similar items', () => {
    render(
      <ProductClient
        product={{ ...mockProduct, stock: 0 }}
        crossSell={[]}
        locale="en"
      />,
    );

    expect(screen.getByRole('button', { name: /is out of stock/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'See Similar Items' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /notify/i })).not.toBeInTheDocument();
  });

  it('localizes shared product-page actions and delivery content for Bengali', () => {
    render(<ProductClient product={mockProduct} crossSell={[]} locale="bn" />);

    expect(screen.getByRole('heading', { name: 'চট্টগ্রাম স্টোর থেকে পণ্য সরবরাহ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ডেলিভারি এলাকা ও সাধারণ জিজ্ঞাসা দেখুন →' }))
      .toHaveAttribute('href', '/bn/delivery');
    expect(screen.getAllByRole('button', { name: 'ব্যাগে যোগ করুন' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Add to Cart' })).not.toBeInTheDocument();
  });

  it('fails closed instead of rendering English primary copy when Bengali presentation is missing', () => {
    const { container } = render(<ProductClient product={mockProduct} crossSell={[]} locale="bn" />);

    expect(container).not.toHaveTextContent(mockProduct.name);
    expect(container).not.toHaveTextContent(mockProduct.description);
  });

  it('renders brand links to dedicated brand hub in English locale', () => {
    render(<ProductClient product={mockProduct} crossSell={[]} locale="en" />);

    const brandLinks = screen.getAllByRole('link', { name: 'Ispahani' });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute('href', '/brand/ispahani');
    }
  });

  it.each([
    ['en', 'Dhoniya', 'ধনিয়া', '6797819a'],
    ['en', 'Holud', 'হলুদ', 'd8b54177'],
    ['en', 'Jira', 'জিরা', 'e0f3835d'],
    ['en', 'Morich', 'মরিচ', '15b0ac41'],
    ['bn', 'Dhoniya', 'ধনিয়া', '6797819a'],
    ['bn', 'Holud', 'হলুদ', 'd8b54177'],
    ['bn', 'Jira', 'জিরা', 'e0f3835d'],
    ['bn', 'Morich', 'মরিচ', '15b0ac41'],
  ] as const)('renders accessible %s same-family pack links for %s', (locale, family, bnFamily, idPrefix) => {
    const heading = locale === 'bn' ? 'একই মসলার অন্যান্য প্যাক' : 'Other available pack sizes';
    const linkName = locale === 'bn'
      ? `রাঁধুনী ${bnFamily} গুঁড়া ৫০ গ্রাম`
      : `Radhuni ${family} Gura 50 g`;
    const englishName = `Radhuni ${family} Gura 50 g`;
    const href = `${locale === 'bn' ? '/bn' : ''}/product/${toProductSlug(englishName, `${idPrefix}-0000-0000-0000-000000000000`)}`;
    const variant = {
      ...mockProduct,
      id: createProductId(`${idPrefix}-0000-0000-0000-000000000000`),
      name: englishName,
      bengaliName: `রাঁধুনী ${bnFamily} গুঁড়া ৫০ গ্রাম`,
      stock: 8,
    };

    render(
      <ProductClient
        product={{ ...mockProduct, name: `Radhuni ${family} Gura 15 g` }}
        crossSell={[]}
        radhuniPackVariants={[variant]}
        locale={locale}
      />,
    );

    const headingElement = screen.getByRole('heading', { name: heading });
    const navigation = screen.getByRole('navigation', { name: heading });
    const link = screen.getByRole('link', { name: linkName });

    expect(headingElement).toBeTruthy();
    expect(navigation.contains(link)).toBe(true);
    expect(link.getAttribute('href')).toBe(href);
  });

  it('renders manufacturer nutrition with the source measurement basis', () => {
    const enrichment = getEnrichedProductData('d132ec9d')!;
    render(
      <ProductClient
        product={{ ...mockProduct, id: createProductId('d132ec9d'), name: enrichment.exactName }}
        crossSell={[]}
        locale="en"
        enrichment={enrichment}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Nutrition' })).toBeInTheDocument();
    expect(screen.getByText('per 100 g')).toBeInTheDocument();
    expect(screen.getByText('Caramel: 246.23 kcal; Chocolate: 243.95 kcal')).toBeInTheDocument();
  });

  it('does not show English nutrition enrichment on the Bengali product page', () => {
    const enrichment = getEnrichedProductData('d132ec9d')!;
    render(
      <ProductClient
        product={{ ...mockProduct, id: createProductId('d132ec9d'), name: enrichment.exactName }}
        crossSell={[]}
        locale="bn"
        enrichment={enrichment}
      />,
    );

    expect(screen.queryByRole('heading', { name: 'Nutrition per 100 g' })).not.toBeInTheDocument();
    expect(screen.queryByText('Caramel: 246.23 kcal; Chocolate: 243.95 kcal')).not.toBeInTheDocument();
  });

  it('renders only publication-gated Bengali details while preserving canonical commerce identity', () => {
    const localizedDetails = {
      summary: 'পর্যালোচিত বাংলা সারাংশ।',
      highlights: ['যাচাইকৃত বাংলা বৈশিষ্ট্য'],
      specifications: [{ label: 'প্যাকের ধরন', value: 'পাউচ' }],
      usageDirections: 'প্যাকেটের নির্দেশনা অনুসরণ করুন।',
      storageInstructions: 'ঠান্ডা ও শুষ্ক স্থানে রাখুন।',
      faqs: [{ question: 'পণ্যটি কোথায় তৈরি?', answer: 'প্যাকেটে বাংলাদেশ লেখা আছে।' }],
    };
    const englishEnrichmentTrap = {
      exactName: 'English enriched name must not render',
      brand: 'Ispahani',
      netQuantity: '500 g',
      category: 'Tea & Coffee',
      summary: 'English summary must not render',
      specifications: [{ label: 'English specification', value: 'English value', evidenceRefs: [] }],
      highlights: ['English highlight must not render'],
      usageDirections: 'English usage must not render',
      storageInstructions: 'English storage must not render',
      faqs: [{ question: 'English question?', answer: 'English answer', evidenceRefs: [] }],
      localizedContent: {
        bn: { summary: 'Static Bengali enrichment must not bypass publication.' },
      },
      evidenceManifest: {},
      fieldEvidence: {
        exactName: [], brand: [], netQuantity: [], category: [], summary: [],
      },
    };
    const canonicalProduct = {
      ...mockProduct,
      id: createProductId('10000000-0000-4000-8000-000000000001'),
      name: 'Ispahani Mirzapore Best Leaf Tea 500 g',
      description: 'English canonical description retained for commerce state.',
      origin: 'Bangladesh',
      brand: 'Ispahani',
      sku: 'TEA-ISP-500',
      price: 500,
      unit: '500 g',
      category: 'English category must not render',
    };
    mockAddToCart.mockClear();
    const { container } = render(
      <ProductClient
        product={canonicalProduct}
        crossSell={[]}
        locale="bn"
        enrichment={englishEnrichmentTrap as any}
        localizedProduct={{
          name: 'ইস্পাহানি মির্জাপুর বেস্ট লিফ চা 500 g',
          description: 'পর্যালোচিত বাংলা পণ্যের বিবরণ।',
          origin: 'বাংলাদেশ',
        }}
        localizedDetails={localizedDetails}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ইস্পাহানি মির্জাপুর বেস্ট লিফ চা 500 g');
    expect(screen.getByText('পর্যালোচিত বাংলা সারাংশ।')).toBeInTheDocument();
    expect(screen.getByText('পর্যালোচিত বাংলা পণ্যের বিবরণ।')).toBeInTheDocument();
    expect(screen.getByText('যাচাইকৃত বাংলা বৈশিষ্ট্য')).toBeInTheDocument();
    expect(screen.getByText('প্যাকের ধরন')).toBeInTheDocument();
    expect(screen.getByText('পাউচ')).toBeInTheDocument();
    expect(screen.getByText('প্যাকেটের নির্দেশনা অনুসরণ করুন।')).toBeInTheDocument();
    expect(screen.getByText('ঠান্ডা ও শুষ্ক স্থানে রাখুন।')).toBeInTheDocument();
    expect(screen.getByText('পণ্যটি কোথায় তৈরি?')).toBeInTheDocument();
    expect(screen.getByText('প্যাকেটে বাংলাদেশ লেখা আছে।')).toBeInTheDocument();
    expect(screen.getByText('বাংলাদেশ')).toBeInTheDocument();
    expect(screen.getByText('TEA-ISP-500')).toBeInTheDocument();
    expect(screen.getAllByText('Ispahani').length).toBeGreaterThan(0);
    expect(screen.getAllByText('500 g').length).toBeGreaterThan(0);
    expect(screen.getAllByText('৳500').length).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent(/English enriched name|English summary|English specification|English value|English highlight|English usage|English storage|English question|English answer/);
    expect(container).not.toHaveTextContent('English category must not render');
    expect(container).not.toHaveTextContent('English canonical description retained for commerce state.');
    expect(container).not.toHaveTextContent('Static Bengali enrichment must not bypass publication.');

    fireEvent.click(screen.getAllByRole('button', { name: 'ব্যাগে যোগ করুন' })[0]);
    expect(mockAddToCart).toHaveBeenCalledWith(canonicalProduct);
  });

  it('renders brand links to dedicated brand hub in Bengali locale', () => {
    render(<ProductClient product={mockProduct} crossSell={[]} locale="bn" />);

    const brandLinks = screen.getAllByRole('link', { name: 'Ispahani' });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute('href', '/bn/brand/ispahani');
    }
  });

  it('links brand in specifications table when provided via enrichment', () => {
    const mockEnriched = {
      exactName: "Ispahani Blender's Choice Premium Black Tea 200g",
      brand: 'Ispahani',
      netQuantity: '200g',
      category: 'Tea & Coffee',
      summary: 'Premium tea from Ispahani.',
      specifications: [
        { label: 'Brand', value: 'Ispahani' },
        { label: 'Net Weight', value: '200g' },
      ],
      highlights: [],
      faqs: [],
      evidenceRefs: {},
      fieldEvidence: {
        exactName: ['PACK_FRONT'],
        brand: ['PACK_FRONT'],
        netQuantity: ['PACK_FRONT'],
        category: ['TAXONOMY'],
        summary: ['EDITORIAL'],
      },
    };

    render(
      <ProductClient
        product={mockProduct}
        crossSell={[]}
        locale="en"
        enrichment={mockEnriched as any}
      />,
    );

    const brandLinks = screen.getAllByRole('link', { name: 'Ispahani' });
    expect(brandLinks.length).toBe(2);
    expect(brandLinks[0]).toHaveAttribute('href', '/brand/ispahani');
    expect(brandLinks[1]).toHaveAttribute('href', '/brand/ispahani');
  });

  it('links unknown brand to brand directory fallback', () => {
    const unknownProduct = {
      ...mockProduct,
      brand: 'Custom Local Brand',
    };

    render(<ProductClient product={unknownProduct} crossSell={[]} locale="en" />);

    const brandLinks = screen.getAllByRole('link', { name: 'Custom Local Brand' });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute('href', '/brand');
    }
  });
});
