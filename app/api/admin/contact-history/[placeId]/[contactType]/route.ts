import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ placeId: string; contactType: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { placeId, contactType } = await params;

  const fieldTypeMap: Record<string, string[]> = {
    place_phones: ["phone", "phone2", "phone_new", "phone_edit"],
    place_lines: ["line_oa", "line_personal", "line_url"],
    place_emails: ["email"],
    place_facebooks: ["facebook"],
    place_instagrams: ["instagram"],
    place_messengers: ["messenger"],
    place_whatsapps: ["whatsapp"],
    place_telegrams: ["telegram"],
  };
  const fieldTypes = fieldTypeMap[contactType] || [];

  try {
    // ── Source 1: scraper history ──
    const { rows: scraperLogs } = await pool.query(
      `SELECT
    'scraper' AS source_type,
    action,
    old_value,
    new_value,
    changed_by,
    changed_at AS event_at
   FROM contact_history
   WHERE place_id = $1 AND table_name = $2
   ORDER BY changed_at DESC`,
      [placeId, contactType],
    );
    console.log(
      "placeId:",
      placeId,
      "contactType:",
      contactType,
      "scraperLogs:",
      scraperLogs.length,
    );

    // ── Source 2: manual edit ──
    const { rows: manualLogs } = await pool.query(
      `SELECT
    'manual' AS source_type,
    COALESCE(cel.action, cer.status) AS action,
    cer.old_value,
    COALESCE(cel.final_value, cer.new_value) AS new_value,
    u.name AS changed_by,
    COALESCE(cel.approved_at, cer.created_at) AS event_at,
    cer.reason,
    cer.status,
    cel.reject_reason
   FROM contact_edit_requests cer
   JOIN users u ON u.id = cer.requested_by
   LEFT JOIN contact_edit_logs cel ON cel.request_id = cer.id
   WHERE cer.place_id = $1 AND cer.field_type = ANY($2::text[])
   ORDER BY event_at DESC`,
      [placeId, fieldTypes],
    );

    const manualTimes = new Set(
      manualLogs.map((m) => new Date(m.event_at).toISOString().slice(0, 16)), // ตัดถึงนาที
    );

    const filteredScraper = scraperLogs.filter((s) => {
      const t = new Date(s.event_at).toISOString().slice(0, 16);
      return !manualTimes.has(t);
    });

    const merged = [...filteredScraper, ...manualLogs].sort(
      (a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime(),
    );

    return NextResponse.json({ timeline: merged });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
