import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS requested_by_name, p.name AS place_name
       FROM contact_edit_requests r
       JOIN users u ON u.id = r.requested_by
       JOIN places p ON p.place_id = r.place_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC`,
      [status],
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────────────────
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { place_id, field_type, old_value, new_value, reason } = body

    // ลบ requested_by ออกจาก body แล้ว — ใช้จาก cookie แทน
    if (!place_id || !field_type || new_value === undefined || new_value === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { rows } = await pool.query(
      `INSERT INTO contact_edit_requests
         (place_id, field_type, old_value, new_value, reason, requested_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [place_id, field_type, old_value, new_value, reason || '', user.id],
    )

    return NextResponse.json({ data: rows[0] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}