'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

type PlaceDetail = {
  place_id: string
  name: string
  city: string
  business_status: string
  rating: string | null
  scraped_at: string
  // contacts
  phone: string | null
  phone2: string | null
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
  if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
  if (status === 'approved') return 'bg-blue-100 text-blue-800'
  if (status === 'rejected') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-600'
}

function statusLabel(status: string) {
  if (status === 'pending') return '🟡 Pending'
  if (status === 'approved') return '🔵 Approved'
  if (status === 'rejected') return '❌ Rejected'
  return status
}

function businessStatusLabel(s: string) {
  if (s === 'OPERATIONAL') return { label: 'เปิดอยู่', cls: 'bg-green-100 text-green-700' }
  if (s === 'CLOSED_TEMPORARILY') return { label: 'ปิดชั่วคราว', cls: 'bg-yellow-100 text-yellow-700' }
  if (s === 'CLOSED_PERMANENTLY') return { label: 'ปิดถาวร', cls: 'bg-red-100 text-red-700' }
  return { label: s, cls: 'bg-gray-100 text-gray-600' }
}
function normalizeInstagram(input: string): string {
  const match = input.match(/instagram\.com\/([^/?]+)/)
  if (match) return match[1].replace(/\/$/, '')
  return input.replace(/^@/, '').trim()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContactRow({
  label, value, fieldType, placeId, url,
  onRequestSent,
}: {
  label: string
  value: string | null
  fieldType: string
  placeId: string
  url?: string | null
  onRequestSent: () => void
}) {
  const [open, setOpen] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const handleDeleteRequest = async () => {
    if (!deleteReason.trim()) return
    setDeleting(true)
    await fetch('/api/requests', {
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
    setDeleting(false)
    setOpenDelete(false)
    setDeleteReason('')
    onRequestSent()
  }
  const handleSubmit = async () => {
    if (!newValue.trim()) return
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: 'ยืนยันส่ง Request?',
      text: `แก้ไข ${label}: ${newValue.trim()}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ส่ง',
      cancelButtonText: 'ยกเลิก',
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
        new_value: valueToSend,  // ← เปลี่ยนจาก newValue
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
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-24 pt-0.5 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 flex-1 break-all">
        {url && value ? (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline">
            {value}
          </a>
        ) : value || <span className="text-gray-300">—</span>}
      </span>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => { setOpen(v => !v); setOpenDelete(false) }}
          className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          แจ้งแก้ไข
        </button>
        {value && (
          <button
            onClick={() => { setOpenDelete(v => !v); setOpen(false) }}
            className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2"
          >
            แจ้งลบ
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-10 mt-8 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">แจ้งแก้ไข — {label}</p>
          <input
            className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-1 text-gray-900 ${fieldError ? 'border-red-400 bg-red-50' : 'border-gray-300'
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
                  ['facebook', 'instagram', 'messenger', 'telegram', 'line_url'].includes(fieldType) ? 'https://...' :
                    `ค่าใหม่ของ ${label}`
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
              } else if (['facebook', 'instagram', 'messenger', 'telegram', 'line_url'].includes(fieldType)) {
                try { new URL(newValue) } catch { setFieldError('URL ต้องขึ้นต้นด้วย https://') }
              }
            }}
          />
          {fieldError && <p className="text-xs text-red-500 mb-2">{fieldError}</p>}
          <textarea
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3 text-gray-900 resize-none"
            placeholder="เหตุผล (optional)"
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">ยกเลิก</button>
            <button
              onClick={handleSubmit}
              disabled={saving || !newValue.trim() || !!fieldError}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'กำลังส่ง...' : 'ส่ง Request'}
            </button>
          </div>
        </div>
      )}
      {openDelete && (
        <div className="absolute z-10 mt-8 right-4 w-80 bg-white border border-red-200 rounded-lg shadow-lg p-4">
          <p className="text-sm font-semibold text-red-600 mb-1">🗑️ แจ้งลบ — {label}</p>
          <p className="text-xs text-gray-400 mb-2">ค่าปัจจุบัน: {value}</p>
          <textarea
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3 text-gray-900 resize-none"
            placeholder="เหตุผลที่ต้องการลบ (บังคับกรอก)"
            rows={2}
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setOpenDelete(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDeleteRequest}
              disabled={deleting || !deleteReason.trim()}
              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-40"
            >
              {deleting ? 'กำลังส่ง...' : 'ส่งคำขอลบ'}
            </button>
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
  const [notes, setNotes] = useState<Note[]>([])
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string, role: string } | null>(null)

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
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
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
    })
    if (!result.isConfirmed) return
    await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
    fetchData()
  }
  // ── Render states ──

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">กำลังโหลด...</div>
  )

  if (error || !place) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">{error || 'ไม่พบข้อมูล'}</p>
      <button onClick={() => router.back()} className="text-blue-500 text-sm underline">← กลับ</button>
    </div>
  )

  const bStatus = businessStatusLabel(place.business_status)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  const contacts: { label: string; value: string | null; fieldType: string; url?: string | null }[] = [
    { label: 'โทรศัพท์', value: place.phone, fieldType: 'phone' },
    { label: 'โทรศัพท์ 2', value: place.phone2, fieldType: 'phone2' },
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
    <div className="max-w-4xl mx-auto">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        ← กลับ Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{place.place_id}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bStatus.cls}`}>{bStatus.label}</span>
            {place.city && <span className="text-xs text-gray-500">📍 {place.city}</span>}
            {place.rating && <span className="text-xs text-gray-500">⭐ {place.rating}</span>}
            {place.google_map_url && (
              <a href={place.google_map_url} target="_blank" rel="noopener noreferrer"
                className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                🗺️ Google Maps
              </a>
            )}
            {place.has_booking && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700">📅 มี Booking</span>
            )}
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                🟡 {pendingCount} Pending Request
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Contacts ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 ข้อมูลติดต่อ</h2>
          <div className="relative">
            {contacts.map(c => (
              <ContactRow key={c.fieldType} label={c.label} value={c.value}
                fieldType={c.fieldType} placeId={placeId} url={c.url} onRequestSent={fetchData} />
            ))}
          </div>
        </div>

        {/* ── Requests ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📨 Request History</h2>
          {requests.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-4">ยังไม่มี request</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {requests.map(r => (
                <div key={r.id} className="border border-gray-100 rounded-lg p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-700">{r.field_type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    <span className="line-through text-gray-300">{r.old_value || '—'}</span>
                    {' → '}
                    {r.new_value === '' || r.new_value === null
                      ? <span className="text-red-500 font-medium">🗑️ ลบออก</span>
                      : <span className="text-gray-700 font-medium">{r.new_value}</span>
                    }
                  </div>
                  {r.reason && <p className="text-gray-400 mt-1">เหตุผล: {r.reason}</p>}
                  <p className="text-gray-300 mt-1">โดย {r.requested_by_name} · {formatDate(r.created_at)}</p>
                  {r.status === 'pending' && (
                    <button
                      onClick={async () => {
                        await fetch(`/api/requests/${r.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'cancelled' }),
                        })
                        fetchData()
                      }}
                      className="mt-2 text-xs text-red-400 hover:text-red-600 underline underline-offset-2"
                    >
                      ยกเลิกคำขอ
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Notes ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📝 Note Timeline</h2>

        {/* Add note */}
        <div className="flex gap-2 mb-4">
          <textarea
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="เพิ่ม note ใหม่..."
            rows={2}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote()
            }}
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !newNote.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 self-end"
          >
            {addingNote ? '...' : 'เพิ่ม'}
          </button>
        </div>

        {/* Note list */}
        {notes.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-4">ยังไม่มี note</p>
        ) : (
          <div className="space-y-3">
            {notes.map(n => (
              <div key={n.id} className="border-l-2 border-blue-100 pl-4 py-1">
                {editingNoteId === n.id ? (
                  <div className="flex gap-2">
                    <textarea
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 resize-none"
                      rows={2}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                    />
                    <div className="flex flex-col gap-1 self-end">
                      <button
                        onClick={() => handleEditNote(n.id)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-1 text-gray-400 text-xs hover:text-gray-600"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-800">{n.note}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{n.author} · {formatDate(n.created_at)}</span>
                      {n.created_at !== n.updated_at && (
                        <span className="text-xs text-gray-300">(แก้ไขแล้ว)</span>
                      )}
                      {/* show edit only for own notes (temp: always show) */}
                      {(currentUser?.role === 'admin' || currentUser?.id === n.user_id) && (
                        <button onClick={() => { setEditingNoteId(n.id); setEditText(n.note) }}
                          className="text-xs text-blue-400 hover:text-blue-600 underline underline-offset-2">
                          แก้ไข
                        </button>
                      )}
                      {(currentUser?.role === 'admin' || currentUser?.id === n.user_id) && (
                        <button onClick={() => handleDeleteNote(n.id)}
                          className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">
                          ลบ
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}