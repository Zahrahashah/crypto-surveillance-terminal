import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  sparkline_in_7d?: {
    price: number[];
  };
}

const CACHE_KEY = "cache:market-data";
const CACHE_TTL = 60; // 60 seconds

export async function GET() {
  try {
    // 1. Try to read from cache
    const cachedData = await redis.get(CACHE_KEY);
    if (cachedData) {
      logger.info({ eventType: "market_cache_hit" }, "Serving market data from Redis cache.");
      return NextResponse.json(JSON.parse(cachedData));
    }

    // 2. Fetch from CoinGecko
    logger.info({ eventType: "market_cache_miss" }, "Fetching fresh market data from CoinGecko.");
    const apiKey = process.env.COINGECKO_API_KEY;
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true";

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (apiKey) {
      headers["x-cg-demo-api-key"] = apiKey;
    }

    const start = Date.now();
    const res = await fetch(url, { headers });
    const duration = Date.now() - start;

    if (!res.ok) {
      logger.error(
        { eventType: "coingecko_market_error", status: res.status, url, duration },
        `CoinGecko Market API failed with status ${res.status}`
      );
      return NextResponse.json(
        { error: `CoinGecko API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = (await res.json()) as CoinGeckoMarketCoin[];

    // 3. Enrich with database UUIDs
    let enrichedData: (CoinGeckoMarketCoin & { dbId: string | null })[] = [];
    try {
      const geckoIds = data.map((c) => c.id);
      const dbCoins = await prisma.coin.findMany({
        where: { coinGeckoId: { in: geckoIds } },
        select: { id: true, coinGeckoId: true },
      });

      const dbIdMap = new Map<string, string>();
      for (const c of dbCoins) {
        dbIdMap.set(c.coinGeckoId, c.id);
      }

      enrichedData = data.map((c) => ({
        ...c,
        dbId: dbIdMap.get(c.id) || null,
      }));
    } catch (err) {
      logger.error(
        { eventType: "market_enrich_failed", error: (err as Error).message },
        "Failed to enrich CoinGecko data with database IDs"
      );
      enrichedData = data.map((c) => ({
        ...c,
        dbId: null,
      }));
    }

    // 4. Cache the successful result in Redis
    await redis.set(CACHE_KEY, JSON.stringify(enrichedData), "EX", CACHE_TTL);

    logger.info(
      { eventType: "market_data_fetched", duration, coinCount: data.length },
      `Fetched and cached ${data.length} coins in Redis.`
    );

    return NextResponse.json(enrichedData);
  } catch (error) {
    logger.error(
      { eventType: "market_api_failed", error: (error as Error).message },
      `Market API failed: ${(error as Error).message}`
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
