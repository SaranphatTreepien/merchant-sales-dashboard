import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { signToken, setAuthCookie, UserPayload } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // ─── Validate input ───────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอก email และ password' },
        { status: 400 }
      )
    }

    // ─── Find user ────────────────────────────────────────────────────────────
    const result = await query(
      `SELECT id, email, name, role, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email.toLowerCase().trim()]
    )

    const user = result.rows[0]

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'email หรือ password ไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // ─── Check password ───────────────────────────────────────────────────────
    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'email หรือ password ไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // ─── Sign JWT + set cookie ────────────────────────────────────────────────
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    const token = await signToken(payload)
    await setAuthCookie(token)

    return NextResponse.json({ user: payload })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    )
  }
}