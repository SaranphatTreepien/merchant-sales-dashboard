'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────
type Phone = {
  id: string
  number: string
  normalized: string | null
  label: string | null
  is_primary: boolean
  is_manual: boolean
  added_by: string
  created_at: string  // เพิ่ม

}
type PlaceDetail = {
  place_id: string
  name: string
  city: string
  business_status: string
  rating: string | null
  scraped_at: string
  website: string | null   // ✅ เพิ่มตรงนี้
  // contacts

  line_oa: string | null
  line_personal: string | null
  email: string | null
  facebook_url: string | null
  instagram_handle: string | null
  messenger_url: string | null
  whatsapp: string | null
  telegram_url: string | null
  google_map_url: string | null
  has_booking: boolean | null
  line_url: string | null
  instagram_url: string | null
}

type Note = {
  id: string
  note: string
  author: string
  user_id: string
  created_at: string
  updated_at: string
}

type ContactRequest = {
  id: string
  field_type: string
  old_value: string | null
  new_value: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_by_name: string
  created_at: string
  reject_reason?: string | null  // เพิ่มตรงนี้
}
type HistoryEvent = {
  source_type: 'scraper' | 'manual'
  table_name: string
  action: string
  old_value: any
  new_value: any
  changed_by: string
  event_at: string
  reason?: string
  status?: string
}
// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function statusColor(status: string) {
  if (status === 'pending') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50'
  if (status === 'approved') return 'bg-[#40BEB6]/10 text-[#40BEB6] dark:bg-[#40BEB6]/20 dark:text-[#40BEB6] border-[#40BEB6]/20'
  if (status === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50'
  return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border-gray-200 dark:border-slate-700'
}

function statusLabel(status: string) {
  if (status === 'pending') return 'Pending'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return status
}

function businessStatusLabel(s: string) {
  if (s === 'OPERATIONAL') return { label: 'เปิดอยู่', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' }
  if (s === 'CLOSED_TEMPORARILY') return { label: 'ปิดชั่วคราว', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50' }
  if (s === 'CLOSED_PERMANENTLY') return { label: 'ปิดถาวร', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50' }
  return { label: s, cls: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700' }
}

function normalizeInstagram(input: string): string {
  const match = input.match(/instagram\.com\/([^/?]+)/)
  if (match) return match[1].replace(/\/$/, '')
  return input.replace(/^@/, '').trim()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContactRow({
  label, value, fieldType, placeId, url,
  onRequestSent, requests,
}: {
  label: string
  value: string | null
  fieldType: string
  placeId: string
  url?: string | null
  onRequestSent: () => void
  requests: ContactRequest[]  // เพิ่ม

}) {

  const [open, setOpen] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const isSubmitting = useRef(false)
  const handleDeleteRequest = async () => {
    if (!deleteReason.trim()) return
    if (isSubmitting.current) return
    isSubmitting.current = true

    setDeleting(true)
    let shouldClose = false
    let shouldRefresh = false  // ← เพิ่ม flag

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          field_type: fieldType,
          old_value: value,
          new_value: '',
          reason: deleteReason,
        }),
      })

      if (res.status === 409) {
        console.log('เข้า 409 แล้ว')  // ← เพิ่ม
        const Swal = (await import('sweetalert2')).default
        await Swal.fire({
          title: 'มีคำขออยู่แล้ว',
          text: 'มีคำขอที่รอดำเนินการอยู่แล้ว กรุณารอ Admin อนุมัติก่อน',
          icon: 'warning',
          confirmButtonColor: '#40BEB6',
          background: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1e293b' : '#fff',
          color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f1f5f9' : '#111827',
        })
        shouldClose = true
      } else {
        shouldClose = true
        shouldRefresh = true  // ← แค่ set flag ไม่เรียกตรงนี้
      }
    } finally {
      setDeleting(false)
      isSubmitting.current = false
      if (shouldClose) {
        setOpenDelete(false)
        setDeleteReason('')
      }
      if (shouldRefresh) onRequestSent()  // ← เรียกหลังสุด หลัง state ทุกอย่าง settle แล้ว
    }
  }

  const handleSubmit = async () => {
    if (!newValue.trim()) return
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: 'ยืนยันส่ง Request?',
      text: `${value ? 'แก้ไข' : 'เพิ่ม'} ${label}: ${newValue.trim()}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#40BEB6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ส่ง',
      cancelButtonText: 'ยกเลิก',
      background: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1e293b' : '#fff',
      color: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f1f5f9' : '#111827',
    })
    if (!result.isConfirmed) return
    const valueToSend = fieldType === 'instagram'
      ? normalizeInstagram(newValue.trim())
      : newValue.trim()
    setSaving(true)
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place_id: placeId,
        field_type: fieldType,
        old_value: value,
        new_value: valueToSend,
        reason,
      }),
    })
    setSaving(false)
    setOpen(false)
    setNewValue('')
    setReason('')
    onRequestSent()
  }

  return (
    <div className="group relative flex flex-col gap-1 border-b border-gray-100 dark:border-slate-800 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-full shrink-0 text-xs font-medium text-gray-400 dark:text-slate-500 sm:w-28">{label}</span>

      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 break-all">
        {value ? (
          url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#40BEB6] hover:underline decoration-2 underline-offset-2">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <button
            onClick={() => { setOpen(v => !v); setOpenDelete(false) }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:text-[#40BEB6] hover:border-[#40BEB6] hover:bg-[#40BEB6]/5 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-[#40BEB6] dark:hover:border-[#40BEB6] transition-all"
          >
            <span className="text-sm leading-none mt-[-1px]">+</span> เพิ่มข้อมูล
          </button>
        )}
      </span>
      {/* pending badge */}
      {(() => {
        const pending = requests.find(r =>
          r.status === 'pending' && r.field_type === fieldType
        )
        if (!pending) return null
        const { text, cls } = pending.new_value === '' || pending.new_value === null
          ? { text: '⏳ รออนุมัติลบ', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
          : !pending.old_value
            ? { text: '⏳ รออนุมัติเพิ่ม', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
            : { text: '⏳ รออนุมัติแก้ไข', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
        return (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cls}`}>
            {text}
          </span>
        )
      })()}
      {/* Action Buttons: ซ่อนแล้วแสดงตอน Hover (เฉพาะตอนที่มีค่า) */}
      {value && (
        <div className="flex shrink-0 gap-1.5 mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setOpen(v => !v); setOpenDelete(false) }}
            className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-gray-100 text-gray-600 hover:bg-[#40BEB6] hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#40BEB6] transition-colors"
          >
            แก้ไข
          </button>
          <button
            onClick={() => { setOpenDelete(v => !v); setOpen(false) }}
            className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-red-50 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white transition-colors"
          >
            ลบ
          </button>
        </div>
      )}

      {/* Popups */}
      {open && (
        <div className="absolute z-20 top-full left-0 mt-2 w-full sm:left-auto sm:right-0 sm:w-80 rounded-xl border border-gray-100 bg-white p-4 shadow-xl shadow-black/5 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{value ? 'แจ้งแก้ไข' : 'เพิ่ม'} {label}</p>
          <InputForm
            fieldType={fieldType} newValue={newValue} setNewValue={setNewValue}
            fieldError={fieldError} setFieldError={setFieldError} label={label}
            reason={reason} setReason={setReason} saving={saving}
            onCancel={() => setOpen(false)} onSubmit={handleSubmit}
          />
        </div>
      )}

      {openDelete && (
        <div className="absolute z-20 top-full left-0 mt-2 w-full sm:left-auto sm:right-0 sm:w-80 rounded-xl border border-red-100 bg-white p-4 shadow-xl shadow-red-500/5 dark:border-red-900/30 dark:bg-slate-800">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">แจ้งลบ {label}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-1">ค่าปัจจุบัน: <span className="font-medium text-gray-700 dark:text-slate-300">{value}</span></p>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-400/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-red-500 mb-3 resize-none transition-all"
            placeholder="เหตุผลที่ต้องการลบ (บังคับกรอก)"
            rows={2}
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpenDelete(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">ยกเลิก</button>
            <button
              onClick={handleDeleteRequest}
              disabled={deleting || !deleteReason.trim()}
              className="px-4 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'กำลังส่ง...' : 'ส่งคำขอลบ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// แตก Form ย่อยเพื่อให้โค้ด Clean ขึ้น
function InputForm({ fieldType, newValue, setNewValue, fieldError, setFieldError, label, reason, setReason, saving, onCancel, onSubmit }: any) {
  return (
    <>
      <input
        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition-all mb-1 ${fieldError
          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-500/50 dark:bg-red-500/10 dark:text-white'
          : 'border-gray-200 bg-gray-50 focus:border-[#40BEB6] focus:bg-white focus:ring-2 focus:ring-[#40BEB6]/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-[#40BEB6]'
          }`}
        inputMode={
          ['phone', 'phone2', 'whatsapp'].includes(fieldType) ? 'tel' :
            fieldType === 'email' ? 'email' :
              ['facebook', 'instagram', 'messenger', 'telegram', 'line_url'].includes(fieldType) ? 'url' : 'text'
        }
        maxLength={
          ['phone', 'phone2', 'whatsapp'].includes(fieldType) ? 15 :
            fieldType === 'email' ? 100 :
              ['facebook', 'instagram', 'messenger', 'telegram', 'line_url'].includes(fieldType) ? 200 :
                ['line_oa', 'line_personal'].includes(fieldType) ? 30 : 200
        }
        placeholder={
          ['phone', 'phone2', 'whatsapp'].includes(fieldType) ? 'เช่น 0812345678' :
            fieldType === 'email' ? 'example@email.com' :
              ['facebook', 'instagram', 'messenger', 'telegram', 'line_url', 'website'].includes(fieldType) ? 'https://...' :
                // ✅ เพิ่ม website
                `ระบุข้อมูลใหม่`
        }
        value={newValue}
        onChange={e => {
          let v = e.target.value
          if (['phone', 'phone2', 'whatsapp'].includes(fieldType)) {
            v = v.replace(/[^0-9+\-\s()]/g, '')
          }
          setNewValue(v)
          setFieldError(null)
        }}
        onBlur={() => {
          if (!newValue.trim()) return
          if (['phone', 'phone2', 'whatsapp'].includes(fieldType)) {
            const digits = newValue.replace(/\D/g, '')
            if (digits.length < 9) setFieldError('ต้องมีอย่างน้อย 9 ตัวเลข')
          } else if (fieldType === 'email') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) setFieldError('รูปแบบอีเมลไม่ถูกต้อง')
          } else if (['facebook', 'instagram', 'messenger', 'telegram', 'line_url', 'website'].includes(fieldType)) {
            // ✅ เพิ่ม website
            try { new URL(newValue) } catch { setFieldError('URL ต้องขึ้นต้นด้วย https://') }
          }
        }}
      />
      {fieldError && <p className="text-[11px] text-red-500 dark:text-red-400 mb-2 font-medium">{fieldError}</p>}
      <textarea
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#40BEB6] focus:bg-white focus:ring-2 focus:ring-[#40BEB6]/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-[#40BEB6] mb-4 resize-none transition-all mt-1"
        placeholder="เหตุผล (Optional)"
        rows={2}
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">ยกเลิก</button>
        <button
          onClick={onSubmit}
          disabled={saving || !newValue.trim() || !!fieldError}
          className="px-4 py-1.5 bg-[#40BEB6] text-white text-xs font-medium rounded-lg hover:bg-[#35a099] disabled:opacity-50 transition-colors"
        >
          {saving ? 'กำลังส่ง...' : 'ส่ง Request'}
        </button>
      </div>
    </>
  )
}
function tableLabel(t: string) {
  const map: Record<string, string> = {
    place_phones: '📞 โทรศัพท์', place_lines: '💬 LINE',
    place_emails: '📧 Email', place_facebooks: '👤 Facebook',
    place_instagrams: '📸 Instagram', place_messengers: '💬 Messenger',
    place_whatsapps: '📱 WhatsApp', place_telegrams: '✈️ Telegram',
    phone: '📞 โทรศัพท์', phone2: '📞 โทรศัพท์ 2',
    phone_new: '📞 เพิ่มเบอร์', phone_edit: '📞 แก้ไขเบอร์',
    line_oa: '💬 LINE OA', line_personal: '💬 LINE Personal',
    line_url: '💬 LINE URL', email: '📧 Email',
    facebook: '👤 Facebook', instagram: '📸 Instagram',
    messenger: '💬 Messenger', whatsapp: '📱 WhatsApp',
    telegram: '✈️ Telegram',
  }
  return map[t] || t
}

function actionBadge(source: string, action: string) {
  if (source === 'scraper') {
    if (action === 'INSERT') return { label: 'เพิ่ม', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
    if (action === 'DELETE') return { label: 'ลบ', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    if (action === 'UPDATE') return { label: 'อัปเดต', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
  }
  if (action === 'accepted' || action === 'edited') return { label: '✅ Approved', cls: 'bg-[#40BEB6]/10 text-[#40BEB6]' }
  if (action === 'rejected') return { label: '❌ Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  if (action === 'pending') return { label: '⏳ Pending', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
  return { label: action, cls: 'bg-gray-100 text-gray-600' }
}

function extractValue(val: any, tableName: string): string {
  if (!val) return '—'
  if (typeof val === 'string') return val
  // JSONB จาก scraper
  return val.number || val.line_id || val.address || val.url ||
    val.handle || val.telegram_url || JSON.stringify(val)
}

function HistoryCard({ event }: { event: HistoryEvent }) {
  const badge = actionBadge(event.source_type, event.action)
  const isManual = event.source_type === 'manual'

  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 p-4 text-sm">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
            {isManual ? '✏️ manual' : '🤖 scraper'}
          </span>
          <span className="text-gray-300 dark:text-slate-600">·</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
            {tableLabel(event.table_name)}
          </span>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-gray-100 dark:border-slate-800 mb-2 flex-wrap">
        <span className="text-gray-400 line-through text-xs truncate max-w-[40%]">
          {extractValue(event.old_value, event.table_name)}
        </span>
        <span className="text-gray-300 dark:text-slate-600 text-xs">→</span>
        <span className="text-gray-800 dark:text-gray-200 text-xs font-medium truncate max-w-[40%]">
          {extractValue(event.new_value, event.table_name)}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500">
        <span>โดย <span className="font-medium text-gray-600 dark:text-slate-300">{event.changed_by}</span></span>
        <span>{formatDate(event.event_at)}</span>
      </div>

      {event.reason && (
        <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
          {event.reason}
        </p>
      )}
    </div>
  )
}
function PhoneRow({
  phone, idx, placeId, onRequestSent, requests,
}: {
  phone: Phone
  idx: number
  placeId: string
  onRequestSent: () => void
  requests: ContactRequest[]  // เพิ่ม
}) {
  const [open, setOpen] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [newNumber, setNewNumber] = useState(phone.number)
  const [newLabel, setNewLabel] = useState(phone.label || '')
  const [editReason, setEditReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const isSubmitting = useRef(false)  // ← เพิ่มใน PhoneRow
  const handleEdit = async () => {
    const digits = newNumber.replace(/\D/g, '')
    if (digits.length < 9) { setFieldError('ต้องมีอย่างน้อย 9 ตัวเลข'); return }
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: 'ยืนยันส่ง Request?',
      text: `แก้ไขเบอร์ ${idx + 1}: ${newNumber.trim()}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#40BEB6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ส่ง',
      cancelButtonText: 'ยกเลิก',
      background: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1e293b' : '#fff',
      color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f1f5f9' : '#111827',
    })
    if (!result.isConfirmed) return
    setSaving(true)
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place_id: placeId,
        field_type: 'phone_edit',
        old_value: phone.number,
        new_value: JSON.stringify({ number: newNumber.trim(), label: newLabel.trim() }),
        reason: editReason.trim() || null,
      }),
    })
    setSaving(false)
    setOpen(false)
    onRequestSent()
  }



  const handleDelete = async () => {
    if (!deleteReason.trim()) return
    if (isSubmitting.current) return
    isSubmitting.current = true

    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: 'ยืนยันส่งคำขอลบ?',
      text: `ลบเบอร์ ${phone.number}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ส่งคำขอลบ',
      cancelButtonText: 'ยกเลิก',
      background: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1e293b' : '#fff',
      color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f1f5f9' : '#111827',
    })

    if (!result.isConfirmed) {
      isSubmitting.current = false
      return
    }

    setDeleting(true)
    let shouldRefresh = false

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          field_type: 'phone',
          old_value: phone.number,
          new_value: '',
          reason: deleteReason,
        }),
      })

      if (res.status === 409) {
        await Swal.fire({
          title: 'มีคำขออยู่แล้ว',
          text: 'มีคำขอที่รอดำเนินการอยู่แล้ว กรุณารอ Admin อนุมัติก่อน',
          icon: 'warning',
          confirmButtonColor: '#40BEB6',
          background: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1e293b' : '#fff',
          color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f1f5f9' : '#111827',
        })
      } else {
        shouldRefresh = true
      }
    } finally {
      setDeleting(false)
      setOpenDelete(false)
      setDeleteReason('')
      isSubmitting.current = false
      if (shouldRefresh) onRequestSent()
    }
  }
  return (
    <div className="group relative flex flex-col gap-1 border-b border-gray-100 dark:border-slate-800 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-28 shrink-0 text-xs font-medium text-gray-400 dark:text-slate-500">
        โทรศัพท์ {idx + 1}
        {phone.is_manual && <span className="ml-1 text-[9px] bg-[#40BEB6]/10 text-[#40BEB6] px-1 py-0.5 rounded font-bold">manual</span>}
      </span>

      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">  {phone.normalized ?? phone.number}
      </span>
      {/* !phone row */}
      {(() => {
        const pending = requests.find(r =>
          r.status === 'pending' && (
            (r.field_type === 'phone_edit' && r.old_value === phone.number) ||
            (r.field_type === 'phone' && r.old_value === phone.number)
          )
        )
        if (!pending) return null
        const { text, cls } = pending.new_value === '' || pending.new_value === null
          ? { text: '⏳ รออนุมัติลบ', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
          : { text: '⏳ รออนุมัติแก้ไข', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
        return (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>
            {text}
          </span>
        )
      })()}

      {phone.label && (
        <span className="text-[11px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">{phone.label}</span>
      )}
      {/* วันที่ */}
      <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0">
        {formatDate(phone.created_at)}
      </span>
      <div className="flex shrink-0 gap-1.5 mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => { setOpen(v => !v); setOpenDelete(false) }}
          className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-gray-100 text-gray-600 hover:bg-[#40BEB6] hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#40BEB6] transition-colors"
        >แก้ไข</button>
        <button
          onClick={() => { setOpenDelete(v => !v); setOpen(false) }}
          className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-red-50 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white transition-colors"
        >ลบ</button>
      </div>

      {open && (
        <div className="absolute z-20 top-full left-0 mt-2 w-full sm:left-auto sm:right-0 sm:w-80 rounded-xl border border-gray-100 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">แจ้งแก้ไข โทรศัพท์ {idx + 1}</p>
          <input
            type="tel"
            placeholder="เบอร์โทร"
            maxLength={15}
            value={newNumber}
            onChange={e => { setNewNumber(e.target.value.replace(/[^0-9+\-\s()]/g, '')); setFieldError(null) }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#40BEB6] focus:ring-2 focus:ring-[#40BEB6]/20 transition-all mb-2"
          />
          {fieldError && <p className="text-[11px] text-red-500 mb-2">{fieldError}</p>}
          <input
            type="text"
            placeholder="เช่น เจ้าของร้าน, หน้าร้าน, เบอร์ส่วนตัว (optional)"
            maxLength={50}
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#40BEB6] focus:ring-2 focus:ring-[#40BEB6]/20 transition-all mb-4"
          />
          <input
            type="text"
            placeholder="เหตุผลที่แก้ไข (optional)"
            maxLength={100}
            value={editReason}
            onChange={e => setEditReason(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#40BEB6] focus:ring-2 focus:ring-[#40BEB6]/20 transition-all mb-4"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">ยกเลิก</button>
            <button
              onClick={handleEdit}
              disabled={saving || !newNumber.trim() || !!fieldError}
              className="px-4 py-1.5 bg-[#40BEB6] text-white text-xs font-medium rounded-lg hover:bg-[#35a099] disabled:opacity-50 transition-colors"
            >{saving ? 'กำลังส่ง...' : 'ส่ง Request'}</button>
          </div>
        </div>
      )}

      {openDelete && (
        <div className="absolute z-20 top-full left-0 mt-2 w-full sm:left-auto sm:right-0 sm:w-80 rounded-xl border border-red-100 bg-white p-4 shadow-xl dark:border-red-900/30 dark:bg-slate-800">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">แจ้งลบ โทรศัพท์ {idx + 1}</p>
          <p className="text-xs text-gray-500 mb-3">ค่าปัจจุบัน: <span className="font-medium text-gray-700 dark:text-slate-300">{phone.number}</span></p>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white mb-3 resize-none transition-all"
            placeholder="เหตุผลที่ต้องการลบ (บังคับกรอก)"
            rows={2}
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpenDelete(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">ยกเลิก</button>
            <button
              onClick={handleDelete}
              disabled={deleting || !deleteReason.trim()}
              className="px-4 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >{deleting ? 'กำลังส่ง...' : 'ส่งคำขอลบ'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlaceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const placeId = params?.id as string

  const [place, setPlace] = useState<PlaceDetail | null>(null)
  const [phones, setPhones] = useState<Phone[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string, role: string } | null>(null)

  // State ควบคุมการยุบ/ขยายกล่อง Request History
  const [isRequestsOpen, setIsRequestsOpen] = useState(false)
  const [addPhoneOpen, setAddPhoneOpen] = useState(false)
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  const [newPhoneLabel, setNewPhoneLabel] = useState('')
  const [addingPhone, setAddingPhone] = useState(false)
  const [addPhoneError, setAddPhoneError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => setCurrentUser(j.user))
  }, [])

  // note form
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/places/${placeId}`)
      if (!res.ok) throw new Error('Not found')
      const json = await res.json()
      setPlace(json.place)
      setNotes(json.notes || [])
      setRequests(json.requests || [])
      setPhones(json.phones || [])
    } catch {
      setError('ไม่พบข้อมูลร้านนี้')
    }
    setLoading(false)
  }

  useEffect(() => { if (placeId) fetchData() }, [placeId])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: 'บันทึก Note?',
      text: newNote.trim(),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#40BEB6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      background: '#f8fafc',
      color: '#0f172a',
    })
    if (!result.isConfirmed) return
    setAddingNote(true)
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId, note: newNote }),
    })
    setNewNote('')
    setAddingNote(false)
    fetchData()
  }

  const handleEditNote = async (noteId: string) => {
    if (!editText.trim()) return
    await fetch(`/api/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: editText }),
    })
    setEditingNoteId(null)
    fetchData()
  }

  const handleDeleteNote = async (noteId: string) => {
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: 'ลบ note นี้?',
      text: 'ไม่สามารถกู้คืนได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      background: '#f8fafc',
      color: '#0f172a',
    })
    if (!result.isConfirmed) return
    await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
    fetchData()
  }
  const handleAddPhone = async () => {
    if (!newPhoneNumber.trim()) return
    const digits = newPhoneNumber.replace(/\D/g, '')
    if (digits.length < 9) {
      setAddPhoneError('ต้องมีอย่างน้อย 9 ตัวเลข')
      return
    }
    // เพิ่มตรงนี้
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: 'ยืนยันส่ง Request?',
      text: `เพิ่มเบอร์: ${newPhoneNumber.trim()}${newPhoneLabel.trim() ? ` (${newPhoneLabel.trim()})` : ''}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#40BEB6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ส่ง',
      cancelButtonText: 'ยกเลิก',
      background: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1e293b' : '#fff',
      color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f1f5f9' : '#111827',
    })
    if (!result.isConfirmed) return

    setAddingPhone(true)
    setAddPhoneError(null)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          field_type: 'phone_new',
          old_value: null,
          new_value: JSON.stringify({ number: newPhoneNumber.trim(), label: newPhoneLabel.trim() || null }),
          reason: null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddPhoneError(json.error || 'เกิดข้อผิดพลาด')
      } else {
        setAddPhoneOpen(false)
        setNewPhoneNumber('')
        setNewPhoneLabel('')
        fetchData()
      }
    } catch {
      setAddPhoneError('เกิดข้อผิดพลาด')
    }
    setAddingPhone(false)
  }
  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/places/${placeId}/history`)
      if (res.ok) {
        const json = await res.json()
        setHistory(json.history || [])
      }
    } catch { }
    setHistoryLoading(false)
  }
  // ── Render states ──

  if (loading) return (
    <div className="flex min-h-[400px] items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
      <div className="animate-pulse flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-[#40BEB6] animate-bounce" /> กำลังโหลดข้อมูล...
      </div>
    </div>
  )

  if (error || !place) return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="rounded-full bg-gray-100 dark:bg-slate-800 p-4 mb-4">
        <span className="text-3xl">🏜️</span>
      </div>
      <p className="text-gray-500 dark:text-slate-400 mb-6 font-medium">{error || 'ไม่พบข้อมูล'}</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#40BEB6]/10 hover:border-[#40BEB6] hover:text-[#40BEB6] active:bg-[#40BEB6] active:text-white active:border-[#40BEB6] active:scale-95 transition-all shadow-sm"
      >
        ← กลับ Dashboard
      </button>
    </div>
  )

  const bStatus = businessStatusLabel(place.business_status)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  const contacts: { label: string; value: string | null; fieldType: string; url?: string | null }[] = [
    { label: 'LINE OA', value: place.line_oa, fieldType: 'line_oa' },
    { label: 'LINE Personal', value: place.line_personal, fieldType: 'line_personal' },
    { label: 'LINE URL', value: place.line_url, fieldType: 'line_url', url: place.line_url },
    { label: 'Email', value: place.email, fieldType: 'email' },
    { label: 'Facebook', value: place.facebook_url, fieldType: 'facebook', url: place.facebook_url },
    { label: 'Instagram', value: place.instagram_handle, fieldType: 'instagram', url: place.instagram_url },
    { label: 'Messenger', value: place.messenger_url, fieldType: 'messenger', url: place.messenger_url },
    { label: 'WhatsApp', value: place.whatsapp, fieldType: 'whatsapp' },
    { label: 'Telegram', value: place.telegram_url, fieldType: 'telegram', url: place.telegram_url },

  ]

  return (
    <div className="mx-auto max-w-5xl py-6 px-4 sm:px-6 lg:px-8 bg-transparent text-gray-900 dark:text-gray-100 min-h-screen">

      {/* Back */}
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#40BEB6]/10 hover:border-[#40BEB6] hover:text-[#40BEB6] hover:-translate-y-0.5 hover:shadow-md active:bg-[#40BEB6] active:text-white active:border-[#40BEB6] active:scale-95 active:translate-y-0 transition-all shadow-sm"
      >
        ← กลับ Dashboard
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="break-words text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl tracking-tight">{place.name}</h1>
        <p className="mt-1 break-all text-sm font-mono text-gray-400 dark:text-slate-500">{place.place_id}</p>

        <div className="flex items-center gap-2.5 mt-4 flex-wrap">
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${bStatus.cls}`}>{bStatus.label}</span>

          {place.city && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
              📍 {place.city}
            </span>
          )}
          {place.rating && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30">
              ⭐ {place.rating}
            </span>
          )}
          {place.google_map_url && (
            <a href={place.google_map_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors">
              🗺️ Google Maps
            </a>
          )}
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 dark:hover:bg-blue-500/20 transition-colors">
              🌐 Website
            </a>
          )}
          {place.has_booking && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#40BEB6]/10 text-[#40BEB6] border border-[#40BEB6]/20 dark:bg-[#40BEB6]/20 dark:text-[#40BEB6] dark:border-[#40BEB6]/30">
              📅 มี Booking
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50">
              ⏳ {pendingCount} Request รออนุมัติ
            </span>
          )}
        </div>
      </div>

      {/* 
        โครงสร้าง Grid สำหรับจัดเรียง:
        Desktop: ข้อมูลติดต่อ (ซ้าย) / Request (ซ้ายล่าง) / Notes (ขวา)
        Mobile (เรียงตาม Order): ข้อมูลติดต่อ -> Notes -> Request 
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        {/* ── 1. Contacts (Desktop ซ้ายบน / Mobile อันดับ 1) ── */}
        {/* ── 1. Contacts ── */}
        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1 order-1 rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            📋 ข้อมูลติดต่อ
          </h2>
          <div className="flex flex-col">

            {/* ── Phones ── */}
            <div className="border-b border-gray-100 dark:border-slate-800 pb-3 mb-1">
              {phones.map((ph, idx) => (
                <PhoneRow
                  key={ph.id}
                  phone={ph}
                  idx={idx}
                  placeId={placeId}
                  onRequestSent={fetchData}
                  requests={requests}  // เพิ่ม

                />
              ))}
              {/* 👇 เพิ่มตรงนี้ */}
              {requests
                .filter(r => r.status === 'pending' && r.field_type === 'phone_new')
                .map((r, i) => {
                  let display = r.new_value
                  try {
                    const p = JSON.parse(r.new_value)
                    if (p?.number) display = p.label ? `${p.number} (${p.label})` : p.number
                  } catch { }
                  return (
                    <div key={r.id} className="flex flex-col gap-1 border-b border-gray-100 dark:border-slate-800 py-3 sm:flex-row sm:items-center sm:gap-4 opacity-60">
                      <span className="w-28 shrink-0 text-xs font-medium text-gray-400 dark:text-slate-500">
                        โทรศัพท์ {phones.length + i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-400 dark:text-slate-500 flex-1 italic">{display}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        ⏳ รออนุมัติข้อเพิ่ม
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">{formatDate(r.created_at)}</span>
                    </div>
                  )
                })
              }
              <div className="mt-2">
                {!addPhoneOpen ? (
                  <button
                    onClick={() => setAddPhoneOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:text-[#40BEB6] hover:border-[#40BEB6] hover:bg-[#40BEB6]/5 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 transition-all"
                  >
                    <span className="text-sm leading-none mt-[-1px]">+</span> เพิ่มเบอร์โทร
                  </button>
                ) : (
                  <div className="mt-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">แจ้งเพิ่มเบอร์โทรศัพท์</p>
                    <input
                      type="tel"
                      placeholder="เบอร์โทร เช่น 0812345678"
                      maxLength={15}
                      value={newPhoneNumber}
                      onChange={e => { setNewPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, '')); setAddPhoneError(null) }}
                      className="w-full rounded-lg border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#40BEB6] focus:ring-2 focus:ring-[#40BEB6]/20 transition-all"
                    />
                    <input
                      type="text"
                      placeholder="ชื่อกำกับ เช่น พี่แดง, เจ้าของร้าน (optional)"
                      maxLength={50}
                      value={newPhoneLabel}
                      onChange={e => setNewPhoneLabel(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#40BEB6] focus:ring-2 focus:ring-[#40BEB6]/20 transition-all"
                    />
                    {addPhoneError && <p className="text-[11px] text-red-500 font-medium">{addPhoneError}</p>}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setAddPhoneOpen(false); setNewPhoneNumber(''); setNewPhoneLabel(''); setAddPhoneError(null) }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      >ยกเลิก</button>
                      <button
                        onClick={handleAddPhone}
                        disabled={addingPhone || !newPhoneNumber.trim()}
                        className="px-4 py-1.5 bg-[#40BEB6] text-white text-xs font-medium rounded-lg hover:bg-[#35a099] disabled:opacity-50 transition-colors"
                      >{addingPhone ? 'กำลังส่ง...' : 'ส่ง Request'}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Other Contacts ── */}
            {contacts.map(c => (
              <ContactRow
                key={c.fieldType}
                label={c.label}
                value={c.value}
                fieldType={c.fieldType}
                placeId={placeId}
                url={c.url}
                onRequestSent={fetchData}
                requests={requests}  // เพิ่ม
              />
            ))}

          </div>
        </div>  {/* ปิด card Contacts */}

        {/* ── 2. Notes ── */}

        {/* ── 2. Notes (Desktop ขวาบน / Mobile อันดับ 2) ── */}
        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 order-2 rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a] lg:sticky lg:top-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            📝 Notes
          </h2>

          <div className="mb-6">
            <textarea
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#40BEB6] focus:bg-white focus:ring-4 focus:ring-[#40BEB6]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#40BEB6] resize-none transition-all placeholder-gray-400 dark:placeholder-slate-600"
              placeholder="พิมพ์ Note ที่ต้องการบันทึก..."
              rows={3}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote()
              }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">กด Ctrl + Enter เพื่อส่ง</span>
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="rounded-lg bg-[#40BEB6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#35a099] disabled:opacity-40 disabled:bg-slate-600 disabled:text-slate-400 transition-colors shadow-sm shadow-[#40BEB6]/20"
              >
                {addingNote ? 'กำลังบันทึก...' : 'เพิ่ม Note'}
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 py-6 text-center">ยังไม่มี Note บันทึกไว้</p>
            ) : (
              notes.map(n => (
                <div key={n.id} className="group relative rounded-xl bg-gray-50 dark:bg-slate-800/50 p-4 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                  {editingNoteId === n.id ? (
                    <div className="flex flex-col gap-3">
                      <textarea
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#40BEB6] focus:ring-2 focus:ring-[#40BEB6]/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white resize-none transition-all"
                        rows={3}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white">ยกเลิก</button>
                        <button onClick={() => handleEditNote(n.id)} className="px-4 py-1.5 bg-[#40BEB6] text-white text-xs font-medium rounded-lg hover:bg-[#35a099]">บันทึก</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{n.note}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-200/60 dark:border-slate-700/60 pt-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#40BEB6]/10 text-[#40BEB6] dark:bg-[#40BEB6]/20 text-[10px] font-bold">
                            {n.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-300">{n.author}</span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500">
                              {formatDate(n.created_at)} {n.created_at !== n.updated_at && '(แก้ไขแล้ว)'}
                            </span>
                          </div>
                        </div>
                        {(currentUser?.role === 'admin' || currentUser?.id === n.user_id) && (
                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingNoteId(n.id); setEditText(n.note) }} className="p-1.5 text-gray-400 hover:text-[#40BEB6] hover:bg-[#40BEB6]/10 rounded-md transition-colors" title="แก้ไข">✏️</button>
                            <button onClick={() => handleDeleteNote(n.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors" title="ลบ">🗑️</button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── 3. Requests (Desktop ซ้ายล่าง / Mobile อันดับ 3) ── */}
        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2 order-3 rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">

          {/* Header กดเพื่อยุบ/ขยาย */}
          <button
            onClick={() => setIsRequestsOpen(!isRequestsOpen)}
            className="w-full flex items-center justify-between p-5 sm:p-6 bg-gray-50/50 dark:bg-slate-800/30 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              📨 Request History
              {requests.length > 0 && (
                <span className="bg-[#40BEB6]/10 text-[#40BEB6] dark:bg-[#40BEB6]/20 text-[11px] px-2 py-0.5 rounded-full font-bold ml-1">
                  {requests.length} รายการ
                </span>
              )}
            </h2>
            <div className={`p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-sm border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 transition-transform duration-300 ${isRequestsOpen ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Body Content */}
          <div className={`transition-all duration-300 ease-in-out ${isRequestsOpen ? 'max-h-[800px] opacity-100 border-t border-gray-100 dark:border-slate-800' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="p-5 sm:p-6">
              {requests.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-lg">ยังไม่มีประวัติการ Request</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {requests.map(r => (
                    <div key={r.id} className="relative rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm dark:border-slate-800 dark:bg-slate-800/30 hover:border-gray-200 dark:hover:border-slate-700 transition-colors">


                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          {(() => {
                            if (r.field_type === 'phone_new') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">➕ เพิ่ม</span>
                            if (r.field_type === 'phone_edit') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">✏️ แก้ไข</span>
                            if (r.new_value === '' || r.new_value === null) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">🗑️ ลบ</span>
                            if (!r.old_value) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">➕ เพิ่ม</span>
                            return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">✏️ แก้ไข</span>
                          })()}
                          {tableLabel(r.field_type)}
                        </span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${statusColor(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>

                      {r.reason && (
                        <p className="text-xs text-gray-600 dark:text-slate-400 mb-2 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
                          <span className="font-medium text-gray-500 dark:text-slate-500">เหตุผล:</span> {r.reason}
                        </p>
                      )}
                      {r.status === 'rejected' && r.reject_reason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2 border-l-2 border-red-200 dark:border-red-800 pl-2">
                          <span className="font-medium">เหตุผลที่ reject:</span> {r.reject_reason}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                        <p className="text-[11px] text-gray-400 dark:text-slate-500">
                          โดย <span className="font-medium text-gray-600 dark:text-slate-300">{r.requested_by_name}</span> · {formatDate(r.created_at)}
                        </p>

                        {r.status === 'pending' && (
                          <button
                            onClick={async () => {
                              const Swal = (await import('sweetalert2')).default
                              const result = await Swal.fire({
                                title: 'ยืนยันยกเลิกคำขอ?',
                                text: 'คำขอนี้จะถูกยกเลิก',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#ef4444',
                                cancelButtonColor: '#6b7280',
                                confirmButtonText: 'ยืนยัน',
                                cancelButtonText: 'ไม่ยกเลิก',
                                background: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1e293b' : '#fff',
                                color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f1f5f9' : '#111827',
                              })
                              if (!result.isConfirmed) return
                              await fetch(`/api/requests/${r.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'cancelled' }),
                              })
                              fetchData()
                            }}
                            className="text-[11px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          >
                            ยกเลิกคำขอ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}