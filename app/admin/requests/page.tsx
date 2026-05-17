'use client'

import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMP_ADMIN_ID = '98df5410-3fe5-4889-8e2f-e76fd759b999'
// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function fieldLabel(f: string) {
  const map: Record<string, string> = {
    phone: 'โทรศัพท์', phone2: 'โทรศัพท์ 2',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1">ยืนยันการดำเนินการ</h3>
        <p className="text-sm text-gray-500 mb-4">
          {actionLabel} request ของ <span className="font-medium text-gray-700">{request.place_name}</span>
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1.5">
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">Field</span>
            <span className="font-medium text-gray-700">{fieldLabel(request.field_type)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">ค่าเดิม</span>
            <span className="text-gray-500 line-through">{request.old_value || '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">ค่าใหม่</span>
            <span className="font-medium text-gray-900">
              {action === 'deleted' ? <span className="text-red-500">ลบออก</span> : finalValue}
            </span>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-900">{request.place_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{request.place_id}</p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(request.created_at)}</span>
      </div>

      {/* Field info */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm space-y-1.5">
        <div className="flex gap-2">
          <span className="text-gray-400 w-24 shrink-0">Field</span>
          <span className="font-medium text-gray-700">{fieldLabel(request.field_type)}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 w-24 shrink-0">ค่าเดิม</span>
          <span className="text-gray-500 line-through">{request.old_value || '—'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 w-24 shrink-0">ค่าที่เสนอ</span>
          {request.new_value === '' || request.new_value === null
            ? <span className="font-medium text-red-500">🗑️ คำขอลบ</span>
            : <span className="font-medium text-blue-700">{request.new_value}</span>
          }
        </div>
        {request.reason && (
          <div className="flex gap-2">
            <span className="text-gray-400 w-24 shrink-0">เหตุผล</span>
            <span className="text-gray-600">{request.reason}</span>
          </div>
        )}
        <div className="flex gap-2">
          <span className="text-gray-400 w-24 shrink-0">โดย</span>
          <span className="text-gray-600">{request.requested_by_name}</span>
        </div>
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
      {!readonly && <div className="flex gap-2 flex-wrap">
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
        <button
          onClick={() => onAction(request, 'rejected', '')}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-200"
        >
          ❌ Reject
        </button>
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

  const fetchRequests = async () => {
    setLoading(true)
    const res = await fetch(`/api/requests?status=${statusFilter}`)
    const json = await res.json()
    setRequests(json.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [statusFilter])

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
          reviewed_by: TEMP_ADMIN_ID,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setToast(`❌ Error: ${err.error}`)
      } else {
        const actionLabel = confirm.action === 'accepted' ? 'อนุมัติ' : confirm.action === 'edited' ? 'แก้ไขและอนุมัติ' : 'ลบ'
        setToast(`✅ ${actionLabel}แล้ว — ${confirm.request.place_name}`)
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
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">📨 Admin — Contact Requests</h1>
        <span className="text-sm text-gray-400">{requests.length} รายการ</span>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-5">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
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
          onClick={fetchRequests}
          className="ml-auto px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {requests.map(r => (
            <RequestCard
              key={r.id}
              request={r}
              onAction={handleAction}
              readonly={statusFilter !== 'pending'}
            />
          ))}
        </div>
      )}
    </div>
  )
}