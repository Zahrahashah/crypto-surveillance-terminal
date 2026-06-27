import { logger } from "./logger";
import { redis } from "./redis";

export class CoinGeckoRateLimitError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.name = "CoinGeckoRateLimitError";
    this.status = 429;
  }
}

export class CoinGeckoServerError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CoinGeckoServerError";
    this.status = status;
  }
}

export class CoinGeckoError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CoinGeckoError";
    this.status = status;
  }
}

interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
}

/**
 * Fetch top 250 coins by market cap from CoinGecko.
 * Returns a map of coinGeckoId -> price.
 */
export async function fetchTop250Prices(): Promise<Record<string, number>> {
  const apiKey = process.env.COINGECKO_API_KEY;
  const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1";
  
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const start = Date.now();
  try {
    const res = await fetch(url, { headers });
    const duration = Date.now() - start;

    if (!res.ok) {
      logger.error(
        { eventType: "coingecko_error", status: res.status, url, duration },
        `CoinGecko API call failed with status ${res.status}`
      );
      if (res.status === 429) {
        throw new CoinGeckoRateLimitError("CoinGecko API rate limit reached (429)");
      } else if (res.status >= 500) {
        throw new CoinGeckoServerError(`CoinGecko server error (${res.status})`, res.status);
      } else {
        throw new CoinGeckoError(`CoinGecko request failed with status ${res.status}`, res.status);
      }
    }

    const data = (await res.json()) as MarketCoin[];
    
    logger.info(
      { eventType: "coingecko_api_call", duration, coinCount: data.length, url },
      `Fetched ${data.length} prices from CoinGecko markets API in ${duration}ms`
    );

    const priceMap: Record<string, number> = {};
    const rankMap: Record<string, string> = {};
    
    data.forEach((coin, index) => {
      if (coin.id && typeof coin.current_price === "number") {
        priceMap[coin.id] = coin.current_price;
        rankMap[coin.id] = (index + 1).toString();
      }
    });

    if (Object.keys(rankMap).length > 0) {
      redis.hset("market:ranks", rankMap).catch((err) => {
        logger.error(
          { eventType: "redis_ranks_error", error: err.message },
          "Failed to write ranks to Redis"
        );
      });
    }

    return priceMap;
  } catch (error) {
    if (
      error instanceof CoinGeckoRateLimitError ||
      error instanceof CoinGeckoServerError ||
      error instanceof CoinGeckoError
    ) {
      throw error;
    }
    const duration = Date.now() - start;
    logger.error(
      { eventType: "coingecko_network_error", error: (error as Error).message, url, duration },
      `Network error fetching from CoinGecko: ${(error as Error).message}`
    );
    throw new CoinGeckoServerError(`Network error: ${(error as Error).message}`, 500);
  }
}

/**
 * Fetch prices for a list of coinGeckoIds in batches of 100.
 * Returns a map of coinGeckoId -> price.
 */
export async function fetchCustomPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};

  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const batchSize = 100;
  const priceMap: Record<string, number> = {};

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const idsString = batch.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(idsString)}&vs_currencies=usd`;

    const start = Date.now();
    try {
      const res = await fetch(url, { headers });
      const duration = Date.now() - start;

      if (!res.ok) {
        logger.error(
          { eventType: "coingecko_error", status: res.status, url, duration },
          `CoinGecko API call failed with status ${res.status}`
        );
        if (res.status === 429) {
          throw new CoinGeckoRateLimitError("CoinGecko API rate limit reached (429)");
        } else if (res.status >= 500) {
          throw new CoinGeckoServerError(`CoinGecko server error (${res.status})`, res.status);
        } else {
          throw new CoinGeckoError(`CoinGecko request failed with status ${res.status}`, res.status);
        }
      }

      const data = (await res.json()) as Record<string, { usd: number }>;
      
      logger.info(
        { eventType: "coingecko_api_call", duration, coinCount: Object.keys(data).length, url },
        `Fetched simple prices for ${Object.keys(data).length} coins in ${duration}ms`
      );

      for (const [coinId, val] of Object.entries(data)) {
        if (val && typeof val.usd === "number") {
          priceMap[coinId] = val.usd;
        }
      }
    } catch (error) {
      if (
        error instanceof CoinGeckoRateLimitError ||
        error instanceof CoinGeckoServerError ||
        error instanceof CoinGeckoError
      ) {
        throw error;
      }
      const duration = Date.now() - start;
      logger.error(
        { eventType: "coingecko_network_error", error: (error as Error).message, url, duration },
        `Network error fetching custom prices from CoinGecko: ${(error as Error).message}`
      );
      throw new CoinGeckoServerError(`Network error: ${(error as Error).message}`, 500);
    }
  }

  return priceMap;
}
