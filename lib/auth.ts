import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserPayload = {
  id: string
  email: string
  name: string
  role: 'admin' | 'sale'
}

// ─── Config ───────────────────────────────────────────────────────────────────
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'changeme-set-in-env'
)
const COOKIE_NAME = 'auth_token'
const EXPIRES_IN = '7d'

// ─── Sign JWT ─────────────────────────────────────────────────────────────────
export async function signToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET)
}

// ─── Verify JWT ───────────────────────────────────────────────────────────────
export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}

// ─── Set Cookie ───────────────────────────────────────────────────────────────
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 วัน (วินาที)
    path: '/',
  })
}

// ─── Clear Cookie ─────────────────────────────────────────────────────────────
export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ─── Get Current User (ใช้ใน Server Component / API Route) ───────────────────
export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// ─── Get Token String (ใช้ใน middleware) ─────────────────────────────────────
export function getTokenFromCookieHeader(cookieHeader: string): string | null {
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match?.[1] ?? null
}