import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Only protect /dashboard/wishlist and /dashboard/profile
  const isProtected =
    path.startsWith("/dashboard/wishlist") || path.startsWith("/dashboard/profile");

  if (isProtected) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Specify exact matchers for performance and accuracy
  matcher: [
    "/dashboard/wishlist/:path*",
    "/dashboard/profile/:path*",
  ],
};
