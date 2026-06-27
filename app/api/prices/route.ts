import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { PriceData } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all active coin IDs from Redis Set
    const coinIds = await redis.smembers("active_monitors");
    
    if (coinIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch corresponding Coin records from PostgreSQL
    const dbCoins = await prisma.coin.findMany({
      where: { id: { in: coinIds } },
    });

    if (dbCoins.length === 0) {
      return NextResponse.json([]);
    }

    // Batch get current and previous prices from Redis
    const currentKeys = dbCoins.map((c) => `currentPrice:${c.id}`);
    const previousKeys = dbCoins.map((c) => `previousPrice:${c.id}`);

    const [currentPrices, previousPrices] = await Promise.all([
      redis.mget(currentKeys),
      redis.mget(previousKeys),
    ]);

    const result: PriceData[] = dbCoins.map((coin, index) => {
      const priceStr = currentPrices[index];
      const prevPriceStr = previousPrices[index];

      const price = priceStr ? parseFloat(priceStr) : 0;
      const previousPrice = prevPriceStr ? parseFloat(prevPriceStr) : null;
      
      let percentageChange: number | null = null;
      if (previousPrice && previousPrice > 0) {
        percentageChange = ((price - previousPrice) / previousPrice) * 100;
      }

      return {
        id: coin.id,
        coinGeckoId: coin.coinGeckoId,
        symbol: coin.symbol,
        name: coin.name,
        price,
        previousPrice,
        percentageChange,
      };
    });

    // Fetch ranks from Redis to sort by market cap rank
    const geckoIds = result.map((c) => c.coinGeckoId);
    let ranks: (string | null)[] = [];
    if (geckoIds.length > 0) {
      ranks = await redis.hmget("market:ranks", ...geckoIds);
    }

    const mappedResult = result.map((coin, index) => {
      const rankStr = ranks[index];
      const rank = rankStr ? parseInt(rankStr, 10) : 999999;
      return { ...coin, rank };
    });

    mappedResult.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.symbol.localeCompare(b.symbol);
    });

    const sortedResult = mappedResult.map((c) => ({
      id: c.id,
      coinGeckoId: c.coinGeckoId,
      symbol: c.symbol,
      name: c.name,
      price: c.price,
      previousPrice: c.previousPrice,
      percentageChange: c.percentageChange,
    }));

    return NextResponse.json(sortedResult);
  } catch (error) {
    console.error("Failed to fetch active prices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
