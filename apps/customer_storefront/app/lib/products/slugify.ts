/**
 * Product Slug Utilities
 *
 * Converts between UUID-based and human-readable product slugs.
 * Format: `{sanitized-name}--{first-8-chars-of-uuid}`
 * Example: `britannia-marie-gold-biscuits--067da398`
 *
 * Latin catalog names keep the historical ASCII slug. A Bengali display name
 * does not: pass the English catalog name as `englishName` so `/bn` and
 * English share one slug. Transliteration runs only when neither name has
 * any Latin slug text.
 */

const HASANT = '\u09CD';
const NUKTA = '\u09BC';
const CHANDRABINDU = '\u0981';
const ANUSVARA = '\u0982';
const VISARGA = '\u0983';

/** Vowel signs replace the inherent vowel of the preceding consonant. */
const VOWEL_SIGNS: Record<string, string> = {
  '\u09BE': 'a',
  '\u09BF': 'i',
  '\u09C0': 'ii',
  '\u09C1': 'u',
  '\u09C2': 'uu',
  '\u09C3': 'ri',
  '\u09C7': 'e',
  '\u09C8': 'oi',
  '\u09CB': 'o',
  '\u09CC': 'ou',
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  '\u0985': 'o',
  '\u0986': 'a',
  '\u0987': 'i',
  '\u0988': 'ii',
  '\u0989': 'u',
  '\u098A': 'uu',
  '\u098B': 'ri',
  '\u098F': 'e',
  '\u0990': 'oi',
  '\u0993': 'o',
  '\u0994': 'ou',
};

const CONSONANTS: Record<string, string> = {
  '\u0995': 'k',
  '\u0996': 'kh',
  '\u0997': 'g',
  '\u0998': 'gh',
  '\u0999': 'ng',
  '\u099A': 'ch',
  '\u099B': 'chh',
  '\u099C': 'j',
  '\u099D': 'jh',
  '\u099E': 'n',
  '\u099F': 't',
  '\u09A0': 'th',
  '\u09A1': 'd',
  '\u09A2': 'dh',
  '\u09A3': 'n',
  '\u09A4': 't',
  '\u09A5': 'th',
  '\u09A6': 'd',
  '\u09A7': 'dh',
  '\u09A8': 'n',
  '\u09AA': 'p',
  '\u09AB': 'f',
  '\u09AC': 'b',
  '\u09AD': 'bh',
  '\u09AE': 'm',
  '\u09AF': 'j',
  '\u09B0': 'r',
  '\u09B2': 'l',
  '\u09B6': 'sh',
  '\u09B7': 'sh',
  '\u09B8': 's',
  '\u09B9': 'h',
  '\u09CE': 't',
  '\u09DC': 'r',
  '\u09DD': 'rh',
  '\u09DF': 'y',
};

const BENGALI_DIGITS: Record<string, string> = {
  '\u09E6': '0',
  '\u09E7': '1',
  '\u09E8': '2',
  '\u09E9': '3',
  '\u09EA': '4',
  '\u09EB': '5',
  '\u09EC': '6',
  '\u09ED': '7',
  '\u09EE': '8',
  '\u09EF': '9',
};

export interface ProductSlugOptions {
  /**
   * Catalog English name. When it still contains Latin slug text, both
   * locales use it and the localized label is ignored.
   */
  englishName?: string | null;
}

export interface CatalogSlugSource {
  id: string;
  name: string;
  originalName?: string | null;
}

/** Historical ASCII slug body. Empty when the name has no Latin letters or digits. */
function latinSlugPart(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
}

/**
 * NFC composes split ও/ৌ signs. It also decomposes ড়, ঢ়, and য়, which Unicode
 * excludes from recomposition, so those three nukta letters are composed again.
 * Otherwise a following vowel sign is skipped and the slug changes.
 */
function normalizeBengaliForSlug(input: string): string {
  return input
    .normalize('NFC')
    .replace(/\u09A1\u09BC/g, '\u09DC')
    .replace(/\u09A2\u09BC/g, '\u09DD')
    .replace(/\u09AF\u09BC/g, '\u09DF');
}

/**
 * Stable phonetic slug text for a Bengali-only name.
 * Hasanta drops the inherent vowel, ya-phala is "y", and a consonant followed
 * by another consonant keeps a single inherent "o" so মরিচ stays "morich".
 */
function transliterateBengali(input: string): string {
  const chars = Array.from(normalizeBengaliForSlug(input));
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const current = chars[i];
    if (current === HASANT || current === NUKTA || VOWEL_SIGNS[current]) continue;
    if (current === CHANDRABINDU) {
      out += 'n';
      continue;
    }
    if (current === ANUSVARA) {
      out += 'ng';
      continue;
    }
    if (current === VISARGA) {
      out += 'h';
      continue;
    }
    if (BENGALI_DIGITS[current]) {
      out += BENGALI_DIGITS[current];
      continue;
    }
    if (INDEPENDENT_VOWELS[current]) {
      out += INDEPENDENT_VOWELS[current];
      continue;
    }

    const consonant = CONSONANTS[current];
    if (!consonant) {
      out += current;
      continue;
    }

    const previous = chars[i - 1];
    const next = chars[i + 1];
    out += current === '\u09AF' && previous === HASANT ? 'y' : consonant;
    if (next === HASANT || next === NUKTA || next === CHANDRABINDU || next === ANUSVARA || next === VISARGA) {
      continue;
    }
    if (next && VOWEL_SIGNS[next]) {
      out += VOWEL_SIGNS[next];
      continue;
    }
    if (next && CONSONANTS[next]) out += 'o';
  }

  return out;
}

function slugBody(name: string, englishName?: string | null): string {
  const englishPart = latinSlugPart(englishName ?? '');
  if (englishPart) return englishPart;

  const direct = latinSlugPart(name);
  if (direct) return direct;

  return latinSlugPart(transliterateBengali(name))
    || latinSlugPart(transliterateBengali(englishName ?? ''));
}

/** Generate a semantic slug from product name + UUID */
export function toProductSlug(name: string, id: string, options?: ProductSlugOptions): string {
  const namePart = slugBody(name, options?.englishName);
  const idPrefix = id.replace(/-/g, '').slice(0, 8); // first 8 hex chars, no dashes
  return `${namePart}--${idPrefix}`;
}

/** Public product URL slug. Prefers the catalog English name over a localized label. */
export function catalogProductSlug(product: CatalogSlugSource): string {
  return toProductSlug(product.name, product.id, { englishName: product.originalName });
}

/**
 * Decode a product slug and normalize supported smart punctuation separators.
 * Shared by ID extraction and middleware canonical interception.
 */
export function normalizeProductSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // ignore malformed URI
  }
  return decoded.replace(/[\u2013\u2014\u2212]/g, '--');
}

/** Extract the final ID suffix; fall back to the whole slug if no separator exists. */
export function extractIdFromSlug(slug: string): string {
  const normalized = normalizeProductSlug(slug);
  const parts = normalized.split('--');
  return parts.at(-1) ?? slug;
}

/** Returns true if the string looks like a bare UUID (36 chars, 4 hyphens) */
export function isBareUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Inclusive/exclusive UUID bounds for an 8-char hex prefix (first UUID group).
 * Prefer this over LIKE: Postgres/PostgREST reject pattern operators on uuid columns.
 */
export function uuidPrefixRange(prefix: string): { gte: string; lt: string | null } | null {
  const clean = prefix.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(clean)) return null;

  const gte = `${clean}-0000-0000-0000-000000000000`;
  const value = Number.parseInt(clean, 16);
  if (value === 0xffffffff) return { gte, lt: null };

  const next = (value + 1).toString(16).padStart(8, '0');
  return { gte, lt: `${next}-0000-0000-0000-000000000000` };
}
