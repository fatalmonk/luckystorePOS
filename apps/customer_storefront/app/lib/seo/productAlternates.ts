export interface ProductAlternateLanguagesInput {
  canonicalEnUrl: string;
  canonicalBnUrl: string;
  isBengaliIndexable: boolean;
}

export interface ProductAlternateLanguages {
  [language: `${Lowercase<string>}-${string}`]: string | undefined;
  'en-BD': string;
  'bn-BD'?: string;
  'x-default': string;
}

export function buildProductAlternateLanguages({
  canonicalEnUrl,
  canonicalBnUrl,
  isBengaliIndexable,
}: ProductAlternateLanguagesInput): ProductAlternateLanguages {
  return {
    'en-BD': canonicalEnUrl,
    ...(isBengaliIndexable ? { 'bn-BD': canonicalBnUrl } : {}),
    'x-default': canonicalEnUrl,
  };
}
