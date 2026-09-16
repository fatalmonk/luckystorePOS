import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockNotFound = vi.fn(() => {
  const err = new Error('NEXT_NOT_FOUND');
  (err as any).digest = 'NEXT_NOT_FOUND';
  throw err;
});

const mockPermanentRedirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT;replace;${url};308;`);
  (err as any).digest = `NEXT_REDIRECT;replace;${url};308;`;
  throw err;
});

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  redirect: (url: string) => mockPermanentRedirect(url),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/category',
  useSearchParams: () => ({ toString: () => '' }),
}));

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
    })),
  },
}));

// Mock CategoryShell to inspect rendered props
vi.mock('../../category/CategoryShell', () => ({
  CategoryShell: vi.fn((props: any) => ({
    type: 'CategoryShell',
    props,
  })),
}));

// Mock products repository / cached helpers
const mockProduct = {
  id: '029b62d8-1111-2222-3333-444455556666',
  name: 'Miniket Rice 5kg',
  price: 360,
  category: 'rice-and-grain',
  categoryId: 'cat-rice',
  description: 'Premium rice',
};

const mockCategories = [
  { id: 'cat-rice', slug: 'rice-and-grain', name: 'Rice & Grain', emoji: '🌾' },
  { id: 'cat-snacks', slug: 'snacks', name: 'Snacks', emoji: '🍿' },
  { id: 'cat-cleaning', slug: 'cleaning-supplies', name: 'Cleaning Supplies', emoji: '🧼' },
];

vi.mock('../products/getCachedCategories', () => ({
  getCachedCategories: vi.fn(async () => mockCategories),
}));

vi.mock('../products/index', () => ({
  createProductRepository: vi.fn(() => ({
    repo: {
      search: vi.fn(async () => ({ products: [mockProduct], total: 1 })),
      getCategories: vi.fn(async () => mockCategories),
    },
  })),
}));

describe('Bengali Category Routes Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates canonical metadata for root Bengali category page (/bn/category)', async () => {
    const { generateMetadata } = await import('../../bn/category/page');
    const meta = await generateMetadata({
      searchParams: Promise.resolve({}),
    });

    expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/bn/category');
    expect(meta.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/category');
    expect(meta.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com/category');
    expect(meta.title).toContain('পণ্য ব্রাউজ করুন');
  });

  it('renders CategoryShell with locale="bn" on /bn/category', async () => {
    const BengaliCategoryRootPage = (await import('../../bn/category/page')).default;
    const result = await BengaliCategoryRootPage({
      searchParams: Promise.resolve({}),
    });

    expect(result.props.locale).toBe('bn');
    expect(result.props.categorySlug).toBe('all');
  });

  it('generates canonical metadata for any valid category slug in Bengali', async () => {
    const { generateMetadata } = await import('../../bn/category/[slug]/page');
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'snacks' }),
      searchParams: Promise.resolve({}),
    });

    expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/bn/category/snacks');
    expect(meta.title).toContain('নাস্তা ও পানীয়');
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it('triggers notFound() for invalid category slug in Bengali', async () => {
    const { generateMetadata } = await import('../../bn/category/[slug]/page');
    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: 'completely-invalid-slug' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  it('triggers permanentRedirect for unnormalized category alias in Bengali', async () => {
    const { generateMetadata } = await import('../../bn/category/[slug]/page');
    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: 'Rice-And-Grain' }),
        searchParams: Promise.resolve({ sort: 'price' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT;replace;/bn/category/rice-and-grain?sort=price;308;');

    expect(mockPermanentRedirect).toHaveBeenCalledWith('/bn/category/rice-and-grain?sort=price');
  });

  it('renders CategoryShell with locale="bn" and translated categories for /bn/category/[slug]', async () => {
    const BengaliCategorySlugPage = (await import('../../bn/category/[slug]/page')).default;
    const result = await BengaliCategorySlugPage({
      params: Promise.resolve({ slug: 'rice-and-grain' }),
      searchParams: Promise.resolve({}),
    });

    expect(result.props.locale).toBe('bn');
    expect(result.props.categorySlug).toBe('rice-and-grain');
  });
});
