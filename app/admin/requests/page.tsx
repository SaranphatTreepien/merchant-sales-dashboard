'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
  loading,
}: {
  state: ConfirmState
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  if (!state) return null

  const { request, action, finalValue } = state

  const actionLabel = action === 'accepted' ? '✅ Accept' : action === 'edited' ? '✏️ Edit' : '🗑️ Delete'
  const actionColor = action === 'deleted'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1">ยืนยันการดำเนินการ</h3>
        <p className="text-sm text-gray-500 mb-4">
          {actionLabel} request ของ <span className="font-medium text-gray-700">{request.place_name}</span>
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <span className="text-gray-400 w-20 shrink-0">Field</span>
            <span className="font-medium text-gray-700">{fieldLabel(request.field_type)}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <span className="text-gray-400 w-20 shrink-0">ค่าเดิม</span>
            <span className="text-gray-500 line-through">{request.old_value || '—'}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <span className="text-gray-400 w-20 shrink-0">ค่าใหม่</span>
            <span className="font-medium text-gray-900 break-all">
              {action === 'deleted'
                ? <span className="text-red-500">ลบออก</span>
                : formatPhoneValue(request.field_type, finalValue)}
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-40 ${actionColor}`}
          >
            {loading ? 'กำลังดำเนินการ...' : `ยืนยัน ${actionLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function formatPhoneValue(fieldType: string, value: string) {
  if (fieldType !== 'phone_edit' && fieldType !== 'phone_new') return value
  try {
    const parsed = JSON.parse(value)
    if (!parsed || parsed.number === undefined) return value
    const label = parsed.label ? ` (${parsed.label})` : ''
    return `${parsed.number}${label}`
  } catch {
    return value
  }
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-200/80 py-2 last:border-b-0 sm:flex-row sm:gap-3">
      <span className="w-28 shrink-0 text-gray-400">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}

function RequestCard({
  request,
  onAction,
  readonly = false,
}: {
  request: Request
  onAction: (req: Request, action: 'accepted' | 'edited' | 'deleted' | 'rejected', finalValue: string) => void
  readonly?: boolean
}) {
  const [editValue, setEditValue] = useState(request.new_value)
  const [showEdit, setShowEdit] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const statusBadgeClass = request.status === 'pending'
    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    : request.status === 'approved'
      ? 'bg-blue-100 text-blue-800 border border-blue-300'
      : 'bg-red-100 text-red-800 border border-red-300'

  const statusBadgeLabel = request.status === 'pending'
    ? ' Pending'
    : request.status === 'approved'
      ? ' Approved'
      : '❌ Rejected'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md sm:p-5">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold text-gray-900">{request.place_name}</p>
          <p className="mt-0.5 break-all text-xs text-gray-400">{request.place_id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}`}>
            {statusBadgeLabel}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(request.created_at)}</span>
        </div>
      </div>

      {/* Field info */}
      <div className="mb-3 rounded-lg bg-gray-50 px-3 py-1 text-sm">
        <FieldRow label="Field">
          <span className="font-medium text-gray-700">{fieldLabel(request.field_type)}</span>
        </FieldRow>
        <FieldRow label="ค่าเดิม">
          <span className="text-gray-500 line-through">{request.old_value || '—'}</span>
        </FieldRow>
        <FieldRow label="ค่าที่เสนอ">
          {request.new_value === '' || request.new_value === null
            ? <span className="font-medium text-red-500">🗑️ คำขอลบ</span>
            : <span className="font-medium text-blue-700 break-all">
              {formatPhoneValue(request.field_type, request.new_value)}
            </span>
          }
        </FieldRow>
        {request.reason && (
          <FieldRow label="เหตุผล">
            <span className="text-gray-600">{request.reason}</span>
          </FieldRow>
        )}
        <FieldRow label="โดย">
          <span className="text-gray-600">{request.requested_by_name}</span>
        </FieldRow>
      </div>

      {/* Edit input (toggle) */}
      {showEdit && (
        <div className="mb-3">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            placeholder="แก้ค่าก่อน approve..."
          />
        </div>
      )}

      {/* Actions */}
      {!readonly && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          onClick={() => onAction(request, 'accepted', request.new_value)}
          className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
        >
          ✅ Accept
        </button>
        <button
          onClick={() => {
            if (!showEdit) { setShowEdit(true); return }
            if (!editValue.trim()) return
            onAction(request, 'edited', editValue.trim())
          }}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
        >
          {showEdit ? '💾 ยืนยัน Edit' : '✏️ Edit'}
        </button>
        {showEdit && (
          <button
            onClick={() => { setShowEdit(false); setEditValue(request.new_value) }}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
          >
            ยกเลิก
          </button>
        )}
        {!showReject ? (
          <button
            onClick={() => setShowReject(true)}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-200"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReject(false); setRejectReason('') }}
                className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50"
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
      }
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

  const fetchRequests = async () => {
    const res = await fetch(`/api/requests?status=${statusFilter}`)
    const json = await res.json()
    setRequests(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    let ignore = false

    fetch(`/api/requests?status=${statusFilter}`)
      .then(res => res.json())
      .then(json => {
        if (ignore) return
        setRequests(json.data || [])
        setLoading(false)
      })
      .catch(() => {
        if (ignore) return
        setRequests([])
        setLoading(false)
      })

    return () => { ignore = true }
  }, [statusFilter])

  const totalPages = Math.max(1, Math.ceil(requests.length / REQUESTS_PER_PAGE))
  const visiblePage = Math.min(currentPage, totalPages)
  const startIndex = (visiblePage - 1) * REQUESTS_PER_PAGE
  const paginatedRequests = requests.slice(startIndex, startIndex + REQUESTS_PER_PAGE)

  const handleAction = (
    request: Request,
    action: 'accepted' | 'edited' | 'deleted' | 'rejected',
    finalValue: string,
  ) => {
    setConfirm({ request, action, finalValue })
  }

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
        const actionLabel = confirm.action === 'accepted' ? 'อนุมัติ' : confirm.action === 'edited' ? 'แก้ไขและอนุมัติ' : 'ลบ'
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
      {/* Toast */}
      {toast && (
        <div className="fixed left-3 right-3 top-4 z-50 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg sm:left-auto sm:right-4">
          {toast}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        state={confirm}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        loading={submitting}
      />

      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">📨 Admin — Contact Requests</h1>
        <span className="text-sm text-gray-400">{requests.length} รายการ</span>
      </div>

      {/* Status Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => {
              setLoading(true)
              setStatusFilter(s)
              setCurrentPage(1)
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s
              ? s === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : s === 'approved' ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
          >
            {s === 'pending' ? '🟡 Pending' : s === 'approved' ? '🔵 Approved' : '❌ Rejected'}
          </button>
        ))}
        <button
          onClick={() => {
            setLoading(true)
            fetchRequests()
          }}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 sm:ml-auto sm:w-auto"
        >
          🔄 Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">กำลังโหลด...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-300 text-sm">ไม่มี request ในสถานะนี้</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedRequests.map(r => (
              <RequestCard
                key={r.id}
                request={r}
                onAction={handleAction}
                readonly={statusFilter !== 'pending'}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-gray-400">
                แสดง {startIndex + 1}-{Math.min(startIndex + REQUESTS_PER_PAGE, requests.length)} จาก {requests.length} รายการ
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
                  disabled={visiblePage === 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-8 rounded-lg border px-2 text-sm font-medium transition-colors ${visiblePage === page
                      ? 'border-blue-300 bg-blue-100 text-blue-800'
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
                  disabled={visiblePage === totalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
