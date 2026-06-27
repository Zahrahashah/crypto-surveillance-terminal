import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const coinCount = await prisma.coin.count();
    const alertCount = await prisma.alert.count();
    const userCount = await prisma.user.count();
    const wishlistCount = await prisma.wishlistItem.count();

    const activeMonitors = await redis.smembers("active_monitors");
    const ping = await redis.ping();

    return NextResponse.json({
      success: true,
      database: {
        coinCount,
        alertCount,
        userCount,
        wishlistCount,
      },
      redis: {
        ping,
        activeMonitorsCount: activeMonitors.length,
        activeMonitors,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
}
