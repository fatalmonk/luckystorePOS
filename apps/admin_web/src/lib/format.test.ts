import { describe, it, expect } from 'vitest';
import {
  calcMargin,
  calcMarginRounded,
  getMarginColor,
  getMarginBadgeStyles,
} from './format';

describe('calcMargin', () => {
  it('calculates correct margin percentage', () => {
    expect(calcMargin(75, 100)).toBe(25);
    expect(calcMargin(50, 100)).toBe(50);
    expect(calcMargin(94, 100)).toBe(6);
  });

  it('returns null for invalid inputs', () => {
    expect(calcMargin(null, 100)).toBeNull();
    expect(calcMargin(100, null)).toBeNull();
    expect(calcMargin(0, 100)).toBeNull();
    expect(calcMargin(100, 0)).toBeNull();
    expect(calcMargin(-10, 100)).toBeNull();
  });
});

describe('calcMarginRounded', () => {
  it('rounds margin percentage to nearest integer', () => {
    expect(calcMarginRounded(75.5, 100)).toBe(25);
    expect(calcMarginRounded(75.4, 100)).toBe(25);
  });
});

describe('getMarginColor', () => {
  it('returns text-success for margins > 25%', () => {
    expect(getMarginColor(25.1)).toBe('text-success');
    expect(getMarginColor(30)).toBe('text-success');
    expect(getMarginColor(100)).toBe('text-success');
  });

  it('returns text-warning for margins 10% to 25%', () => {
    expect(getMarginColor(25)).toBe('text-warning');
    expect(getMarginColor(24)).toBe('text-warning');
    expect(getMarginColor(15)).toBe('text-warning');
    expect(getMarginColor(10)).toBe('text-warning');
  });

  it('returns text-danger for margins < 10%', () => {
    expect(getMarginColor(9.9)).toBe('text-danger');
    expect(getMarginColor(6)).toBe('text-danger');
    expect(getMarginColor(0)).toBe('text-danger');
    expect(getMarginColor(-10)).toBe('text-danger');
  });

  it('returns text-text-muted when margin is null', () => {
    expect(getMarginColor(null)).toBe('text-text-muted');
  });
});

describe('getMarginBadgeStyles', () => {
  it('returns green badge for margins > 25%', () => {
    const res = getMarginBadgeStyles(30);
    expect(res.container).toContain('bg-success-subtle');
    expect(res.container).toContain('border-success/20');
    expect(res.text).toBe('text-success');
  });

  it('returns yellow/amber badge for margins between 10% and 25% (inclusive)', () => {
    const res24 = getMarginBadgeStyles(24);
    expect(res24.container).toContain('bg-warning-subtle');
    expect(res24.container).toContain('border-warning/20');
    expect(res24.text).toBe('text-warning');

    const res10 = getMarginBadgeStyles(10);
    expect(res10.container).toContain('bg-warning-subtle');
    expect(res10.container).toContain('border-warning/20');
    expect(res10.text).toBe('text-warning');

    const res25 = getMarginBadgeStyles(25);
    expect(res25.container).toContain('bg-warning-subtle');
    expect(res25.container).toContain('border-warning/20');
    expect(res25.text).toBe('text-warning');
  });

  it('returns red badge for margins < 10%', () => {
    const res6 = getMarginBadgeStyles(6);
    expect(res6.container).toContain('bg-danger-subtle');
    expect(res6.container).toContain('border-danger/20');
    expect(res6.text).toBe('text-danger');

    const res0 = getMarginBadgeStyles(0);
    expect(res0.container).toContain('bg-danger-subtle');
    expect(res0.text).toBe('text-danger');
  });

  it('returns neutral muted badge when margin is null', () => {
    const res = getMarginBadgeStyles(null);
    expect(res.container).toContain('bg-surface-raised');
    expect(res.text).toBe('text-text-muted');
  });
});
