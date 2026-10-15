import { createHash } from 'node:crypto';
import { z } from 'zod';
import { GUIDE_SLUG, guideApprovalContent, hasPublicationApproval } from './publication';

export const GUIDE_BASE_URL = 'https://www.luckystore1947.com';
export { GUIDE_SLUG } from './publication';
const text = z.string().trim().min(1);
const date = z.string().datetime({ offset: true });
const source = z.object({ title: text, url: z.string().url().startsWith('https://'), checkedAt: date });
const fact = z.object({ text, evidence: z.array(text).min(1) });

export const buyingGuideSchema = z.object({
  slug: z.string().regex(GUIDE_SLUG).refine(slug => slug !== 'editorial', 'Reserved editorial-policy slug'),
  revision: z.number().int().positive(),
  state: z.enum(['draft', 'review', 'published', 'archived']),
  title: text,
  description: text,
  introduction: text,
  definition: fact,
  takeaways: z.array(fact).length(5),
  methodology: fact,
  mode: z.enum(['unranked', 'ranked']),
  category: z.object({ id: z.string().uuid(), slug: z.string().regex(GUIDE_SLUG), name: text }),
  author: z.object({ name: text, kind: z.enum(['Person', 'Organization']), profileUrl: z.string().url().startsWith('https://') }).optional(),
  publishedAt: date.optional(),
  updatedAt: date.optional(),
  evidence: z.record(source),
  products: z.array(z.object({
    id: z.string().uuid(),
    // Exact name at research time: a changed SKU description requires editorial review.
    verifiedName: text,
    quantity: z.object({ value: z.number().finite().positive(), unit: z.enum(['g', 'ml']), evidence: text }),
    description: fact,
    useCase: fact,
    rank: z.number().int().positive().optional(),
    rationale: fact.optional(),
  })).min(3).max(12),
  faqs: z.array(z.object({ question: text, answer: fact })).min(6).max(8),
  relatedSlugs: z.array(z.string().regex(GUIDE_SLUG)).default([]),
  approval: z.object({
    revision: z.number().int().positive(),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    verifiedBy: text,
    verifiedAt: date,
    approvedBy: text,
    approvedAt: date,
  }).optional(),
}).superRefine((guide, ctx) => {
  const problem = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const refs = [guide.definition, ...guide.takeaways, guide.methodology,
    ...guide.products.flatMap(p => [p.description, p.useCase, ...(p.rationale ? [p.rationale] : [])]),
    ...guide.faqs.map(f => f.answer)].flatMap(f => f.evidence);
  refs.push(...guide.products.map(p => p.quantity.evidence));
  if (refs.some(ref => !guide.evidence[ref])) problem('Every factual field must reference registered evidence');
  if (new Set(guide.products.map(p => p.id)).size !== guide.products.length) problem('Duplicate product IDs');
  if (new Set(guide.products.map(p => p.quantity.unit)).size !== 1) problem('Comparison quantities must use the same unit');
  if (guide.mode === 'ranked' && guide.products.some((p, i) => p.rank !== i + 1 || !p.rationale)) {
    problem('Ranked guides require consecutive editorial ranks and evidenced rationale');
  }
  if (guide.mode === 'unranked' && guide.products.some(p => p.rank !== undefined)) problem('Unranked guides cannot claim ranks');
  if (guide.state === 'published') {
    if (!guide.author || !guide.publishedAt || !guide.updatedAt || !guide.approval) {
      problem('Publication requires an accountable author, dates, verification and approval');
    } else {
      if (guide.approval.revision !== guide.revision || guide.approval.contentHash !== guideContentHash(guide)) {
        problem('Approval must match the exact editorial revision and content');
      }
      const verified = Date.parse(guide.approval.verifiedAt);
      const approved = Date.parse(guide.approval.approvedAt);
      const published = Date.parse(guide.publishedAt);
      const updated = Date.parse(guide.updatedAt);
      if (verified > approved || approved > updated || published > updated) {
        problem('Verification and approval must precede this revision; preserve the original publication date');
      }
    }
  }
});

export type BuyingGuide = z.infer<typeof buyingGuideSchema>;

/** Excludes workflow fields only; dates, evidence and all visible editorial content are bound to approval. */
export function guideContentHash(guide: unknown): string {
  return createHash('sha256').update(guideApprovalContent(guide)).digest('hex');
}

export function publishedGuides(records: readonly unknown[], now = new Date()): BuyingGuide[] {
  const parsed = records.map(record => buyingGuideSchema.parse(record));
  if (new Set(parsed.map(g => g.slug)).size !== parsed.length) throw new Error('Duplicate buying-guide slugs');
  return parsed.filter(g => hasPublicationApproval(g, now.getTime()));
}

export function guideUrl(slug: string): string {
  return `${GUIDE_BASE_URL}/best/${slug}`;
}

export function guideSitemapEntries(records: readonly unknown[]) {
  return publishedGuides(records).map(g => ({ url: guideUrl(g.slug), lastModified: g.updatedAt! }));
}
