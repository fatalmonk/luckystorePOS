// Rate limiting utility for Supabase Edge Functions
// Uses in-memory store with expiration (resets on function cold start)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,      // 10 requests
  windowMs: 60 * 1000,  // per 1 minute
};

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @param config - Rate limit configuration
 * @returns {object} - { allowed: boolean, remaining: number, resetAfter: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now);
  }

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAfter: config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAfter: entry.resetTime - now,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAfter: entry.resetTime - now,
  };
}

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Validate request body size
 */
export function validateBodySize(body: string, maxSizeBytes: number = 1024 * 1024): boolean {
  const size = new Blob([body]).size;
  return size <= maxSizeBytes;
}

/**
 * Sanitize string input to prevent injection
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  // Remove null bytes and other dangerous characters
  const sanitized = input
    .replace(/\x00/g, '')
    .replace(/[<>]/g, '')
    .trim();

  // Limit length
  return sanitized.slice(0, maxLength);
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate positive integer
 */
export function isValidPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER;
}

/**
 * Validate positive number with decimal precision
 */
export function isValidPositiveNumber(value: number, maxDecimals: number = 2): boolean {
  if (typeof value !== 'number' || isNaN(value) || value < 0) return false;
  const decimalPlaces = (value.toString().split('.')[1] || '').length;
  return decimalPlaces <= maxDecimals && value <= Number.MAX_SAFE_INTEGER;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Generate rate limit headers
 */
export function getRateLimitHeaders(
  remaining: number,
  resetAfter: number,
  maxRequests: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAfter / 1000).toString(),
  };
}