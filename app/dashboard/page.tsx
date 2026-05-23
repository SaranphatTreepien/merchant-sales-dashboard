'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ExportModal } from '@/components/ExportModal'
import { DashboardSummaryModal } from '@/components/DashboardSummaryModal'

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceGroup = { label: string; value: string; types: string[] }
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
  whatsapp?: string | null
  telegram_url?: string | null
  last_note: string | null
  last_note_by: string | null
  last_note_at: string | null
  pending_requests: string
  deal_status: 'pending' | 'success' | 'stop' | null  // เพิ่ม stop
  deal_sale_name: string | null
  deal_reference_code: string | null  // เพิ่ม
  deal_updated_at: string | null    // ✅ เพิ่ม
  last_activity_at: string | null
  country: string | null
}
type Filters = {
  search: string; city: string; serviceType: string; status: string
  hasLine: boolean; hasFb: boolean; hasIg: boolean
  hasEmail: boolean; hasPhone: boolean
  hasWhatsapp: boolean; hasTelegram: boolean
  hasBooking: 'yes' | 'no' | ''; noted: 'yes' | 'no' | ''
  hasDeal: 'yes' | 'no' | 'pending' | 'success' | 'stop' | ''
  hasTiktok: boolean
}

const DEFAULT_FILTERS: Filters = {
  search: '', city: '', serviceType: '', status: '',
  hasLine: false, hasFb: false, hasIg: false,
  hasEmail: false, hasPhone: false,
  hasWhatsapp: false, hasTelegram: false,
  hasBooking: '', noted: '',
  hasDeal: '',
  hasTiktok: false,
}
const PAGE_SIZE = 20
// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function StatusBadge({ place }: { place: Place }) {
  const hasPending = parseInt(place.pending_requests) > 0
  const hasNote = !!place.last_note

  const baseCls = "inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap min-w-[90px]"

  if (!hasPending && !hasNote) {
    return (
      <div className="flex justify-center">
        <span className={`${baseCls} bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400 border border-slate-200/60 dark:border-white/10`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          No Action
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {hasPending && (
        <span className={`${baseCls} bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 shadow-sm`}>
          <span className="text-[11px]">🔔</span>
          <span>Pending</span>
        </span>
      )}
      {hasNote && (
        <span className={`${baseCls} bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20 shadow-sm`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#40BEB6]" />
          <span>Noted</span>
        </span>
      )}
    </div>
  )
}
function ContactBadges({ place }: { place: Place }) {
  const badges = [
    place.phone && { label: 'Phone', cls: 'bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
    place.line_id && { label: 'LINE', cls: 'bg-green-50 text-green-700 border-green-200/60 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' },
    place.facebook_url && { label: 'FB', cls: 'bg-indigo-50 text-indigo-600 border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' },
    place.instagram_handle && { label: 'IG', cls: 'bg-pink-50 text-pink-600 border-pink-200/60 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20' },
    place.whatsapp && { label: 'WhatsApp', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    place.telegram_url && { label: 'Telegram', cls: 'bg-sky-50 text-sky-600 border-sky-200/60 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20' },
    place.email && { label: 'Email', cls: 'bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
  ].filter(Boolean) as { label: string; cls: string }[]

  if (badges.length === 0)
    return <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>

  return (
    <div className="flex max-h-[56px] flex-wrap gap-1 overflow-hidden">
      {badges.map(b => (
        <span key={b.label} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap shadow-2xs ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </div>
  )
}



// ─── Main Page ────────────────────────────────────────────────────────────────
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
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('ALL')

  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countries, setCountries] = useState<{ code: string; name: string; flag: string; total: number }[]>([])
  const [showFilters, setShowFilters] = useState(true)

  const isMounted = useRef(false)
  const filtersRef = useRef(filters)
  const selectedCountryRef = useRef(selectedCountry)
  const pageRef = useRef(page)

  // sync refs — ไม่ใช้ useEffect เพราะต้องการ sync ทันที
  filtersRef.current = filters
  selectedCountryRef.current = selectedCountry
  pageRef.current = page
  const [stats, setStats] = useState({
    countryCode: '',
    countryName: '',
    countryFlag: '',
    noted: 0, pending: 0, success: 0, stop: 0
  })
  const [copiedRefCode, setCopiedRefCode] = useState<string | null>(null)

  const copyRefCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(code)
    setCopiedRefCode(code)
    setTimeout(() => setCopiedRefCode(null), 1500)
  }
  // app/dashboard/page.tsx
  // Effects — เรียบง่าย ไม่ซ้อนกัน
  // Effect หลัก — โหลดครั้งแรก + เปลี่ยน country
  // Effect หลัก — โหลดครั้งแรก + เปลี่ยน country
  useEffect(() => {
    fetch(`/api/filters?country=${selectedCountry}`).then(r => r.json()).then(json => {
      setCities(json.cities || [])
      setServiceGroups(json.serviceGroups || [])
      setCountries(json.countries || [])
    })
    setPage(1)
    fetchData(1)
    // set หลัง fetchData เพื่อให้ effects อื่น skip ตอน mount
    setTimeout(() => { isMounted.current = true }, 50)
  }, [selectedCountry])

  // Search — debounce, skip ตอน mount
  useEffect(() => {
    if (!isMounted.current) return
    const timer = setTimeout(() => { setPage(1); fetchData(1) }, 400)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Filters อื่น — skip ตอน mount
  useEffect(() => {
    if (!isMounted.current) return
    setPage(1); fetchData(1)
  }, [
    filters.city, filters.serviceType, filters.status,
    filters.hasLine, filters.hasFb, filters.hasIg,
    filters.hasEmail, filters.hasPhone,
    filters.hasWhatsapp, filters.hasTelegram,
    filters.hasBooking, filters.noted,
    filters.hasDeal, filters.hasTiktok
  ])

  // Pagination — skip ตอน mount
  useEffect(() => {
    if (!isMounted.current) return
    fetchData(page)
  }, [page])

  const buildParams = (p: number, all = false) => {
    const f = filtersRef.current
    const country = selectedCountryRef.current
    const params = new URLSearchParams()
    params.set('country', country)
    if (f.search) params.set('search', f.search)
    if (f.city) params.set('city', f.city)
    if (f.serviceType) params.set('serviceType', f.serviceType)
    if (f.status) params.set('status', f.status)
    if (f.hasLine) params.set('hasLine', '1')
    if (f.hasFb) params.set('hasFb', '1')
    if (f.hasIg) params.set('hasIg', '1')
    if (f.hasEmail) params.set('hasEmail', '1')
    if (f.hasWhatsapp) params.set('hasWhatsapp', '1')
    if (f.hasTelegram) params.set('hasTelegram', '1')
    if (f.hasDeal === 'yes') params.set('hasDeal', 'yes')
    if (f.hasDeal === 'no') params.set('hasDeal', 'no')
    if (f.hasDeal === 'pending') params.set('hasDeal', 'pending')
    if (f.hasDeal === 'success') params.set('hasDeal', 'success')
    if (f.hasDeal === 'stop') params.set('hasDeal', 'stop')
    if (f.hasTiktok) params.set('hasTiktok', '1')
    if (f.hasPhone) params.set('hasPhone', '1')
    if (f.hasBooking === 'yes') params.set('hasBooking', 'yes')
    if (f.hasBooking === 'no') params.set('hasBooking', 'no')
    if (f.noted === 'yes') params.set('noted', 'yes')
    if (f.noted === 'no') params.set('noted', 'no')
    if (!all) params.set('page', String(p))
    else params.set('export', '1')
    return params
  }

  // fetchData — stable reference ไม่มี dependency เลย
  const fetchData = useCallback(async (p?: number) => {
    const currentPage = p ?? pageRef.current
    const country = selectedCountryRef.current
    console.log('[fetchData] called', { p, currentPage, country, stack: new Error().stack?.split('\n')[2] })
    setLoading(true)
    const [statsRes, res] = await Promise.all([
      fetch(`/api/dashboard/stats?country=${country}`),
      fetch(`/api/dashboard?${buildParams(currentPage)}`),
    ])
    const [statsJson, json] = await Promise.all([
      statsRes.json(),
      res.json(),
    ])
    setData(json.data || [])
    setTotal(json.total || 0)
    setStats(statsJson)
    setLoading(false)
  }, []) // ← dependency array ว่าง — reference ไม่เปลี่ยนอีกแล้ว

  const handleSearch = () => { setPage(1); fetchData(1) }
  const [copiedPlaceId, setCopiedPlaceId] = useState<string | null>(null)

  const copyPlaceId = (e: React.MouseEvent, placeId: string) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(placeId)
    setCopiedPlaceId(placeId)
    setTimeout(() => setCopiedPlaceId(null), 1500)
  }
  const toggleFilter = (key: keyof Filters) => setFilters(f => ({ ...f, [key]: !f[key] }))
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1

  // Compute active filters count
  const activeFiltersCount = [
    filters.search !== '',
    filters.city !== '',
    filters.serviceType !== '',
    filters.status !== '',
    filters.hasLine,
    filters.hasFb,
    filters.hasIg,
    filters.hasEmail,
    filters.hasPhone,
    filters.hasWhatsapp,   // ← เพิ่มบรรทัดนี้
    filters.hasTelegram,   // ← เพิ่มบรรทัดนี้
    filters.hasDeal !== '',
    filters.hasTiktok,
    filters.hasBooking !== '',
    filters.noted !== ''
  ].filter(Boolean).length

  const ToggleBtn = ({ label, fKey }: { label: string; fKey: keyof Filters }) => {
    let icon = "🔗"
    if (fKey === 'hasPhone') icon = "📞"
    if (fKey === 'hasLine') icon = "💬"
    if (fKey === 'hasFb') icon = "📘"
    if (fKey === 'hasIg') icon = "📸"
    if (fKey === 'hasEmail') icon = "✉️"
    if (fKey === 'hasWhatsapp') icon = "💚"
    if (fKey === 'hasTelegram') icon = "✈️"
    if (fKey === 'hasTiktok') icon = "🎵"

    const displayLabel = label.replace(/[^\w\s]/gi, '').trim()

    return (
      <button
        onClick={() => toggleFilter(fKey)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 ${filters[fKey]
          ? 'bg-[#40BEB6] text-white border-[#40BEB6] shadow-sm shadow-[#40BEB6]/30 ring-2 ring-[#40BEB6]/20'
          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-[#40BEB6]/50 hover:text-[#40BEB6] dark:hover:border-[#40BEB6]/40 dark:hover:text-teal-400'
          }`}
      >
        <span className="text-[13px]">{icon}</span>
        <span>{displayLabel}</span>
      </button>
    )
  }

  const PlaceholderContactBtn = ({ icon, label }: { icon: string; label: string }) => (
    <button
      type="button"
      disabled
      title="เตรียมไว้สำหรับ filter ในอนาคต"
      className="flex cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-400 opacity-80 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
    >
      <span className="text-[13px]">{icon}</span>
      <span>{label}</span>
    </button>
  )
  const latestActivity = data.reduce((max, p) => {
    if (!p.last_activity_at) return max
    return !max || p.last_activity_at > max ? p.last_activity_at : max
  }, null as string | null)
  return (
    <div className="w-full max-w-none px-0 py-1 sm:px-2 sm:py-4 xl:-mx-8 xl:w-[calc(100%+4rem)] 2xl:-mx-14 2xl:w-[calc(100%+7rem)]">

      {/* ── Header Redesign ── */}
      {/* ── Header ── */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3">

        {/* Card 1 — Hero */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-2 min-w-0">
              {/* Title row */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Dashboard</h1>
                <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-700/10 dark:bg-pink-500/10 dark:text-pink-400 dark:ring-pink-500/20">
                  Sales Focus
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              </div>
              {/* Hero numbers */}
              <div className="flex flex-wrap items-baseline gap-3">
                {/* Country Dropdown */}
                <div className="relative" id="country-dropdown">

                  <button
                    onClick={() => setShowCountryDropdown(v => !v)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 transition-all hover:border-[#40BEB6]/40 hover:bg-white dark:hover:bg-white/10"
                  >
                    {selectedCountry !== 'ALL' && (
                      <span
                        className={`fi fi-${selectedCountry.toLowerCase()}`}
                        style={{ width: '1.5rem', height: '1rem', borderRadius: '2px', flexShrink: 0 }}
                      />
                    )}
                    <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {countries.find(c => c.code === selectedCountry)?.name ?? selectedCountry}
                    </span>
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown list */}
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                      {countries.map(c => (
                        <button
                          key={c.code}
                          onClick={() => {
                            setSelectedCountry(c.code)
                            setShowCountryDropdown(false)
                            setFilters(f => ({ ...f, city: '' }))
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${selectedCountry === c.code ? 'text-[#40BEB6]' : 'text-slate-700 dark:text-slate-200'}`}
                        >
                          <span className={`fi fi-${c.flag}`} style={{ width: '1.25rem', height: '0.875rem', borderRadius: '2px', flexShrink: 0 }} />
                          <span>{c.name}</span>
                          <span className="ml-auto text-xs text-slate-400">{c.total.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-3xl font-bold tabular-nums text-[#40BEB6]">
                  {total?.toLocaleString() ?? '0'}
                </span>
                <span className="text-sm text-slate-400 dark:text-slate-500 self-end pb-1">merchants</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSummaryModal(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:border-[#40BEB6]/40 hover:text-[#40BEB6] active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                รายละเอียด
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#40BEB6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#35a8a1] active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Card 2 — 4 Stat Cards */}
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

  {/* Noted */}
  <div className="group relative overflow-hidden rounded-2xl border border-slate-300/70 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/15 dark:from-slate-900 dark:to-slate-900/80">

    <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />

    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Noted
        </p>

        <p className="mt-2 text-3xl font-black tabular-nums text-emerald-500 dark:text-emerald-400">
          {stats.noted?.toLocaleString() ?? '0'}
        </p>

        <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          ร้านที่มี note
        </p>
      </div>

      <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
        📝
      </div>
    </div>
  </div>

  {/* Success */}
  <div className="group relative overflow-hidden rounded-2xl border border-slate-300/70 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/15 dark:from-slate-900 dark:to-slate-900/80">

    <div className="absolute inset-x-0 top-0 h-1 bg-[#40BEB6]" />

    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Deal Success
        </p>

        <p className="mt-2 text-3xl font-black tabular-nums text-[#40BEB6]">
          {stats.success?.toLocaleString() ?? '0'}
        </p>

        <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          ปิดดีลแล้ว
        </p>
      </div>

      <div className="rounded-xl bg-[#40BEB6]/10 p-2 text-[#40BEB6]">
        ✅
      </div>
    </div>
  </div>

  {/* Progress */}
  <div className="group relative overflow-hidden rounded-2xl border border-slate-300/70 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/15 dark:from-slate-900 dark:to-slate-900/80">

    <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />

    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Deal Progress
        </p>

        <p className="mt-2 text-3xl font-black tabular-nums text-blue-500 dark:text-blue-400">
          {stats.pending?.toLocaleString() ?? '0'}
        </p>

        <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          กำลังดำเนินการ
        </p>
      </div>

      <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
        ⏳
      </div>
    </div>
  </div>

  {/* Stop */}
  <div className="group relative overflow-hidden rounded-2xl border border-slate-300/70 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/15 dark:from-slate-900 dark:to-slate-900/80">

    <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />

    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Deal Stop
        </p>

        <p className="mt-2 text-3xl font-black tabular-nums text-red-500 dark:text-red-400">
          {stats.stop?.toLocaleString() ?? '0'}
        </p>

        <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          ยุติการติดต่อ
        </p>
      </div>

      <div className="rounded-xl bg-red-500/10 p-2 text-red-500">
        ❌
      </div>
    </div>
  </div>

</div>

      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-5 space-y-4 rounded-2xl border border-slate-300 bg-white p-3 dark:border-white/25 dark:bg-slate-900/80 sm:mb-6 sm:p-5">

        {/* Header */}
        <div className="flex w-full items-center justify-between border-b border-slate-300/90 pb-3 dark:border-white/20">

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Search & Filter Console
            </span>

            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-[#40BEB6]/10 text-[#40BEB6] rounded-full border border-[#40BEB6]/25">
                {activeFiltersCount} Active
              </span>
            )}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#40BEB6] hover:bg-[#40BEB6]/10 transition-all duration-200"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''
                }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {showFilters && (
          <>
            {/* Row 1: Search & Dropdowns */}
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(240px,340px)_180px_170px_170px_minmax(230px,280px)] lg:gap-3">
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#40BEB6] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all duration-300 placeholder-slate-400 focus:border-[#40BEB6] focus:bg-white focus:ring-4 focus:ring-[#40BEB6]/10 dark:border-slate-700 dark:bg-slate-950/45 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:placeholder-slate-500 dark:focus:border-[#40BEB6] dark:focus:bg-slate-950"
                  placeholder="ค้นหาชื่อร้าน / place_id..."
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="relative">
                <select
                  className={`h-11 w-full appearance-none rounded-xl border px-3.5 py-2.5 pr-10 text-sm font-semibold outline-none transition-all cursor-pointer focus:border-[#40BEB6] focus:ring-4 focus:ring-[#40BEB6]/10 ${filters.city !== ''
                    ? 'border-[#40BEB6] bg-[#40BEB6]/5 text-[#40BEB6] ring-4 ring-[#40BEB6]/10 dark:border-[#40BEB6] dark:bg-slate-950/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 focus:bg-white dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-400 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:hover:border-slate-600 dark:focus:bg-slate-950'
                    }`}
                  value={filters.city}
                  onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                >
                  <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">📍 ทุกจังหวัด</option>
                  {cities.map(c =>
                    c === 'อื่นๆ'
                      ? <option key="other" value="other" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">⚠️ อื่นๆ</option>
                      : <option key={c} value={c} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{c}</option>
                  )}
                </select>
                <span className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${filters.city !== '' ? 'text-[#40BEB6]' : 'text-slate-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>

              <div className="relative min-w-0 group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-[#40BEB6] transition-colors text-xs">📅</span>
                <select
                  className={`h-11 w-full appearance-none rounded-xl border bg-white dark:bg-slate-900 pl-8 pr-9 py-2 text-xs font-semibold outline-none transition-all duration-200 cursor-pointer ${filters.hasBooking !== ''
                    ? 'border-[#40BEB6] text-[#40BEB6] ring-4 ring-[#40BEB6]/10 bg-[#40BEB6]/5'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  value={filters.hasBooking}
                  onChange={e => setFilters(f => ({ ...f, hasBooking: e.target.value as 'yes' | 'no' | '' }))}
                >
                  <option value="">Booking: ทั้งหมด</option>
                  <option value="yes">✅ มี Booking</option>
                  <option value="no">❌ ไม่มี Booking</option>
                </select>
                <span className={`absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none ${filters.hasBooking !== '' ? 'text-[#40BEB6]' : 'text-slate-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>

              <div className="relative min-w-0 group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-[#40BEB6] transition-colors text-xs">📝</span>
                <select
                  className={`h-11 w-full appearance-none rounded-xl border bg-white dark:bg-slate-900 pl-8 pr-9 py-2 text-xs font-semibold outline-none transition-all duration-200 cursor-pointer ${filters.noted !== ''
                    ? 'border-[#40BEB6] text-[#40BEB6] ring-4 ring-[#40BEB6]/10 bg-[#40BEB6]/5'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  value={filters.noted}
                  onChange={e => setFilters(f => ({ ...f, noted: e.target.value as 'yes' | 'no' | '' }))}
                >
                  <option value="">Note: ทั้งหมด</option>
                  <option value="yes">✅ มี Note</option>
                  <option value="no">❌ ไม่มี Note</option>
                </select>
                <span className={`absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none ${filters.noted !== '' ? 'text-[#40BEB6]' : 'text-slate-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
              <div className="relative min-w-0 group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-xs">🤝</span>
                <select
                  className={`h-11 w-full appearance-none rounded-xl border bg-white dark:bg-slate-900 pl-8 pr-9 py-2 text-xs font-semibold outline-none transition-all duration-200 cursor-pointer ${filters.hasDeal !== ''
                    ? 'border-[#40BEB6] text-[#40BEB6] ring-4 ring-[#40BEB6]/10 bg-[#40BEB6]/5'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  value={filters.hasDeal}
                  onChange={e => setFilters(f => ({ ...f, hasDeal: e.target.value as 'yes' | 'no' | 'pending' | 'success' | 'stop' | '' }))}
                >
                  <option value="">Deal: ทั้งหมด</option>
                  <option value="yes">🤝 บันทึกแล้ว (ทุกสถานะ)</option>
                  <option value="success">✅ Success</option>
                  <option value="pending">🔵 In Progress</option>
                  <option value="stop">🔴 Stop</option>
                  <option value="no">⬜ ยังไม่บันทึก</option>
                </select>
                <span className={`absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none ${filters.hasDeal !== '' ? 'text-[#40BEB6]' : 'text-slate-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
              <div className="relative">
                <select
                  className={`h-11 w-full appearance-none rounded-xl border px-3.5 py-2.5 pr-10 text-sm font-semibold outline-none transition-all cursor-pointer focus:border-[#40BEB6] focus:ring-4 focus:ring-[#40BEB6]/10 ${filters.serviceType !== ''
                    ? 'border-[#40BEB6] bg-[#40BEB6]/5 text-[#40BEB6] ring-4 ring-[#40BEB6]/10 dark:border-[#40BEB6] dark:bg-slate-950/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 focus:bg-white dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-400 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:hover:border-slate-600 dark:focus:bg-slate-950'
                    }`}
                  value={filters.serviceType}
                  onChange={e => setFilters(f => ({ ...f, serviceType: e.target.value }))}
                >
                  <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">🏷 ทุก Service Type</option>
                  {serviceGroups.map(g => <option key={g.value} value={g.value} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{g.label}</option>)}
                </select>
                <span className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${filters.serviceType !== '' ? 'text-[#40BEB6]' : 'text-slate-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
            </div>

            {/* Row 2: Contact Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="mr-0 w-full text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 sm:mr-2 sm:w-auto">Contact channels</span>

              <ToggleBtn label="📞 Phone" fKey="hasPhone" />
              <ToggleBtn label="LINE" fKey="hasLine" />
              <ToggleBtn label="FB" fKey="hasFb" />
              <ToggleBtn label="IG" fKey="hasIg" />
              <ToggleBtn label="Email" fKey="hasEmail" />
              <ToggleBtn label="💚 WhatsApp" fKey="hasWhatsapp" />
              <ToggleBtn label="✈️ Telegram" fKey="hasTelegram" />
              <ToggleBtn label="TikTok" fKey="hasTiktok" />
            </div>

            {/* Row 3: Actions */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-white/5 lg:flex-row lg:items-center lg:justify-end">
              <div className="grid w-full grid-cols-2 gap-2 lg:ml-auto lg:w-auto">
                <button
                  onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); setTimeout(() => fetchData(1), 0) }}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95 sm:w-auto"
                >
                  Clear All
                </button>
                <button
                  onClick={() => fetchData(page)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all active:scale-95 hover:border-[#40BEB6]/30 hover:text-[#40BEB6] dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-[#40BEB6]/30 dark:hover:text-teal-400 sm:w-auto"
                >
                  <span className="text-[11px]">🔄</span> Refresh
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── Mobile Merchant Cards ── */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm dark:border-white/12 dark:bg-slate-900/80 dark:shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]">
            กำลังโหลด...
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm dark:border-white/12 dark:bg-slate-900/80 dark:shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]">
            ไม่พบข้อมูล
          </div>
        ) : data.map((place, idx) => (
          <div
            key={place.place_id}
            onClick={() => router.push(`/dashboard/${place.place_id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && router.push(`/dashboard/${place.place_id}`)}
            className="block w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm shadow-slate-200/50 transition active:scale-[0.99] cursor-pointer dark:border-white/12 dark:bg-slate-900/80 dark:shadow-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* ชื่อร้าน + ธง */}
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${parseInt(place.pending_requests) > 0
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]'
                    : place.last_note
                      ? 'bg-[#40BEB6] shadow-[0_0_8px_rgba(64,190,182,0.45)]'
                      : 'bg-slate-300 dark:bg-slate-600'
                    }`} />
                  {place.country && (
                    <span
                      className={`fi fi-${place.country.toLowerCase()} shrink-0`}
                      style={{ width: '1rem', height: '0.75rem', borderRadius: '2px' }}
                    />
                  )}
                  <p className="truncate text-[15px] font-bold leading-5 text-slate-900 dark:text-white">
                    {place.name || '—'}
                  </p>
                </div>
                {/* place_id + badges row */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-4">
                  <span className="font-mono text-[10px] text-slate-400">
                    #{(page - 1) * PAGE_SIZE + idx + 1} · {place.place_id}
                  </span>

                </div>
              </div>
              <StatusBadge place={place} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-transparent bg-slate-50 px-3 py-2 dark:border-white/6 dark:bg-slate-950/45">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">City</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{place.city || '—'}</p>
              </div>
              <div className="rounded-xl border border-transparent bg-slate-50 px-3 py-2 dark:border-white/6 dark:bg-slate-950/45">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Service</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{place.service_type || '—'}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ContactBadges place={place} />
              {place.has_booking === true && (
                <span className="inline-flex items-center rounded-full border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-400">
                  Booking
                </span>
              )}
              {place.service_type && (
                <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/12 dark:bg-slate-950/45 dark:text-slate-300">
                  {place.service_type}
                </span>
              )}
            </div>

   <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-white/10">

  {/* Deal Status Section */}
  {(place.deal_status ||
    place.deal_reference_code ||
    (place.last_activity_at &&
      new Date(place.last_activity_at).toDateString() ===
        new Date().toDateString())) && (
    <div className="mb-4 flex flex-wrap items-center gap-2">

      {/* REF CODE */}
      {place.deal_reference_code && (
        <button
          type="button"
          onClick={e => copyRefCode(e, place.deal_reference_code!)}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-slate-100/80 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-700 transition-all hover:border-[#40BEB6]/40 hover:bg-[#40BEB6]/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        >
          <span className="truncate max-w-[110px]">
            🏷 {place.deal_reference_code}
          </span>

          <span className="text-[9px] text-slate-400 transition-colors group-hover:text-[#40BEB6]">
            {copiedRefCode === place.deal_reference_code ? '✓' : '⎘'}
          </span>
        </button>
      )}

      {/* STATUS */}
      {place.deal_status === 'success' && (
        <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-500 dark:text-emerald-400">
          ✅ Deal Success
        </span>
      )}

      {place.deal_status === 'pending' && (
        <span className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-[11px] font-bold text-blue-500 dark:text-blue-400">
          🔵 In Progress
        </span>
      )}

      {place.deal_status === 'stop' && (
        <span className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-500 dark:text-red-400">
          🔴 Stop
        </span>
      )}

      {/* DATE */}
      {place.deal_updated_at && (
        <span className="text-[10px] text-slate-400">
          {formatDate(place.deal_updated_at)}
        </span>
      )}
    </div>
  )}

  {/* NOTE SECTION */}
  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">

    <div className="flex gap-3">

      {/* Accent */}
      <div className="w-1 shrink-0 rounded-full bg-[#40BEB6]" />

      <div className="min-w-0 flex-1">

        {/* NOTE */}
        <p className="text-[13px] leading-6 text-slate-800 dark:text-slate-100 font-medium break-words">
          {place.last_note || 'ยังไม่มี note ล่าสุด'}
        </p>

        {/* FOOTER */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {place.last_note_by
              ? `${place.last_note_by} · ${formatDate(place.last_note_at)}`
              : 'No recent action'}
          </span>

          {place.google_map_url && (
            <a
              href={place.google_map_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex w-fit items-center rounded-full border border-red-300/40 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-500 transition-all hover:bg-red-500/20 dark:border-red-400/20 dark:text-red-400"
            >
              📍 Google Maps
            </a>
          )}

        </div>
      </div>
    </div>
  </div>
</div>
          </div>
        ))}
      </div>

      {/* ── Table Desktop ── */}
      <div className="hidden rounded-[22px] border border-slate-300 bg-white p-1 shadow-sm dark:border-white/25 dark:bg-slate-900/80 dark:shadow-[0_18px_45px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.045)] lg:-mx-10 lg:block lg:w-[calc(100%+5rem)] 2xl:-mx-20 2xl:w-[calc(100%+10rem)]" >
        <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-white/20">

          <table className="w-full text-sm table-auto border-collapse">

            {/* thead */}
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/55 text-left border-b border-slate-300 dark:border-white/20">

                {[
                  { label: '#', extra: 'pl-4 sm:pl-5 w-10' },
                  { label: 'Name', extra: 'min-w-[200px]' },
                  { label: 'Status', extra: 'text-center w-32' },
                  { label: 'Ref Code', extra: 'text-center w-36' },
                  { label: 'Contacts', extra: 'w-40' },
                  { label: 'City', extra: 'w-28' },
                  { label: 'Note', extra: 'min-w-[160px]' },
                  { label: 'Maps', extra: 'text-center w-16' },
                  { label: 'Booking', extra: 'text-center w-20' },
                  { label: 'Updated', extra: 'text-center w-24' },
                ].map(({ label, extra }) => (
                  <th
                    key={label}
                    className={`px-3 py-3 sm:px-4 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-r border-slate-900/10 dark:border-white/10 last:border-r-0 ${extra}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* tbody */}
            <tbody className="bg-white dark:bg-transparent divide-y divide-slate-200 dark:divide-white/15">

              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 text-sm">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 text-sm">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : data.map((place, idx) => (

                <tr
                  key={place.place_id}
                  onClick={() => router.push(`/dashboard/${place.place_id}`)}
                  className={`cursor-pointer transition-all group border-l-[3px] ${place.deal_status === 'success' ? 'border-l-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5'
                    : place.deal_status === 'pending' ? 'border-l-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-500/5'
                      : place.deal_status === 'stop' ? 'border-l-red-400 hover:bg-red-50/30 dark:hover:bg-red-500/5'
                        : 'border-l-transparent hover:bg-slate-50/80 dark:hover:bg-white/[0.035]'
                    }`}
                >
                  {/* # */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-white/15
">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  {/* Name */}

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-slate-100 dark:border-white/7">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${parseInt(place.pending_requests) > 0
                        ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                        : place.last_note
                          ? 'bg-[#40BEB6] shadow-[0_0_6px_rgba(64,190,182,0.6)]'
                          : 'bg-slate-300 dark:bg-slate-600'
                        }`} />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/${place.place_id}`) }}
                        className="flex items-center gap-1.5 max-w-[220px] text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-[#40BEB6] hover:underline hover:underline-offset-2 transition-colors"
                      >
                        {place.country && (
                          <span className={`fi fi-${place.country.toLowerCase()} shrink-0`}
                            style={{ width: '1rem', height: '0.75rem', borderRadius: '2px' }} />
                        )}
                        <span className="truncate">{place.name || '—'}</span>
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-3.5">
                      <span className="font-mono text-[10px] text-slate-400 truncate">{place.place_id}</span>
                      <button
                        type="button"
                        onClick={e => copyPlaceId(e, place.place_id)}
                        className="shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 transition-colors"
                      >
                        {copiedPlaceId === place.place_id ? '✓ Copied' : 'Copy'}
                      </button>
                      {place.service_type && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 truncate max-w-[140px]">
                          {place.service_type}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-center border-r border-slate-100 dark:border-white/7">
                    <div className="flex flex-col items-center gap-1">
                      <StatusBadge place={place} />
                      {place.deal_status === 'success' && (
                        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap min-w-[90px] bg-[#40BEB6]/15 text-[#40BEB6] border border-[#40BEB6]/30 dark:bg-[#40BEB6]/20 dark:text-[#5dd6cf] dark:border-[#40BEB6]/40">
                          ✅ Deal Success
                        </span>
                      )}
                      {place.deal_status === 'pending' && (
                        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap min-w-[90px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40">
                          🔵 In Progress
                        </span>
                      )}
                      {place.deal_status === 'stop' && (
                        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap min-w-[90px] bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-400/40">
                          🔴 Stop Deal
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Ref Code */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-center border-r border-slate-100 dark:border-white/7" onClick={e => e.stopPropagation()}>
                    {place.deal_reference_code ? (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={e => copyRefCode(e, place.deal_reference_code!)}
                          className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold max-w-[120px] bg-slate-100 hover:bg-[#40BEB6]/10 dark:bg-white/5 dark:hover:bg-[#40BEB6]/15 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-[#40BEB6]/40 transition-all"
                        >
                          <span className="truncate">🏷 {place.deal_reference_code}</span>
                          <span className="shrink-0 text-[9px] text-slate-400 group-hover:text-[#40BEB6] transition-colors">
                            {copiedRefCode === place.deal_reference_code ? '✓' : '⎘'}
                          </span>
                        </button>
                        {place.deal_sale_name && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{place.deal_sale_name}</span>
                        )}
                        {place.deal_updated_at && (
                          <span className="text-[10px] text-slate-400">{formatDate(place.deal_updated_at)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Contacts */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-slate-100 dark:border-white/7">
                    <ContactBadges place={place} />
                  </td>

                  {/* City */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-white/7">
                    {place.city || '—'}
                  </td>

                  {/* Note */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-slate-100 dark:border-white/7">
                    {place.last_note ? (
                      <div className="cursor-help" title={place.last_note}>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-100 line-clamp-2 break-words">
                          {place.last_note}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {place.last_note_by && <span className="font-medium">{place.last_note_by} · </span>}
                          {formatDate(place.last_note_at)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Maps */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-center border-r border-slate-100 dark:border-white/7" onClick={e => e.stopPropagation()}>
                    {place.google_map_url ? (
                      <a
                        href={place.google_map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 transition-colors"
                      >
                        📍 Map
                      </a>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Booking */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-center border-r border-slate-100 dark:border-white/7" >
                    {
                      place.has_booking === true ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20">
                          ✓ Yes
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                      )
                    }
                  </td>
                  {/* Updated */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-center">
                    {place.last_activity_at &&
                      new Date(place.last_activity_at).toDateString() === new Date().toDateString() ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
                        <span className="text-[10px] font-semibold tabular-nums whitespace-nowrap text-amber-600 dark:text-amber-300">
                          {formatDate(place.last_activity_at)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* ── Pagination ── */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" >
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {loading ? 'กำลังโหลด...' : `${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, total)} จาก ${total.toLocaleString()} รายการ`}
        </span>
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={loading || page === 1}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 sm:px-3.5"
          >
            ← ก่อนหน้า
          </button>
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold tabular-nums text-slate-600 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-white sm:px-3.5">
            {page} / {loading ? '...' : totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading || page >= totalPages}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 sm:px-3.5"
          >
            ถัดไป →
          </button>
        </div>
      </div >

      {/* ── Export Modal ── */}
      {
        showExportModal && (
          <ExportModal
            cities={cities}
            serviceGroups={serviceGroups}
            currentFilters={filters}
            onClose={() => setShowExportModal(false)}
            country={selectedCountry}
          />
        )
      }
      <DashboardSummaryModal
        open={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        country={selectedCountry}
      />
    </div >
  )
}
