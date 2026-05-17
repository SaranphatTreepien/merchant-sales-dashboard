'use client'

import { useState } from 'react'
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
]

function formatDate(iso: string | null) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit',
        timeZone: 'Asia/Bangkok',
    })
}

export function ExportModal({ cities, serviceGroups, onClose }: {
    cities: string[]
    serviceGroups: ServiceGroup[]
    currentFilters: Filters
    onClose: () => void
}) {
    const [selCities, setSelCities] = useState<Set<string>>(new Set())
    const [selServiceTypes, setSelServiceTypes] = useState<Set<string>>(new Set())
    const [hasBooking, setHasBooking] = useState<'yes' | 'no' | ''>('')
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
        setDownloading(true)
        const confirm = await Swal.fire({
            title: 'Export CSV?',
            text: `${selCities.size > 0 ? selCities.size + ' จังหวัด' : 'ทุกจังหวัด'} · ${selectedCols.size} columns`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Download',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#16a34a',
        })
        if (!confirm.isConfirmed) return
        try {   // ← เพิ่มตรงนี้
            const params = new URLSearchParams()
            params.set('export', '1')
            if (hasBooking) params.set('hasBooking', hasBooking)

            // multi city/serviceType — ส่งหลายค่าได้
            selCities.forEach(c => params.append('city', c))
            selServiceTypes.forEach(s => params.append('serviceType', s))

            const res = await fetch(`/api/export?${params}`)
            const json = await res.json()
            // เพิ่มตรงนี้
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
            a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`
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

        } catch {        // ← ตรงนี้ปิด try ทั้งหมด
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่',
                icon: 'error',
                confirmButtonText: 'ตกลง',
            })
            setDownloading(false)
        }
    }

    const groups = ['ข้อมูลหลัก', 'Contact']

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-[560px] max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-800">⬇️ Export CSV</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>

                <div className="overflow-y-auto px-5 py-4 space-y-5">

                    {/* City multi-select */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">📍 จังหวัด</p>
                            <div className="flex gap-2">
                                <button onClick={() => setSelCities(new Set(cities))} className="text-xs text-blue-500 hover:text-blue-700">ทั้งหมด</button>
                                <span className="text-gray-300">|</span>
                                <button onClick={() => setSelCities(new Set())} className="text-xs text-gray-400 hover:text-gray-600">ล้าง</button>
                            </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto grid grid-cols-3 gap-1">
                            {cities.map(c => (
                                <label key={c} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1">
                                    <input type="checkbox" checked={selCities.has(c)}
                                        onChange={() => toggleSet(selCities, setSelCities, c)}
                                        className="rounded border-gray-300 text-blue-600" />
                                    {c}
                                </label>
                            ))}
                        </div>
                        {selCities.size > 0 && (
                            <p className="text-xs text-blue-500 mt-1">เลือก {selCities.size} จังหวัด</p>
                        )}
                    </div>

                    {/* Service Type multi-select */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🏷️ Service Type</p>
                            <div className="flex gap-2">
                                <button onClick={() => setSelServiceTypes(new Set(serviceGroups.map(g => g.value)))} className="text-xs text-blue-500 hover:text-blue-700">ทั้งหมด</button>
                                <span className="text-gray-300">|</span>
                                <button onClick={() => setSelServiceTypes(new Set())} className="text-xs text-gray-400 hover:text-gray-600">ล้าง</button>
                            </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-2 grid grid-cols-2 gap-1">
                            {serviceGroups.map(g => (
                                <label key={g.value} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1">
                                    <input type="checkbox" checked={selServiceTypes.has(g.value)}
                                        onChange={() => toggleSet(selServiceTypes, setSelServiceTypes, g.value)}
                                        className="rounded border-gray-300 text-blue-600" />
                                    {g.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Booking */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">📅 Booking</p>
                        <div className="flex gap-3">
                            {([['', 'ทั้งหมด'], ['yes', '✅ มี Booking'], ['no', '❌ ไม่มี']] as const).map(([val, lbl]) => (
                                <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                                    <input type="radio" checked={hasBooking === val}
                                        onChange={() => setHasBooking(val)}
                                        className="text-blue-600" />
                                    {lbl}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Columns */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">เลือก Column</p>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedCols(new Set(ALL_COLUMNS.map(c => c.key)))} className="text-xs text-blue-500 hover:text-blue-700">Select All</button>
                                <span className="text-gray-300">|</span>
                                <button onClick={() => setSelectedCols(new Set())} className="text-xs text-gray-400 hover:text-gray-600">Deselect All</button>
                            </div>
                        </div>
                        {groups.map(grp => (
                            <div key={grp} className="mb-3">
                                <p className="text-xs text-gray-400 font-medium mb-1">{grp}</p>
                                <div className="grid grid-cols-3 gap-1">
                                    {ALL_COLUMNS.filter(c => c.group === grp).map(c => (
                                        <label key={c.key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1">
                                            <input type="checkbox" checked={selectedCols.has(c.key)}
                                                onChange={() => {
                                                    const next = new Set(selectedCols)
                                                    next.has(c.key) ? next.delete(c.key) : next.add(c.key)
                                                    setSelectedCols(next)
                                                }}
                                                className="rounded border-gray-300 text-blue-600" />
                                            {c.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-200">
                    <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading || selectedCols.size === 0}
                        className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-40 min-w-[140px] flex items-center justify-center gap-2"
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