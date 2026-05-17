'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExportModal } from '@/components/ExportModal'

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceGroup = {
  label: string
  value: string
  types: string[]
}
type Place = {
  place_id: string
  name: string
  city: string
  service_type: string | null
  business_status: string
  rating: string | null
  google_map_url: string | null
  has_booking: boolean | null
  phone: string | null
  line_id: string | null
  email: string | null
  facebook_url: string | null
  instagram_handle: string | null
  last_note: string | null
  last_note_by: string | null
  last_note_at: string | null
  pending_requests: string
}

type Filters = {
  search: string
  city: string
  serviceType: string
  status: string
  hasLine: boolean
  hasFb: boolean
  hasIg: boolean
  hasEmail: boolean
  hasPhone: boolean
  hasBooking: 'yes' | 'no' | ''
  noted: 'yes' | 'no' | ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function StatusBadge({ place }: { place: Place }) {
  if (parseInt(place.pending_requests) > 0)
    return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 whitespace-nowrap font-medium">🟡 Pending</span>
  if (place.last_note)
    return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 whitespace-nowrap font-medium">✅ Noted</span>
  return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-400 whitespace-nowrap">— No Action</span>
}

function ContactIcons({ place }: { place: Place }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {place.phone && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs font-medium">📞</span>}
      {place.line_id && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded text-xs font-medium">LINE</span>}
      {place.email && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs font-medium">✉️</span>}
      {place.facebook_url && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded text-xs font-medium">FB</span>}
      {place.instagram_handle && <span className="px-1.5 py-0.5 bg-pink-50 text-pink-600 border border-pink-200 rounded text-xs font-medium">IG</span>}
      {!place.phone && !place.line_id && !place.email && !place.facebook_url && !place.instagram_handle &&
        <span className="text-gray-300 text-xs">—</span>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: Filters = {
  search: '', city: '', serviceType: '', status: '',
  hasLine: false, hasFb: false, hasIg: false,
  hasEmail: false, hasPhone: false, hasBooking: '', noted: '',
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<Place[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [cities, setCities] = useState<string[]>([])
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])

  const [showExportModal, setShowExportModal] = useState(false)


  // load filter options once
  useEffect(() => {
    fetch('/api/filters').then(r => r.json()).then(json => {
      setCities(json.cities || [])
      setServiceGroups(json.serviceGroups || [])
    })
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchData(1) }, 400)
    return () => clearTimeout(timer)
  }, [filters.search])


  useEffect(() => {
    setPage(1)
    fetchData(1)
  }, [filters.city, filters.serviceType, filters.status,
  filters.hasLine, filters.hasFb, filters.hasIg,
  filters.hasEmail, filters.hasPhone, filters.hasBooking])
  useEffect(() => { fetchData(page) }, [page])

  const buildParams = useCallback((p: number, all = false) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.city) params.set('city', filters.city)
    if (filters.serviceType) params.set('serviceType', filters.serviceType)
    if (filters.status) params.set('status', filters.status)
    if (filters.hasLine) params.set('hasLine', '1')
    if (filters.hasFb) params.set('hasFb', '1')
    if (filters.hasIg) params.set('hasIg', '1')
    if (filters.hasEmail) params.set('hasEmail', '1')
    if (filters.hasPhone) params.set('hasPhone', '1')
    if (filters.hasBooking === 'yes') params.set('hasBooking', 'yes')
    if (filters.hasBooking === 'no') params.set('hasBooking', 'no')
    if (filters.noted === 'yes') params.set('noted', 'yes')
    if (filters.noted === 'no') params.set('noted', 'no')
    if (!all) params.set('page', String(p))
    else params.set('export', '1')
    return params
  }, [filters])

  const fetchData = useCallback(async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/dashboard?${buildParams(p)}`)
    const json = await res.json()
    setData(json.data || [])
    setTotal(json.total || 0)
    setLoading(false)
  }, [page, buildParams])

  useEffect(() => { setPage(1); fetchData(1) }, [filters])
  useEffect(() => { fetchData(page) }, [page])

  const handleSearch = () => { setPage(1); fetchData(1) }

 

  const toggleFilter = (key: keyof Filters) => {
    setFilters(f => ({ ...f, [key]: !f[key] }))
  }

  const totalPages = total > 0 ? Math.ceil(total / 50) : 1

  const ToggleBtn = ({ label, fKey }: { label: string; fKey: keyof Filters }) => (
    <button
      onClick={() => toggleFilter(fKey)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filters[fKey]
        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
        }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">📊 Sales Dashboard</h1>
        <span className="text-sm text-gray-400">ทั้งหมด {total.toLocaleString()} รายการ</span>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm space-y-3">

        {/* Row 1: Search + Dropdowns */}
        <div className="flex gap-2 flex-wrap">
          <input
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 placeholder-gray-400 flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="🔍 ค้นหาชื่อร้าน / place_id..."
            value={filters.search}
            onChange={e => {
              const val = e.target.value
              setFilters(f => ({ ...f, search: val }))
            }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={filters.city}
            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
          >
            <option value="">📍จังหวัด</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={filters.serviceType}
            onChange={e => setFilters(f => ({ ...f, serviceType: e.target.value }))}
          >
            <option value="">🏷️ ทุก Service Type</option>
            {serviceGroups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}

          </select>
          {/* <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="OPERATIONAL">เปิดอยู่</option>
            <option value="CLOSED_TEMPORARILY">ปิดชั่วคราว</option>
            <option value="CLOSED_PERMANENTLY">ปิดถาวร</option>
          </select> */}
        </div>

        {/* Row 2: Contact Toggles + Action Buttons */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-400 font-medium">Contact:</span>
          <ToggleBtn label="📞 Phone" fKey="hasPhone" />
          <ToggleBtn label="LINE" fKey="hasLine" />
          <ToggleBtn label="FB" fKey="hasFb" />
          <ToggleBtn label="IG" fKey="hasIg" />
          <ToggleBtn label="✉️ Email" fKey="hasEmail" />
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={filters.hasBooking}
            onChange={e => setFilters(f => ({ ...f, hasBooking: e.target.value as 'yes' | 'no' | '' }))}
          >
            <option value="">📅 Booking</option>
            <option value="yes">✅Booking</option>
            <option value="no">❌ Booking</option>
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={filters.noted}
            onChange={e => setFilters(f => ({ ...f, noted: e.target.value as 'yes' | 'no' | '' }))}
          >
            <option value="">📝Note</option>
            <option value="yes">✅Note</option>
            <option value="no">❌ Note</option>
          </select>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); setTimeout(() => fetchData(1), 0) }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 font-medium"
            >
              ClearFilters
            </button>
            <button
              onClick={() => fetchData(page)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 font-medium"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 shadow-sm"
            >
              ⬇️ Export CSV
            </button>

            {showExportModal && (
              <ExportModal
                cities={cities}
                serviceGroups={serviceGroups}
                currentFilters={filters}
                onClose={() => setShowExportModal(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-50 text-left border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs w-10">#</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Name</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Contacts</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Maps</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Service Type</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">City</th>

              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Booking</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Rating</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Last Action</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">By</th>
              <th className="px-3 py-2.5 text-gray-500 font-semibold text-xs">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400 text-sm">ไม่พบข้อมูล</td></tr>
            ) : data.map((place, idx) => (
              <tr
                key={place.place_id}
                onClick={() => router.push(`/dashboard/${place.place_id}`)}
                className={`border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
              >
                <td className="px-3 py-2.5 text-gray-400 text-xs">
                  {(page - 1) * 50 + idx + 1}
                </td>
                <td className="px-3 py-2.5 max-w-xs">
                  <div className="font-medium text-gray-900 truncate">{place.name || '—'}</div>
                  <div className="text-xs text-gray-400 truncate">{place.place_id}</div>
                </td>
                <td className="px-3 py-2.5"><ContactIcons place={place} /></td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  {place.google_map_url ? (
                    <a
                      href={place.google_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      🗺️ Maps
                    </a>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  {place.service_type ? (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-medium">
                      {place.service_type}
                    </span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{place.city || '—'}</td>

                <td className="px-3 py-2.5">
                  {place.has_booking === true
                    ? <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs font-medium">✅ Yes</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5 text-gray-600 text-xs">{place.rating ?? '—'}</td>
                <td className="px-3 py-2.5 text-gray-500 max-w-[180px]">
                  <div className="truncate text-xs leading-relaxed" title={place.last_note ?? ''}>
                    {place.last_note ?? '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatDate(place.last_note_at)}</div>
                </td>
                <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{place.last_note_by ?? '—'}</td>
                <td className="px-3 py-2.5"><StatusBadge place={place} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex gap-2 mt-4 items-center justify-between">
        <span className="text-xs text-gray-400">
          {loading
            ? 'กำลังโหลด...'
            : `แสดง ${((page - 1) * 50) + 1}–${Math.min(page * 50, total)} จาก ${total.toLocaleString()} รายการ`
          }
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={loading || page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs disabled:opacity-40 bg-white hover:bg-gray-50 font-medium"
          >
            ← ก่อนหน้า
          </button>
          <span className="text-xs text-gray-600 self-center px-2">หน้า {page} / {loading ? '...' : totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading || page >= totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs disabled:opacity-40 bg-white hover:bg-gray-50 font-medium"
          >
            ถัดไป →
          </button>
        </div>
      </div>
    </div>
  )
}