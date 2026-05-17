import { Pool, QueryResult, QueryResultRow } from 'pg'

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB || 'merchant_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
})

// ─── Query helper — ใช้แทน pool.query ตรงๆ ─────────────────────────────────
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

export default pool