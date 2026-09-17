import { describe, expect, it } from 'vitest';
import { isMissingItemTranslationsTableError } from '../translationErrors';

describe('translation query errors', () => {
  it('allows only a missing-table error to use the English fallback', () => {
    expect(isMissingItemTranslationsTableError({ code: 'PGRST205' })).toBe(true);
    expect(isMissingItemTranslationsTableError({ code: '42P01' })).toBe(true);
    expect(
      isMissingItemTranslationsTableError({
        message: 'relation "public.item_translations" does not exist',
      })
    ).toBe(true);
  });

  it('does not classify permissions, network, or unrelated errors as missing-table errors', () => {
    expect(isMissingItemTranslationsTableError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingItemTranslationsTableError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
    expect(isMissingItemTranslationsTableError({ message: 'network timeout' })).toBe(false);
    expect(isMissingItemTranslationsTableError(null)).toBe(false);
  });
});
