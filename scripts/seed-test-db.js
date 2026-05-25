// scripts/seed-test-db.js
const { Client } = require('pg')

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'postgres',
  user: 'postgres',
  password: 'Merc',
})

const CITIES = [
  'กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'พัทยา', 'ขอนแก่น',
  'นครราชสีมา', 'อุดรธานี', 'สงขลา', 'สุราษฎร์ธานี', 'ระยอง',
  'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'เชียงราย', 'กาญจนบุรี',
]

const SERVICE_TYPES = [
  'restaurant', 'cafe', 'hotel', 'spa', 'bar',
  'resort_hotel', 'thai_restaurant', 'seafood_restaurant',
  'coffee_shop', 'massage_spa', 'tour_agency', 'hostel',
  'night_club', 'bakery', 'gym',
]

const COUNTRIES = ['TH', 'TH', 'TH', 'TH', 'SG', 'MY', 'VN']

const STATUSES = ['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY']

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomBool(trueChance = 0.5) {
  return Math.random() < trueChance
}

async function createSchema() {
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS places (
      id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      place_id           TEXT NOT NULL UNIQUE,
      name               TEXT,
      address            TEXT,
      city               TEXT,
      country            TEXT DEFAULT 'TH',
      description        TEXT,
      dress_code         TEXT,
      google_map_url     TEXT,
      latitude           NUMERIC(10,7),
      longitude          NUMERIC(10,7),
      service_type       TEXT,
      service_types      JSONB DEFAULT '[]',
      business_status    TEXT DEFAULT 'OPERATIONAL',
      website            TEXT,
      rating             NUMERIC(3,1),
      total_reviews      INTEGER,
      shop_quality_score INTEGER DEFAULT 0,
      scraped            BOOLEAN DEFAULT false,
      scraped_at         TIMESTAMPTZ,
      scrape_batch       TEXT,
      extra              JSONB DEFAULT '{}',
      created_at         TIMESTAMPTZ DEFAULT now(),
      updated_at         TIMESTAMPTZ DEFAULT now(),
      opening_hours      JSONB DEFAULT '{}',
      has_booking        BOOLEAN,
      last_activity_at   TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_places_place_id      ON places(place_id);
    CREATE INDEX IF NOT EXISTS idx_places_city          ON places(city);
    CREATE INDEX IF NOT EXISTS idx_places_business_status ON places(business_status);
    CREATE INDEX IF NOT EXISTS idx_places_city_status   ON places(city, business_status);
    CREATE INDEX IF NOT EXISTS idx_places_scraped       ON places(scraped);
  `)
  console.log('✅ Schema created')
}

async function seed() {
  await client.connect()
  console.log('🔗 Connected to merchant_db_test')

  await createSchema()

  const TOTAL = 1_000_000
  const BATCH = 10_000
  const batches = TOTAL / BATCH

  console.log(`🌱 Seeding ${TOTAL.toLocaleString()} records in ${batches} batches...`)
  const start = Date.now()

  for (let b = 0; b < batches; b++) {
    const rows = []

    for (let i = 0; i < BATCH; i++) {
      const n = b * BATCH + i
      const city = randomItem(CITIES)
      const country = randomItem(COUNTRIES)
      const serviceType = randomItem(SERVICE_TYPES)
      const status = randomItem(STATUSES)
      const rating = randomBool(0.8) ? randomFloat(1, 5) : null
      const hasBooking = randomBool(0.3) ? true : randomBool(0.3) ? false : null
      const lat = randomFloat(5.5, 20.5, 7)
      const lng = randomFloat(97.5, 105.5, 7)
      const lastActivity = randomBool(0.4)
        ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        : null

      rows.push([
        `ChIJ_test_${String(n).padStart(8, '0')}`,  // place_id
        `ร้าน Test ${n + 1}`,                         // name
        `${n + 1} ถนนทดสอบ ${city}`,                 // address
        city,
        country,
        `https://maps.google.com/?q=${lat},${lng}`,  // google_map_url
        lat,
        lng,
        serviceType,
        status,
        rating,
        Math.floor(Math.random() * 5000),            // total_reviews
        hasBooking,
        lastActivity,
        new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(), // scraped_at
      ])
    }

    // bulk insert ด้วย unnest — เร็วกว่า multi-row VALUES
    await client.query(`
      INSERT INTO places (
        place_id, name, address, city, country,
        google_map_url, latitude, longitude,
        service_type, business_status,
        rating, total_reviews, has_booking,
        last_activity_at, scraped_at
      )
      SELECT * FROM unnest(
        $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
        $6::text[], $7::numeric[], $8::numeric[],
        $9::text[], $10::text[],
        $11::numeric[], $12::integer[], $13::boolean[],
        $14::timestamptz[], $15::timestamptz[]
      )
    `, [
      rows.map(r => r[0]),
      rows.map(r => r[1]),
      rows.map(r => r[2]),
      rows.map(r => r[3]),
      rows.map(r => r[4]),
      rows.map(r => r[5]),
      rows.map(r => r[6]),
      rows.map(r => r[7]),
      rows.map(r => r[8]),
      rows.map(r => r[9]),
      rows.map(r => r[10]),
      rows.map(r => r[11]),
      rows.map(r => r[12]),
      rows.map(r => r[13]),
      rows.map(r => r[14]),
    ])

    if ((b + 1) % 10 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      const pct = (((b + 1) / batches) * 100).toFixed(0)
      console.log(`  ${pct}% — ${((b + 1) * BATCH).toLocaleString()} rows — ${elapsed}s`)
    }
  }

  const total = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n✅ Done! 1,000,000 rows in ${total}s`)
  await client.end()
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})