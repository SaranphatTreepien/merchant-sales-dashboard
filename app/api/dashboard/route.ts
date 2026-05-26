import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Params ──────────────────────────────────────────────────────────────────
  const search = searchParams.get("search");
  const city = searchParams.get("city");
  const serviceType = searchParams.get("serviceType");
  const status = searchParams.get("status");
  const isExport = searchParams.get("export") === "1";

  // Contact toggles
  const hasPhone = searchParams.get("hasPhone") === "1";
  const hasLine = searchParams.get("hasLine") === "1";
  const hasFb = searchParams.get("hasFb") === "1";
  const hasIg = searchParams.get("hasIg") === "1";
  const hasEmail = searchParams.get("hasEmail") === "1";
  const hasWhatsapp = searchParams.get("hasWhatsapp") === "1";
  const hasTelegram = searchParams.get("hasTelegram") === "1";
  const hasDeal = searchParams.get("hasDeal");
  const hasTiktok = searchParams.get("hasTiktok") === "1";
  const hasBooking = searchParams.get("hasBooking");
  const noted = searchParams.get("noted");
  const country = searchParams.get("country");
  const saleId = searchParams.get("saleId");
  const hasShop = searchParams.get("hasShop"); // 'yes' | 'no' | null (default = 'no')
  // Pagination (ไม่ใช้ตอน export)
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    // ── WHERE conditions ─────────────────────────────────────────────────────
    const conditions: string[] = ["1=1"];
    const values: unknown[] = [];
    let i = 1;

    if (country && country !== "ALL") {
      conditions.push(`p.country = $${i++}`);
      values.push(country);
    }
    // Search: ชื่อร้าน หรือ place_id
    if (search) {
      conditions.push(`(
    p.name ILIKE $${i} OR 
    p.place_id ILIKE $${i + 1} OR
    EXISTS (
      SELECT 1 FROM deal_cases dc2 
      WHERE dc2.place_id = p.place_id 
      AND dc2.reference_code ILIKE $${i + 2}
    )
  )`);
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
      i += 3;
    }

    // Dropdown filters
    if (city) {
      if (city === "other") {
        const { getCitiesByCountry } = await import("@/lib/constants/regions");
        const whitelist = getCitiesByCountry(country || "TH");
        conditions.push(
          `(p.city IS NULL OR p.city = '' OR p.city != ALL($${i++}))`,
        );
        values.push(whitelist);
      } else {
        conditions.push(`p.city = $${i++}`);
        values.push(city);
      }
    }
    if (serviceType) {
      const SERVICE_TYPE_MAP: Record<string, string[]> = {
        restaurant_food: [
          "restaurant",
          "thai_restaurant",
          "seafood_restaurant",
          "noodle_shop",
          "family_restaurant",
          "fast_food_restaurant",
          "buffet_restaurant",
          "chinese_restaurant",
          "japanese_restaurant",
          "korean_restaurant",
          "italian_restaurant",
          "indian_restaurant",
          "halal_restaurant",
          "dessert_restaurant",
          "pizza_restaurant",
          "steak_house",
          "barbecue_restaurant",
          "asian_restaurant",
          "vietnamese_restaurant",
          "sushi_restaurant",
          "chicken_restaurant",
          "brunch_restaurant",
          "breakfast_restaurant",
          "hot_pot_restaurant",
          "hamburger_restaurant",
          "dim_sum_restaurant",
          "yakiniku_restaurant",
          "korean_barbecue_restaurant",
          "ramen_restaurant",
          "western_restaurant",
          "fusion_restaurant",
          "asian_fusion_restaurant",
          "japanese_izakaya_restaurant",
          "chinese_noodle_restaurant",
          "vegetarian_restaurant",
          "vegan_restaurant",
          "fine_dining_restaurant",
          "french_restaurant",
          "turkish_restaurant",
          "mexican_restaurant",
          "american_restaurant",
          "mediterranean_restaurant",
          "kebab_shop",
          "sandwich_shop",
          "salad_shop",
          "bistro",
          "diner",
          "food_court",
          "meal_takeaway",
          "meal_delivery",
          "food",
          "food_store",
          "food_drink",
          "chicken_wings_restaurant",
          "dumpling_restaurant",
          "cantonese_restaurant",
          "lebanese_restaurant",
          "middle_eastern_restaurant",
          "burmese_restaurant",
          "indonesian_restaurant",
          "greek_restaurant",
          "german_restaurant",
          "russian_restaurant",
          "european_restaurant",
          "eastern_european_restaurant",
          "taiwanese_restaurant",
          "tonkatsu_restaurant",
          "japanese_curry_restaurant",
          "soup_restaurant",
          "snack_bar",
          "deli",
          "cafeteria",
        ],
        cafe_drinks: [
          "cafe",
          "coffee_shop",
          "coffee_roastery",
          "coffee_stand",
          "bakery",
          "cake_shop",
          "dessert_shop",
          "pastry_shop",
          "donut_shop",
          "ice_cream_shop",
          "candy_store",
          "confectionery",
          "juice_shop",
          "tea_house",
          "cat_cafe",
          "dog_cafe",
          "bagel_shop",
        ],
        bar_nightlife: [
          "bar",
          "pub",
          "cocktail_bar",
          "night_club",
          "sports_bar",
          "lounge_bar",
          "wine_bar",
          "beer_garden",
          "bar_and_grill",
          "brewpub",
          "brewery",
          "hookah_bar",
          "irish_pub",
          "karaoke",
          "live_music_venue",
        ],
        accommodation: [
          "hotel",
          "resort_hotel",
          "hostel",
          "guest_house",
          "lodging",
          "inn",
          "private_guest_room",
          "extended_stay_hotel",
          "farmstay",
          "bed_and_breakfast",
          "cottage",
          "campground",
          "camping_cabin",
          "motel",
          "apartment_building",
          "apartment_complex",
          "condominium_complex",
          "rest_stop",
        ],
        health_beauty: [
          "spa",
          "massage_spa",
          "massage",
          "sauna",
          "public_bath",
          "hair_salon",
          "beauty_salon",
          "nail_salon",
          "barber_shop",
          "beautician",
          "skin_care_clinic",
          "makeup_artist",
          "fitness_center",
          "gym",
          "yoga_studio",
          "wellness_center",
          "swimming_pool",
          "sports_coaching",
          "sports_club",
          "sports_complex",
          "sports_activity_location",
          "sports_school",
          "medical_clinic",
          "doctor",
          "health",
          "health_food_store",
          "pet_care",
        ],
        travel_tourism: [
          "tour_agency",
          "travel_agency",
          "tourist_attraction",
          "tourist_information_center",
          "ferry_service",
          "scenic_spot",
          "historical_landmark",
          "botanical_garden",
          "zoo",
          "wildlife_park",
          "water_park",
          "adventure_sports_center",
          "go_karting_venue",
          "race_course",
          "fishing_pond",
          "fishing_pier",
          "fishing_charter",
          "golf_course",
          "farm",
          "ranch",
        ],
        other: [
          "store",
          "market",
          "shopping_mall",
          "grocery_store",
          "supermarket",
          "convenience_store",
          "liquor_store",
          "clothing_store",
          "cosmetics_store",
          "gift_shop",
          "home_goods_store",
          "furniture_store",
          "electronics_store",
          "pet_store",
          "pet_boarding_service",
          "florist",
          "toy_store",
          "butcher_shop",
          "gas_station",
          "car_wash",
          "car_repair",
          "auto_parts_store",
          "bicycle_store",
          "wholesaler",
          "warehouse_store",
          "manufacturer",
          "supplier",
          "general_contractor",
          "corporate_office",
          "business_center",
          "coworking_space",
          "real_estate_agency",
          "educational_institution",
          "community_center",
          "cultural_center",
          "association_or_organization",
          "non_profit_organization",
          "event_venue",
          "banquet_hall",
          "wedding_venue",
          "performing_arts_theater",
          "concert_hall",
          "amusement_center",
          "playground",
          "catering_service",
          "shipping_service",
          "food_delivery",
          "pizza_delivery",
          "service",
          "art_gallery",
          "art_studio",
        ],
      };
      const types = SERVICE_TYPE_MAP[serviceType];
      if (types) {
        conditions.push(`p.service_type = ANY($${i++})`);
        values.push(types);
      }
    }
    if (status) {
      conditions.push(`p.business_status = $${i++}`);
      values.push(status);
    }

    // Contact toggle filters (EXISTS subquery — ไม่ให้กระทบ GROUP BY)
    if (hasPhone) {
      conditions.push(`EXISTS (
        SELECT 1 FROM place_phones ph2
        WHERE ph2.place_id = p.place_id AND ph2.deleted_at IS NULL
      )`);
    }
    if (hasLine) {
      conditions.push(`EXISTS (
        SELECT 1 FROM place_lines pl2
        WHERE pl2.place_id = p.place_id
      )`);
    }
    if (hasFb) {
      conditions.push(`EXISTS (
        SELECT 1 FROM place_facebooks pfb2
        WHERE pfb2.place_id = p.place_id
      )`);
    }
    if (hasIg) {
      conditions.push(`EXISTS (
        SELECT 1 FROM place_instagrams pig2
        WHERE pig2.place_id = p.place_id
      )`);
    }
    if (hasEmail) {
      conditions.push(`EXISTS (
        SELECT 1 FROM place_emails pe2
        WHERE pe2.place_id = p.place_id
      )`);
    }
    if (hasWhatsapp) {
      conditions.push(`EXISTS (
    SELECT 1 FROM place_whatsapps pw2
    WHERE pw2.place_id = p.place_id
  )`);
    }
    if (hasTelegram) {
      conditions.push(`EXISTS (
    SELECT 1 FROM place_telegrams pt2
    WHERE pt2.place_id = p.place_id
  )`);
    }
    if (hasDeal === "yes")
      conditions.push(
        `EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id)`,
      );
    if (hasDeal === "no")
      conditions.push(
        `NOT EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id)`,
      );
    if (hasDeal === "success")
      conditions.push(
        `EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id AND dc2.status = 'success')`,
      );
    if (hasDeal === "pending")
      conditions.push(
        `EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id AND dc2.status = 'pending')`,
      );
    if (hasDeal === "stop")
      conditions.push(
        `EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id AND dc2.status = 'stop')`,
      );
    if (hasTiktok)
      conditions.push(
        `EXISTS (SELECT 1 FROM place_tiktoks ptk2 WHERE ptk2.place_id = p.place_id)`,
      );
    if (hasBooking === "yes") conditions.push(`p.has_booking = TRUE`);
    if (hasBooking === "no")
      conditions.push(`(p.has_booking = FALSE OR p.has_booking IS NULL)`);
    if (noted === "yes")
      conditions.push(
        `EXISTS (SELECT 1 FROM place_notes n2 WHERE n2.place_id = p.place_id)`,
      );
    if (noted === "no")
      conditions.push(
        `NOT EXISTS (SELECT 1 FROM place_notes n2 WHERE n2.place_id = p.place_id)`,
      );
    if (saleId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id AND dc2.sale_id = $${i++}::uuid)`,
      );
      values.push(saleId);
    }
    // hasShop filter — default 'no' (ไม่แสดงร้านที่ create shop แล้ว)
    const effectiveHasShop = hasShop ?? "no";
    if (effectiveHasShop === "no") {
      conditions.push(
        `NOT EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id AND dc2.shop_created_at IS NOT NULL)`,
      );
    } else if (effectiveHasShop === "yes") {
      conditions.push(
        `EXISTS (SELECT 1 FROM deal_cases dc2 WHERE dc2.place_id = p.place_id AND dc2.shop_created_at IS NOT NULL)`,
      );
    }
    // hasShop = 'all' → ไม่เพิ่ม condition (แสดงทุกร้าน)

    const where = conditions.join(" AND ");

    // ── Main SELECT ──────────────────────────────────────────────────────────
    const paginationClause = isExport
      ? ""
      : `LIMIT ${limit + 1} OFFSET ${offset}`;

    const { rows } = await pool.query(
      `
  WITH ranked AS (
    SELECT p.place_id, p.scraped_at, p.last_activity_at
    FROM places p
    WHERE ${where}
    ORDER BY p.last_activity_at DESC NULLS LAST, p.scraped_at DESC
    ${paginationClause}
  )
  SELECT
    p.place_id, p.name, p.city, p.service_type,
    p.business_status, p.rating, p.google_map_url,
    p.has_booking, p.country,
    MAX(ph.number) AS phone,
    MAX(CASE WHEN (ph.is_primary IS NULL OR ph.is_primary = FALSE) THEN ph.number END) AS phone2,
    MAX(pl.line_id) AS line_id,
    MAX(pe.address) AS email,
    MAX(pfb.url) AS facebook_url,
    MAX(pig.handle) AS instagram_handle,
    MAX(pw.number) AS whatsapp,
    MAX(ptg.telegram_url) AS telegram_url,
    deal.status AS deal_status,
    deal.reference_code AS deal_reference_code,
    deal.sale_name AS deal_sale_name,
    deal.updated_at AS deal_updated_at,
    ln.note AS last_note,
    ln.author AS last_note_by,
    ln.created_at AS last_note_at,
    COALESCE(pr.cnt, 0) AS pending_requests,
    ranked.last_activity_at
  FROM ranked
  JOIN places p ON p.place_id = ranked.place_id
  LEFT JOIN place_phones ph ON ph.place_id = p.place_id AND ph.deleted_at IS NULL
  LEFT JOIN place_lines pl ON pl.place_id = p.place_id
  LEFT JOIN place_emails pe ON pe.place_id = p.place_id
  LEFT JOIN place_facebooks pfb ON pfb.place_id = p.place_id
  LEFT JOIN place_instagrams pig ON pig.place_id = p.place_id
  LEFT JOIN place_whatsapps pw ON pw.place_id = p.place_id
  LEFT JOIN place_telegrams ptg ON ptg.place_id = p.place_id
  LEFT JOIN LATERAL (
    SELECT dc.status, dc.reference_code, dc.updated_at, u.name AS sale_name
    FROM deal_cases dc
    LEFT JOIN users u ON u.id::text = dc.sale_id::text
    WHERE dc.place_id = p.place_id
    LIMIT 1
  ) deal ON true
  LEFT JOIN LATERAL (
    SELECT n.note, n.created_at, u.name AS author
    FROM place_notes n
    JOIN users u ON u.id = n.user_id
    WHERE n.place_id = p.place_id
    ORDER BY n.created_at DESC
    LIMIT 1
  ) ln ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM contact_edit_requests r
    WHERE r.place_id = p.place_id AND r.status = 'pending'
  ) pr ON true
  GROUP BY
    p.place_id, p.name, p.city, p.service_type,
    p.business_status, p.rating, p.google_map_url,
    p.has_booking, p.scraped_at, p.country,
    deal.status, deal.reference_code, deal.updated_at, deal.sale_name,
    ln.note, ln.created_at, ln.author,
    pr.cnt, ranked.last_activity_at
  ORDER BY ranked.last_activity_at DESC NULLS LAST, p.scraped_at DESC
  `,
      values,
    );

    // ── Count — ดึงจาก window function แทน query แยก ──────────────────────
    // AFTER
    if (isExport) {
      console.log("[dashboard] export rows:", rows.length);
      return NextResponse.json({
        data: rows,
        total: rows.length,
        page: 1,
        limit: rows.length,
      });
    }

    // ตรวจว่ามีหน้าถัดไปไหม — ดึง limit+1 แล้วเช็ค
    const hasNextPage = rows.length > limit;
    const pageData = hasNextPage ? rows.slice(0, limit) : rows;

    // COUNT แยก — run parallel กับ data query ไม่ได้แล้ว แต่ทำใน Promise.all กับ stats ได้
    // ตอนนี้ทำ COUNT แยกหลัง data query — เร็วเพราะ data query เบาลงมาก
    const hasFilter =
      (country && country !== "ALL") ||
      search ||
      city ||
      serviceType ||
      status ||
      hasPhone ||
      hasLine ||
      hasFb ||
      hasIg ||
      hasEmail ||
      hasWhatsapp ||
      hasTelegram ||
      hasDeal ||
      hasTiktok ||
      hasBooking ||
      noted ||
      saleId;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM places p WHERE ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0]?.total ?? "0");

    console.log(
      "[dashboard] rows:",
      pageData.length,
      "total:",
      total,
      "hasNext:",
      hasNextPage,
      "country:",
      country,
    );

    return NextResponse.json({
      data: pageData,
      total,
      hasNextPage,
      page,
      limit,
    });
  } catch (err: unknown) {
    const isConnRefused =
      err !== null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "ECONNREFUSED";

    if (isConnRefused) {
      console.error("[api/dashboard] DB unreachable (ECONNREFUSED)");
      return NextResponse.json(
        { error: "DB_UNREACHABLE", message: "ไม่สามารถเชื่อมต่อ Database ได้" },
        { status: 503 },
      );
    }

    console.error("[api/dashboard] error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
