let lockCount = 0;
let previousOverflow = '';

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => undefined;

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(lockCount - 1, 0);

    if (lockCount === 0) {
      document.body.style.overflow = previousOverflow;
      previousOverflow = '';
    }
  };
}
