    # 📊 Sales Dashboard — Project Plan

    > อัปเดตล่าสุด: 16 May 2026 (v3 — EOD)

    ---

ดู DB ผ่าน docker
C:\Users\Saranphat>docker ps
CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES
a6f728c7b959 postgres:17 "docker-entrypoint.s…" 13 days ago Up 9 minutes 0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp merchant_db

C:\Users\Saranphat>

    ## 1. Stack

    | Layer    | Technology                                      |
    | -------- | ----------------------------------------------- |
    | Frontend | Next.js (App Router) + Tailwind CSS             |
    | Auth     | JWT (jose) + bcryptjs — httpOnly cookie         |
    | DB       | PostgreSQL (`merchant_db`) — รวมทุก table       |
    | ORM      | `pg` (raw SQL)                                  |
    | Deploy   | รอ DB บริษัท → Next.js ชี้ไปที่นั้น             |
    | Notify   | LINE Group (รอ token) / Telegram Bot (แผนใหม่)  |

    ---

    ## 2. DB Tables (19 tables)

    ### ข้อมูลหลัก
    | Table | หมายเหตุ |
    |-------|---------|
    | `places` | master table — ชื่อ ที่อยู่ rating website scrape_batch |
    | `users` | id, email, name, role, password_hash, created_at |

    ### Contact Tables
    | Table | หมายเหตุ |
    |-------|---------|
    | `place_phones` | เบอร์โทรศัพท์ + is_primary + deleted_at |
    | `place_lines` | LINE OA/personal — line_id, line_url, type |
    | `place_emails` | อีเมล |
    | `place_facebooks` | Facebook URL |
    | `place_instagrams` | handle + instagram_url |
    | `place_messengers` | Messenger URL |
    | `place_whatsapps` | WhatsApp number |
    | `place_telegrams` | telegram_url |

    ### Notes & Logs
    | Table | หมายเหตุ |
    |-------|---------|
    | `place_notes` | place_id, user_id, note, created_at, updated_at |
    | `place_note_logs` | note_id, user_id, old_note, new_note, changed_at |

    ### Requests
    | Table | หมายเหตุ |
    |-------|---------|
    | `contact_edit_requests` | place_id, field_type, old/new_value, reason, status, requested_by, reviewed_by |
    | `contact_edit_logs` | request_id, action, final_value, approved_by, approved_at |
    | `contact_verifications` | ระบบ verify contact |

    ### ระบบ (เดิม)
    | Table | หมายเหตุ |
    |-------|---------|
    | `scrape_logs` | log scrape — scrape_ok, duration, batch_name |
    | `rescrape_queue` | queue rescrape — status pending/scraping/done/failed |
    | `contact_history` | ประวัติ contact ก่อน rescrape |
    | `place_payment_info` | transfer_account, transfer_name |

    ---
    -- New Table

deal_cases
├── id SERIAL PRIMARY KEY
├── place_id VARCHAR(255) FK → places(place_id)
├── sale_id UUID FK → users(id)
├── reference_code VARCHAR(30) NULL ← optional สำหรับ pending
├── status deal_status (pending | success)
├── note TEXT NULL
├── created_at TIMESTAMPTZ
└── updated_at TIMESTAMPTZ ← auto-update via trigger

-- New Type
deal_status ENUM ('pending', 'success')

-- Indexes
idx_deal_cases_place_id
idx_deal_cases_sale_id
idx_deal_cases_status

-- Trigger
trg_deal_cases_updated_at → auto-update updated_at

    ## 3. โครงสร้างไฟล์ปัจจุบัน

    ```
    sales-dashboard/

sales-dashboard/
├── app/
│   ├── page.tsx ✅                          — redirect → /dashboard
│   ├── layout.tsx ✅                        — root layout + ThemeProvider
│   ├── login/page.tsx ✅                    — หน้า login + JWT cookie
│   ├── profile/page.tsx ✅                  — เปลี่ยนชื่อ + password
│   ├── dashboard/
│   │   ├── page.tsx ✅                      — ตารางร้าน + filter + Country Dropdown + Stats 4 ตัว + DashboardSummaryModal
│   │   └── [id]/page.tsx ✅                 — place detail + notes + contact + deal cases card
│   ├── notes/
│   │   ├── page.tsx ✅                      — note history ของตัวเอง + search
│   │   └── all/page.tsx ✅                  — note history ทุกคน + อ่านอย่างเดียว
│   ├── report/page.tsx ❌                   — TODO: Recharts (เก็บไว้ทำทีหลัง)
│   └── admin/
│       ├── requests/page.tsx ✅             — จัดการ contact edit requests (Accept/Edit/Reject/Delete)
│       ├── users/page.tsx ✅                — จัดการ users ทั้งหมด
│       └── contact-history/page.tsx ✅      — ประวัติ contact ก่อน rescrape + timeline modal
├── app/api/
│   ├── auth/
│   │   ├── login/route.ts ✅               — POST login → set httpOnly JWT cookie
│   │   ├── logout/route.ts ✅              — POST logout → clear cookie
│   │   ├── me/route.ts ✅                  — GET current user จาก cookie
│   │   └── profile/route.ts ✅             — PATCH เปลี่ยนชื่อ + password
│   ├── dashboard/
│   │   ├── route.ts ✅                     — GET ตารางร้าน + filter + country filter + pagination
│   │   ├── stats/route.ts ✅               — GET 4 ตัวเลข: Merchants / Noted / In Progress / Success
│   │   └── summary/route.ts ✅             — GET summary modal: contact stats + 77 จังหวัด (Promise.all)
│   ├── export/route.ts ✅                  — GET export CSV + country filter + deal columns
│   ├── filters/route.ts ✅                 — GET dropdown options: cities / serviceType / countries
│   ├── notes/
│   │   ├── route.ts ✅                     — GET list / POST สร้าง note
│   │   └── [id]/route.ts ✅               — PATCH แก้ / DELETE ลบ + log
│   ├── places/
│   │   ├── [id]/route.ts ✅               — GET place detail + contacts ทั้งหมด
│   │   └── [id]/phones/route.ts ✅        — (deprecated) เดิมใช้จัดการ phone
│   ├── requests/
│   │   ├── route.ts ✅                     — GET list / POST สร้าง contact edit request
│   │   └── [id]/route.ts ✅               — PATCH approve/reject + log
│   ├── report-issue/route.ts ✅            — POST ส่ง issue → Telegram Bot
│   ├── deal-cases/
│   │   ├── route.ts ✅                     — GET list / POST สร้างเคส (pending/inprocess/success/stop)
│   │   └── [id]/route.ts ✅               — PATCH แก้ไข / DELETE ยกเลิกเคส
│   ├── admin/contact-history/
│   │   ├── route.ts ✅                     — GET ประวัติ contact ทั้งหมด + search + date filter
│   │   └── [placeId]/[contactType]/route.ts ✅ — GET timeline contact รายร้านรายประเภท
│   └── verifications/route.ts ✅           — GET/POST ระบบ verify contact
├── components/
│   ├── LogoutButton.tsx ✅                  — ปุ่ม logout + redirect
│   ├── ExportModal.tsx ✅                   — modal เลือก filter + columns + export CSV
│   ├── ThemeToggle.tsx ✅                   — dark/light mode toggle
│   ├── ReportIssueButton.tsx ✅             — floating button → ส่ง issue Telegram
│   └── DashboardSummaryModal.tsx ✅         — modal สรุป overview + 77 จังหวัด + Export PDF
├── lib/
│   ├── db.ts ✅                             — PostgreSQL connection pool (pg)
│   ├── auth.ts ✅                           — JWT sign/verify + bcrypt helper
│   ├── providers.tsx ✅                     — ThemeProvider wrapper
│   └── constants/
│       └── regions.ts ✅                    — whitelist 77 จังหวัด + region grouping
├── middleware.ts ✅                          — route protection + JWT verify จาก cookie
├── scripts/create-user.js ✅               — CLI สร้าง user ใหม่ + bcrypt hash
└── .env.local ✅                            — DB / JWT secret / Telegram token

    ## 4. Features Status
## 4. Features Status

### ✅ เสร็จแล้ว
- [x] Login / Logout / JWT auth
- [x] Role-based nav (admin เห็น Requests)
- [x] ตาราง + filter (City, Service Type, Status, Booking, Noted)
- [x] STATUS badge (🟡 Pending / ✅ Noted / 🔵 Approved)
- [x] คลิก row → place detail
- [x] Note: เพิ่ม/แก้/ลบ + log + role permission
- [x] Export CSV modal — multi-select จังหวัด/serviceType + column selector + deal columns + country filter
- [x] Contact Edit Request — แจ้งแก้ไข/ลบ + validation
- [x] Admin: Accept/Edit/Reject/Delete + SweetAlert2 confirm
- [x] Sale เห็น status request ใน /dashboard/[id]
- [x] Note History (ของตัวเอง) + search
- [x] Note History All (ทุกคน) + อ่านอย่างเดียว
- [x] City whitelist 77 จังหวัด
- [x] Service Type 7 groups
- [x] Instagram normalize (URL/handle → handle + auto URL)
- [x] Profile — เปลี่ยนชื่อ + password
- [x] Admin Users — จัดการ user
- [x] scripts/create-user.js — CLI
- [x] Contact History (admin only) — search + date filter + timeline modal
- [x] Report Issue — floating button → Telegram Bot
- [x] phones array แทน phone/phone2 + PhoneRow (add/edit/delete via request)
- [x] deal_cases — บันทึกเคสการขายต่อร้าน (pending / inprocess / success / stop)
- [x] deal_status ENUM — 3 / inprocess 🔵 / success 🟢 / stop 🔴
- [x] API deal-cases — GET / POST / PATCH / DELETE
- [x] /dashboard/[id] — card 🤝 เคสการขาย + modal บันทึก/แก้ไข/ยกเลิก
- [x] Stats 4 ตัว — Merchants / Noted / In Progress / Success (แทน Deals เดิม)
- [x] Country Dropdown + country filter ทุก API
- [x] DashboardSummaryModal — overview + 77 จังหวัด + Export PDF
- [x] Telegram Bot token
- [x] Note Template Button
- [x] Activity log tab
- [x] LINE Notify token
### ❌ TODO
- [x] /report page — Recharts (เก็บไว้ทำทีหลัง)

### ⏳ รอ / Pending
- [ ] DB บริษัท (host/credentials) — รอทีมแจ้ง
- [ ] Deploy Dashboard ขึ้น server จริง — รอ DB บริษัท
- [ ] ปุ่ม Link ใน CMS → Dashboard URL — ทำหลัง deploy
- [ ] Feature เพิ่มเติมจากทีม Sale — รอรายละเอียด
สิ่งที่หัวหน้าตัดสินใจชัดเจน
1. Deploy แยกกันเลย
"db กับ repo น้องทำแยกกันอยู่"
Dashboard อยู่คนละ server กับ CMS
ไม่ต้องยุ่งกับ CMS เลย
2. ไม่ต้อง SSO / ไม่ต้อง pass token
"แค่ deploy แยกเลย แล้วใส่ปุ่ม แค่กด link มา url เรา ไม่ต้อง pass auth อะไรเลย"
CMS ใส่แค่ปุ่ม → link มา URL Dashboard
ไม่มี shared session / ไม่มี token exchange
3. Sale login เอง
"ให้ sale ไป login เองอีกรอบ ได้ ไม่ต้องนั่งไล่ flow กับ pass auth token"
Sale กดมาจาก CMS → เจอหน้า Login → กรอก credential เอง
CMS admin ใช้งานเอง ไม่ต้องอำนวยความสะดวกเยอะ


PS C:\Users\Saranphat> docker exec merchant_db psql -U postgres -d merchant_db -c "\dt"
                 List of relations
 Schema |         Name          | Type  |  Owner
--------+-----------------------+-------+----------
 public | contact_edit_logs     | table | postgres
 public | contact_edit_requests | table | postgres
 public | contact_history       | table | postgres
 public | contact_verifications | table | postgres
 public | deal_cases            | table | postgres
 public | place_emails          | table | postgres
 public | place_facebooks       | table | postgres
 public | place_instagrams      | table | postgres
 public | place_lines           | table | postgres
 public | place_messengers      | table | postgres
 public | place_note_logs       | table | postgres
 public | place_notes           | table | postgres
 public | place_payment_info    | table | postgres
 public | place_phones          | table | postgres
 public | place_telegrams       | table | postgres
 public | place_whatsapps       | table | postgres
 public | places                | table | postgres
 public | rescrape_queue        | table | postgres
 public | scrape_logs           | table | postgres
 public | users                 | table | postgres
(20 rows)

PS C:\Users\Saranphat>
PS C:\Users\Saranphat> docker exec merchant_db psql -U postgres -d merchant_db -c "\di"
                                       List of relations
 Schema |                    Name                    | Type  |  Owner   |         Table
--------+--------------------------------------------+-------+----------+-----------------------
 public | contact_edit_logs_pkey                     | index | postgres | contact_edit_logs
 public | contact_edit_requests_pkey                 | index | postgres | contact_edit_requests
 public | contact_history_pkey                       | index | postgres | contact_history
 public | contact_verifications_pkey                 | index | postgres | contact_verifications
 public | contact_verifications_place_field_unique   | index | postgres | contact_verifications
 public | deal_cases_pkey                            | index | postgres | deal_cases
 public | deal_cases_place_id_unique                 | index | postgres | deal_cases
 public | idx_contact_edit_requests_pending          | index | postgres | contact_edit_requests
 public | idx_contact_edit_requests_place_id_created | index | postgres | contact_edit_requests
 public | idx_contact_history_changed_at             | index | postgres | contact_history
 public | idx_contact_history_place_changed          | index | postgres | contact_history
 public | idx_contact_history_place_id               | index | postgres | contact_history
 public | idx_contact_history_record                 | index | postgres | contact_history
 public | idx_contact_history_table                  | index | postgres | contact_history
 public | idx_deal_cases_place_id                    | index | postgres | deal_cases
 public | idx_deal_cases_place_id_updated            | index | postgres | deal_cases
 public | idx_deal_cases_sale_id                     | index | postgres | deal_cases
 public | idx_deal_cases_shop_created                | index | postgres | deal_cases
 public | idx_deal_cases_status                      | index | postgres | deal_cases
 public | idx_place_emails_address                   | index | postgres | place_emails
 public | idx_place_emails_place_id                  | index | postgres | place_emails
 public | idx_place_facebooks_place_id               | index | postgres | place_facebooks
 public | idx_place_instagrams_place_id              | index | postgres | place_instagrams
 public | idx_place_lines_line_id                    | index | postgres | place_lines
 public | idx_place_lines_place_id                   | index | postgres | place_lines
 public | idx_place_lines_primary                    | index | postgres | place_lines
 public | idx_place_messengers_place_id              | index | postgres | place_messengers
 public | idx_place_notes_place_id_created           | index | postgres | place_notes
 public | idx_place_phones_normalized                | index | postgres | place_phones
 public | idx_place_phones_place_id                  | index | postgres | place_phones
 public | idx_place_phones_primary                   | index | postgres | place_phones
 public | idx_place_telegrams_place_id               | index | postgres | place_telegrams
 public | idx_place_whatsapps_place_id               | index | postgres | place_whatsapps
 public | idx_places_business_status                 | index | postgres | places
 public | idx_places_city                            | index | postgres | places
 public | idx_places_city_status                     | index | postgres | places
 public | idx_places_country                         | index | postgres | places
 public | idx_places_country_city                    | index | postgres | places
 public | idx_places_last_activity                   | index | postgres | places
 public | idx_places_place_id                        | index | postgres | places
 public | idx_places_scraped                         | index | postgres | places
 public | idx_places_scraped_city                    | index | postgres | places
 public | idx_rescrape_queue_place_id                | index | postgres | rescrape_queue
 public | idx_rescrape_queue_status                  | index | postgres | rescrape_queue
 public | idx_scrape_logs_batch                      | index | postgres | scrape_logs
 public | idx_scrape_logs_place_id                   | index | postgres | scrape_logs
 public | place_emails_pkey                          | index | postgres | place_emails
 public | place_facebooks_pkey                       | index | postgres | place_facebooks
 public | place_instagrams_pkey                      | index | postgres | place_instagrams
 public | place_lines_pkey                           | index | postgres | place_lines
 public | place_lines_place_id_line_id_key           | index | postgres | place_lines
 public | place_messengers_pkey                      | index | postgres | place_messengers
 public | place_note_logs_pkey                       | index | postgres | place_note_logs
 public | place_notes_pkey                           | index | postgres | place_notes
 public | place_payment_info_pkey                    | index | postgres | place_payment_info
 public | place_payment_info_place_id_key            | index | postgres | place_payment_info
 public | place_phones_pkey                          | index | postgres | place_phones
 public | place_telegrams_pkey                       | index | postgres | place_telegrams
 public | place_whatsapps_pkey                       | index | postgres | place_whatsapps
 public | places_pkey                                | index | postgres | places
 public | places_place_id_key                        | index | postgres | places
 public | rescrape_queue_pkey                        | index | postgres | rescrape_queue
 public | scrape_logs_pkey                           | index | postgres | scrape_logs
 public | udx_place_emails_address                   | index | postgres | place_emails
 public | udx_place_facebooks_url                    | index | postgres | place_facebooks
 public | udx_place_instagrams_handle                | index | postgres | place_instagrams
 public | udx_place_lines_line_id                    | index | postgres | place_lines
 public | udx_place_messengers_url                   | index | postgres | place_messengers
 public | udx_place_phones_normalized                | index | postgres | place_phones
 public | udx_place_telegrams_handle                 | index | postgres | place_telegrams
 public | udx_place_whatsapps_number                 | index | postgres | place_whatsapps
 public | users_email_key                            | index | postgres | users
 public | users_pkey                                 | index | postgres | users
(73 rows)