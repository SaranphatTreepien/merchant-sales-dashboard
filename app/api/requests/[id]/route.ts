import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PoolClient } from "pg";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // ─── Auth ────────────────────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, final_value, reject_reason } = body;
    // ลบ reviewed_by ออกจาก body — ใช้จาก cookie แทน
    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }
    if (
      !["accepted", "edited", "deleted", "rejected", "cancelled"].includes(
        action,
      )
    ) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (action === "edited" && !final_value?.trim()) {
      return NextResponse.json(
        { error: "final_value required for edited action" },
        { status: 400 },
      );
    }

    // ── 1. ดึง request เดิม ──────────────────────────────────────────────────
    const { rows: reqRows } = await pool.query(
      `SELECT * FROM contact_edit_requests WHERE id = $1`,
      [id],
    );
    if (!reqRows[0])
      return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const request = reqRows[0];

    // cancelled — sale ยกเลิก request ของตัวเอง
    if (action === "cancelled") {
      if (user.role !== "admin" && request.requested_by !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // accept/edit/reject/delete — admin เท่านั้น
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Request already reviewed" },
        { status: 409 },
      );
    }

    const valueToApply =
      action === "edited" ? final_value.trim() : request.new_value;

    // ── 2. Transaction ───────────────────────────────────────────────────────
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (action === "cancelled") {
        await client.query(
          `UPDATE contact_edit_requests 
     SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() 
     WHERE id = $2`,
          [user.id, id],
        );

        // ── เพิ่มตรงนี้ ──
        await client.query(
          `INSERT INTO contact_edit_logs (request_id, action, final_value, approved_by, reject_reason)
 VALUES ($1, 'rejected', NULL, $2, $3)`,
          [id, user.id, reject_reason || null],
        );

        await client.query("COMMIT");
        return NextResponse.json({ success: true, action: "cancelled" });
      }

      if (action === "rejected") {
        // ไม่ทำอะไรกับ contact
      } else if (action === "deleted") {
        await applyDelete(
          client,
          request.place_id,
          request.field_type,
          request.old_value,
        );
      } else if (
        action === "accepted" &&
        (!request.new_value || request.new_value === "")
      ) {
        await applyDelete(
          client,
          request.place_id,
          request.field_type,
          request.old_value,
        );
      } else {
        await applyUpsert(
          client,
          request.place_id,
          request.field_type,
          valueToApply,
          request.old_value,
          request.reason,
        );
      }

      await client.query(
        `UPDATE contact_edit_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $3`,
        [
          action === "rejected" || action === "deleted"
            ? "rejected"
            : "approved",
          user.id,
          id,
        ],
      );

      await client.query(
        `INSERT INTO contact_edit_logs (request_id, action, final_value, approved_by, reject_reason)
   VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          action,
          action === "deleted" || action === "rejected" ? null : valueToApply,
          user.id,
          action === "rejected" ? reject_reason || null : null,
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        action,
        final_value: valueToApply,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[PATCH /api/requests/[id]]", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// ── Helpers (ไม่เปลี่ยน logic เลย เพิ่มแค่ type) ──────────────────────────────
function normalizeInstagram(input: string): string {
  const match = input.match(/instagram\.com\/([^/?]+)/);
  if (match) return match[1].replace(/\/$/, "");
  return input.replace(/^@/, "").trim();
}
async function applyUpsert(
  client: PoolClient,
  placeId: string,
  fieldType: string,
  newValue: string,
  oldValue: string | null,
  reason?: string | null,
) {
  if (!placeId) throw new Error("placeId is required"); // ✅ guard
  switch (fieldType) {
    case "phone":
    case "phone2": {
      const isPrimary = fieldType === "phone";
      if (oldValue) {
        await client.query(
          `UPDATE place_phones SET number = $1, updated_at = NOW() WHERE place_id = $2 AND number = $3 AND deleted_at IS NULL`,
          [newValue, placeId, oldValue],
        );
      } else {
        await client.query(
          `INSERT INTO place_phones (place_id, number, is_primary) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [placeId, newValue, isPrimary],
        );
      }
      break;
    }
    case "phone_new": {
      let phoneNumber = newValue;
      let phoneLabel: string | null = reason || null;

      // ถ้า newValue เป็น JSON { number, label } ให้ parse ก่อน
      try {
        const parsed = JSON.parse(newValue);
        if (parsed?.number) {
          phoneNumber = parsed.number;
          phoneLabel = parsed.label || null;
        }
      } catch {}

      const normalized = phoneNumber.replace(/\D/g, "");
      await client.query(
        `INSERT INTO place_phones 
     (place_id, number, normalized, label, category, confidence, is_primary, is_manual, added_by, source)
     VALUES ($1, $2, $3, $4, 'business', 5, false, true, 'dashboard', 'manual')
     ON CONFLICT DO NOTHING`,
        [placeId, phoneNumber, normalized, phoneLabel],
      );
      break;
    }
    case "phone_edit": {
      // new_value เป็น JSON { number, label }
      const parsed = JSON.parse(newValue);
      const normalized = parsed.number.replace(/\D/g, "");
      await client.query(
        `UPDATE place_phones 
     SET number = $1, normalized = $2, label = $3, is_manual = true, updated_at = NOW()
     WHERE place_id = $4 AND number = $5 AND deleted_at IS NULL`,
        [parsed.number, normalized, parsed.label || null, placeId, oldValue],
      );
      break;
    }
    case "line_oa":
    case "line_personal": {
      const lineType = fieldType === "line_oa" ? "oa" : "personal";
      if (oldValue) {
        await client.query(
          `UPDATE place_lines SET line_id = $1, updated_at = NOW() WHERE place_id = $2 AND line_id = $3`,
          [newValue, placeId, oldValue],
        );
      } else {
        await client.query(
          `INSERT INTO place_lines (place_id, line_id, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [placeId, newValue, lineType],
        );
      }
      break;
    }
    case "line_url": {
      if (oldValue) {
        // มีค่าเดิม → UPDATE row ที่ line_url ตรงกัน
        await client.query(
          `UPDATE place_lines SET line_url = $1, updated_at = NOW()
       WHERE place_id = $2 AND line_url = $3`,
          [newValue, placeId, oldValue],
        );
      } else {
        // ไม่มีค่าเดิม → UPDATE row type='oa' ก่อน ถ้าไม่มีค่อย INSERT
        const { rowCount } = await client.query(
          `UPDATE place_lines SET line_url = $1, updated_at = NOW()
       WHERE place_id = $2
         AND type = 'oa'
         AND deleted_at IS NULL`,
          [newValue, placeId],
        );
        if (rowCount === 0) {
          // ไม่มี row เลย → INSERT ใหม่ โดยใช้ line_url เป็น line_id (fallback)
          await client.query(
            `INSERT INTO place_lines (place_id, line_id, line_url, type, is_manual)
         VALUES ($1, $2, $2, 'oa', true)
         ON CONFLICT (place_id, line_id) DO UPDATE
           SET line_url = EXCLUDED.line_url, updated_at = NOW()`,
            [placeId, newValue],
          );
        }
      }
      break;
    }
    case "email": {
      if (oldValue) {
        await client.query(
          `UPDATE place_emails SET address = $1, updated_at = NOW() WHERE place_id = $2 AND address = $3`,
          [newValue, placeId, oldValue],
        );
      } else {
        await client.query(
          `INSERT INTO place_emails (place_id, address) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [placeId, newValue],
        );
      }
      break;
    }
    case "facebook": {
      if (oldValue) {
        await client.query(
          `UPDATE place_facebooks SET url = $1, updated_at = NOW() WHERE place_id = $2 AND url = $3`,
          [newValue, placeId, oldValue],
        );
      } else {
        await client.query(
          `INSERT INTO place_facebooks (place_id, url) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [placeId, newValue],
        );
      }
      break;
    }
    case "instagram": {
      const handle = normalizeInstagram(newValue); // ← เพิ่มบรรทัดนี้
      const igUrl = `https://www.instagram.com/${handle}`;
      if (oldValue) {
        await client.query(
          `UPDATE place_instagrams 
       SET handle = $1, instagram_url = $2, updated_at = NOW()
       WHERE place_id = $3 AND handle = $4`,
          [handle, igUrl, placeId, oldValue], // ← เปลี่ยน newValue → handle
        );
      } else {
        await client.query(
          `INSERT INTO place_instagrams (place_id, handle, instagram_url)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [placeId, handle, igUrl], // ← เปลี่ยน newValue → handle
        );
      }
      break;
    }
    case "messenger": {
      if (oldValue) {
        await client.query(
          `UPDATE place_messengers SET url = $1, updated_at = NOW() WHERE place_id = $2 AND url = $3`,
          [newValue, placeId, oldValue],
        );
      } else {
        await client.query(
          `INSERT INTO place_messengers (place_id, url) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [placeId, newValue],
        );
      }
      break;
    }
    case "whatsapp": {
      if (oldValue) {
        await client.query(
          `UPDATE place_whatsapps SET number = $1, updated_at = NOW() WHERE place_id = $2 AND number = $3`,
          [newValue, placeId, oldValue],
        );
      } else {
        await client.query(
          `INSERT INTO place_whatsapps (place_id, number) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [placeId, newValue],
        );
      }
      break;
    }
    case "telegram": {
      if (oldValue) {
        await client.query(
          `UPDATE place_telegrams SET telegram_url = $1, updated_at = NOW() WHERE place_id = $2 AND telegram_url = $3`,
          [newValue, placeId, oldValue],
        );
      } else {
        await client.query(
          `INSERT INTO place_telegrams (place_id, telegram_url) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [placeId, newValue],
        );
      }
      break;
    }

    default:
      throw new Error(`Unknown field_type: ${fieldType}`);
  }
}

async function applyDelete(
  client: PoolClient,
  placeId: string,
  fieldType: string,
  oldValue: string | null,
) {
  if (!oldValue) return;
  switch (fieldType) {
    case "phone":
    case "phone2":
    case "phone_new":
      await client.query(
        `UPDATE place_phones SET deleted_at = NOW() WHERE place_id = $1 AND number = $2 AND deleted_at IS NULL`,
        [placeId, oldValue],
      );
      break;
    case "line_oa":
    case "line_personal":
      await client.query(
        `DELETE FROM place_lines WHERE place_id = $1 AND line_id = $2`,
        [placeId, oldValue],
      );
      break;
    case "line_url":
      await client.query(
        `UPDATE place_lines SET line_url = NULL, updated_at = NOW() WHERE place_id = $1 AND line_url = $2`,
        [placeId, oldValue],
      );
      break;
    case "email":
      await client.query(
        `DELETE FROM place_emails WHERE place_id = $1 AND address = $2`,
        [placeId, oldValue],
      );
      break;
    case "facebook":
      await client.query(
        `DELETE FROM place_facebooks WHERE place_id = $1 AND url = $2`,
        [placeId, oldValue],
      );
      break;
    case "instagram":
      await client.query(
        `DELETE FROM place_instagrams WHERE place_id = $1 AND handle = $2`,
        [placeId, oldValue],
      );
      break;
    case "messenger":
      await client.query(
        `DELETE FROM place_messengers WHERE place_id = $1 AND url = $2`,
        [placeId, oldValue],
      );
      break;
    case "whatsapp":
      await client.query(
        `DELETE FROM place_whatsapps WHERE place_id = $1 AND number = $2`,
        [placeId, oldValue],
      );
      break;
    case "telegram":
      await client.query(
        `DELETE FROM place_telegrams WHERE place_id = $1 AND telegram_url = $2`,
        [placeId, oldValue],
      );
      break;
  }
}
