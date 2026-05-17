import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const cities = searchParams.getAll("city");
  const serviceTypes = searchParams.getAll("serviceType");
  const hasBooking = searchParams.get("hasBooking");

  const conditions: string[] = ["1=1"];
  const values: unknown[] = [];
  let i = 1;

  if (cities.length > 0) {
    conditions.push(`p.city = ANY($${i++})`);
    values.push(cities);
  }

  if (serviceTypes.length > 0) {
    const rawTypes = serviceTypes.flatMap((s) => SERVICE_TYPE_MAP[s] || [s]);
    conditions.push(`p.service_type = ANY($${i++})`);
    values.push(rawTypes);
  }

  if (hasBooking === "yes") conditions.push(`p.has_booking = TRUE`);
  if (hasBooking === "no")
    conditions.push(`(p.has_booking = FALSE OR p.has_booking IS NULL)`);

  const where = conditions.join(" AND ");

  try {
    const { rows } = await pool.query(
      `
      SELECT
        p.place_id, p.name, p.address, p.city, p.country,
        p.google_map_url, p.service_type, p.service_types,
        p.business_status, p.website, p.rating, p.total_reviews,
        p.description, p.has_booking, p.opening_hours,
        MAX(CASE WHEN ph.is_primary = TRUE THEN ph.number END) AS phone,
        MAX(CASE WHEN (ph.is_primary IS NULL OR ph.is_primary = FALSE) THEN ph.number END) AS phone2,
        MAX(CASE WHEN pl.type = 'oa' THEN pl.line_id END) AS line_oa,
        MAX(CASE WHEN pl.type = 'personal' THEN pl.line_id END) AS line_personal,
        MAX(pl.line_url) AS line_url,
        MAX(pe.address) AS email,
        MAX(pfb.url) AS facebook_url,
        MAX(pig.handle) AS instagram_handle,
        MAX(pig.instagram_url) AS instagram_url,
        MAX(pm.url) AS messenger_url,
        MAX(pw.number) AS whatsapp,
        MAX(pt.telegram_url) AS telegram_url
      FROM places p
      LEFT JOIN place_phones     ph  ON ph.place_id = p.place_id AND ph.deleted_at IS NULL
      LEFT JOIN place_lines      pl  ON pl.place_id = p.place_id
      LEFT JOIN place_emails     pe  ON pe.place_id = p.place_id
      LEFT JOIN place_facebooks  pfb ON pfb.place_id = p.place_id
      LEFT JOIN place_instagrams pig ON pig.place_id = p.place_id
      LEFT JOIN place_messengers pm  ON pm.place_id = p.place_id
      LEFT JOIN place_whatsapps  pw  ON pw.place_id = p.place_id
      LEFT JOIN place_telegrams  pt  ON pt.place_id = p.place_id
      WHERE ${where}
      GROUP BY p.place_id, p.name, p.address, p.city, p.country,
        p.google_map_url, p.service_type, p.service_types,
        p.business_status, p.website, p.rating, p.total_reviews,
        p.description, p.has_booking, p.opening_hours
      ORDER BY p.city, p.name
    `,
      values,
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[api/export]", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
