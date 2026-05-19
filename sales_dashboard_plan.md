    # 📊 Sales Dashboard — Project Plan

    > อัปเดตล่าสุด: 16 May 2026 (v3 — EOD)

    ---

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

    ## 3. โครงสร้างไฟล์ปัจจุบัน

    ```
    sales-dashboard/
    ├── app/
    │   ├── page.tsx                        ✅ redirect → /dashboard
    │   ├── layout.tsx                      ✅ + nav link /admin/contact-history
    │   ├── login/page.tsx                  ✅
    │   ├── profile/page.tsx                ✅
    │   ├── dashboard/
    │   │   ├── page.tsx                    ✅
    │   │   └── [id]/page.tsx               ✅ phones array + PhoneRow
    │   ├── notes/
    │   │   ├── page.tsx                    ✅
    │   │   └── all/page.tsx                ✅
    │   ├── report/page.tsx                 ❌ placeholder (TODO: Recharts)
    │   └── admin/
    │       ├── requests/page.tsx           ✅ + fieldLabel phone_new, phone_edit
    │       ├── users/page.tsx              ✅
    │       └── contact-history/
    │           └── page.tsx                ✅ search + date filter + timeline modal
    ├── api/
    │   ├── auth/
    │   │   ├── login/route.ts              ✅
    │   │   ├── logout/route.ts             ✅
    │   │   ├── me/route.ts                 ✅
    │   │   └── profile/route.ts            ✅
    │   ├── dashboard/route.ts              ✅
    │   ├── export/route.ts                 ✅
    │   ├── filters/route.ts                ✅
    │   ├── notes/
    │   │   ├── route.ts                    ✅
    │   │   └── [id]/route.ts               ✅
    │   ├── places/
    │   │   ├── [id]/route.ts               ✅ phones array
    │   │   └── [id]/phones/route.ts        ✅ (deprecated)
    │   ├── requests/
    │   │   ├── route.ts                    ✅
    │   │   └── [id]/route.ts               ✅ phone_new, phone_edit cases
    │   ├── report-issue/
    │   │   └── route.ts                    ✅ POST → Telegram Bot
    │   ├── admin/
    │   │   └── contact-history/
    │   │       ├── route.ts                ✅ DISTINCT ON place_id + date filter
    │   │       └── [placeId]/
    │   │           └── [contactType]/
    │   │               └── route.ts        ✅ scraper + manual merge
    │   └── verifications/route.ts          ✅
    ├── components/
    │   ├── LogoutButton.tsx                ✅
    │   ├── ExportModal.tsx                 ✅
    │   ├── ThemeToggle.tsx                 ✅
    │   └── ReportIssueButton.tsx           ✅
    ├── lib/
    │   ├── db.ts                           ✅
    │   ├── auth.ts                         ✅
    │   └── providers.tsx                   ✅
    ├── middleware.ts                        ✅
    ├── scripts/
    │   └── create-user.js                  ✅
    └── .env.local                          ✅
    ```

    ---

    ## 4. Features Status

    ### ✅ เสร็จแล้ว
    - [x] Login / Logout / JWT auth
    - [x] Role-based nav (admin เห็น Requests)
    - [x] ตาราง + filter (City, Service Type, Status, Booking, Noted)
    - [x] STATUS badge (🟡 Pending / ✅ Noted / 🔵 Approved)
    - [x] คลิก row → place detail
    - [x] Note: เพิ่ม/แก้/ลบ + log + role permission
    - [x] Export CSV modal — multi-select จังหวัด/serviceType + column selector
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

    ### ❌ TODO หลัง Demo
    - [ ] Note Template Button — [โทรติด][โทรไม่รับ][ขอโทรกลับ][ปิดดีล][ปฏิเสธ]
    - [ ] /report — Recharts (sale: bar+donut / admin: grouped bar + filter by sale)
    - [ ] LINE Notify — 3 events (request/approve/reject)
    - [ ] แจ้งปัญหา — floating button → Telegram Bot

    ---

    ## 5. Auth & Permission

    | หน้า | Sale | Admin |
    |------|------|-------|
    | /dashboard | ✅ | ✅ |
    | /dashboard/[id] | ✅ | ✅ |
    | /notes | ✅ ของตัวเอง | ✅ ของตัวเอง |
    | /notes/all | ✅ อ่านอย่างเดียว | ✅ อ่านอย่างเดียว |
    | /admin/requests | ❌ redirect | ✅ |
    | /admin/users | ❌ redirect | ✅ |
    | /profile | ✅ | ✅ |

    | action | Sale | Admin |
    |--------|------|-------|
    | เพิ่ม note | ✅ | ✅ |
    | แก้/ลบ note ตัวเอง | ✅ | ✅ |
    | แก้/ลบ note คนอื่น | ❌ | ✅ |
    | แจ้งแก้ไข contact | ✅ | ✅ |
    | approve/reject request | ❌ | ✅ |

    ---

    ## 6. Service Type Groups ทำแล้ว 

    | Group | Label |
    |-------|-------|
    | restaurant_food | 🍽️ Restaurant & Food |
    | cafe_drinks | ☕ Cafe & Drinks |
    | bar_nightlife | 🍺 Bar & Nightlife |
    | accommodation | 🏨 Accommodation |
    | health_beauty | 💆 Health & Beauty |
    | travel_tourism | ✈️ Travel & Tourism |
    | other | 🛍️ Other |

    ---

    ## 7. Note Template (TODO) ยังไม่ทำรอ หลังพรีเซ้น 

    ```
    [โทรติด]     → "โทรติด [ชื่อ] สนใจ/ไม่สนใจ เพราะ..."
    [โทรไม่รับ]  → "โทรไม่รับ ครั้งที่ "
    [ขอโทรกลับ]  → "ขอโทรกลับ วัน/เวลา "
    [ปิดดีล]     → "ปิดได้แล้ว "
    [ปฏิเสธ]     → "ปฏิเสธ เพราะ..."
    ```

    ---

    ## 8. Accounts ทดสอบ รอทำหลังตกแต่ง 

    | Email | Password | Role |
    |-------|----------|------|
    | admin@sales.com | admin1234 | admin |
    | test@test.com | sale1234 | sale |
    | sale2@sales.com | sale2pass | sale |

    ---

    ## 9. Pending Decisions

    | หัวข้อ | สถานะ |
    |--------|-------|
    | LINE Notify token | รอสร้าง |
    | Telegram Bot token | แผนใหม่ — รอตัดสินใจ |
    | DB บริษัท (host/credentials) | รอบริษัทแจ้ง |
    | /report design | รอตัดสินใจหลัง demo |
    | Activity log tab | TODO หลัง demo |

    ---

    ## 10. Demo 20 พ.ค. 🎯

    **พร้อม demo แล้ว** — feature หลักครบทั้งหมด