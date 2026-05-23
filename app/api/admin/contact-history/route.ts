// app/api/admin/contact-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const dateFrom = searchParams.get("dateFrom")?.trim() || "";
  const dateTo = searchParams.get("dateTo")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const params: unknown[] = [
    search,
    `%${search.toLowerCase()}%`,
    dateFrom || null,
    dateTo || null,
  ];

  // shared WHERE fragment — ใช้ซ้ำทั้ง 2 query
  const whereClause = `
    ($1 = '' OR ch.place_id = $1 OR LOWER(p.name) LIKE $2)
    AND ($3::timestamptz IS NULL OR ch.changed_at >= $3::timestamptz)
    AND ($4::date IS NULL OR ch.changed_at < ($4::date + interval '1 day')::timestamptz)
  `;

  try {
    // ยิง 2 query พร้อมกัน — data + count แยกกัน
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `
        SELECT DISTINCT ON (ch.place_id)
          ch.place_id,
          ch.table_name,
          ch.action,
          ch.old_value,
          ch.new_value,
          ch.changed_by,
          ch.changed_at,
          p.name  AS place_name,
          p.city
        FROM contact_history ch
        JOIN places p ON p.place_id = ch.place_id
        WHERE ${whereClause}
        ORDER BY ch.place_id, ch.changed_at DESC
        LIMIT $5 OFFSET $6
        `,
        [...params, limit, offset],
      ),
      pool.query(
        `
        SELECT COUNT(DISTINCT ch.place_id) AS total
        FROM contact_history ch
        JOIN places p ON p.place_id = ch.place_id
        WHERE ${whereClause}
        `,
        params,
      ),
    ]);

    // sort ผลลัพธ์ตาม changed_at DESC หลัง DISTINCT ON
    const sorted = [...dataResult.rows].sort(
      (a, b) =>
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    );

    return NextResponse.json({
      data: sorted,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0]?.total || "0"),
      },
    });
  } catch (err) {
    console.error("[contact-history] DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}