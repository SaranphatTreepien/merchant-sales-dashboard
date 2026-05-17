import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/admin/users
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { rows } = await query(
      `SELECT id, email, name, role, created_at
       FROM users
       ORDER BY created_at DESC`,
      []
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

// POST /api/admin/users  body: { name, email, role, password }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, email, role, password } = await req.json()

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!['admin', 'sale'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 })
    }

    // check email ซ้ำ
    const exist = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()])
    if (exist.rows.length > 0) {
      return NextResponse.json({ error: 'Email นี้มีอยู่แล้ว' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 10)
    const { rows } = await query(
      `INSERT INTO users (name, email, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), role, hash]
    )
    return NextResponse.json({ data: rows[0] }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}