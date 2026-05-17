import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { place_id, field_type, verified_by } = body
    if (!place_id || !field_type || !verified_by) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // upsert — ถ้ายืนยันซ้ำ field เดิม ให้ update เวลาใหม่
    const { rows } = await pool.query(`
      INSERT INTO contact_verifications (place_id, field_type, verified_by, verified_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (place_id, field_type)
      DO UPDATE SET verified_by = $3, verified_at = NOW()
      RETURNING *
    `, [place_id, field_type, verified_by])

    return NextResponse.json({ data: rows[0] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}