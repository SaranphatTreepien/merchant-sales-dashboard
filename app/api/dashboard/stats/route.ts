import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getCitiesByCountry,
  OTHER_CITY,
  COUNTRY_DISPLAY,
} from "@/lib/constants/regions";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const isAll = !country || country === "ALL";

  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // แก้เป็น
  const city = searchParams.get("city");
  const isOther = city === OTHER_CITY;
  const whitelist = isOther ? getCitiesByCountry(country || "TH") : [];

  const cityCondition = isOther
    ? `AND (p.city IS NULL OR p.city = '' OR p.city != ALL($2))`
    : city
      ? `AND p.city = $2`
      : "";

  const cityValue = isOther ? whitelist : (city ?? null);
   const [notedResult, dealResult, shopResult] = await Promise.all([
    // noted — parameterized + city filter
    query(
      `SELECT COUNT(DISTINCT pn.place_id) AS noted
     FROM place_notes pn
     JOIN places p ON p.place_id = pn.place_id
     WHERE ($1::text IS NULL OR p.country = $1)
     ${cityCondition}`,
      cityValue
        ? [isAll ? null : country, cityValue]
        : [isAll ? null : country],
    ),
    // deal — parameterized + city filter
    query(
      `SELECT
       COUNT(*) FILTER (WHERE dc.status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE dc.status = 'success') AS success,
       COUNT(*) FILTER (WHERE dc.status = 'stop')    AS stop
     FROM deal_cases dc
     JOIN places p ON p.place_id = dc.place_id
     WHERE ($1::text IS NULL OR p.country = $1)
     ${cityCondition}`,
      cityValue
        ? [isAll ? null : country, cityValue]
        : [isAll ? null : country],
    ),
    // shop_created — นับร้านที่ create shop แล้ว
    query(
      `SELECT COUNT(*) AS shop_created
       FROM deal_cases dc
       JOIN places p ON p.place_id = dc.place_id
       WHERE dc.shop_created_at IS NOT NULL
       AND ($1::text IS NULL OR p.country = $1)
       ${cityCondition}`,
      cityValue
        ? [isAll ? null : country, cityValue]
        : [isAll ? null : country],
    ),
  ]);

  const countryCode = country && country !== "ALL" ? country : "ALL";

  const countryInfo = COUNTRY_DISPLAY[countryCode] ?? {
    name: countryCode,
    flag: countryCode.toLowerCase(),
  };
  const deal = dealResult.rows[0];

  return NextResponse.json({
    countryCode,
    countryName: countryInfo.name,
    countryFlag: countryInfo.flag,
    noted: parseInt(notedResult.rows[0]?.noted ?? "0"),
    pending: parseInt(deal?.pending ?? "0"),
    success: parseInt(deal?.success ?? "0"),
    stop: parseInt(deal?.stop ?? "0"),
    shopCreated: parseInt(shopResult.rows[0]?.shop_created ?? "0"),
  });
}
