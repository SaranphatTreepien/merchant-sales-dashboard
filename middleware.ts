import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookieHeader } from "@/lib/auth";

// ─── Routes ที่ไม่ต้อง login ──────────────────────────────────────────────────
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// ─── Routes ที่ต้องเป็น admin เท่านั้น ───────────────────────────────────────
const ADMIN_PATHS = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ผ่านได้เลย — static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth/login")
  ) {
    return NextResponse.next();
  }

  // ─── อ่าน token ───────────────────────────────────────────────────────────
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = getTokenFromCookieHeader(cookieHeader);
  const user = token ? await verifyToken(token) : null;

  // ถ้ายังไม่ login และเข้าหน้าที่ต้อง login → redirect /login
  if (!user && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ถ้า login แล้ว พยายามเข้า /login → redirect /dashboard
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin-only routes
  if (
    ADMIN_PATHS.some((p) => pathname.startsWith(p)) &&
    user?.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * match ทุก path ยกเว้น:
     * - _next/static
     * - _next/image
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
