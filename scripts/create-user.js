// scripts/create-user.js
// # สร้าง sale
// node scripts/create-user.js "สมชาย ใจดี" somchai@sales.com sale mypass123

// # สร้าง admin
// node scripts/create-user.js "Admin2" admin2@sales.com admin admin@1234
// node scripts/create-user.js "สมชาย ใจดี" somchai@sales.com sale mypass123
// #                            ^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^ ^^^^ ^^^^^^^^^
// #                            ชื่อ (name)   email (username)   role password
//Username = somchai@sales.com
// Password = mypass123




const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

require('dotenv').config({ path: '.env.local' })

const [,, name, email, role, password] = process.argv

if (!name || !email || !role || !password) {
  console.error('Usage: node scripts/create-user.js "ชื่อ" email role password')
  console.error('Example: node scripts/create-user.js "สมชาย" somchai@sales.com sale mypass123')
  process.exit(1)
}

if (!['admin', 'sale'].includes(role)) {
  console.error('role ต้องเป็น admin หรือ sale เท่านั้น')
  process.exit(1)
}

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB || 'merchant_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
})

async function main() {
  try {
    const hash = await bcrypt.hash(password, 10)

    const { rows } = await pool.query(
      `INSERT INTO users (email, name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase().trim(), name, role, hash]
    )

    console.log('✅ สร้าง user สำเร็จ!')
    console.log(`   ID    : ${rows[0].id}`)
    console.log(`   Name  : ${rows[0].name}`)
    console.log(`   Email : ${rows[0].email}`)
    console.log(`   Role  : ${rows[0].role}`)
    console.log(`   Password : ${password}`)
  } catch (err) {
    if (err.code === '23505') {
      console.error('❌ Email นี้มีอยู่แล้วในระบบ')
    } else {
      console.error('❌ Error:', err.message)
    }
  } finally {
    await pool.end()
  }
}

main()