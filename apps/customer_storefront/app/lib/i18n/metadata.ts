import type { Locale } from './config';
import { LOCALE_HREFLANG, SITE_URL, stripLocalePrefix, withLocale } from './config';

export function buildLocaleAlternates(path: string, locale: Locale): {
  canonical: string;
  languages: { 'en-BD': string; 'bn-BD': string; 'x-default': string };
} {
  const englishPath = stripLocalePrefix(path).replace(/\/+$/, '') || '/';
  const englishUrl = `${SITE_URL}${englishPath === '/' ? '' : englishPath}`;
  const bengaliUrl = `${SITE_URL}${withLocale(englishPath, 'bn')}`;
  const languages = {
    'en-BD': englishUrl,
    'bn-BD': bengaliUrl,
    'x-default': englishUrl,
  };

  return { canonical: languages[LOCALE_HREFLANG[locale]], languages };
}
