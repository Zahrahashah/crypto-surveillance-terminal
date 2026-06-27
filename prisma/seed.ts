import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching coin list from CoinGecko...");
  
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }
  
  // Try fetching. If it fails, we will log a descriptive warning.
  let response;
  try {
    response = await fetch("https://api.coingecko.com/api/v3/coins/list", { headers });
  } catch (err) {
    console.error("Error making HTTP request to CoinGecko:", err);
    throw err;
  }

  if (!response.ok) {
    console.error(`HTTP Error from CoinGecko: ${response.status} ${response.statusText}`);
    const body = await response.text().catch(() => "");
    console.error("Response body:", body);
    throw new Error(`Failed to fetch coin list: ${response.status}`);
  }
  
  const coins = (await response.json()) as Array<{ id: string; symbol: string; name: string }>;
  console.log(`Fetched ${coins.length} coins from CoinGecko. Cleaning data...`);
  
  const cleanCoins = coins
    .filter((c) => c && c.id && c.symbol && c.name)
    .map((c) => ({
      coinGeckoId: c.id,
      symbol: c.symbol.toLowerCase(),
      name: c.name,
    }));
    
  console.log(`Cleaned data: ${cleanCoins.length} valid coins. Beginning database insert...`);
  
  // Chunk insert to respect PostgreSQL parameter limits
  const chunkSize = 2000;
  let insertedCount = 0;
  
  for (let i = 0; i < cleanCoins.length; i += chunkSize) {
    const chunk = cleanCoins.slice(i, i + chunkSize);
    const result = await prisma.coin.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    insertedCount += result.count;
    console.log(`Inserted batch ${Math.floor(i / chunkSize) + 1}: ${result.count} coins`);
  }
  
  console.log(`Seeding complete. Successfully inserted ${insertedCount} coins into the database.`);
}

main()
  .catch((e) => {
    console.error("Database seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
