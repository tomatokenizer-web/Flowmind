import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = new Set(["/", "/sign-in"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and auth API
  if (publicRoutes.has(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow dev routes
  if (pathname.startsWith("/dev")) {
    return NextResponse.next();
  }

  // Check session token (works on Edge runtime)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL("/sign-in", req.url);
    // After sign-in, always go to /dashboard (not wherever they were trying to go)
    signInUrl.searchParams.set("callbackUrl", "/dashboard");
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
