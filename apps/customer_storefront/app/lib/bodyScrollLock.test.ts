import { afterEach, describe, expect, it } from 'vitest';
import { lockBodyScroll } from './bodyScrollLock';

describe('lockBodyScroll', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('keeps scrolling locked until every overlay releases its lock', () => {
    const unlockDrawer = lockBodyScroll();
    const unlockSheet = lockBodyScroll();

    unlockDrawer();
    expect(document.body.style.overflow).toBe('hidden');

    unlockSheet();
    expect(document.body.style.overflow).toBe('');
  });

  it('restores the previous inline overflow value', () => {
    document.body.style.overflow = 'clip';
    const unlock = lockBodyScroll();

    unlock();
    expect(document.body.style.overflow).toBe('clip');
  });
});
