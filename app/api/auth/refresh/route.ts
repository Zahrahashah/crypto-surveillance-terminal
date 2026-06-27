import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { isRateLimited } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { encode } from "next-auth/jwt";

export async function POST() {
  const reqHeaders = headers();
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const timestamp = new Date().toISOString();

  // Rate Limiting (5 requests per minute per IP)
  if (await isRateLimited(ip, "refresh")) {
    logger.warn(
      { eventType: "rate_limit_exceeded", ip, timestamp, route: "/api/auth/refresh" },
      `Rate limit exceeded for IP ${ip} on token refresh endpoint`
    );
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const cookieStore = cookies();
  const currentRefreshToken = cookieStore.get("refreshToken")?.value;

  if (!currentRefreshToken) {
    logger.warn(
      { eventType: "refresh_failed", ip, timestamp, reason: "missing_refresh_token" },
      "Refresh failed: no refresh token in cookies"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Validate refresh token in database
    const user = await prisma.user.findUnique({
      where: { refreshToken: currentRefreshToken },
    });

    if (!user || !user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
      logger.warn(
        {
          eventType: "refresh_failed",
          ip,
          timestamp,
          email: user?.email,
          reason: !user ? "token_not_found" : "token_expired",
        },
        "Refresh failed: refresh token invalid or expired"
      );
      
      // Clear cookie if expired or invalid
      cookieStore.delete("refreshToken");
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Generate new rotated refresh token
    const newRefreshToken = crypto.randomBytes(40).toString("hex");
    const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExpiry: newRefreshTokenExpiry,
      },
    });

    // Set rotated refresh token cookie
    cookieStore.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // Issue a new NextAuth session token (15 minutes expiry)
    const isProd = process.env.NODE_ENV === "production";
    const sessionTokenCookieName = isProd
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const newSessionToken = await encode({
      token: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 15 * 60, // 15 minutes
    });

    // Set NextAuth session cookie
    cookieStore.set(sessionTokenCookieName, newSessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    logger.info(
      { eventType: "refresh_success", ip, timestamp, email: user.email, userId: user.id },
      `Token rotated successfully for user ${user.email}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, ip, timestamp }, "Error occurred during token refresh");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
