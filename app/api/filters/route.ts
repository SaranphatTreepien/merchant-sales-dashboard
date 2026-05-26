import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  COUNTRY_DISPLAY,
  getCitiesByCountry,
  OTHER_CITY,
  OTHER_CITY_LABEL,
} from "@/lib/constants/regions";

const SERVICE_GROUPS = [
  {
    label: "🍽️ Restaurant & Food",
    value: "restaurant_food",
    types: [
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
  },
  {
    label: "☕ Cafe & Drinks",
    value: "cafe_drinks",
    types: [
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
  },
  {
    label: "🍺 Bar & Nightlife",
    value: "bar_nightlife",
    types: [
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
      "bistro",
    ],
  },
  {
    label: "🏨 Accommodation",
    value: "accommodation",
    types: [
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
  },
  {
    label: "💆 Health & Beauty",
    value: "health_beauty",
    types: [
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
  },
  {
    label: "✈️ Travel & Tourism",
    value: "travel_tourism",
    types: [
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
  },
  {
    label: "🛍️ Other",
    value: "other",
    types: [
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
      "tourist_attraction",
      "art_gallery",
      "art_studio",
    ],
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "ALL";

  try {
    const isTH = country === "TH";
    const thCities = isTH ? getCitiesByCountry("TH") : [];

    const [countryRows, cityRows, otherRows, salesRows] = await Promise.all([
      pool
        .query(
          `SELECT country, COUNT(*) as total
           FROM places
           WHERE country IS NOT NULL
           GROUP BY country
           ORDER BY total DESC`,
        )
        .then((r) => r.rows),

      country !== "ALL"
        ? isTH
          ? pool
              .query(
                `SELECT DISTINCT
                  CASE city
                    WHEN 'Pattaya'       THEN 'ชลบุรี'
                    WHEN 'Pattaya City'  THEN 'ชลบุรี'
                    WHEN 'Muang Pattaya' THEN 'ชลบุรี'
                    WHEN 'Nongprue'      THEN 'ชลบุรี'
                    WHEN 'Khlong Nueng'  THEN 'ปทุมธานี'
                    WHEN 'Nonthaburi'    THEN 'นนทบุรี'
                    WHEN 'Samut Prakan'  THEN 'สมุทรปราการ'
                    WHEN 'Ao Salat'      THEN 'ระยอง'
                    WHEN 'Ban Suan'      THEN 'ชลบุรี'
                    ELSE city
                  END AS city
                FROM places
                WHERE city = ANY($1) AND country = $2
                ORDER BY city ASC`,
                [thCities, country],
              )
              .then((r) => r.rows)
          : pool
              .query(
                `SELECT DISTINCT city
                 FROM places
                 WHERE country = $1
                   AND city IS NOT NULL AND city != ''
                 ORDER BY city ASC`,
                [country],
              )
              .then((r) => r.rows)
        : Promise.resolve([]),

      country !== "ALL" && isTH
        ? pool
            .query(
              `SELECT COUNT(*) as total
               FROM places
               WHERE country = $1
                 AND (city IS NULL OR city = '' OR city != ALL($2))`,
              [country, thCities],
            )
            .then((r) => r.rows)
        : Promise.resolve([{ total: "0" }]),

      pool
        .query(`SELECT id, name FROM users ORDER BY name ASC`)
        .then((r) => r.rows),
    ]);

    const countryList = countryRows.map((r) => ({
      code: r.country,
      name: COUNTRY_DISPLAY[r.country]?.name ?? r.country,
      flag: COUNTRY_DISPLAY[r.country]?.flag ?? r.country.toLowerCase(),
      total: parseInt(r.total),
    }));

    const allTotal = countryList.reduce((sum, c) => sum + c.total, 0);
    const countries = [
      { code: "ALL", name: "All Countries", flag: "un", total: allTotal },
      ...countryList,
    ];

    const hasOther = parseInt(otherRows[0]?.total ?? "0") > 0;
    const cities =
      country !== "ALL"
        ? [...cityRows.map((r) => r.city), ...(hasOther ? [OTHER_CITY] : [])]
        : [];

    return NextResponse.json({
      countries,
      serviceGroups: SERVICE_GROUPS,
      cities,
      otherLabel: OTHER_CITY_LABEL,
      sales: salesRows.map((r) => ({ id: r.id, name: r.name })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
