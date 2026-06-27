import { redis } from "./redis";

/**
 * Redis sliding window rate limiter.
 * Keys are based on the client IP and the auth endpoint.
 * Max 5 requests per 60 seconds.
 */
export async function isRateLimited(
  ip: string,
  endpoint: string,
  limit: number = 5,
  windowMs: number = 60000
): Promise<boolean> {
  const key = `ratelimit:${ip}:${endpoint}`;
  const now = Date.now();
  const clearBefore = now - windowMs;

  const pipeline = redis.pipeline();
  // Remove logs older than the window
  pipeline.zremrangebyscore(key, "-inf", clearBefore);
  // Count current logs in window
  pipeline.zcard(key);
  // Add current request timestamp
  pipeline.zadd(key, now, `${now}:${Math.random()}`);
  // Set TTL to twice the window size to clear unused keys
  pipeline.expire(key, Math.ceil(windowMs / 1000) * 2);

  const results = await pipeline.exec();
  if (!results) {
    return false;
  }

  // results[1][1] is the count returned by ZCARD
  const count = results[1][1] as number;

  return count >= limit;
}
