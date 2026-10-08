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

export function resolveApiBaseUrl(
  value = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.luckystore1947.com',
  isDev: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production',
) {
  const url = new URL(value);

  if (!isDev) {
    if (url.protocol !== 'https:') {
      throw new Error('EXPO_PUBLIC_API_URL must use HTTPS in production');
    }
    return url.toString().replace(/\/$/, '');
  }

  // Development environment: validate loopback, RFC1918 private IPv4, or mDNS .local
  const hostname = url.hostname;
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1';
  const isRfc1918 =
    /^10\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(hostname) ||
    /^192\.168\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(hostname);
  const isMdnsLocal = /^[a-zA-Z0-9-]+\.local$/.test(hostname);

  const isAllowedDevHttp = isLoopback || isRfc1918 || isMdnsLocal;

  if (url.protocol !== 'https:' && !isAllowedDevHttp) {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTPS or a valid local development host');
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
