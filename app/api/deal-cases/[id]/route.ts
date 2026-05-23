import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const VALID_STATUSES = ["pending", "success", "stop"];

// PATCH /api/deal-cases/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { reference_code, status, note } = body;

  // Validation เบื้องต้น
  if (status !== undefined && !VALID_STATUSES.includes(status))
    return NextResponse.json(
      { error: "status ต้องเป็น pending, success หรือ stop" },
      { status: 400 },
    );

  if (reference_code !== undefined && reference_code.trim().length > 30)
    return NextResponse.json(
      { error: "reference_code ต้องไม่เกิน 30 ตัวอักษร" },
      { status: 400 },
    );

  // ดึง existing ก่อน
  const existing = await query(`SELECT * FROM deal_cases WHERE id = $1`, [id]);
  if (existing.rows.length === 0)
    return NextResponse.json({ error: "ไม่พบเคสนี้" }, { status: 404 });

  const deal = existing.rows[0];

  if (user.role !== "admin" && deal.sale_id !== user.id)
    return NextResponse.json(
      { error: "ไม่มีสิทธิ์แก้ไขเคสนี้" },
      { status: 403 },
    );

  // ✅ คำนวณ final value รวม body + existing
  const finalStatus = status ?? deal.status;
  const finalRefCode =
    reference_code !== undefined ? reference_code.trim() : deal.reference_code;

  if (finalStatus === "success" && !finalRefCode)
    return NextResponse.json(
      { error: "reference_code required สำหรับสถานะสำเร็จ" },
      { status: 400 },
    );

  const result = await query(
    `UPDATE deal_cases SET
      reference_code = COALESCE($1, reference_code),
      status         = COALESCE($2::deal_status, status),
      note           = COALESCE($3, note),
      updated_at     = NOW()
     WHERE id = $4
     RETURNING *`,
    [reference_code?.trim() ?? null, status ?? null, note?.trim() ?? null, id],
  );
  return NextResponse.json({ data: result.rows[0] });
}

// DELETE /api/deal-cases/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await query(`SELECT * FROM deal_cases WHERE id = $1`, [id]);
  if (existing.rows.length === 0)
    return NextResponse.json({ error: "ไม่พบเคสนี้" }, { status: 404 });

  if (user.role !== "admin" && existing.rows[0].sale_id !== user.id)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบเคสนี้" }, { status: 403 });

  await query(`DELETE FROM deal_cases WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}
