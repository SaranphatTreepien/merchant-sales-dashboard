import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/notes?date_from=&date_to=&user_id=&place_id=&page=1
// AFTER
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const user_id = searchParams.get("user_id");
    const place_id = searchParams.get("place_id");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 10; // paginate ต่อ place
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (date_from) {
      conditions.push(`pn.created_at >= $${idx++}`);
      values.push(date_from);
    }
    if (date_to) {
      conditions.push(`pn.created_at < ($${idx++}::date + interval '1 day')`);
      values.push(date_to);
    }
    if (user_id) {
      conditions.push(`pn.user_id = $${idx++}`);
      values.push(user_id);
    }
    if (place_id) {
      conditions.push(`pn.place_id = $${idx++}`);
      values.push(place_id);
    }
    if (search) {
      conditions.push(`(
        p.name ILIKE $${idx} OR
        pn.place_id ILIKE $${idx} OR
        p.city ILIKE $${idx} OR
        pn.note ILIKE $${idx++}
      )`);
      values.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // COUNT ต่อ place (ไม่ใช่ note)
    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT pn.place_id) AS total
       FROM place_notes pn
       LEFT JOIN places p ON p.place_id = pn.place_id
       ${where}`,
      values,
    );
    const total = parseInt(countRes.rows[0].total);

    // ดึง place_id ที่ paginate แล้ว — เรียงตาม note ล่าสุดของแต่ละร้าน
    const placeRes = await pool.query(
      `SELECT pn.place_id
       FROM place_notes pn
       LEFT JOIN places p ON p.place_id = pn.place_id
       ${where}
       GROUP BY pn.place_id
       ORDER BY MAX(pn.created_at) DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset],
    );

    const placeIds = placeRes.rows.map((r) => r.place_id);

    if (placeIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      });
    }

    // ดึง notes ทั้งหมดของ place ที่ได้มา
    const dataRes = await pool.query(
      `SELECT
          pn.id,
          pn.note,
          pn.created_at,
          pn.updated_at,
          pn.place_id,
          p.name AS place_name,
          pn.user_id,
          u.name AS sale_name
       FROM place_notes pn
       LEFT JOIN places p ON p.place_id = pn.place_id
       LEFT JOIN users u ON u.id = pn.user_id
       WHERE pn.place_id = ANY($1)
       ORDER BY pn.created_at DESC`,
      [placeIds],
    );

    return NextResponse.json({
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// POST /api/notes  body: { place_id, note }
export async function POST(req: NextRequest) {
  try {
    // ─── Auth ─────────────────────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { place_id, note } = body;

    if (!place_id || !note) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO place_notes (place_id, user_id, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [place_id, user.id, note], // ← user_id จาก cookie แทน body
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
