import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toProductSlug } from '../../../../lib/products/slugify';
import { getCachedProductBySlug } from '../../../../lib/products/getCachedProduct';
import { getPublishedItemTranslations } from '../../../../lib/products/productTranslations';
import BengaliProductPage, { dynamic, generateMetadata } from './page';

const mocks = vi.hoisted(() => {
  const translationQuery: Record<string, any> = {};
  translationQuery.select = vi.fn(() => translationQuery);
  translationQuery.eq = vi.fn(() => translationQuery);
  translationQuery.maybeSingle = vi.fn();
  return {
    translationQuery,
    getCachedProductBySlug: vi.fn(),
    getPublishedItemTranslations: vi.fn(),
    getCachedRadhuniPackVariants: vi.fn(),
    getEnrichedProductData: vi.fn(),
    getProductGalleryImages: vi.fn(),
  };
});

vi.mock('../../../../lib/products/getCachedProduct', () => ({
  getCachedProductBySlug: mocks.getCachedProductBySlug,
}));
vi.mock('../../../../lib/supabase', () => ({
  supabase: { from: vi.fn(() => mocks.translationQuery) },
}));
vi.mock('../../../../lib/products/productTranslations', () => ({
  getPublishedItemTranslations: mocks.getPublishedItemTranslations,
}));
vi.mock('../../../../lib/products/getCachedCrossSell', () => ({
  getCachedRadhuniPackVariants: mocks.getCachedRadhuniPackVariants,
}));
vi.mock('../../../../lib/products/productEnrichment', () => ({
  getEnrichedProductData: mocks.getEnrichedProductData,
}));
vi.mock('../../../../lib/products/productGalleryRegistry', () => ({
  getProductGalleryImages: mocks.getProductGalleryImages,
}));
vi.mock('../../../../components/updated/Header', () => ({
  Header: () => <header>বাংলা হেডার</header>,
}));
vi.mock('../../../../components/BottomNav', () => ({
  BottomNav: () => <nav>বাংলা নেভিগেশন</nav>,
}));
vi.mock('../../../../(english)/product/[slug]/ProductClient', () => ({
  default: ({ product, localizedProduct, localizedDetails, galleryImages }: any) => (
    <article data-hydration-product={JSON.stringify(product)}>
      <h1>{localizedProduct?.name}</h1>
      <p>{localizedProduct?.description}</p>
      <p>{localizedProduct?.origin}</p>
      <p>{product.brand}</p>
      <p>{product.sku}</p>
      <p>{product.unit}</p>
      <p>৳{product.price}</p>
      <p>{localizedDetails?.summary}</p>
      {localizedDetails?.highlights?.map((value: string) => <p key={value}>{value}</p>)}
      {localizedDetails?.specifications?.map((value: { label: string; value: string }) => (
        <p key={value.label}>{value.label}: {value.value}</p>
      ))}
      <p>{localizedDetails?.usageDirections}</p>
      <p>{localizedDetails?.storageInstructions}</p>
      {localizedDetails?.faqs?.map((value: { question: string; answer: string }) => (
        <p key={value.question}>{value.question}: {value.answer}</p>
      ))}
      {galleryImages?.map((image: { url: string; alt: string; badge?: string }) => (
        <p key={image.url}>{image.alt} {image.badge}</p>
      ))}
    </article>
  ),
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('not found'); },
  permanentRedirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));

const product = {
  id: '4dc60601-5883-4ab4-98a7-d5e8b1ca8adb',
  name: 'Ispahani Mirzapore Best Leaf Tea 500 g',
  originalName: 'Ispahani Mirzapore Best Leaf Tea 500 g',
  description: 'English source description must never render on Bengali routes.',
  nutrition: 'English-only nutrition text must never be serialized.',
  searchTerms: ['English-only search term'],
  price: 500,
  unit: '500 g',
  stock: 8,
  emoji: '🍵',
  brand: 'Ispahani',
  sku: 'TEA-ISP-500',
  category: 'Tea & Coffee',
  image_url: null,
  origin: 'Bangladesh',
};

const translation = {
  itemId: product.id,
  locale: 'bn' as const,
  name: 'ইস্পাহানি মির্জাপুর বেস্ট লিফ চা 500 g',
  description: 'পর্যালোচিত বাংলা পণ্যের বিবরণ।',
  origin: 'বাংলাদেশ',
  searchTerms: ['ইস্পাহানি চা', 'ispahani cha', 'ispahani tea'],
  details: {
    summary: 'পর্যালোচিত বাংলা সারাংশ।',
    highlights: ['যাচাইকৃত বৈশিষ্ট্য'],
    specifications: [{ label: 'প্যাকের ধরন', value: 'পাউচ' }],
    usageDirections: 'প্যাকেটের নির্দেশনা অনুসরণ করুন।',
    storageInstructions: 'ঠান্ডা ও শুষ্ক স্থানে রাখুন।',
    faqs: [{ question: 'এটি কোথায় তৈরি?', answer: 'প্যাকেটে বাংলাদেশ লেখা আছে।' }],
  },
  reviewedAt: '2026-11-12T11:00:00.000Z',
  publishedAt: '2026-11-12T12:00:00.000Z',
  reviewedBy: '20000000-0000-4000-8000-000000000001',
  publishedBy: '30000000-0000-4000-8000-000000000001',
};

describe('Bengali product publication boundary', () => {
  it('requires request-time rendering so revoked translations are not held by ISR', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedProductBySlug).mockResolvedValue(product as never);
    vi.mocked(getPublishedItemTranslations).mockResolvedValue(new Map([[product.id, translation]]));
    mocks.translationQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.getCachedRadhuniPackVariants.mockResolvedValue([]);
    mocks.getEnrichedProductData.mockReturnValue({
      galleryImages: [{
        url: 'https://images.example.com/tea.jpg',
        alt: 'English image alternative must not render',
        badge: 'English package claim must not render',
      }],
    });
    mocks.getProductGalleryImages.mockReturnValue(undefined);
  });

  it('uses only reviewed Bengali product copy and structured details in metadata, JSON-LD, and route output', async () => {
    const slug = toProductSlug(product.name, product.id);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    const html = renderToStaticMarkup(await BengaliProductPage({ params: Promise.resolve({ slug }) }));
    const document = new DOMParser().parseFromString(html, 'text/html');
    const jsonLd = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent || '{}');

    expect(metadata.title).toEqual({ absolute: expect.stringContaining('ইস্পাহানি মির্জাপুর বেস্ট লিফ চা 500 g') });
    expect((metadata.title as { absolute: string }).absolute).toContain('৳500');
    expect((metadata.title as { absolute: string }).absolute).not.toContain('৳৫০০');
    expect(metadata.description).toBe('পর্যালোচিত বাংলা সারাংশ।');
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toMatchObject({
      canonical: `https://www.luckystore1947.com/bn/product/${slug}`,
      languages: {
        'en-BD': `https://www.luckystore1947.com/product/${slug}`,
        'bn-BD': `https://www.luckystore1947.com/bn/product/${slug}`,
      },
    });
    expect(document.body.textContent).toContain('পর্যালোচিত বাংলা পণ্যের বিবরণ।');
    expect(document.body.textContent).toContain('পর্যালোচিত বাংলা সারাংশ।');
    expect(document.body.textContent).toContain('বাংলাদেশ');
    expect(document.body.textContent).toContain('যাচাইকৃত বৈশিষ্ট্য');
    expect(document.body.textContent).toContain('প্যাকের ধরন: পাউচ');
    expect(document.body.textContent).toContain('প্যাকেটের নির্দেশনা অনুসরণ করুন।');
    expect(document.body.textContent).toContain('ঠান্ডা ও শুষ্ক স্থানে রাখুন।');
    expect(document.body.textContent).toContain('এটি কোথায় তৈরি?: প্যাকেটে বাংলাদেশ লেখা আছে।');
    expect(document.body.textContent).toContain('TEA-ISP-500');
    expect(document.body.textContent).toContain('500 g');
    expect(document.body.textContent).toContain('৳500');
    expect(document.body.textContent).not.toContain(product.description);
    const hydrationProduct = JSON.parse(
      document.querySelector('article')?.getAttribute('data-hydration-product') || '{}',
    );
    expect(hydrationProduct).toMatchObject({
      id: product.id,
      name: translation.name,
      description: translation.details.summary,
      origin: translation.origin,
      stock: product.stock,
      price: product.price,
      sku: product.sku,
    });
    for (const excluded of ['originalName', 'nutrition', 'searchTerms', 'bengaliDescription']) {
      expect(hydrationProduct).not.toHaveProperty(excluded);
    }
    expect(JSON.stringify(hydrationProduct)).not.toContain(product.description);
    expect(JSON.stringify(hydrationProduct)).not.toContain(product.name);
    expect(document.body.textContent).not.toContain('English image alternative must not render');
    expect(document.body.textContent).not.toContain('English package claim must not render');
    expect(jsonLd).toMatchObject({
      '@type': 'Product',
      name: translation.name,
      description: translation.details.summary,
      sku: product.sku,
      offers: { price: product.price, priceCurrency: 'BDT' },
    });
  });

  it('marks an unpublished Bengali product noindex and renders only localized under-review UI', async () => {
    vi.mocked(getPublishedItemTranslations).mockResolvedValue(new Map());
    const slug = toProductSlug(product.name, product.id);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    const html = renderToStaticMarkup(await BengaliProductPage({ params: Promise.resolve({ slug }) }));

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.title).toEqual({ absolute: 'পণ্যের বাংলা তথ্য পর্যালোচনাধীন | লাকি স্টোর' });
    expect(metadata.alternates).toEqual({
      canonical: `https://www.luckystore1947.com/bn/product/${slug}`,
    });
    expect(JSON.stringify(metadata)).not.toContain(product.name);
    expect(html).toContain('পণ্যের বাংলা তথ্য পর্যালোচনাধীন');
    expect(html).not.toContain(product.name);
    expect(html).not.toContain(product.description);
    expect(html).not.toContain('application/ld+json');
  });

  it('uses neutral Bengali metadata and JSON-LD when optional reviewed copy is absent', async () => {
    vi.mocked(getPublishedItemTranslations).mockResolvedValue(new Map([[
      product.id,
      { ...translation, description: null, origin: null, details: null },
    ]]));
    const slug = toProductSlug(product.name, product.id);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    const html = renderToStaticMarkup(await BengaliProductPage({ params: Promise.resolve({ slug }) }));
    const document = new DOMParser().parseFromString(html, 'text/html');
    const jsonLd = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent || '{}');

    expect(metadata.description).toBe(`${translation.name} সম্পর্কে যাচাইকৃত বাংলা পণ্যের তথ্য।`);
    expect(jsonLd.description).toBe(`${translation.name} সম্পর্কে যাচাইকৃত বাংলা পণ্যের তথ্য।`);
    expect(JSON.stringify(metadata)).not.toContain('পাওয়া যাচ্ছে');
    expect(jsonLd.description).not.toContain('available at Lucky Store in Chattogram');
  });
});
