import Redis from "ioredis";

const globalForRedis = global as unknown as { redis: Redis | undefined };

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis =
  globalForRedis.redis ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ worker/queue
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
