/**
 * Debounce utility for performance optimization
 * Usage: const debouncedFn = debounce((value) => doSomething(value), 300);
 */

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle utility - limits execution to once per interval
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoized selector for expensive computations
 */
export function createSelector<T, R>(
  selector: (state: T) => R,
  equalityFn: (a: R, b: R) => boolean = Object.is
) {
  let lastState: T | null = null;
  let lastResult: R | null = null;

  return (state: T): R => {
    if (lastState !== null && equalityFn(selector(lastState), selector(state))) {
      return lastResult!;
    }
    lastState = state;
    lastResult = selector(state);
    return lastResult;
  };
}