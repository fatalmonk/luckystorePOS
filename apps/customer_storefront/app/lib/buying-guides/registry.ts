import 'server-only';
import type { BuyingGuide } from './model';
import { REVIEW_GUIDES } from './research';

// Publication is a reviewed source change. Never insert fabricated approval or dates.
// Research candidates and unresolved evidence are tracked in the implementation plan.
// Add a guide only after its catalogue IDs, quantities and factual copy are verified.
export const BUYING_GUIDES: readonly BuyingGuide[] = REVIEW_GUIDES;
