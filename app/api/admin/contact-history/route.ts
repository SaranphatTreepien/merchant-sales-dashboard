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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    const { rows } = await pool.query(
      `
      WITH latest AS (
        SELECT DISTINCT ON (ch.place_id)
          ch.place_id,
          ch.table_name,
          ch.action,
          ch.old_value,
          ch.new_value,
          ch.changed_by,
          ch.changed_at,
          p.name AS place_name,
          p.city
        FROM contact_history ch
        JOIN places p ON p.place_id = ch.place_id
        WHERE
          ($1 = '' OR ch.place_id = $1 OR LOWER(p.name) LIKE $2)
          AND ($3 = '' OR ch.changed_at >= $3::timestamptz)
          AND ($4 = '' OR ch.changed_at <= ($4::date + interval '1 day')::timestamptz)
        ORDER BY ch.place_id, ch.changed_at DESC
      ),
      counted AS (
        SELECT *, COUNT(*) OVER() AS total_count
        FROM latest
      )
      SELECT * FROM counted
      ORDER BY changed_at DESC
      LIMIT $5 OFFSET $6
      `,
      [search, `%${search.toLowerCase()}%`, dateFrom, dateTo, limit, offset],
    );

    const total = rows[0]?.total_count || 0;

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total: parseInt(total) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}