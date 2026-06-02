// Simple in-memory rate limiter
// Tracks requests per key (e.g., IP + org_code) within a time window

interface RateEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateEntry>()

// Clean up expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key)
    }
  }, 60_000)
}

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g., IP address or IP+org_code)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default 60s)
 * @returns true if the request should be BLOCKED (rate limited)
 */
export function isRateLimited(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60_000
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count++
  return entry.count > maxRequests
}

/**
 * Extract client IP from Next.js request headers
 */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}
