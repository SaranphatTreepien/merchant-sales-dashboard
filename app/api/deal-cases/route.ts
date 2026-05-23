import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const VALID_STATUSES = ["pending", "success", "stop"];

// GET /api/deal-cases?place_id=xxx
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const place_id = req.nextUrl.searchParams.get("place_id");
  if (!place_id)
    return NextResponse.json({ error: "place_id required" }, { status: 400 });

  const result = await query(
    `SELECT 
      dc.*,
      u.name AS sale_name,
      u.email AS sale_email
     FROM deal_cases dc
     JOIN users u ON u.id::text = dc.sale_id::text
     WHERE dc.place_id = $1
     ORDER BY dc.created_at DESC`,
    [place_id]
  );
  return NextResponse.json({ data: result.rows });
}

// POST /api/deal-cases
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { place_id, reference_code, status, note } = body;

  // Validation
  if (!place_id)
    return NextResponse.json({ error: "place_id required" }, { status: 400 });

  if (!VALID_STATUSES.includes(status))
    return NextResponse.json(
      { error: "status ต้องเป็น pending, success หรือ stop" },
      { status: 400 }
    );

  if (status === "success" && (!reference_code || reference_code.trim().length < 1))
    return NextResponse.json(
      { error: "reference_code required สำหรับสถานะสำเร็จ" },
      { status: 400 }
    );

  if (reference_code && reference_code.trim().length > 30)
    return NextResponse.json(
      { error: "reference_code ต้องไม่เกิน 30 ตัวอักษร" },
      { status: 400 }
    );

  // เช็คว่ามีเคสของร้านนี้อยู่แล้วไหม
  const existing = await query(
    `SELECT id FROM deal_cases WHERE place_id = $1`,
    [place_id]
  );
  if (existing.rows.length > 0)
    return NextResponse.json(
      { error: "ร้านนี้มีเคสอยู่แล้ว ใช้การแก้ไขแทน" },
      { status: 409 }
    );

  const result = await query(
    `INSERT INTO deal_cases (place_id, sale_id, reference_code, status, note)
     VALUES ($1, $2::uuid, $3, $4, $5)
     RETURNING *`,
    [
      place_id,
      user.id,
      reference_code?.trim() || null,
      status,
      note?.trim() || null,
    ]
  );
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}