// AFTER
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import  pool  from "@/lib/db"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await verifyToken(token)
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = 20
  const offset = (page - 1) * limit

  const { rows } = await pool.query(
    `
    SELECT
      dc.id,
      dc.place_id,
      p.name        AS place_name,
      p.city,
      p.service_type,
      p.country,
      dc.reference_code,
      dc.status     AS deal_status,
      dc.shop_created_at,
      u.name        AS created_by_name
    FROM deal_cases dc
    JOIN places p ON p.place_id = dc.place_id
    LEFT JOIN users u ON u.id = dc.shop_created_by
    WHERE dc.shop_created_at IS NOT NULL
    ORDER BY dc.shop_created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  )

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM deal_cases WHERE shop_created_at IS NOT NULL`,
  )

  return NextResponse.json({
    data: rows,
    total: parseInt(countRows[0].total),
    page,
    hasNextPage: offset + rows.length < parseInt(countRows[0].total),
  })
}