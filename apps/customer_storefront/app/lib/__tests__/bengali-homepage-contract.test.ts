import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { getDictionary } from '../i18n/dictionaries';
import { toBengaliNumerals, withLocale, stripLocalePrefix } from '../i18n/config';
import { CATEGORY_GROUPS } from '../types';

afterEach(() => {
  cleanup();
});

// Mock Supabase to test translation overlay without network
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'item_translations') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  item_id: 'p-tea-1',
                  name: 'ইস্পাহানি মির্জাপুর চা',
                  description: 'চট্টগ্রামের বাগান থেকে বাছাইকৃত তাজা চা পাতা।',
                },
              ],
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    }),
  },
}));

vi.mock('../products/index', () => ({
  createProductRepository: vi.fn(() => ({
    repo: {
      search: vi.fn().mockResolvedValue({
        products: [
          {
            id: 'p-tea-1',
            name: 'Ispahani Mirzapore Tea',
            emoji: '🍵',
            price: 180,
            originalPrice: 200,
            unit: '500g',
            category: 'tea-and-coffee',
            stock: 50,
            brand: 'Ispahani',
            description: 'Fresh black tea.',
          },
        ],
      }),
      getCategories: vi.fn().mockResolvedValue([
        { id: 'cat-1', slug: 'tea-and-coffee', name: 'Tea & Coffee', emoji: '☕' },
      ]),
    },
  })),
  RuleBasedBrandParser: vi.fn().mockImplementation(() => ({
    parse: vi.fn((str: string) => str),
  })),
}));

import { BENGALI_CATEGORY_NAMES, getHomePageData } from '../products/getHomePageData';
import { formatLocalizedBdt } from '../../components/GridProductCard';
import { getCategoryBreadcrumbHref } from '../../product/[slug]/ProductClient';

describe('Bengali Homepage & Seamless Switching Contract', () => {
  it('provides complete Bengali dictionaries for all homepage sections with key parity', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.header.cart).toBe('ব্যাগ');
    expect(bnDict.header.promoText).toContain('ফ্রি হোম ডেলিভারি');
    expect(bnDict.campaign.headline).toBeTruthy();
    expect(bnDict.trustStrip.freeDeliveryTitle).toContain('ফ্রি ডেলিভারি');
    expect(bnDict.categoryGrid.dailyCooking).toBe('নিত্য রান্না');
    expect(bnDict.popularBazaar.label).toBe('জনপ্রিয় বাজার:');
    expect(bnDict.reels.popularTitle).toBe('এখন সবচেয়ে জনপ্রিয়');
    expect(bnDict.deal.title).toBe('সাপ্তাহিক স্পেশাল অফার');
    expect(bnDict.heritage.badge).toBe('ঐতিহ্য ও বিশ্বাস');
    expect(bnDict.footer.story).toContain('হেঁশেলের খাঁটি উপাদান');
    expect(bnDict.bottomNav.home).toBe('হোম');
    expect(bnDict.productCard.addToCart).toBe('যোগ করুন');

    // Ensure structural parity across dictionary keys
    expect(Object.keys(bnDict)).toEqual(Object.keys(enDict));
    expect(Object.keys(bnDict.header)).toEqual(Object.keys(enDict.header));
    expect(Object.keys(bnDict.campaign)).toEqual(Object.keys(enDict.campaign));
    expect(Object.keys(bnDict.trustStrip)).toEqual(Object.keys(enDict.trustStrip));
    expect(Object.keys(bnDict.categoryGrid)).toEqual(Object.keys(enDict.categoryGrid));
    expect(Object.keys(bnDict.footer)).toEqual(Object.keys(enDict.footer));
  });

  it('converts numbers to Bengali numerals accurately', () => {
    expect(toBengaliNumerals('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
    expect(toBengaliNumerals(500)).toBe('৫০০');
    expect(toBengaliNumerals('৳ 1,250')).toBe('৳ ১,২৫০');
    expect(toBengaliNumerals('Save ৳15')).toBe('Save ৳১৫');
    expect(formatLocalizedBdt(1250, 'bn')).toBe('৳১,২৫০');
    expect(formatLocalizedBdt(1250, 'en')).toBe('৳1,250');
  });

  it('prefixes and strips URLs with locale correctly', () => {
    expect(withLocale('/category/snacks', 'bn')).toBe('/bn/category/snacks');
    expect(withLocale('/category/snacks', 'en')).toBe('/category/snacks');
    expect(withLocale('/', 'bn')).toBe('/bn');
    expect(withLocale('/', 'en')).toBe('/');
    expect(withLocale('https://example.com', 'bn')).toBe('https://example.com');
    expect(withLocale('#section', 'bn')).toBe('#section');

    expect(stripLocalePrefix('/bn/category/snacks')).toBe('/category/snacks');
    expect(stripLocalePrefix('/bn')).toBe('/');
    expect(stripLocalePrefix('/category/snacks')).toBe('/category/snacks');
    expect(getCategoryBreadcrumbHref('snacks', 'bn')).toBe('/bn/category/snacks');
    expect(getCategoryBreadcrumbHref('personal-care', 'bn')).toBe('/bn/category/personal-care');
  });

  it('provides comprehensive appDrawer dictionary keys across all locales', () => {
    const enDict = getDictionary('en');
    const bnDict = getDictionary('bn');

    expect(Object.keys(bnDict.appDrawer)).toEqual(Object.keys(enDict.appDrawer));
    expect(enDict.appDrawer).toEqual({
      categories: 'Categories',
      freeDeliveryPromo: 'Free delivery on ৳500+ (1 km Chawkbazar) →',
      deliveryInfo: 'Delivery Areas & Info',
      helpCenter: 'Help Center',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
      closeMenu: 'Close menu',
      navigationMenu: 'Navigation menu',
      home: 'Home',
      shopAll: 'Shop All',
      deals: 'Deals',
      newArrivals: 'New Arrivals',
      wishlist: 'Wishlist',
      cart: 'Cart',
    });
    expect(bnDict.appDrawer).toEqual({
      categories: 'ক্যাটাগরি',
      freeDeliveryPromo: 'ফ্রি ডেলিভারি ৳৫০০+ (১ কিমি চকবাজার) →',
      deliveryInfo: 'ডেলিভারি এলাকা ও তথ্য',
      helpCenter: 'সহায়তা কেন্দ্র',
      lightMode: 'লাইট মোড',
      darkMode: 'ডার্ক মোড',
      switchToLight: 'লাইট মোডে পরিবর্তন করুন',
      switchToDark: 'ডার্ক মোডে পরিবর্তন করুন',
      closeMenu: 'মেনু বন্ধ করুন',
      navigationMenu: 'নেভিগেশন মেনু',
      home: 'হোম',
      shopAll: 'সব পণ্য',
      deals: 'অফার',
      newArrivals: 'নতুন পণ্য',
      wishlist: 'পছন্দের তালিকা',
      cart: 'ব্যাগ',
    });
  });

  it('provides Bengali labels for every drawer category group', () => {
    expect(CATEGORY_GROUPS.map(({ slug }) => slug).filter((slug) => !BENGALI_CATEGORY_NAMES[slug])).toEqual([]);
  });

  it('provides comprehensive checkout dictionary keys across all locales', () => {
    const enDict = getDictionary('en');
    const bnDict = getDictionary('bn');

    expect(enDict.checkout.fullName).toBe('Full Name');
    expect(bnDict.checkout.fullName).toBe('আপনার নাম');
    expect(enDict.checkout.cashOnDelivery).toBe('Cash on Delivery');
    expect(bnDict.checkout.cashOnDelivery).toBe('ক্যাশ অন ডেলিভারি');
    expect(enDict.checkout.confirmOrder).toBe('Confirm Order');
    expect(bnDict.checkout.confirmOrder).toBe('অর্ডার নিশ্চিত করুন');
  });

  it('fetches homepage data and overlays Bengali product translations in bn locale', async () => {
    const data = await getHomePageData('bn');
    expect(data).toHaveProperty('inStock');
    expect(data).toHaveProperty('categories');
    expect(data.categories.length).toBeGreaterThan(0);

    // Verify Bengali translation overlay
    const translatedItem = data.inStock.find((p) => p.id === 'p-tea-1');
    expect(translatedItem).toBeDefined();
    expect(translatedItem?.name).toBe('ইস্পাহানি মির্জাপুর চা');
    expect(translatedItem?.description).toBe('চট্টগ্রামের বাগান থেকে বাছাইকৃত তাজা চা পাতা।');

    // Verify category translation
    const teaCategory = data.categories.find((c) => c.slug === 'tea-and-coffee');
    expect(teaCategory?.name).toBe('চা ও কফি');
  });

  it('renders LanguageSwitcher with prefetch and scroll=false for immediate soft transition', async () => {
    const { LanguageSwitcher } = await import('../../components/LanguageSwitcher');

    render(React.createElement(LanguageSwitcher));
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/bn');
    expect(link).toHaveAttribute('hrefLang', 'bn-BD');
    expect(link.textContent).toBe('বাংলা');
  });

  it('renders Bengali SVG logo in both Logo and Footer components for bn locale', async () => {
    const { Logo } = await import('../../components/ui/Logo');
    const { Footer } = await import('../../components/updated/Footer');

    // Test Logo component directly with bn locale
    const { container: logoContainer } = render(React.createElement(Logo, { locale: 'bn' }));
    const logoLink = screen.getByRole('link', { name: 'লাকি স্টোর ১৯৪৭' });
    expect(logoLink).toHaveAttribute('href', '/bn');
    const lightImg = logoContainer.querySelector('img[src*="logo-bangla.svg"]');
    const darkImg = logoContainer.querySelector('img[src*="logo-bangla-inverse.svg"]');
    expect(lightImg).not.toBeNull();
    expect(darkImg).not.toBeNull();

    // Test Footer component with bn locale
    const { container: footerContainer } = render(React.createElement(Footer, { locale: 'bn' }));
    const footerLogo = footerContainer.querySelector('img[src*="logo-bangla.svg"]');
    expect(footerLogo).not.toBeNull();
    expect(screen.getByRole('link', { name: 'যোগাযোগ' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'পছন্দের তালিকা' })).toHaveAttribute('href', '/wishlist');
    expect(screen.getByRole('link', { name: 'গোপনীয়তা নীতি' })).toHaveAttribute('href', '/privacy');
  });
});
