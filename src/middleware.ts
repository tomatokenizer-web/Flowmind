import { auth } from "@/lib/auth";

const publicRoutes = new Set(["/", "/sign-in"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes and auth API
  if (publicRoutes.has(pathname) || pathname.startsWith("/api/auth")) {
    return;
  }

  // Redirect unauthenticated users to sign-in
  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
