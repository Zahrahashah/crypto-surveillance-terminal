import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      take: 20,
      orderBy: { triggeredAt: "desc" },
      include: {
        coin: {
          select: {
            id: true,
            coinGeckoId: true,
            symbol: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Failed to fetch latest alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
