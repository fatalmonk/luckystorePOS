import { resolveRegistryEvidence } from '../_shared/translation-registry-evidence.ts';
import { validateDraft, type Draft, type Source } from './validation.ts';

// This explicit fallback is intentionally narrow. It cannot create unsupported claims
// or approve content, and is used only if the selected free provider fails.
const verifiedTemplates: Record<string, { url: string; name: string; description: string }> = {
  b79a6606: {
    url: 'https://buldak.com/us/product/buldak-ramen-2x-cup/',
    name: 'Samyang Buldak রামেন 2X কাপ 70g',
    description: 'Samyang Buldak Ramen 2X Cup 70g হলো 70g ওজনের কাপ নুডলস। প্রস্তুতকারকের তথ্য অনুযায়ী এটি তীব্র ঝাল স্বাদের।',
  },
  '4bbb76d4': {
    url: 'https://buldak.com/us/product/buldak-ramen-original-cup/',
    name: 'Samyang Buldak রামেন Original কাপ 70g',
    description: 'Samyang Buldak Ramen Original Cup 70g হলো 70g ওজনের কাপ নুডলস। প্রস্তুতকারকের তথ্য অনুযায়ী এটি ঝাল ও উমামি স্বাদের।',
  },
};
export function evidenceFallbackDraft(source: Source): Draft | null {
  const match = resolveRegistryEvidence(source);
  const expected = match.key ? verifiedTemplates[match.key] : null;
  if (!match.matched || !match.supportedFacts || !expected
    || !match.links.some(link => link.url === expected.url)) return null;
  const proposed = {
    id: source.id, name: expected.name, description: expected.description,
    search_terms: [source.name, expected.name],
  };
  return validateDraft({ ...source, description: null, evidenceDescription: match.supportedFacts }, proposed).draft ?? null;
}
