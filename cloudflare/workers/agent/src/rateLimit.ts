// src/rateLimit.ts
// In-memory rate limiting per Phase 5

const rateLimits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  if (!rateLimits.has(ip)) rateLimits.set(ip, []);
  const timestamps = rateLimits.get(ip)!;

  // Slide window
  while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) timestamps.shift();

  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length };
}