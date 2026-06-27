import { loadEnvConfig } from "@next/env";
// Load environment variables before importing other dependencies
loadEnvConfig(process.cwd());

import { Queue, Worker, QueueEvents, ConnectionOptions } from "bullmq";
import Redis from "ioredis";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";
import { fetchTop250Prices, fetchCustomPrices } from "../lib/coingecko";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Separate connection for BullMQ scheduler and worker threads
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const queueName = "price-monitor";

async function startWorker() {
  logger.info({ eventType: "worker_start" }, "Initializing Crypto Surveillance background worker...");

  // 1. Initialize BullMQ Queue
  const priceQueue = new Queue(queueName, { connection: connection as unknown as ConnectionOptions });

  // 2. Clean existing repeatable jobs to avoid duplicates on restart
  const activeRepeatableJobs = await priceQueue.getRepeatableJobs();
  for (const job of activeRepeatableJobs) {
    await priceQueue.removeRepeatableByKey(job.key);
  }

  // 3. Add repeatable job (every 30 seconds = 30000ms)
  await priceQueue.add(
    "fetch-and-check",
    {},
    {
      repeat: {
        every: 30000,
      },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
  logger.info({ eventType: "worker_job_scheduled" }, "Repeatable job 'fetch-and-check' scheduled every 30 seconds.");

  // 4. Initialize Worker Processor
  const worker = new Worker(
    queueName,
    async (job) => {
      if (job.name !== "fetch-and-check") return;

      const jobStart = Date.now();
      const timestamp = new Date().toISOString();
      logger.info({ eventType: "job_run_start", timestamp }, "Background price monitoring job started.");

      try {
        // Step a: Fetch active coin IDs (wishlisted coins) from database
        const wishlistItems = await prisma.wishlistItem.findMany({
          select: { coinId: true },
          distinct: ["coinId"],
        });

        const wishlistedCoins = await prisma.coin.findMany({
          where: { id: { in: wishlistItems.map((item) => item.coinId) } },
          select: { id: true, coinGeckoId: true },
        });

        // Step b: Fetch price data from CoinGecko
        // Fetch top 250 prices (markets API)
        const prices = await fetchTop250Prices();

        // Check if there are any wishlisted coins not present in top 250
        const top250GeckoIds = new Set(Object.keys(prices));
        const missingWishlistGeckoIds = wishlistedCoins
          .map((c) => c.coinGeckoId)
          .filter((id) => !top250GeckoIds.has(id));

        // Fetch custom prices for the missing ones in batches of 100
        if (missingWishlistGeckoIds.length > 0) {
          const customPrices = await fetchCustomPrices(missingWishlistGeckoIds);
          Object.assign(prices, customPrices);
        }

        const coinGeckoIdsToFetch = Object.keys(prices);
        if (coinGeckoIdsToFetch.length === 0) {
          logger.warn({ eventType: "job_no_coins" }, "No coin prices fetched from API. Returning early.");
          return;
        }

        // Fetch local database Coin IDs for all fetched CoinGecko IDs
        const dbCoins = await prisma.coin.findMany({
          where: { coinGeckoId: { in: coinGeckoIdsToFetch } },
        });

        const priceSnapshotsData: Array<{ coinId: string; price: number }> = [];
        const activeIds: string[] = [];

        // Process each coin
        for (const coin of dbCoins) {
          const currentPrice = prices[coin.coinGeckoId];
          if (typeof currentPrice !== "number") continue;

          activeIds.push(coin.coinGeckoId);

          // Step c: Read the previous currentPrice from Redis before overwriting
          const previousPriceStr = await redis.get(`currentPrice:${coin.coinGeckoId}`);

          // Step d: Write new price to currentPrice:{coinId} in Redis
          await redis.set(`currentPrice:${coin.coinGeckoId}`, currentPrice.toString());

          if (previousPriceStr) {
            const previousPrice = parseFloat(previousPriceStr);
            if (previousPrice > 0) {
              // Update previousPrice key in Redis so APIs can read it
              await redis.set(`previousPrice:${coin.coinGeckoId}`, previousPrice.toString());

              const percentageChange = ((currentPrice - previousPrice) / previousPrice) * 100;

              // Read global crash threshold from Redis
              const thresholdStr = await redis.get("settings:crash-threshold");
              const threshold = thresholdStr ? parseFloat(thresholdStr) : 2.0;

              // Monitor for flash crashes (drop <= -threshold)
              if (percentageChange <= -threshold) {
                const dedupKey = `alert:dedup:${coin.coinGeckoId}`;
                const isDeduped = await redis.get(dedupKey);

                if (!isDeduped) {
                  // Write Alert record to PostgreSQL
                  const alert = await prisma.alert.create({
                    data: {
                      coinId: coin.id,
                      priceAtCrash: currentPrice,
                      percentageDrop: percentageChange,
                    },
                  });

                  // Set alert:dedup:{coinId} in Redis with 5-minute TTL (300 seconds)
                  await redis.set(dedupKey, "1", "EX", 300);

                  logger.info(
                    {
                      eventType: "flash_crash",
                      coin: coin.symbol.toUpperCase(),
                      price: currentPrice,
                      percentageDrop: percentageChange,
                      alertId: alert.id,
                      timestamp: new Date().toISOString(),
                    },
                    `CRITICAL ALERT: ${coin.name} (${coin.symbol.toUpperCase()}) crashed by ${percentageChange.toFixed(
                      2
                    )}% to $${currentPrice}`
                  );
                }
              }
            }
          } else {
            // If there was no previous currentPrice, initialize previousPrice as the current price
            await redis.set(`previousPrice:${coin.coinGeckoId}`, currentPrice.toString());
          }

          // Step g: Prep for bulk insert
          priceSnapshotsData.push({
            coinId: coin.id,
            price: currentPrice,
          });
        }

        // Step h: Bulk insert PriceSnapshot records via createMany
        if (priceSnapshotsData.length > 0) {
          await prisma.priceSnapshot.createMany({
            data: priceSnapshotsData,
          });
        }

        // Batch populate active monitors list in Redis atomically
        if (activeIds.length > 0) {
          const pipeline = redis.pipeline();
          pipeline.del("active_monitors");
          pipeline.sadd("active_monitors", ...activeIds);
          await pipeline.exec();
        }

        const jobDuration = Date.now() - jobStart;
        logger.info(
          { eventType: "job_run_end", duration: jobDuration, coinCount: dbCoins.length, timestamp: new Date().toISOString() },
          `Background price monitoring job completed in ${jobDuration}ms.`
        );
      } catch (error) {
        logger.error(
          { eventType: "job_run_failed", error: (error as Error).message, timestamp: new Date().toISOString() },
          `Background price monitoring job failed: ${(error as Error).message}`
        );
      }
    },
    { connection: connection as unknown as ConnectionOptions }
  );

  worker.on("failed", (job, err) => {
    logger.error({ eventType: "job_failed", jobId: job?.id, error: err.message }, `Job failed in worker: ${err.message}`);
  });

  // Handle process shutdown cleanly
  process.on("SIGTERM", async () => {
    logger.info({ eventType: "worker_shutdown" }, "Shutting down background worker...");
    await worker.close();
    await connection.quit();
    process.exit(0);
  });
}

startWorker().catch((err) => {
  logger.error({ eventType: "worker_fatal_error", error: err.message }, `Fatal error starting background worker: ${err.message}`);
  process.exit(1);
});
