import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { number, label } = await req.json();

  if (!number?.trim()) {
    return NextResponse.json(
      { error: "กรุณาระบุเบอร์โทรศัพท์" },
      { status: 400 },
    );
  }

  // normalize เบอร์ — ตัด space/dash เหลือแต่ตัวเลข
  const normalized = number.replace(/\D/g, "");
  if (normalized.length < 9) {
    return NextResponse.json(
      { error: "เบอร์ต้องมีอย่างน้อย 9 หลัก" },
      { status: 400 },
    );
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO place_phones 
        (place_id, number, normalized, label, category, confidence, is_primary, is_manual, added_by, source)
       VALUES ($1, $2, $3, $4, 'business', 5, false, true, 'dashboard', 'manual')
       RETURNING id, number, normalized, label, is_primary, is_manual`,
      [id, number.trim(), normalized, label?.trim() || null],
    );
    return NextResponse.json({ phone: rows[0] });
  } catch (err: any) {
    // unique constraint — เบอร์ซ้ำ
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "เบอร์นี้มีอยู่แล้วในร้านนี้" },
        { status: 409 },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
