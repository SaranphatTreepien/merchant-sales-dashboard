import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromCookieHeader } from '@/lib/auth'

// ─── Routes ที่ไม่ต้อง login ──────────────────────────────────────────────────
const PUBLIC_PATHS = ['/login', '/api/auth/login']

// ─── Routes ที่ต้องเป็น admin เท่านั้น ───────────────────────────────────────
const ADMIN_PATHS = ['/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ผ่านได้เลย — public routes + static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // ─── อ่าน token จาก cookie ───────────────────────────────────────────────
  const cookieHeader = req.headers.get('cookie') ?? ''
  const token = getTokenFromCookieHeader(cookieHeader)

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const user = await verifyToken(token)

  if (!user) {
    // token หมดอายุหรือ invalid → redirect login
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ─── Admin-only routes ────────────────────────────────────────────────────
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && user.role !== 'admin') {
    // sale พยายามเข้า /admin → redirect dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // ─── ถ้า login แล้วพยายามเข้า /login → redirect dashboard ────────────────
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * match ทุก path ยกเว้น:
     * - _next/static
     * - _next/image
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}