import type { Locale } from './config';
import { withLocale } from './config';

export function getLocaleHref(pathname: string, search: string, locale: Locale): string {
  return `${withLocale(pathname, locale)}${search}`;
}
