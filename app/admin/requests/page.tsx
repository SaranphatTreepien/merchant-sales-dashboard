// AFTER — แทนที่ทั้งไฟล์
'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

const REQUESTS_PER_PAGE = 9

type Request = {
  id: string
  place_id: string
  place_name: string
  field_type: string
  old_value: string | null
  new_value: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_by_name: string
  created_at: string
}

type ConfirmState = {
  request: Request
  action: 'accepted' | 'edited' | 'deleted' | 'rejected'
  finalValue: string
} | null

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function fieldLabel(f: string) {
  const map: Record<string, string> = {
    phone: 'โทรศัพท์ 1', phone2: 'โทรศัพท์ 2',
    phone_new: '➕ เพิ่มเบอร์โทร',
    phone_edit: '✏️ แก้ไขเบอร์โทร',
    line_oa: 'LINE OA', line_personal: 'LINE Personal', line_url: 'LINE URL',
    email: 'Email', facebook: 'Facebook', instagram: 'Instagram',
    messenger: 'Messenger', whatsapp: 'WhatsApp', telegram: 'Telegram',
  }
  return map[f] || f
}

function formatPhoneValue(fieldType: string, value: string) {
  if (fieldType !== 'phone_edit' && fieldType !== 'phone_new') return value
  try {
    const parsed = JSON.parse(value)
    if (!parsed || parsed.number === undefined) return value
    return `${parsed.number}${parsed.label ? ` (${parsed.label})` : ''}`
  } catch {
    return value
  }
}

// แยก JSON phone → { number, label }
function parsePhoneJson(value: string): { number: string; label: string } {
  try {
    const parsed = JSON.parse(value)
    return { number: parsed.number ?? '', label: parsed.label ?? '' }
  } catch {
    return { number: value, label: '' }
  }
}

function isPhoneField(fieldType: string) {
  return fieldType === 'phone_edit' || fieldType === 'phone_new'
}

// ─── TruncatedValue ───────────────────────────────────────────────────────────
function TruncatedValue({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 40
  if (value.length <= LIMIT) {
    return <span className="break-all">{value}</span>
  }
  return (
    <span className="break-all">
      {expanded ? value : `${value.slice(0, LIMIT)}…`}
      <button
        onClick={() => setExpanded(e => !e)}
        className="ml-1 text-xs text-blue-400 hover:underline shrink-0"
      >
        {expanded ? 'ย่อ' : 'ดูทั้งหมด'}
      </button>
    </span>
  )
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-200/80 py-2 last:border-b-0 sm:flex-row sm:gap-3 dark:border-slate-700/60">
      <span className="w-28 shrink-0 text-gray-400 dark:text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 overflow-hidden">{children}</span>
    </div>
  )
}

function ConfirmDialog({
  state, onConfirm, onCancel, loading,
}: {
  state: ConfirmState
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  if (!state) return null
  const { request, action, finalValue } = state
  const actionLabel = action === 'accepted' ? '✅ Accept' : action === 'edited' ? '✏️ Edit' : action === 'rejected' ? '❌ Reject' : '🗑️ Delete'
  const actionColor = action === 'deleted' || action === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">ยืนยันการดำเนินการ</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {actionLabel} request ของ <span className="font-medium text-gray-700 dark:text-slate-200">{request.place_name}</span>
        </p>
        <div className="bg-gray-50 dark:bg-slate-900/60 rounded-lg p-3 mb-4 text-sm space-y-1.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <span className="text-gray-400 dark:text-slate-500 w-20 shrink-0">Field</span>
            <span className="font-medium text-gray-700 dark:text-slate-200">{fieldLabel(request.field_type)}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <span className="text-gray-400 dark:text-slate-500 w-20 shrink-0">ค่าเดิม</span>
            <span className="text-gray-500 line-through break-all">{request.old_value || '—'}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <span className="text-gray-400 dark:text-slate-500 w-20 shrink-0">ค่าใหม่</span>
            <span className="font-medium text-gray-900 dark:text-white break-all">
              {action === 'deleted'
                ? <span className="text-red-500">ลบออก</span>
                : formatPhoneValue(request.field_type, finalValue)}
            </span>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 disabled:opacity-40">
            ยกเลิก
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-40 ${actionColor}`}>
            {loading ? 'กำลังดำเนินการ...' : `ยืนยัน ${actionLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BulkConfirmDialog ────────────────────────────────────────────────────────
function BulkConfirmDialog({ requests, open, onConfirm, onCancel, loading }: {
  requests: Request[]
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  if (!open || requests.length === 0) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            ยืนยัน Accept ทั้งหมด {requests.length} รายการ?
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          การดำเนินการนี้จะอนุมัติ request ทั้งหมดที่เลือกพร้อมกัน และไม่สามารถย้อนกลับได้
        </p>

        {/* รายชื่อร้านที่จะ approve */}
        <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 mb-5">
          {requests.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-start gap-3 px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-gray-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-800/60'
                }`}
            >
              <span className="shrink-0 text-gray-400 dark:text-slate-500 w-5 text-right">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 dark:text-slate-200 truncate">{r.place_name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                  {fieldLabel(r.field_type)} → {formatPhoneValue(r.field_type, r.new_value) || '🗑️ ลบ'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 disabled:opacity-40"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'กำลังอนุมัติ...' : `✅ ยืนยัน Accept ${requests.length} รายการ`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RequestCard ──────────────────────────────────────────────────────────────
function RequestCard({
  request, onAction, readonly = false, selected = false, onSelect,
}: {
  request: Request
  onAction: (req: Request, action: 'accepted' | 'edited' | 'deleted' | 'rejected', finalValue: string) => void
  readonly?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
}) {
  // phone field: แยก number + label
  const isPhone = isPhoneField(request.field_type)
  const parsedPhone = isPhone ? parsePhoneJson(request.new_value) : null

  const [editPhone, setEditPhone] = useState<{ number: string; label: string }>(
    parsedPhone ?? { number: request.new_value, label: '' }
  )
  const [editValue, setEditValue] = useState(isPhone ? '' : request.new_value)
  const [showEdit, setShowEdit] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const statusBadgeClass = request.status === 'pending'
    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    : request.status === 'approved'
      ? 'bg-blue-100 text-blue-800 border border-blue-300'
      : 'bg-red-100 text-red-800 border border-red-300'

  const statusBadgeLabel = request.status === 'pending' ? '🟡 Pending'
    : request.status === 'approved' ? '🔵 Approved' : '❌ Rejected'

  // สร้าง finalValue สำหรับ submit
  const buildEditFinalValue = () => {
    if (isPhone) {
      return JSON.stringify({ number: editPhone.number.trim(), label: editPhone.label.trim() })
    }
    return editValue.trim()
  }

  const handleConfirmEdit = () => {
    if (isPhone) {
      if (!editPhone.number.trim()) return
    } else {
      if (!editValue.trim()) return
    }
    onAction(request, 'edited', buildEditFinalValue())
    setShowEdit(false)
  }

  const handleCancelEdit = () => {
    setShowEdit(false)
    if (isPhone && parsedPhone) {
      setEditPhone(parsedPhone)
    } else {
      setEditValue(request.new_value)
    }
  }

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${selected
      ? 'border-[#40BEB6] bg-[#40BEB6]/5 dark:bg-[#40BEB6]/10'
      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600'
      }`}>

      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(request.id)}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#40BEB6]"
            />
          )}
          <div className="min-w-0">
            <p className="break-words font-semibold text-gray-900 dark:text-white">{request.place_name}</p>
            <p className="mt-0.5 break-all text-xs text-gray-400 dark:text-slate-500">{request.place_id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}`}>
            {statusBadgeLabel}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
            {formatDate(request.created_at)}
          </span>
        </div>
      </div>

      {/* Field info */}
      <div className="mb-3 rounded-lg bg-gray-50 px-3 py-1 text-sm dark:bg-slate-900/60">
        <FieldRow label="Field">
          <span className="font-medium text-gray-700 dark:text-slate-200">{fieldLabel(request.field_type)}</span>
        </FieldRow>
        <FieldRow label="ค่าเดิม">
          {request.old_value
            ? <TruncatedValue value={request.old_value} />
            : <span className="text-gray-400">—</span>
          }
        </FieldRow>
        <FieldRow label="ค่าที่เสนอ">
          {request.new_value === '' || request.new_value === null
            ? <span className="font-medium text-red-500">🗑️ คำขอลบ</span>
            : <span className="font-medium text-blue-700 dark:text-blue-400">
              <TruncatedValue value={formatPhoneValue(request.field_type, request.new_value)} />
            </span>
          }
        </FieldRow>
        {request.reason && (
          <FieldRow label="เหตุผล">
            <span className="text-gray-600 dark:text-slate-300">{request.reason}</span>
          </FieldRow>
        )}
        <FieldRow label="โดย">
          <span className="text-gray-600 dark:text-slate-300">{request.requested_by_name}</span>
        </FieldRow>
      </div>

      {/* Edit input — แยก phone กับ text ทั่วไป */}
      {showEdit && (
        <div className="mb-3 space-y-2">
          {isPhone ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">เบอร์โทรศัพท์</label>
                <input
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={editPhone.number}
                  onChange={e => setEditPhone(p => ({ ...p, number: e.target.value }))}
                  placeholder="เบอร์โทรศัพท์..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Label (ถ้ามี)</label>
                <input
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={editPhone.label}
                  onChange={e => setEditPhone(p => ({ ...p, label: e.target.value }))}
                  placeholder="เช่น สาขาหลัก, แฟกซ์ (ไม่บังคับ)"
                />
              </div>
            </>
          ) : (
            <input
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              placeholder="แก้ค่าก่อน approve..."
            />
          )}
        </div>
      )}

      {/* Actions */}
      {!readonly && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            onClick={() => onAction(request, 'accepted', request.new_value)}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
          >
            ✅ Accept
          </button>
          <button
            onClick={() => {
              if (!showEdit) {
                // reset ค่าใหม่ทุกครั้งที่เปิด
                if (isPhone) {
                  setEditPhone(parsePhoneJson(request.new_value))
                } else {
                  setEditValue(request.new_value)
                }
                setShowEdit(true)
                return
              }
              handleConfirmEdit()
            }}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
          >
            {showEdit ? '💾 ยืนยัน Edit' : '✏️ Edit'}
          </button>
          {showEdit && (
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              ยกเลิก
            </button>
          )}
          {!showReject ? (
            <button
              onClick={() => setShowReject(true)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 text-xs font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              ❌ Reject
            </button>
          ) : (
            <div className="w-full mt-2 space-y-2">
              <input
                type="text"
                placeholder="เหตุผลที่ reject (บังคับกรอก)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowReject(false); setRejectReason('') }}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    if (!rejectReason.trim()) return
                    onAction(request, 'rejected', rejectReason.trim())
                    setShowReject(false)
                  }}
                  disabled={!rejectReason.trim()}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  ยืนยัน Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  const fetchRequests = async () => {
    const res = await fetch(`/api/requests?status=${statusFilter}`)
    const json = await res.json()
    setRequests(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setSelectedIds(new Set())
    fetch(`/api/requests?status=${statusFilter}`)
      .then(r => r.json())
      .then(json => { if (!ignore) { setRequests(json.data || []); setLoading(false) } })
      .catch(() => { if (!ignore) { setRequests([]); setLoading(false) } })
    return () => { ignore = true }
  }, [statusFilter])

  const totalPages = Math.max(1, Math.ceil(requests.length / REQUESTS_PER_PAGE))
  const visiblePage = Math.min(currentPage, totalPages)
  const startIndex = (visiblePage - 1) * REQUESTS_PER_PAGE
  const paginatedRequests = requests.slice(startIndex, startIndex + REQUESTS_PER_PAGE)

  const selectedRequests = paginatedRequests.filter(r => selectedIds.has(r.id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRequests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedRequests.map(r => r.id)))
    }
  }

  // กด Accept ทั้งหมด → เปิด modal ก่อน
  const handleBulkAcceptClick = () => {
    if (selectedIds.size === 0) return
    setShowBulkConfirm(true)
  }

  // ยืนยันแล้วจาก modal → call API
  const handleBulkConfirm = async () => {
    setBulkSubmitting(true)
    let success = 0
    for (const id of selectedIds) {
      const req = requests.find(r => r.id === id)
      if (!req) continue
      try {
        await fetch(`/api/requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accepted', final_value: req.new_value }),
        })
        success++
      } catch {
        // continue ต่อแม้ error รายเดียว
      }
    }
    setSelectedIds(new Set())
    setBulkSubmitting(false)
    setShowBulkConfirm(false)
    setToast(`✅ อนุมัติแล้ว ${success} รายการ`)
    setLoading(true)
    fetchRequests()
    setTimeout(() => setToast(''), 3000)
  }

  const handleAction = (
    request: Request,
    action: 'accepted' | 'edited' | 'deleted' | 'rejected',
    finalValue: string,
  ) => setConfirm({ request, action, finalValue })

  const handleConfirm = async () => {
    if (!confirm) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/requests/${confirm.request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: confirm.action,
          final_value: confirm.finalValue,
          reject_reason: confirm.action === 'rejected' ? confirm.finalValue : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setToast(`❌ Error: ${err.error}`)
      } else {
        const actionLabel = confirm.action === 'accepted' ? 'อนุมัติ'
          : confirm.action === 'edited' ? 'แก้ไขและอนุมัติ'
            : confirm.action === 'rejected' ? 'ปฏิเสธ'
              : 'ลบ'
        setToast(`✅ ${actionLabel}แล้ว — ${confirm.request.place_name}`)
        setLoading(true)
        fetchRequests()
      }
    } catch {
      setToast('❌ เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
    setConfirm(null)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div>
      {toast && (
        <div className="fixed left-3 right-3 top-4 z-50 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg sm:left-auto sm:right-4">
          {toast}
        </div>
      )}

      <ConfirmDialog
        state={confirm}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        loading={submitting}
      />

      <BulkConfirmDialog
        requests={selectedRequests}
        open={showBulkConfirm}
        onConfirm={handleBulkConfirm}
        onCancel={() => setShowBulkConfirm(false)}
        loading={bulkSubmitting}
      />

      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">📨 Admin — Contact Requests</h1>
        <span className="text-sm text-gray-400">{requests.length} รายการ</span>
      </div>

      {/* Status Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setLoading(true); setStatusFilter(s); setCurrentPage(1) }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s
              ? s === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : s === 'approved' ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
          >
            {s === 'pending' ? '🟡 Pending' : s === 'approved' ? '🔵 Approved' : '❌ Rejected'}
          </button>
        ))}
        <button
          onClick={() => { setLoading(true); fetchRequests() }}
          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 sm:ml-auto sm:w-auto"
        >
          🔄 Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">กำลังโหลด...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-300 dark:text-slate-600 text-sm">ไม่มี request ในสถานะนี้</div>
      ) : (
        <>
          {/* Bulk action bar */}
          {statusFilter === 'pending' && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 py-3">
              <input
                type="checkbox"
                checked={paginatedRequests.length > 0 && selectedIds.size === paginatedRequests.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 cursor-pointer accent-[#40BEB6]"
              />
              <span className="text-sm text-gray-600 dark:text-slate-400">
                {selectedIds.size > 0 ? `เลือกแล้ว ${selectedIds.size} รายการ` : 'เลือกทั้งหมดในหน้านี้'}
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkAcceptClick}
                  disabled={bulkSubmitting}
                  className="ml-auto rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  ✅ Accept ทั้งหมด ({selectedIds.size})
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedRequests.map(r => (
              <RequestCard
                key={r.id}
                request={r}
                onAction={handleAction}
                readonly={statusFilter !== 'pending'}
                selected={selectedIds.has(r.id)}
                onSelect={statusFilter === 'pending' ? toggleSelect : undefined}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-gray-400">
                แสดง {startIndex + 1}–{Math.min(startIndex + REQUESTS_PER_PAGE, requests.length)} จาก {requests.length} รายการ
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
                  disabled={visiblePage === 1}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`h-8 min-w-8 rounded-lg border px-2 text-sm font-medium transition-colors ${visiblePage === p
                      ? 'border-[#40BEB6] bg-[#40BEB6] text-white'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
                  disabled={visiblePage === totalPages}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}