import { describe, it, expect } from 'vitest';
import { getStatusStepIndex, TIMELINE_STAGES } from './orders';

describe('mobile orders lib', () => {
  it('returns correct timeline progression index', () => {
    expect(getStatusStepIndex('pending')).toBe(0);
    expect(getStatusStepIndex('confirmed')).toBe(1);
    expect(getStatusStepIndex('preparing')).toBe(2);
    expect(getStatusStepIndex('out_for_delivery')).toBe(3);
    expect(getStatusStepIndex('delivered')).toBe(4);
    expect(getStatusStepIndex('cancelled')).toBe(-1);
  });

  it('contains all 5 progress stages in timeline', () => {
    expect(TIMELINE_STAGES).toHaveLength(5);
    expect(TIMELINE_STAGES[0].id).toBe('pending');
    expect(TIMELINE_STAGES[4].id).toBe('delivered');
  });
});
