import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { getCurrentUser, signToken, setAuthCookie } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, current_password, new_password } = await req.json()

    // ─── แก้ password ──────────────────────────────────────────────────────────
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'กรุณากรอก password ปัจจุบัน' }, { status: 400 })
      }

      const result = await query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [user.id]
      )
      const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash)
      if (!isValid) {
        return NextResponse.json({ error: 'password ปัจจุบันไม่ถูกต้อง' }, { status: 400 })
      }

      const hash = await bcrypt.hash(new_password, 10)
      await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, user.id])
    }

    // ─── แก้ชื่อ ───────────────────────────────────────────────────────────────
    const newName = name?.trim() || user.name
    await query(`UPDATE users SET name = $1 WHERE id = $2`, [newName, user.id])

    // ─── sign JWT ใหม่ (ชื่ออาจเปลี่ยน) ──────────────────────────────────────
    const updated = { ...user, name: newName }
    const token = await signToken(updated)
    await setAuthCookie(token)

    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('[PATCH /api/auth/profile]', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}