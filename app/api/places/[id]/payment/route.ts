import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const token = req.cookies.get("auth_token")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let body: {
    transfer_account?: string | null;
    transfer_name?: string | null;
    transfer_type?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO place_payment_info (place_id, transfer_account, transfer_name, transfer_type)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (place_id) DO UPDATE SET
     transfer_account = EXCLUDED.transfer_account,
     transfer_name    = EXCLUDED.transfer_name,
     transfer_type    = EXCLUDED.transfer_type`,
      [
        id,
        body.transfer_account ?? null,
        body.transfer_name ?? null,
        body.transfer_type ?? null,
      ],
    );

    await pool.query(
      `UPDATE places SET last_activity_at = NOW() WHERE place_id = $1`,
      [id],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
