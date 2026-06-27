import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// GET /api/wishlist - Fetch user's wishlist coins with prices
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        coin: true,
      },
    });

    if (wishlistItems.length === 0) {
      return NextResponse.json([]);
    }

    const coins = wishlistItems.map((item) => item.coin);

    // Batch fetch prices from Redis
    const currentKeys = coins.map((c) => `currentPrice:${c.id}`);
    const previousKeys = coins.map((c) => `previousPrice:${c.id}`);

    const [currentPrices, previousPrices] = await Promise.all([
      redis.mget(currentKeys),
      redis.mget(previousKeys),
    ]);

    const result = coins.map((coin, index) => {
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

    // Sort alphabetically
    result.sort((a, b) => a.symbol.localeCompare(b.symbol));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch wishlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/wishlist - Add a coin to user's wishlist
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const { coinId } = await req.json();

    if (!coinId) {
      return NextResponse.json({ error: "Missing coinId" }, { status: 400 });
    }

    // Verify coin exists
    const coin = await prisma.coin.findUnique({
      where: { id: coinId },
    });

    if (!coin) {
      return NextResponse.json({ error: "Coin not found" }, { status: 404 });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlistItem.upsert({
      where: {
        userId_coinId: {
          userId,
          coinId,
        },
      },
      update: {},
      create: {
        userId,
        coinId,
      },
    });

    return NextResponse.json(wishlistItem, { status: 201 });
  } catch (error) {
    console.error("Failed to add to wishlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/wishlist - Remove a coin from user's wishlist
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const { searchParams } = new URL(req.url);
    const coinId = searchParams.get("coinId");

    if (!coinId) {
      return NextResponse.json({ error: "Missing coinId" }, { status: 400 });
    }

    await prisma.wishlistItem.delete({
      where: {
        userId_coinId: {
          userId,
          coinId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove from wishlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
