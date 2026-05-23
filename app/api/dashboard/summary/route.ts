import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getCitiesByCountry, ALL_CITIES } from "@/lib/constants/regions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const countryParam = searchParams.get("country") || "ALL";
  const isAll = countryParam === "ALL";
  const country = isAll ? null : countryParam;

  const cities = country ? getCitiesByCountry(country) : ALL_CITIES;
  const countryFilter = country ? `AND p.country = '${country}'` : "";
  console.log("[summary] country:", country);
  console.log("[summary] cities.length:", cities.length);
  try {
    const [contactResult, dealResult, provinceResult, serviceResult] =
      await Promise.all([
        // ── 1. Contact Stats ──────────────────────────────────────────────────
        query(
          `SELECT
    COUNT(DISTINCT p.place_id)::int                                          AS total_places,
    COUNT(DISTINCT pp.place_id)::int                                         AS has_phone,
    COUNT(DISTINCT pl.place_id)::int                                         AS has_line,
    COUNT(DISTINCT pf.place_id)::int                                         AS has_facebook,
    COUNT(DISTINCT pi.place_id)::int                                         AS has_instagram,
    COUNT(DISTINCT pe.place_id)::int                                         AS has_email,
    COUNT(DISTINCT pw.place_id)::int                                         AS has_whatsapp,
    COUNT(DISTINCT pt.place_id)::int                                         AS has_telegram,
    COUNT(DISTINCT CASE WHEN p.has_booking = TRUE THEN p.place_id END)::int  AS has_booking
  FROM places p
  LEFT JOIN place_phones     pp ON pp.place_id = p.place_id AND pp.deleted_at IS NULL
  LEFT JOIN place_lines      pl ON pl.place_id = p.place_id
  LEFT JOIN place_facebooks  pf ON pf.place_id = p.place_id
  LEFT JOIN place_instagrams pi ON pi.place_id = p.place_id
  LEFT JOIN place_emails     pe ON pe.place_id = p.place_id
  LEFT JOIN place_whatsapps  pw ON pw.place_id = p.place_id
  LEFT JOIN place_telegrams  pt ON pt.place_id = p.place_id
  ${country ? "WHERE p.country = $1" : ""}`,
          country ? [country] : [],
        ),

        // ── 2. Deal Stats ─────────────────────────────────────────────────────
        query(
          `SELECT
    COUNT(DISTINCT CASE WHEN dc.status = 'success' THEN dc.place_id END)::int AS deal_success,
    COUNT(DISTINCT CASE WHEN dc.status = 'pending' THEN dc.place_id END)::int AS deal_pending,
    COUNT(DISTINCT CASE WHEN dc.status = 'stop'    THEN dc.place_id END)::int AS deal_stop,
    COUNT(DISTINCT dc.place_id)::int                                           AS deal_total
  FROM deal_cases dc
  ${country ? "JOIN places p ON p.place_id = dc.place_id WHERE p.country = $1" : ""}`,
          country ? [country] : [],
        ),
        // ── 3. Province Breakdown ─────────────────────────────────────────────
        // ── 3. Province / Country Breakdown ──────────────────────────────────
        isAll
          ? query(`
      SELECT
        p.country                                                                     AS city,
        false                                                                         AS is_other,
        NULL::text[]                                                                  AS other_city_names,
        COUNT(DISTINCT p.place_id)::int                                               AS total_places,
        COUNT(DISTINCT pp.place_id)::int                                              AS has_phone,
        COUNT(DISTINCT pl.place_id)::int                                              AS has_line,
        COUNT(DISTINCT pf.place_id)::int                                              AS has_facebook,
        COUNT(DISTINCT pi.place_id)::int                                              AS has_instagram,
        COUNT(DISTINCT pe.place_id)::int                                              AS has_email,
        COUNT(DISTINCT pw.place_id)::int                                              AS has_whatsapp,
        COUNT(DISTINCT pt.place_id)::int                                              AS has_telegram,
        COUNT(DISTINCT CASE WHEN p.has_booking = TRUE THEN p.place_id END)::int       AS has_booking,
        COUNT(DISTINCT CASE WHEN dc.status = 'success' THEN dc.place_id END)::int    AS deal_success,
        COUNT(DISTINCT CASE WHEN dc.status = 'pending' THEN dc.place_id END)::int    AS deal_pending,
        COUNT(DISTINCT CASE WHEN dc.status = 'stop'    THEN dc.place_id END)::int    AS deal_stop
      FROM places p
      LEFT JOIN place_phones     pp ON pp.place_id = p.place_id AND pp.deleted_at IS NULL
      LEFT JOIN place_lines      pl ON pl.place_id = p.place_id
      LEFT JOIN place_facebooks  pf ON pf.place_id = p.place_id
      LEFT JOIN place_instagrams pi ON pi.place_id = p.place_id
      LEFT JOIN place_emails     pe ON pe.place_id = p.place_id
      LEFT JOIN place_whatsapps  pw ON pw.place_id = p.place_id
      LEFT JOIN place_telegrams  pt ON pt.place_id = p.place_id
      LEFT JOIN deal_cases       dc ON dc.place_id = p.place_id
      WHERE p.country IS NOT NULL
      GROUP BY p.country
      ORDER BY total_places DESC
    `)
          : query(
              `
      -- ── Known cities ──
      SELECT
        p.city,
        false                                                                         AS is_other,
        NULL::text[]                                                                  AS other_city_names,
        COUNT(DISTINCT p.place_id)::int                                               AS total_places,
        COUNT(DISTINCT pp.place_id)::int                                              AS has_phone,
        COUNT(DISTINCT pl.place_id)::int                                              AS has_line,
        COUNT(DISTINCT pf.place_id)::int                                              AS has_facebook,
        COUNT(DISTINCT pi.place_id)::int                                              AS has_instagram,
        COUNT(DISTINCT pe.place_id)::int                                              AS has_email,
        COUNT(DISTINCT pw.place_id)::int                                              AS has_whatsapp,
        COUNT(DISTINCT pt.place_id)::int                                              AS has_telegram,
        COUNT(DISTINCT CASE WHEN p.has_booking = TRUE THEN p.place_id END)::int       AS has_booking,
        COUNT(DISTINCT CASE WHEN dc.status = 'success' THEN dc.place_id END)::int    AS deal_success,
        COUNT(DISTINCT CASE WHEN dc.status = 'pending' THEN dc.place_id END)::int    AS deal_pending,
        COUNT(DISTINCT CASE WHEN dc.status = 'stop'    THEN dc.place_id END)::int    AS deal_stop
      FROM places p
      LEFT JOIN place_phones     pp ON pp.place_id = p.place_id AND pp.deleted_at IS NULL
      LEFT JOIN place_lines      pl ON pl.place_id = p.place_id
      LEFT JOIN place_facebooks  pf ON pf.place_id = p.place_id
      LEFT JOIN place_instagrams pi ON pi.place_id = p.place_id
      LEFT JOIN place_emails     pe ON pe.place_id = p.place_id
      LEFT JOIN place_whatsapps  pw ON pw.place_id = p.place_id
      LEFT JOIN place_telegrams  pt ON pt.place_id = p.place_id
      LEFT JOIN deal_cases       dc ON dc.place_id = p.place_id
      WHERE p.city = ANY($1) AND p.country = $2
      GROUP BY p.city

      UNION ALL

      -- ── Other (city ไม่อยู่ใน whitelist) ──
      SELECT
        '⚠️ Other'                                                                    AS city,
        true                                                                          AS is_other,
        ARRAY_AGG(DISTINCT p.city ORDER BY p.city)
          FILTER (WHERE p.city IS NOT NULL)                                           AS other_city_names,
        COUNT(DISTINCT p.place_id)::int,
        COUNT(DISTINCT pp.place_id)::int,
        COUNT(DISTINCT pl.place_id)::int,
        COUNT(DISTINCT pf.place_id)::int,
        COUNT(DISTINCT pi.place_id)::int,
        COUNT(DISTINCT pe.place_id)::int,
        COUNT(DISTINCT pw.place_id)::int,
        COUNT(DISTINCT pt.place_id)::int,
        COUNT(DISTINCT CASE WHEN p.has_booking = TRUE THEN p.place_id END)::int,
        COUNT(DISTINCT CASE WHEN dc.status = 'success' THEN dc.place_id END)::int,
        COUNT(DISTINCT CASE WHEN dc.status = 'pending' THEN dc.place_id END)::int,
        COUNT(DISTINCT CASE WHEN dc.status = 'stop'    THEN dc.place_id END)::int
      FROM places p
      LEFT JOIN place_phones     pp ON pp.place_id = p.place_id AND pp.deleted_at IS NULL
      LEFT JOIN place_lines      pl ON pl.place_id = p.place_id
      LEFT JOIN place_facebooks  pf ON pf.place_id = p.place_id
      LEFT JOIN place_instagrams pi ON pi.place_id = p.place_id
      LEFT JOIN place_emails     pe ON pe.place_id = p.place_id
      LEFT JOIN place_whatsapps  pw ON pw.place_id = p.place_id
      LEFT JOIN place_telegrams  pt ON pt.place_id = p.place_id
      LEFT JOIN deal_cases       dc ON dc.place_id = p.place_id
      WHERE (p.city IS NULL OR p.city NOT IN (SELECT unnest($1::text[])))
        AND p.country = $2

      ORDER BY is_other ASC, total_places DESC
      `,
              [cities, country!],
            ),

        // ── 4. Service Type Stats ─────────────────────────────────────────────
        query(
          `
        SELECT
          COUNT(DISTINCT CASE WHEN service_type = ANY(ARRAY[
            'restaurant','thai_restaurant','seafood_restaurant','noodle_shop',
            'family_restaurant','fast_food_restaurant','buffet_restaurant',
            'chinese_restaurant','japanese_restaurant','korean_restaurant',
            'italian_restaurant','indian_restaurant','halal_restaurant',
            'dessert_restaurant','pizza_restaurant','steak_house',
            'barbecue_restaurant','asian_restaurant','vietnamese_restaurant',
            'sushi_restaurant','chicken_restaurant','brunch_restaurant',
            'breakfast_restaurant','hot_pot_restaurant','hamburger_restaurant',
            'dim_sum_restaurant','yakiniku_restaurant','korean_barbecue_restaurant',
            'ramen_restaurant','western_restaurant','fusion_restaurant',
            'asian_fusion_restaurant','japanese_izakaya_restaurant',
            'chinese_noodle_restaurant','vegetarian_restaurant','vegan_restaurant',
            'fine_dining_restaurant','french_restaurant','turkish_restaurant',
            'mexican_restaurant','american_restaurant','mediterranean_restaurant',
            'kebab_shop','sandwich_shop','salad_shop','bistro','diner',
            'food_court','meal_takeaway','meal_delivery','food','food_store',
            'food_drink','chicken_wings_restaurant','dumpling_restaurant',
            'cantonese_restaurant','lebanese_restaurant','middle_eastern_restaurant',
            'burmese_restaurant','indonesian_restaurant','greek_restaurant',
            'german_restaurant','russian_restaurant','european_restaurant',
            'eastern_european_restaurant','taiwanese_restaurant','tonkatsu_restaurant',
            'japanese_curry_restaurant','soup_restaurant','snack_bar','deli','cafeteria'
          ]) THEN place_id END)::int AS restaurant_food,
          COUNT(DISTINCT CASE WHEN service_type = ANY(ARRAY[
            'cafe','coffee_shop','coffee_roastery','coffee_stand','bakery',
            'cake_shop','dessert_shop','pastry_shop','donut_shop','ice_cream_shop',
            'candy_store','confectionery','juice_shop','tea_house','cat_cafe',
            'dog_cafe','bagel_shop'
          ]) THEN place_id END)::int AS cafe_drinks,
          COUNT(DISTINCT CASE WHEN service_type = ANY(ARRAY[
            'bar','pub','cocktail_bar','night_club','sports_bar','lounge_bar',
            'wine_bar','beer_garden','bar_and_grill','brewpub','brewery',
            'hookah_bar','irish_pub','karaoke','live_music_venue'
          ]) THEN place_id END)::int AS bar_nightlife,
          COUNT(DISTINCT CASE WHEN service_type = ANY(ARRAY[
            'hotel','resort_hotel','hostel','guest_house','lodging','inn',
            'private_guest_room','extended_stay_hotel','farmstay','bed_and_breakfast',
            'cottage','campground','camping_cabin','motel','apartment_building',
            'apartment_complex','condominium_complex','rest_stop'
          ]) THEN place_id END)::int AS accommodation,
          COUNT(DISTINCT CASE WHEN service_type = ANY(ARRAY[
            'spa','massage_spa','massage','sauna','public_bath','hair_salon',
            'beauty_salon','nail_salon','barber_shop','beautician','skin_care_clinic',
            'makeup_artist','fitness_center','gym','yoga_studio','wellness_center',
            'swimming_pool','sports_coaching','sports_club','sports_complex',
            'sports_activity_location','sports_school','medical_clinic','doctor',
            'health','health_food_store','pet_care'
          ]) THEN place_id END)::int AS health_beauty,
          COUNT(DISTINCT CASE WHEN service_type = ANY(ARRAY[
            'tour_agency','travel_agency','tourist_attraction',
            'tourist_information_center','ferry_service','scenic_spot',
            'historical_landmark','botanical_garden','zoo','wildlife_park',
            'water_park','adventure_sports_center','go_karting_venue','race_course',
            'fishing_pond','fishing_pier','fishing_charter','golf_course','farm','ranch'
         ]) THEN place_id END)::int AS travel_tourism
FROM places p ${country ? "WHERE p.country = $1" : ""}`,
          country ? [country] : [],
        ),
      ]);

    return NextResponse.json({
      contact_stats: contactResult.rows[0],
      deal_stats: dealResult.rows[0],
      provinces: provinceResult.rows,
      service_stats: serviceResult.rows[0],
      is_all: isAll,
    });
  } catch (err) {
    console.error("[summary] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
