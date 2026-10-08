import { z } from 'zod';
import { CategoryNameSchema } from './schema-utils';

export type Locale = 'en' | 'bn';

export const HomeProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().default('🛒'),
  price: z.number().finite().nonnegative(),
  originalPrice: z.number().finite().nonnegative().optional(),
  unit: z.string().min(1),
  stock: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
  badge: z.string().optional(),
  category: CategoryNameSchema,
}).strip();

export const HomeCategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().default('🛒'),
}).strip();

export const HomeDtoSchema = z.object({
  locale: z.enum(['en', 'bn']),
  degraded: z.boolean(),
  categories: z.array(HomeCategorySchema).max(60),
  sections: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    products: z.array(HomeProductSchema).max(20),
  })).max(10),
}).strip();

export type HomeProduct = z.infer<typeof HomeProductSchema>;
export type HomeDto = z.infer<typeof HomeDtoSchema>;

export function resolveApiBaseUrl(value = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.luckystore1947.com') {
  const url = new URL(value);
  const isLocalDevHost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.startsWith('192.168.') ||
    url.hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(url.hostname) ||
    url.hostname.endsWith('.local');

  if (url.protocol !== 'https:' && !isLocalDevHost) {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTPS');
  }
  return url.toString().replace(/\/$/, '');
}

export async function fetchHome(locale: Locale, signal?: AbortSignal): Promise<HomeDto> {
  const response = await fetch(`${resolveApiBaseUrl()}/api/mobile/v1/home?locale=${locale}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Home request failed (${response.status})`);
  return HomeDtoSchema.parse(await response.json());
}
