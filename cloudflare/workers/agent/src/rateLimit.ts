// src/rateLimit.ts
// In-memory rate limiting per Phase 5
// NOTE: Relying on isolate-local global memory. Enforcement is per-isolate (not shared).
// This is acceptable for free-tier POS/gateway workloads.

const rateLimits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();

  // Periodic cleanup to prune inactive IP buckets and prevent memory leaks
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [key, timestamps] of rateLimits.entries()) {
      while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        rateLimits.delete(key);
      }
    }
    lastCleanup = now;
  }

  if (!rateLimits.has(ip)) rateLimits.set(ip, []);
  const timestamps = rateLimits.get(ip)!;

  // Slide window
  while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length };
}