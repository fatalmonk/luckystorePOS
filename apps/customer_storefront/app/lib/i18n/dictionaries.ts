import type { Locale } from './config';

export const dictionaries = {
  en: { language: 'বাংলা', languageLabel: 'Switch to Bengali' },
  bn: { language: 'English', languageLabel: 'ইংরেজিতে পরিবর্তন করুন' },
} as const satisfies Record<Locale, Record<string, string>>;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
