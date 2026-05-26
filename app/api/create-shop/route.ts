// AFTER
// app/api/create-shop/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  // Auth check
const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let currentUser: Awaited<ReturnType<typeof verifyToken>> | null = null;
  try {
    currentUser = await verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!currentUser) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate: must be array
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be an array of shop payloads" },
      { status: 400 },
    );
  }

  if (body.length === 0) {
    return NextResponse.json({ error: "No shops provided" }, { status: 400 });
  }

  if (body.length > 50) {
    return NextResponse.json(
      { error: "Too many shops in one request (max 50)" },
      { status: 400 },
    );
  }

  
  // --- MOCK MODE: log payload แล้ว return success รายร้าน ---
// AFTER
  // ─── TODO: เปิดเมื่อได้ AAPPOINT_API_TOKEN จริง ──────────────────────────
  // const AAPPOINT_API_URL = process.env.AAPPOINT_API_URL ?? 'https://dev.aappoint.me'
  // const AAPPOINT_API_TOKEN = process.env.AAPPOINT_API_TOKEN
  // if (!AAPPOINT_API_TOKEN) {
  //   return NextResponse.json({ error: 'AAPPOINT_API_TOKEN not configured' }, { status: 503 })
  // }
  // const shops = body as Record<string, unknown>[]
  // const settled = await Promise.allSettled(
  //   shops.map(async (shop) => {
  //     const res = await fetch(`${AAPPOINT_API_URL}/shop`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${AAPPOINT_API_TOKEN}`,
  //       },
  //       body: JSON.stringify(shop),
  //     })
  //     const json = await res.json().catch(() => ({}))
  //     if (!res.ok) {
  //       throw {
  //         place_id: shop.google_place_id ?? null,
  //         name_th: shop.name_th ?? null,
  //         status: res.status,
  //         error: json?.message ?? json?.error ?? `HTTP ${res.status}`,
  //       }
  //     }
  //     return {
  //       place_id: shop.google_place_id ?? null,
  //       name_th: shop.name_th ?? null,
  //       success: true,
  //       shop_id: json?.id ?? json?.shop_id ?? null,
  //     }
  //   })
  // )
  // const results = settled.map((r) => {
  //   if (r.status === 'fulfilled') return { ...r.value, success: true }
  //   const reason = r.reason as { place_id: string; name_th: string; error: string }
  //   return {
  //     place_id: reason?.place_id ?? null,
  //     name_th: reason?.name_th ?? null,
  //     success: false,
  //     error: reason?.error ?? 'Unknown error',
  //   }
  // })
  // console.log('[create-shop] done —', {
  //   by: currentUser.email,
  //   total: results.length,
  //   succeeded: results.filter(r => r.success).length,
  //   failed: results.filter(r => !r.success).length,
  // })
  // return NextResponse.json({
  //   total: results.length,
  //   succeeded: results.filter(r => r.success).length,
  //   failed: results.filter(r => !r.success).length,
  //   results,
  // })
  // ─────────────────────────────────────────────────────────────────────────

  // --- MOCK MODE: ใช้ไปก่อนจนกว่าจะได้ token ---
  console.log("=== [create-shop] MOCK MODE ===")
  console.log("Requested by:", currentUser.email, "| role:", currentUser.role)
  console.log("Total shops:", body.length)
  ;(body as Record<string, unknown>[]).forEach((shop, i) => {
    console.log(`\n--- Shop [${i + 1}] ---`)
    console.log(JSON.stringify(shop, null, 2))
  })
  console.log("=== END MOCK ===")

// AFTER
  // --- MOCK MODE: ใช้ไปก่อนจนกว่าจะได้ token ---
  console.log("=== [create-shop] MOCK MODE ===")
  console.log("Requested by:", currentUser.email, "| role:", currentUser.role)
  console.log("Total shops:", body.length)
  ;(body as Record<string, unknown>[]).forEach((shop, i) => {
    console.log(`\n--- Shop [${i + 1}] ---`)
    console.log(JSON.stringify(shop, null, 2))
  })
  console.log("=== END MOCK ===")

  const shops = body as Record<string, unknown>[]

  const results = shops.map((shop) => ({
    place_id: (shop.google_place_id as string) ?? null,
    name_th: (shop.name_th as string) ?? null,
    success: true,
    shop_id: `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message: "Mock success — not sent to aappoint yet",
  }))

  // บันทึก shop_created_at + shop_created_by ลง deal_cases
  // UPSERT: ถ้ามี deal case อยู่แล้ว → UPDATE, ถ้าไม่มี → INSERT ใหม่ (status = pending)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    for (const shop of shops) {
      const placeId = shop.google_place_id as string | null
      if (!placeId) continue

      await client.query(
        `
        INSERT INTO deal_cases (place_id, sale_id, status, shop_created_at, shop_created_by, created_at, updated_at)
        VALUES ($1, $2, 'pending', NOW(), $2, NOW(), NOW())
        ON CONFLICT (place_id)
        DO UPDATE SET
          shop_created_at = NOW(),
          shop_created_by = $2,
          updated_at = NOW()
        `,
        [placeId, currentUser.id],
      )
    }

    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[create-shop] failed to log shop_created:", err)
    // ไม่ throw — log ล้มเหลวไม่ควร block response
  } finally {
    client.release()
  }

  return NextResponse.json({
    total: body.length,
    succeeded: results.length,
    failed: 0,
    results,
  })
}
