# 🧪 Dashboard Testing Guide

> อัปเดต: 19 พ.ค. 2026 | ร้านทดสอบ: TEST_FULL_001, TEST_FULL_002

---

## Step 1 — INSERT ข้อมูลทดสอบ

```sql
-- places
INSERT INTO places (place_id, name, city, service_type, business_status, has_booking, google_map_url, rating, website)
VALUES
  ('TEST_FULL_001', 'ร้านทดสอบ Full Contact', 'กรุงเทพมหานคร', 'restaurant', 'OPERATIONAL', true, 'https://maps.google.com/?cid=123456', 4.5, 'https://testfull001.com'),
  ('TEST_FULL_002', 'ร้านทดสอบ Full Contact 2', 'เชียงใหม่', 'cafe', 'OPERATIONAL', false, 'https://maps.google.com/?cid=789012', 4.2, 'https://testfull002.com');

-- phones
INSERT INTO place_phones (place_id, number, normalized, label, is_primary, is_manual, added_by, source)
VALUES
  ('TEST_FULL_001', '0812345678', '0812345678', 'เจ้าของ', true, false, 'scraper', 'scraper'),
  ('TEST_FULL_001', '0898765432', '0898765432', 'ผู้จัดการ', false, false, 'scraper', 'scraper'),
  ('TEST_FULL_002', '0823456789', '0823456789', 'หน้าร้าน', true, false, 'scraper', 'scraper');

-- lines
INSERT INTO place_lines (place_id, line_id, line_url, type)
VALUES
  ('TEST_FULL_001', '@testfull001', 'https://line.me/R/ti/p/@testfull001', 'oa'),
  ('TEST_FULL_002', '@testfull002', 'https://line.me/R/ti/p/@testfull002', 'oa');

-- emails
INSERT INTO place_emails (place_id, address)
VALUES
  ('TEST_FULL_001', 'contact@testfull001.com'),
  ('TEST_FULL_002', 'info@testfull002.com');

-- facebooks
INSERT INTO place_facebooks (place_id, url)
VALUES
  ('TEST_FULL_001', 'https://www.facebook.com/testfull001'),
  ('TEST_FULL_002', 'https://www.facebook.com/testfull002');

-- instagrams
INSERT INTO place_instagrams (place_id, handle, instagram_url)
VALUES
  ('TEST_FULL_001', 'testfull001', 'https://www.instagram.com/testfull001'),
  ('TEST_FULL_002', 'testfull002', 'https://www.instagram.com/testfull002');

-- messengers
INSERT INTO place_messengers (place_id, url)
VALUES
  ('TEST_FULL_001', 'https://m.me/testfull001'),
  ('TEST_FULL_002', 'https://m.me/testfull002');

-- whatsapps
INSERT INTO place_whatsapps (place_id, number)
VALUES
  ('TEST_FULL_001', '0812345678'),
  ('TEST_FULL_002', '0823456789');

-- telegrams
INSERT INTO place_telegrams (place_id, telegram_url)
VALUES
  ('TEST_FULL_001', 'https://t.me/testfull001'),
  ('TEST_FULL_002', 'https://t.me/testfull002');
```

---

## Step 2 — Test Cases

### 📝 Note

| #   | Test                | วิธีทำ                                                | Expected                       |
| --- | ------------------- | ----------------------------------------------------- | ------------------------------ |
| 1   | เพิ่ม note          | login sale → เปิด TEST_FULL_001 → พิมพ์ note → บันทึก | note แสดงใน dashboard          |
| 2   | แก้ note            | คลิก ✏️ แก้ note ตัวเอง                               | log บันทึกใน `place_note_logs` |
| 3   | ลบ note             | คลิก 🗑️ ลบ note ตัวเอง                                | note หายจาก dashboard          |
| 4   | sale ลบ note คนอื่น | login sale → ลบ note ของ admin                        | ❌ ปุ่มไม่แสดง                 |

**เช็ค DB:**

```sql
SELECT n.*, u.name AS author FROM place_notes n
JOIN users u ON u.id = n.user_id
WHERE n.place_id IN ('TEST_FULL_001', 'TEST_FULL_002')
ORDER BY n.created_at DESC;

SELECT * FROM place_note_logs
WHERE note_id IN (
  SELECT id FROM place_notes
  WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002')
);
```

---

### 📋 Contact Edit Request

| #   | Test                | วิธีทำ                                                                        | Expected                              |
| --- | ------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| 1   | เพิ่มเบอร์โทร       | login sale → TEST_FULL_001 → + เพิ่มเบอร์ → `0944444444` label `เบอร์ส่วนตัว` | status = pending                      |
| 2   | แก้ไขเบอร์          | login sale → กดแก้ไข โทรศัพท์ 1 → เปลี่ยนเป็น `0811111111`                    | status = pending                      |
| 3   | ลบเบอร์             | login sale → กดลบ โทรศัพท์ 2 → ใส่เหตุผล                                      | status = pending                      |
| 4   | แก้ไข LINE OA       | login sale → กด + เพิ่มข้อมูล LINE OA → `@newline001`                         | status = pending                      |
| 5   | แก้ไข Email         | login sale → กด + เพิ่มข้อมูล Email → `new@testfull001.com`                   | status = pending                      |
| 6   | Admin approve       | login admin → /admin/requests → approve ทุก request                           | status = approved, contact อัปเดต     |
| 7   | Admin reject        | login admin → reject 1 request                                                | status = rejected, contact ไม่เปลี่ยน |
| 8   | Sale ดู status      | login sale → dashboard → เปิด TEST_FULL_001                                   | เห็น badge pending/approved           |
| 9   | Sale ยกเลิก request | login sale → กด "ยกเลิกคำขอ"                                                  | status = rejected                     |

**เช็ค DB หลัง approve:**

```sql
-- เช็ค contact_edit_logs
SELECT l.action, r.field_type, r.old_value, r.new_value, r.place_id
FROM contact_edit_logs l
JOIN contact_edit_requests r ON r.id = l.request_id
WHERE r.place_id IN ('TEST_FULL_001', 'TEST_FULL_002')
ORDER BY r.created_at DESC;

-- เช็ค place_phones
SELECT number, label, is_manual, deleted_at
FROM place_phones
WHERE place_id = 'TEST_FULL_001'
ORDER BY created_at DESC;

-- เช็ค contact_history (trigger)
SELECT table_name, action, old_value, new_value, changed_by, changed_at
FROM contact_history
WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002')
ORDER BY changed_at DESC
LIMIT 20;
```

---

### 🕓 Contact History (Admin)

| #   | Test              | วิธีทำ                                                                    | Expected                               |
| --- | ----------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| 1   | ดูประวัติ scraper | login admin → /admin/contact-history → ค้นหา TEST_FULL_001 → กด ดูประวัติ | เห็น 🤖 scraper events                 |
| 2   | ดูประวัติ manual  | หลัง approve request → กด ดูประวัติ                                       | เห็น ✏️ manual events                  |
| 3   | ค้นหาด้วยชื่อ     | พิมพ์ "Full Contact"                                                      | เห็นเฉพาะ TEST_FULL_001, TEST_FULL_002 |

---

## Step 3 — CLEAR ข้อมูลทดสอบ

```sql
-- ลบ note logs
DELETE FROM place_note_logs
WHERE note_id IN (
  SELECT id FROM place_notes
  WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002')
);

-- ลบ notes
DELETE FROM place_notes
WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');

-- ลบ request logs
DELETE FROM contact_edit_logs
WHERE request_id IN (
  SELECT id FROM contact_edit_requests
  WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002')
);

-- ลบ requests
DELETE FROM contact_edit_requests
WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');

-- ลบ contacts
DELETE FROM place_phones WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
DELETE FROM place_lines WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
DELETE FROM place_emails WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
DELETE FROM place_facebooks WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
DELETE FROM place_instagrams WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
DELETE FROM place_messengers WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
DELETE FROM place_whatsapps WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
DELETE FROM place_telegrams WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');

-- ลบ places
DELETE FROM places
WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
```

**เช็คว่าสะอาดแล้ว:**

```sql
SELECT COUNT(*) FROM places WHERE place_id IN ('TEST_FULL_001', 'TEST_FULL_002');
-- Expected: 0
```

---

## Step 4 — ลำดับการทดสอบแนะนำ

1. รัน INSERT (Step 1)
2. Login sale → ทดสอบ Note ทุกตัว (Step 2 Note)
3. Login sale → ส่ง Contact Request ทุกตัว (Step 2 Request #1-5)
4. Login admin → approve/reject (Step 2 Request #6-7)
5. Login sale → ตรวจ badge + ยกเลิก request (Step 2 Request #8-9)
6. Login admin → ตรวจ Contact History (Step 2 History)
7. รัน CLEAR (Step 3)
8. เช็คว่า places หายแล้ว
