import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    // ─── Auth ─────────────────────────────────────────────────────────────────
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { note } = body  // ← เอา user_id ออกจาก body แล้ว

    if (!note) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // get old note
    const { rows: old } = await pool.query(
      `SELECT note, user_id FROM place_notes WHERE id = $1`,
      [id],
    )
    if (!old[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // permission: admin แก้ได้ทุกอัน, sale แก้ได้เฉพาะของตัวเอง
    if (user.role !== 'admin' && old[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // update note
    const { rows } = await pool.query(
      `UPDATE place_notes
       SET note = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [note, id],
    )

    // log the change
    await pool.query(
      `INSERT INTO place_note_logs (note_id, user_id, old_note, new_note)
       VALUES ($1, $2, $3, $4)`,
      [id, user.id, old[0].note, note],
    )

    return NextResponse.json({ data: rows[0] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    // ─── Auth ─────────────────────────────────────────────────────────────────
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // เช็คว่า note มีอยู่
    const { rows } = await pool.query(
      `SELECT user_id FROM place_notes WHERE id = $1`,
      [id],
    )
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // permission: admin ลบได้ทุกอัน, sale ลบได้เฉพาะของตัวเอง
    if (user.role !== 'admin' && rows[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await pool.query(`DELETE FROM place_notes WHERE id = $1`, [id])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}