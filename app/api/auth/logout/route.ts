import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import { isRateLimited } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST() {
  const reqHeaders = headers();
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const timestamp = new Date().toISOString();

  // Rate Limiting (5 requests per minute per IP)
  if (await isRateLimited(ip, "logout")) {
    logger.warn(
      { eventType: "rate_limit_exceeded", ip, timestamp, route: "/api/auth/logout" },
      `Rate limit exceeded for IP ${ip} on logout endpoint`
    );
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute." },
      { status: 429 }
    );
  }

  const cookieStore = cookies();
  const currentRefreshToken = cookieStore.get("refreshToken")?.value;

  try {
    if (currentRefreshToken) {
      // Find the user with this refresh token
      const user = await prisma.user.findUnique({
        where: { refreshToken: currentRefreshToken },
      });

      if (user) {
        // Invalidate in PostgreSQL
        await prisma.user.update({
          where: { id: user.id },
          data: {
            refreshToken: null,
            refreshTokenExpiry: null,
          },
        });

        logger.info(
          { eventType: "logout", ip, timestamp, email: user.email, userId: user.id },
          `User ${user.email} logged out successfully`
        );
      }
    }
  } catch (error) {
    logger.error({ error, ip, timestamp }, "Error occurred during logout database update");
  } finally {
    // Always clear cookies locally
    cookieStore.delete("refreshToken");

    const isProd = process.env.NODE_ENV === "production";
    const sessionTokenCookieName = isProd
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    cookieStore.delete(sessionTokenCookieName);
  }

  return NextResponse.json({ success: true });
}
