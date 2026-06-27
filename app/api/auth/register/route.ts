import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { cookies, headers } from "next/headers";
import { isRateLimited } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  const reqHeaders = headers();
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const timestamp = new Date().toISOString();

  // Sliding window rate limit (5 requests per minute per IP)
  if (await isRateLimited(ip, "register")) {
    logger.warn(
      { eventType: "rate_limit_exceeded", ip, timestamp, route: "/api/auth/register" },
      `Rate limit exceeded for IP ${ip} on registration endpoint`
    );
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn(
        { eventType: "register_failed", ip, timestamp, email, reason: "email_already_exists" },
        `Registration failed: Email ${email} is already in use`
      );
      return NextResponse.json(
        { error: "Email is already registered." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Create a new refresh token
    const refreshToken = crypto.randomBytes(40).toString("hex");
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        refreshToken,
        refreshTokenExpiry,
      },
    });

    // Set HTTP-only secure refresh token cookie
    cookies().set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    logger.info(
      { eventType: "register_success", ip, timestamp, email: newUser.email, userId: newUser.id },
      `User ${newUser.email} registered successfully`
    );

    return NextResponse.json(
      { id: newUser.id, email: newUser.email },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error, ip, timestamp }, "Error occurred during registration");
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
