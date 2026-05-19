# TODO วันนี้ — อัปเดต 18 พ.ค. 69

## Backend / API
- [x] API `POST /api/places/[id]/phones` — admin only (deprecated — ใช้ requests แทน)
- [x] API `GET /api/admin/contact-history/[placeId]/[contactType]` — admin only
- [x] Field label phone_new, phone_edit ใน admin requests

---

## Frontend / UI
- [x] Contact History page (/admin/contact-history) — search + date filter + timeline modal
- [x] phones array + PhoneRow ใน /dashboard/[id] — add/edit/delete via request
- [x] Report Issue button → Telegram Bot
- [x] Nav link /admin/contact-history

---

## Testing
- [ ] ทดสอบระบบทั้งหมด
  - เพิ่ม/ลบ/แก้ไขเบอร์
  - ตรวจสอบ permission
  - ตรวจสอบ history timeline
  - ตรวจสอบ responsive

---

## Data / Cleanup
- [ ] Clear log / test data
- [ ] สร้าง user จริงสำหรับใช้งาน

---

## UI / Design
- [ ] ตกแต่ง UI
- [ ] ปรับกราฟิก / spacing / consistency
- [ ] ตรวจสอบ mobile responsive

---

## สรุปสถานะ

| งาน | สถานะ |
|-----|-------|
| Field label (phone_new, phone_edit ฯลฯ) | ✅ |
| Contact History page (admin only) | ✅ |
| phones array + PhoneRow | ✅ |
| Report Issue → Telegram | ✅ |
| ตกแต่ง UI | ✅ เริ่มแล้วแต่ยังไม่ค่อยดูดี | ให้ codex ช่วยปรับให้ default ui เป้น เชิงเดียวกันทั้งหมด แต่ต้องอัพขึ้น github เพื่อกัน codex พลาด
| ทดสอบ responsive | ✅ |
  หน้า dashboard ID ขาด เว็๋บไซต์ฺ | ✅ |
 Clear data test + สร้าง user จริง | ❌ |
  ทดสอบ flow ทั้งหมด     | ❌ |
  | ตกแต่ง UI | ❌ เริ่มแล้วแต่ยังไม่ค่อยดูดี | ให้ codex ช่วยปรับให้ default ui เป้น เชิงเดียวกันทั้งหมด แต่ต้องอัพขึ้น github เพื่อกัน codex พลาด

  