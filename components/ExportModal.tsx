'use client'

import { useState } from 'react'
import { COUNTRY_LABELS } from '@/lib/constants/regions'

import Swal from 'sweetalert2'
type ServiceGroup = { label: string; value: string; types: string[] }
type Filters = {
    search: string; city: string; serviceType: string; status: string
    hasLine: boolean; hasFb: boolean; hasIg: boolean
    hasEmail: boolean; hasPhone: boolean
    hasBooking: 'yes' | 'no' | ''; noted: 'yes' | 'no' | ''
}

const ALL_COLUMNS = [
    // ข้อมูลหลัก
    { key: 'place_id', label: 'Place ID', group: 'ข้อมูลหลัก' },
    { key: 'name', label: 'Name', group: 'ข้อมูลหลัก' },
    { key: 'address', label: 'Address', group: 'ข้อมูลหลัก' },
    { key: 'city', label: 'City', group: 'ข้อมูลหลัก' },
    { key: 'country', label: 'Country', group: 'ข้อมูลหลัก' },
    { key: 'google_map_url', label: 'Google Map URL', group: 'ข้อมูลหลัก' },
    { key: 'service_type', label: 'Service Type', group: 'ข้อมูลหลัก' },
    { key: 'service_types', label: 'Service Types', group: 'ข้อมูลหลัก' },
    { key: 'business_status', label: 'Business Status', group: 'ข้อมูลหลัก' },
    { key: 'website', label: 'Website', group: 'ข้อมูลหลัก' },
    { key: 'rating', label: 'Rating', group: 'ข้อมูลหลัก' },
    { key: 'total_reviews', label: 'Total Reviews', group: 'ข้อมูลหลัก' },
    { key: 'description', label: 'Description', group: 'ข้อมูลหลัก' },
    { key: 'has_booking', label: 'Booking', group: 'ข้อมูลหลัก' },
    { key: 'opening_hours', label: 'Opening Hours', group: 'ข้อมูลหลัก' },
    // Contact
    { key: 'phone', label: 'Phone', group: 'Contact' },
    { key: 'phone2', label: 'Phone 2', group: 'Contact' },
    { key: 'line_oa', label: 'LINE OA', group: 'Contact' },
    { key: 'line_personal', label: 'LINE Personal', group: 'Contact' },
    { key: 'line_url', label: 'LINE URL', group: 'Contact' },
    { key: 'email', label: 'Email', group: 'Contact' },
    { key: 'facebook_url', label: 'Facebook', group: 'Contact' },
    { key: 'instagram_handle', label: 'Instagram Handle', group: 'Contact' },
    { key: 'instagram_url', label: 'Instagram URL', group: 'Contact' },
    { key: 'messenger_url', label: 'Messenger', group: 'Contact' },
    { key: 'whatsapp', label: 'WhatsApp', group: 'Contact' },
    { key: 'telegram_url', label: 'Telegram', group: 'Contact' },
    // Deal
    { key: 'deal_status', label: 'Deal Status', group: 'Deal' },
    { key: 'reference_code', label: 'Reference Code', group: 'Deal' },
    { key: 'deal_by', label: 'Deal By (Sale)', group: 'Deal' },
]

function formatDate(iso: string | null) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit',
        timeZone: 'Asia/Bangkok',
    })
}
function Section({ id, title, open, onToggle, children }: {
    id: string; title: string; open: boolean
    onToggle: (id: string) => void; children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10">
            <button onClick={() => onToggle(id)} className="flex w-full items-center justify-between px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{title}</p>
                <span className={`text-lg text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {open && <div className="px-3 pb-3">{children}</div>}
        </div>
    )
}
export function ExportModal({ cities, serviceGroups, onClose, country }: {

    cities: string[]
    serviceGroups: ServiceGroup[]
    currentFilters: Filters
    onClose: () => void
    country: string
}) {
    const [selCities, setSelCities] = useState<Set<string>>(new Set())
    const [selServiceTypes, setSelServiceTypes] = useState<Set<string>>(new Set())
    const [hasBooking, setHasBooking] = useState<'yes' | 'no' | ''>('')
    const [noted, setNoted] = useState<'yes' | 'no' | ''>('') // ← เพิ่ม
    const [open, setOpen] = useState<Record<string, boolean>>({
        city: true,
        serviceType: true,
        booking: true,
        noted: true,
        columns: true,
    })
    const toggleOpen = (key: string) =>
        setOpen(prev => ({ ...prev, [key]: !prev[key] }))

    const [selectedCols, setSelectedCols] = useState<Set<string>>(
        new Set(ALL_COLUMNS.map(c => c.key))
    )
    const [downloading, setDownloading] = useState(false)

    const toggleSet = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
        const next = new Set(set)
        next.has(val) ? next.delete(val) : next.add(val)
        setFn(next)
    }

    const handleDownload = async () => {
        const countryLabel = country === 'ALL' ? 'All Countries' : (COUNTRY_LABELS[country]?.name ?? country)
        const confirm = await Swal.fire({
            title: 'Export CSV?',
            text: `${countryLabel} · ${selCities.size > 0 ? selCities.size + ' จังหวัด' : 'ทุกจังหวัด'} · ${selectedCols.size} columns`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Download',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#16a34a',
        })
        if (!confirm.isConfirmed) return
        setDownloading(true)
        try {
            const params = new URLSearchParams()
            params.set('export', '1')
            params.set('country', country)
            if (hasBooking) params.set('hasBooking', hasBooking)
            if (noted) params.set('noted', noted)
            selCities.forEach(c => params.append('city', c))
            selServiceTypes.forEach(s => params.append('serviceType', s))

            const res = await fetch(`/api/export?${params}`)
            const json = await res.json()
            if (!res.ok) {
                await Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: json.error || 'ไม่สามารถ export ได้ กรุณาลองใหม่',
                    icon: 'error',
                    confirmButtonText: 'ตกลง',
                })
                setDownloading(false)
                return
            }
            const rows = json.data || []
            const cols = ALL_COLUMNS.filter(c => selectedCols.has(c.key))
            const headers = cols.map(c => c.label)
            const csvRows = rows.map((r: Record<string, unknown>) =>
                cols.map(c => {
                    if (c.key === 'has_booking') return r.has_booking ? 'Yes' : 'No'
                    if (c.key === 'deal_status') {
                        if (r.deal_status === 'success') return 'สำเร็จ'
                        if (r.deal_status === 'pending') return 'รอ / ติดปัญหา'
                        return ''
                    }
                    if (c.key === 'opening_hours') return JSON.stringify(r.opening_hours || '')
                    if (c.key === 'service_types') return JSON.stringify(r.service_types || '')
                    return String(r[c.key] ?? '')
                }).map(v => `"${v.replace(/"/g, '""')}"`).join(',')
            )
            const csv = [headers.join(','), ...csvRows].join('\n')
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const countrySlug = country === 'ALL' ? 'all' : (COUNTRY_LABELS[country]?.flag ?? country.toLowerCase())
            a.download = `export-${countrySlug}-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            setDownloading(false)
            await Swal.fire({
                title: 'Download สำเร็จ!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            })
            onClose()
        } catch {
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่',
                icon: 'error',
                confirmButtonText: 'ตกลง',
            })
            setDownloading(false)
        }
    }
    const groups = ['ข้อมูลหลัก', 'Contact', 'Deal']

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-900 sm:max-h-[90vh] sm:w-[560px] sm:rounded-2xl">

                {/* Header */}
                <div className="border-b border-slate-100 px-4 py-4 dark:border-white/10 sm:px-5">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-white/15 sm:hidden" />
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Export CSV</h2>
                            <div className="mt-1 flex items-center gap-1.5">
                                {country !== 'ALL' && (
                                    <img
                                        src={`https://flagcdn.com/24x18/${COUNTRY_LABELS[country]?.flag}.png`}
                                        alt={country}
                                        className="h-3.5 w-auto rounded-sm"
                                    />
                                )}
                                <p className="text-xs text-slate-400">
                                    {country === 'ALL' ? '🌏 All Countries' : COUNTRY_LABELS[country]?.name ?? country}
                                    {' '}— เลือกข้อมูลและ columns ที่ต้องการดาวน์โหลด
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10">✕</button>
                    </div>
                </div>
                {/* ปุ่ม mobile only */}
                <div className="flex flex-col gap-2 px-4 pt-4 sm:hidden">
                    <button
                        onClick={handleDownload}
                        disabled={downloading || selectedCols.size === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#40BEB6] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#40BEB6]/25 hover:bg-[#35a8a1] disabled:opacity-40"
                    >
                        {downloading ? (<><svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>กำลัง Export...</>) : '⬇️ Download CSV'}
                    </button>
                    <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300">Cancel</button>
                </div>
                <div className="space-y-5 overflow-y-auto px-4 py-4 pb-13 sm:px-5">

                    {/* City multi-select */}
                    <Section id="city" title="จังหวัด" open={open.city} onToggle={toggleOpen}>
                        <div className="flex justify-end gap-2 mb-1">
                            <button onClick={() => setSelCities(new Set(cities))} className="text-xs font-semibold text-[#40BEB6] hover:text-[#2f9b95]">ทั้งหมด</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => setSelCities(new Set())} className="text-xs font-semibold text-slate-400 hover:text-slate-600">ล้าง</button>
                        </div>
                        <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-2 dark:border-white/10 dark:bg-white/5 sm:grid-cols-3">
                            {cities.map(c => (
                                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/10">
                                    <input type="checkbox" checked={selCities.has(c)}
                                        onChange={() => toggleSet(selCities, setSelCities, c)}
                                        className="rounded border-slate-300 text-[#40BEB6]" />
                                    {c}
                                </label>
                            ))}
                        </div>
                        {selCities.size > 0 && <p className="text-xs text-blue-500 mt-1">เลือก {selCities.size} จังหวัด</p>}
                    </Section>

                    {/* Service Type multi-select */}
                    <Section id="serviceType" title="Service Type" open={open.serviceType} onToggle={toggleOpen}>
                        <div className="flex justify-end gap-2 mb-1">
                            <button onClick={() => setSelServiceTypes(new Set(serviceGroups.map(g => g.value)))} className="text-xs font-semibold text-[#40BEB6] hover:text-[#2f9b95]">ทั้งหมด</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => setSelServiceTypes(new Set())} className="text-xs font-semibold text-slate-400 hover:text-slate-600">ล้าง</button>
                        </div>
                        <div className="grid grid-cols-1 gap-1 rounded-2xl border border-slate-200 bg-slate-50/60 p-2 dark:border-white/10 dark:bg-white/5 sm:grid-cols-2">
                            {serviceGroups.map(g => (
                                <label key={g.value} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/10">
                                    <input type="checkbox" checked={selServiceTypes.has(g.value)}
                                        onChange={() => toggleSet(selServiceTypes, setSelServiceTypes, g.value)}
                                        className="rounded border-slate-300 text-[#40BEB6]" />
                                    {g.label}
                                </label>
                            ))}
                        </div>
                    </Section>

                    {/* Booking */}
                    <Section id="booking" title="Booking" open={open.booking} onToggle={toggleOpen}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                            {([['', 'ทั้งหมด'], ['yes', '✅ มี Booking'], ['no', '❌ ไม่มี']] as const).map(([val, lbl]) => (
                                <label key={val} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:text-slate-200">
                                    <input type="radio" checked={hasBooking === val} onChange={() => setHasBooking(val)} className="text-[#40BEB6]" />
                                    {lbl}
                                </label>
                            ))}
                        </div>
                    </Section>
                    {/* Noted */}
                    <Section id="noted" title="Noted" open={open.noted} onToggle={toggleOpen}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                            {([['', 'ทั้งหมด'], ['yes', '✅ มี Note'], ['no', '❌ ไม่มี']] as const).map(([val, lbl]) => (
                                <label key={val} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:text-slate-200">
                                    <input type="radio" checked={noted === val} onChange={() => setNoted(val)} className="text-[#40BEB6]" />
                                    {lbl}
                                </label>
                            ))}
                        </div>
                    </Section>
                    {/* Columns */}
                    {/* Columns */}
                    <Section id="columns" title="เลือก Column" open={open.columns} onToggle={toggleOpen}>
                        <div className="flex justify-end gap-2 mb-1">
                            <button onClick={() => setSelectedCols(new Set(ALL_COLUMNS.map(c => c.key)))} className="text-xs font-semibold text-[#40BEB6] hover:text-[#2f9b95]">Select All</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => setSelectedCols(new Set())} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Deselect All</button>
                        </div>
                        {groups.map(grp => (
                            <div key={grp} className="mb-3">
                                <p className="mb-1 text-xs font-semibold text-slate-400">{grp}</p>
                                <div className="grid grid-cols-1 gap-1 rounded-2xl border border-slate-200 bg-slate-50/60 p-2 dark:border-white/10 dark:bg-white/5 sm:grid-cols-3">
                                    {ALL_COLUMNS.filter(c => c.group === grp).map(c => (
                                        <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/10">
                                            <input type="checkbox" checked={selectedCols.has(c.key)}
                                                onChange={() => { const next = new Set(selectedCols); next.has(c.key) ? next.delete(c.key) : next.add(c.key); setSelectedCols(next) }}
                                                className="rounded border-slate-300 text-[#40BEB6]" />
                                            {c.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </Section>
                </div>

                {/* Footer */}
                <div className="hidden sm:flex gap-2 border-t border-slate-100 bg-white/90 px-4 py-4 dark:border-white/10 dark:bg-slate-900/90 sm:flex-row sm:justify-end sm:px-5">                    <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 sm:py-2">Cancel</button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading || selectedCols.size === 0}
                        className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[#40BEB6] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#40BEB6]/25 hover:bg-[#35a8a1] disabled:opacity-40 sm:py-2"
                    >
                        {downloading ? (
                            <>
                                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                กำลัง Export...
                            </>
                        ) : `⬇️ Download CSV`}
                    </button>
                </div>
            </div>
        </div>
    )
}
