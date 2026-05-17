import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// PATCH /api/admin/users/[id]  body: { name?, role?, new_password? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, role, new_password } = await req.json()
    const { id } = params

    if (role && !['admin', 'sale'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (new_password) {
      if (new_password.length < 6) {
        return NextResponse.json({ error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 })
      }
      const hash = await bcrypt.hash(new_password, 10)
      await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, id])
    }

    if (name || role) {
      await query(
        `UPDATE users SET
          name = COALESCE($1, name),
          role = COALESCE($2, role)
         WHERE id = $3`,
        [name?.trim() || null, role || null, id]
      )
    }

    const { rows } = await query(
      `SELECT id, email, name, role, created_at FROM users WHERE id = $1`,
      [id]
    )
    return NextResponse.json({ data: rows[0] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ป้องกันลบตัวเอง
    if (params.id === user.id) {
      return NextResponse.json({ error: 'ไม่สามารถลบตัวเองได้' }, { status: 400 })
    }

    await query(`DELETE FROM users WHERE id = $1`, [params.id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}