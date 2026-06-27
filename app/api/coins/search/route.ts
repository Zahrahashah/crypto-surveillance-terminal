import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { fetchCustomPrices } from "@/lib/coingecko";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json([]);
    }

    // Search local database
    const coins = await prisma.coin.findMany({
      where: {
        OR: [
          { symbol: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
    });

    const results = [];

    for (const coin of coins) {
      const currentPriceStr = await redis.get(`currentPrice:${coin.id}`);
      
      let price = currentPriceStr ? parseFloat(currentPriceStr) : null;
      let previousPrice = null;
      let percentageChange = null;

      if (price === null) {
        // Fetch price on-demand from CoinGecko API since it is not currently tracked
        try {
          const pricesMap = await fetchCustomPrices([coin.coinGeckoId]);
          const currentPrice = pricesMap[coin.coinGeckoId];

          if (typeof currentPrice === "number") {
            price = currentPrice;
            previousPrice = currentPrice; // Set previous to current for the first fetch
            percentageChange = 0.0;

            // Populate Redis immediately so it is available in general GET /api/prices
            await redis.set(`currentPrice:${coin.id}`, currentPrice.toString());
            await redis.set(`previousPrice:${coin.id}`, currentPrice.toString());

            // Write initial snapshot to PostgreSQL
            await prisma.priceSnapshot.create({
              data: {
                coinId: coin.id,
                price: currentPrice,
              },
            });

            logger.info(
              { eventType: "on_demand_price_fetch", coin: coin.symbol.toUpperCase(), price: currentPrice },
              `Fetched on-demand price for searched coin: ${coin.name} ($${currentPrice})`
            );
          }
        } catch (err) {
          logger.error(
            { eventType: "on_demand_price_failed", coin: coin.symbol.toUpperCase(), error: (err as Error).message },
            `Failed to fetch on-demand price for searched coin ${coin.name}`
          );
        }
      } else {
        const previousPriceStr = await redis.get(`previousPrice:${coin.id}`);
        previousPrice = previousPriceStr ? parseFloat(previousPriceStr) : null;
        if (previousPrice && previousPrice > 0) {
          percentageChange = ((price - previousPrice) / previousPrice) * 100;
        }
      }

      results.push({
        id: coin.id,
        coinGeckoId: coin.coinGeckoId,
        symbol: coin.symbol,
        name: coin.name,
        price,
        previousPrice,
        percentageChange,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to search coins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
