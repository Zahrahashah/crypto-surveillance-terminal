import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { logger } from "./logger";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const reqHeaders = headers();
        const forwardedFor = reqHeaders.get("x-forwarded-for");
        const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
        const timestamp = new Date().toISOString();

        if (!credentials?.email || !credentials?.password) {
          logger.warn(
            { eventType: "login_failed", ip, timestamp, reason: "missing_credentials" },
            "Failed login attempt: missing email or password"
          );
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          logger.warn(
            { eventType: "login_failed", ip, timestamp, email: credentials.email, reason: "user_not_found" },
            `Failed login attempt: user with email ${credentials.email} not found`
          );
          return null;
        }

        // Empty check - Google OAuth users might not have a password
        if (!user.passwordHash) {
          logger.warn(
            { eventType: "login_failed", ip, timestamp, email: credentials.email, reason: "oauth_user_no_password" },
            `Failed login attempt: user registered via Google tried to login with password`
          );
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          logger.warn(
            { eventType: "login_failed", ip, timestamp, email: credentials.email, reason: "invalid_password" },
            `Failed login attempt: incorrect password for email ${credentials.email}`
          );
          return null;
        }

        // Generate and rotate refresh token
        const refreshToken = crypto.randomBytes(40).toString("hex");
        const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

        await prisma.user.update({
          where: { id: user.id },
          data: {
            refreshToken,
            refreshTokenExpiry,
          },
        });

        // Set secure HTTP-only cookie
        cookies().set("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        });

        logger.info(
          { eventType: "login_success", ip, timestamp, email: user.email, userId: user.id },
          `User ${user.email} logged in successfully`
        );

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Auto-create or fetch user in Postgres
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              passwordHash: "", // Empty password for OAuth signups
            },
          });
        }
        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.user = {
          id: user.id,
          email: user.email,
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = token.user as { id: string; email: string };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
