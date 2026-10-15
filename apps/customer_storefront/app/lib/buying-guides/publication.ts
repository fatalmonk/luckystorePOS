import type { BuyingGuide } from './model';

export const GUIDE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Edge-compatible canonical content shared by Node approval validation and middleware. */
export function guideApprovalContent(guide: unknown): string {
  const { state: _state, approval: _approval, ...content } = guide as Record<string, unknown>;
  function stable(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, stable(item)]));
    return value;
  }
  return JSON.stringify(stable(content));
}

export function hasPublicationApproval(guide: BuyingGuide, now = Date.now()): boolean {
  return guide.state === 'published' && GUIDE_SLUG.test(guide.slug) && !!guide.author &&
    !!guide.publishedAt && !!guide.updatedAt && !!guide.approval &&
    guide.approval.revision === guide.revision &&
    Date.parse(guide.approval.verifiedAt) <= Date.parse(guide.approval.approvedAt) &&
    Date.parse(guide.approval.approvedAt) <= Date.parse(guide.updatedAt) &&
    Date.parse(guide.publishedAt) <= Date.parse(guide.updatedAt) && Date.parse(guide.updatedAt) <= now;
}

export async function isPublicGuideSlug(slug: string, guides: readonly BuyingGuide[]): Promise<boolean> {
  if (!GUIDE_SLUG.test(slug)) return false;
  const matches = guides.filter(guide => guide.slug === slug && hasPublicationApproval(guide));
  if (matches.length !== 1) return false;
  const guide = matches[0];
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(guideApprovalContent(guide)));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return hash === guide.approval!.contentHash;
}
