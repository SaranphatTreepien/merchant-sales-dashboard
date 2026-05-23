import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { rows } = await pool.query(
      `SELECT
  p.place_id,
  p.name,
  p.city,
  p.business_status,
  p.rating,
  p.scraped_at,
  p.website,         
  p.service_type,       -- ✅ เพิ่ม

    p.google_map_url,
  p.has_booking,
  p.country,
    c.line_oa, c.line_personal, c.line_url,
  p.has_booking,
    c.line_oa, c.line_personal, c.line_url,
    c.email, c.facebook_url,
    c.instagram_handle, c.instagram_url,
    c.messenger_url,
    c.whatsapp, c.telegram_url
  FROM places p
      LEFT JOIN LATERAL (
        SELECT
          
          MAX(CASE WHEN pl.type = 'oa'       THEN pl.line_id END) AS line_oa,
          MAX(CASE WHEN pl.type = 'personal' THEN pl.line_id END) AS line_personal,
          MAX(pl.line_url)      AS line_url,
          MAX(pe.address)       AS email,
          MAX(pfb.url)          AS facebook_url,
          MAX(pig.handle)       AS instagram_handle,
          MAX(pig.instagram_url) AS instagram_url,
          MAX(pms.url)          AS messenger_url,
          MAX(pwa.number)       AS whatsapp,
          MAX(ptg.telegram_url) AS telegram_url
        FROM places p2
        LEFT JOIN place_phones     ph  ON ph.place_id  = p2.place_id AND ph.deleted_at IS NULL
        LEFT JOIN place_lines      pl  ON pl.place_id  = p2.place_id
        LEFT JOIN place_emails     pe  ON pe.place_id  = p2.place_id
        LEFT JOIN place_facebooks  pfb ON pfb.place_id = p2.place_id
        LEFT JOIN place_instagrams pig ON pig.place_id = p2.place_id
        LEFT JOIN place_messengers pms ON pms.place_id = p2.place_id
        LEFT JOIN place_whatsapps  pwa ON pwa.place_id = p2.place_id
        LEFT JOIN place_telegrams  ptg ON ptg.place_id = p2.place_id
        WHERE p2.place_id = p.place_id
      ) c ON true
      WHERE p.place_id = $1`,
      [id],
    );

    if (!rows[0])
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { rows: notes } = await pool.query(
      `
      SELECT n.*, u.name AS author
      FROM place_notes n
      JOIN users u ON u.id = n.user_id
      WHERE n.place_id = $1
      ORDER BY n.created_at DESC
    `,
      [id],
    );

    const { rows: requests } = await pool.query(
      `
  SELECT 
    r.*, 
    u.name AS requested_by_name,
    l.reject_reason
  FROM contact_edit_requests r
  JOIN users u ON u.id = r.requested_by
  LEFT JOIN contact_edit_logs l ON l.request_id = r.id
  WHERE r.place_id = $1
  ORDER BY r.created_at DESC
  `,
      [id],
    );
    const { rows: phones } = await pool.query(
      `SELECT id, number, normalized, label, is_primary, is_manual, added_by, source, created_at
FROM place_phones
WHERE place_id = $1 AND deleted_at IS NULL
ORDER BY is_primary DESC, created_at ASC`,
      [id],
    );

    return NextResponse.json({ place: rows[0], notes, requests, phones });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
