import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // With database sessions, the session token is stored in a cookie
  // (not a JWT). Check for the session cookie directly.
  const sessionToken =
    req.cookies.get("__Secure-authjs.session-token")?.value ??
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("next-auth.session-token")?.value;

  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", req.url);
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
