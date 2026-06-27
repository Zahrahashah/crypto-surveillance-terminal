import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redis } from "@/lib/redis";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thresholdStr = await redis.get("settings:crash-threshold");
    const pollIntervalStr = await redis.get("settings:poll-interval");

    return NextResponse.json({
      crashThreshold: thresholdStr ? parseFloat(thresholdStr) : 2.0,
      pollInterval: pollIntervalStr ? parseInt(pollIntervalStr) : 10,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { crashThreshold, pollInterval } = await req.json();

    if (crashThreshold !== undefined) {
      await redis.set("settings:crash-threshold", crashThreshold.toString());
    }
    if (pollInterval !== undefined) {
      await redis.set("settings:poll-interval", pollInterval.toString());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
