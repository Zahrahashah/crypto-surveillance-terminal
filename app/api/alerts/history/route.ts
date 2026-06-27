import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "10")));
    const coinId = searchParams.get("coinId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.AlertWhereInput = {};
    if (coinId && coinId !== "all") {
      where.coinId = coinId;
    }
    if (from || to) {
      where.triggeredAt = {};
      if (from) {
        where.triggeredAt.gte = new Date(from);
      }
      if (to) {
        // Extend "to" date to end of the day if it's just a date string (YYYY-MM-DD)
        const toDate = new Date(to);
        if (to.length === 10) {
          toDate.setHours(23, 59, 59, 999);
        }
        where.triggeredAt.lte = toDate;
      }
    }

    const skip = (page - 1) * pageSize;

    const [alerts, totalCount] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: pageSize,
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
      }),
      prisma.alert.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      alerts,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Failed to fetch alerts history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
