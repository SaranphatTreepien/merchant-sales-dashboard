import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCitiesByCountry, OTHER_CITY } from "@/lib/constants/regions";
const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  TH: { name: "Thailand", flag: "TH" },
  SG: { name: "Singapore", flag: "SG" },
  MY: { name: "Malaysia", flag: "MY" },
  ID: { name: "Indonesia", flag: "ID" },
  VN: { name: "Vietnam", flag: "VN" },
  PH: { name: "Philippines", flag: "PH" },
  JP: { name: "Japan", flag: "JP" },
  KR: { name: "South Korea", flag: "KR" },
  CN: { name: "China", flag: "CN" },
  US: { name: "United States", flag: "US" },
  GB: { name: "United Kingdom", flag: "GB" },
};

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
  const [notedResult, dealResult] = await Promise.all([
    // noted — parameterized + city filter
    query(
      `SELECT COUNT(DISTINCT pn.place_id) AS noted
     FROM place_notes pn
     JOIN places p ON p.place_id = pn.place_id
     WHERE ($1::text IS NULL OR p.country = $1)
     ${cityCondition}`,
      cityValue ? [isAll ? null : country, cityValue] : [isAll ? null : country],

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
      cityValue ? [isAll ? null : country, cityValue] : [isAll ? null : country],

    ),
  ]);

  const countryCode = country && country !== "ALL" ? country : "ALL";

  const countryInfo = COUNTRY_MAP[countryCode] ?? {
    name: countryCode,
    flag: "🌏",
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
  });
}
