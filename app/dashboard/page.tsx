'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExportModal } from '@/components/ExportModal'

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
}
type Filters = {
  search: string; city: string; serviceType: string; status: string
  hasLine: boolean; hasFb: boolean; hasIg: boolean
  hasEmail: boolean; hasPhone: boolean
  hasWhatsapp: boolean; hasTelegram: boolean
  hasBooking: 'yes' | 'no' | ''; noted: 'yes' | 'no' | ''
}

const DEFAULT_FILTERS: Filters = {
  search: '', city: '', serviceType: '', status: '',
  hasLine: false, hasFb: false, hasIg: false,
  hasEmail: false, hasPhone: false,
  hasWhatsapp: false, hasTelegram: false,
  hasBooking: '', noted: '',
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
    <div className="flex max-h-[42px] flex-wrap gap-1 overflow-hidden">
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
  const [showFilters, setShowFilters] = useState(true)

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
    setPage(1); fetchData(1)
  }, [filters.city, filters.serviceType, filters.status,
  filters.hasLine, filters.hasFb, filters.hasIg,
  filters.hasEmail, filters.hasPhone,
  filters.hasWhatsapp, filters.hasTelegram,
  filters.hasBooking, filters.noted])

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
    if (filters.hasWhatsapp) params.set('hasWhatsapp', '1')
    if (filters.hasTelegram) params.set('hasTelegram', '1')
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

  const handleSearch = () => { setPage(1); fetchData(1) }
  const copyPlaceId = (placeId: string) => navigator.clipboard?.writeText(placeId)
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

  return (
    <div className="w-full max-w-none px-0 py-1 sm:px-2 sm:py-4 xl:-mx-8 xl:w-[calc(100%+4rem)] 2xl:-mx-14 2xl:w-[calc(100%+7rem)]">

      {/* ── Header Redesign ── */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 sm:mb-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="min-w-0 flex-1">
          {/* Title & Tag */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-700/10 dark:bg-pink-500/10 dark:text-pink-400 dark:ring-pink-500/20">
              Sales Focus
            </span>
          </div>

          {/* Meta Information Row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-semibold text-[#40BEB6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#40BEB6]" />
              {total.toLocaleString()} Merchants
            </div>

            <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

            <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Live Data
            </div>

            <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

            <div className="text-slate-400 dark:text-slate-500">
              Merchant Acquirer for Restaurants
            </div>
          </div>
        </div>

        {/* Clean Export Button */}
        <div className="mt-4 sm:mt-0 sm:shrink-0">
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 sm:w-auto"
          >
            <svg className="h-4 w-4 text-slate-500 group-hover:text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-5 space-y-4 rounded-2xl border border-slate-200/80 bg-white p-3 ring-1 ring-white/90 dark:border-white/12 dark:bg-slate-900/80 dark:ring-white/10 dark:shadow-none sm:mb-6 sm:p-5">

        {/* Header */}
        <div className="flex w-full items-center justify-between border-b border-slate-100 pb-3 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300">Search & Filter Console</span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-[#40BEB6]/10 text-[#40BEB6] rounded-full border border-[#40BEB6]/20">
                {activeFiltersCount} Active
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#40BEB6] hover:bg-[#40BEB6]/10 transition-all"
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
                  {cities.map(c => <option key={c} value={c} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{c}</option>)}
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
              <span className="mr-0 w-full text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 sm:mr-2 sm:w-auto">Contact channels</span>
              <ToggleBtn label="📞 Phone" fKey="hasPhone" />
              <ToggleBtn label="LINE" fKey="hasLine" />
              <ToggleBtn label="FB" fKey="hasFb" />
              <ToggleBtn label="IG" fKey="hasIg" />
              <ToggleBtn label="Email" fKey="hasEmail" />
              <ToggleBtn label="💚 WhatsApp" fKey="hasWhatsapp" />
              <ToggleBtn label="✈️ Telegram" fKey="hasTelegram" />
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
          <button
            key={place.place_id}
            onClick={() => router.push(`/dashboard/${place.place_id}`)}
            className="block w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm shadow-slate-200/50 transition active:scale-[0.99] dark:border-white/12 dark:bg-slate-900/80 dark:shadow-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${parseInt(place.pending_requests) > 0
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]'
                    : place.last_note
                      ? 'bg-[#40BEB6] shadow-[0_0_8px_rgba(64,190,182,0.45)]'
                      : 'bg-slate-300 dark:bg-slate-600'
                    }`} />
                  <p className="truncate text-[15px] font-bold leading-5 text-slate-900 dark:text-white">
                    {place.name || '—'}
                  </p>
                </div>
                <p className="mt-1 truncate pl-4 font-mono text-[10px] text-slate-400">
                  #{(page - 1) * PAGE_SIZE + idx + 1} · {place.place_id}
                </p>
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

            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/8">
              <p className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {place.last_note || 'ยังไม่มี note ล่าสุด'}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="truncate text-[11px] text-slate-400">
                  {place.last_note_by ? `${place.last_note_by} · ${formatDate(place.last_note_at)}` : 'No recent action'}
                </span>
                {place.google_map_url && (
                  <a
                    href={place.google_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  >
                    Maps
                  </a>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Table (Fixed Width & Desktop Optimized) ── */}
      <div className="hidden rounded-[22px] border border-slate-200/80 bg-white p-1 shadow-sm dark:border-white/12 dark:bg-slate-900/80 dark:shadow-[0_18px_45px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.045)] lg:-mx-10 lg:block lg:w-[calc(100%+5rem)] 2xl:-mx-20 2xl:w-[calc(100%+10rem)]">
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
          <table className="min-w-[1680px] w-full text-sm table-fixed">

            {/* thead */}
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/55 text-left border-b border-slate-200/80 dark:border-white/10">
                {[
                  { label: '#', w: 'w-[4%]', extra: 'pl-4 sm:pl-5' },
                  { label: 'Status', w: 'w-[8%]', extra: 'text-center' },
                  { label: 'Name', w: 'w-[22%]', extra: '' },
                  { label: 'Contacts', w: 'w-[17%]', extra: '' },
                  { label: 'Maps', w: 'w-[5%]', extra: 'text-center' },
                  { label: 'City', w: 'w-[9%]', extra: '' },
                  { label: 'Booking', w: 'w-[7%]', extra: 'text-center' },
                  { label: 'Note', w: 'w-[15%]', extra: '' },
                  { label: 'By', w: 'w-[9%]', extra: '' },
                  { label: 'Service Type', w: 'w-[10%]', extra: '' },  // รวม = 113% → min-w ดูแลอยู่แล้ว
                ].map(({ label, w, extra }) => (
                  <th
                    key={label}
                    className={`px-3 py-3 sm:px-4 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 ${w} ${extra}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-transparent divide-y divide-slate-100 dark:divide-white/7">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 dark:text-slate-400 text-sm">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 dark:text-slate-400 text-sm">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : data.map((place, idx) => (
                <tr
                  key={place.place_id}
                  onClick={() => router.push(`/dashboard/${place.place_id}`)}
                  className="hover:bg-slate-50/80 dark:hover:bg-white/[0.035] cursor-pointer transition-all group"
                >
                  {/* Subtle Accent-Line Block inside Row Number Cell */}
                  <td className="relative px-3 py-3 sm:px-4 sm:py-3.5 text-xs text-slate-400 dark:text-slate-400 tabular-nums font-medium pl-4 sm:pl-5">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-[#40BEB6] transition-all duration-200" />
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </td>

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-center">
                    <StatusBadge place={place} />
                  </td>

                  {/* Styled Status Dot Indicator Inside Name Column */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${parseInt(place.pending_requests) > 0
                        ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                        : place.last_note
                          ? 'bg-[#40BEB6] shadow-[0_0_6px_rgba(64,190,182,0.6)]'
                          : 'bg-slate-300 dark:bg-slate-600'
                        }`} />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          router.push(`/dashboard/${place.place_id}`)
                        }}
                        className="max-w-[190px] truncate text-left text-sm font-semibold text-slate-900 transition-colors hover:text-[#40BEB6] hover:underline hover:underline-offset-2 dark:text-white"
                      >
                        {place.name || '—'}
                      </button>
                    </div>
                    <div className="mt-1 flex max-w-[220px] items-center gap-1.5 pl-3.5">
                      <span className="truncate font-mono text-[10px] text-slate-400 dark:text-slate-400">
                        {place.place_id}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          copyPlaceId(place.place_id)
                        }}
                        className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 transition hover:border-[#40BEB6]/40 hover:text-[#40BEB6] dark:border-white/10 dark:hover:border-[#40BEB6]/40 dark:hover:text-[#40BEB6]"
                        title="Copy place_id"
                      >
                        Copy
                      </button>
                    </div>
                  </td>

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5">
                    <ContactBadges place={place} />
                  </td>

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5" onClick={e => e.stopPropagation()}>
                    {place.google_map_url
                      ? <a href={place.google_map_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 transition-colors">
                        📍 Maps
                      </a>
                      : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    }
                  </td>

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                    {place.city || '—'}
                  </td>

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5">
                    {place.has_booking === true
                      ? <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50/80 text-teal-700 border border-teal-200/40 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20">
                        ✓ Yes
                      </span>
                      : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    }
                  </td>
                  {/* Truncation & Enhanced Native Tooltip Hint */}
                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 max-w-[150px]">
                    {place.last_note
                      ? (
                        <div className="relative cursor-help" title={place.last_note}>
                          <div className="text-xs text-slate-700 dark:text-slate-200 font-medium truncate">
                            {place.last_note}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">
                            {formatDate(place.last_note_at)}
                          </div>
                        </div>
                      )
                      : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    }
                  </td>

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5 text-xs text-slate-500 dark:text-slate-300 font-medium whitespace-nowrap">
                    {place.last_note_by || '—'}
                  </td>

                  <td className="px-3 py-3 sm:px-4 sm:py-3.5">
                    {place.service_type
                      ? <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white border border-slate-200/60 dark:border-white/10 truncate max-w-[150px]">
                        {place.service_type}
                      </span>
                      : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      {/* ── Export Modal ── */}
      {
        showExportModal && (
          <ExportModal
            cities={cities}
            serviceGroups={serviceGroups}
            currentFilters={filters}
            onClose={() => setShowExportModal(false)}
          />
        )
      }
    </div >
  )
}
