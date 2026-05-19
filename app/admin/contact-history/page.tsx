'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

type ContactLog = {
    id: string
    place_id: string
    place_name: string
    city: string
    table_name: string
    record_id: string
    action: string
    old_value: any
    new_value: any
    changed_by: string
    changed_at: string
    total_count: string
}

type TimelineEvent = {
    source_type: 'scraper' | 'manual'
    action: string
    old_value: any
    new_value: any
    changed_by: string
    event_at: string
    reason?: string
    status?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Bangkok',
    })
}

function tableLabel(t: string) {
    const map: Record<string, string> = {
        place_phones: '📞 โทรศัพท์',
        place_lines: '💬 LINE',
        place_emails: '📧 Email',
        place_facebooks: '👤 Facebook',
        place_instagrams: '📸 Instagram',
        place_messengers: '💬 Messenger',
        place_whatsapps: '📱 WhatsApp',
        place_telegrams: '✈️ Telegram',
    }
    return map[t] || t
}

// ─── Timeline Modal ───────────────────────────────────────────────────────────

function TimelineModal({
    placeId, placeName, contactType, onClose
}: {
    placeId: string
    placeName: string
    contactType: string
    onClose: () => void
}) {
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/admin/contact-history/${placeId}/${contactType}`)
            .then(r => r.json())
            .then(j => setTimeline(j.timeline || []))
            .finally(() => setLoading(false))
    }, [placeId, contactType])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight">{placeName}</h3>
                        <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">ID: {placeId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
                    ) : timeline.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                            ไม่มีประวัติการแก้ไข
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

                            <div className="space-y-4">
                                {timeline.map((event, idx) => {
                                    const isManual = event.source_type === 'manual'
                                    const isScraper = event.source_type === 'scraper'

                                    const actionBadge = () => {
                                        if (isScraper) {
                                            if (event.action === 'INSERT') return { label: 'เพิ่ม', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
                                            if (event.action === 'DELETE') return { label: 'ลบ', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
                                            if (event.action === 'UPDATE') return { label: 'อัปเดต', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
                                        }
                                        if (event.action === 'accepted' || event.action === 'edited') return { label: '✅ Approved', cls: 'bg-[#40BEB6]/10 text-[#40BEB6]' }
                                        if (event.action === 'rejected') return { label: '❌ Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
                                        if (event.action === 'pending') return { label: '⏳ Pending', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
                                        if (event.action === 'cancelled') return { label: '🚫 ยกเลิก', cls: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400' }

                                        return { label: event.action, cls: 'bg-slate-100 text-slate-600' }
                                    }

                                    const extractVal = (val: any) => {
                                        if (!val) return '—'
                                        if (typeof val === 'string') {
                                            try {
                                                const p = JSON.parse(val)
                                                if (p?.number) return p.label ? `${p.number} (${p.label})` : p.number
                                            } catch { }
                                            return val
                                        }
                                        return val.number || val.line_id || val.address || val.url || val.handle || val.telegram_url || JSON.stringify(val)
                                    }

                                    const badge = actionBadge()

                                    return (
                                        <div key={idx} className="relative pl-8">
                                            {/* Dot */}
                                            <div className={`absolute left-1.5 top-3 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${isManual ? 'bg-[#40BEB6]' : 'bg-slate-400'}`} />

                                            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                                {/* Header */}

                                                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-medium text-slate-400">
                                                            {isManual ? '✏️ manual' : '🤖 scraper'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {event.old_value === null || event.old_value === '' || event.old_value === '—'
                                                                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">➕ เพิ่ม</span>
                                                                : event.new_value === null || event.new_value === ''
                                                                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">🗑️ ลบ</span>
                                                                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">✏️ แก้ไข</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                {/* Value change */}
                                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-800 mb-2 flex-wrap">
                                                    <span className="text-slate-400 line-through text-xs truncate max-w-[40%]">
                                                        {extractVal(event.old_value)}
                                                    </span>
                                                    <span className="text-slate-300 dark:text-slate-600 text-xs">→</span>
                                                    <span className="text-slate-800 dark:text-slate-200 text-xs font-medium truncate max-w-[40%]">
                                                        {event.new_value === '' || event.new_value === null
                                                            ? <span className="text-red-500">ลบออก</span>
                                                            : extractVal(event.new_value)
                                                        }
                                                    </span>
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                    <span>โดย <span className="font-medium text-slate-600 dark:text-slate-300">{event.changed_by}</span></span>
                                                    <span>{formatDate(event.event_at)}</span>
                                                </div>

                                                {event.reason && (
                                                    <p className="mt-2 text-[11px] text-slate-500 border-l-2 border-slate-200 dark:border-slate-700 pl-2">
                                                        เหตุผล: {event.reason}
                                                    </p>
                                                )}
                                                {(event as any).reject_reason && (
                                                    <p className="mt-2 text-[11px] text-red-500 dark:text-red-400 border-l-2 border-red-200 dark:border-red-800 pl-2">
                                                        เหตุผลที่ปฏิเสธ: {(event as any).reject_reason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactHistoryPage() {
    const router = useRouter()
    const [data, setData] = useState<ContactLog[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [modal, setModal] = useState<{ placeId: string, placeName: string, contactType: string } | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (search) params.set('search', search)
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)
            const res = await fetch(`/api/admin/contact-history?${params}`)
            const json = await res.json()
            setData(json.data || [])
            setTotal(parseInt(json.pagination?.total || '0'))
        } catch { }
        setLoading(false)
    }, [search, dateFrom, dateTo, page])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearch = () => {
        setSearch(searchInput)
        setPage(1)
    }

    const totalPages = Math.ceil(total / 20)

    const handleCopyId = (id: string) => {
        navigator.clipboard?.writeText(id)
    }

    return (
        <div className="mx-auto max-w-7xl py-8 px-4 sm:px-6 font-sans text-slate-900 dark:text-slate-100 min-h-screen">

            {modal && (
                <TimelineModal
                    placeId={modal.placeId}
                    placeName={modal.placeName}
                    contactType={modal.contactType}
                    onClose={() => setModal(null)}
                />
            )}

            {/* Header Section */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>🕓</span> Contact History
                    </h1>
                </div>
                <div className="text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-medium">
                    ทั้งหมด {total.toLocaleString()} รายการ
                </div>
            </div>

            {/* Filter Panel */}
            <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="ค้นหาด้วย Place ID หรือชื่อร้าน..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="flex-1 px-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:border-[#40BEB6]"
                    />
                    <button onClick={handleSearch} className="px-5 py-2 bg-[#40BEB6] text-white text-sm font-semibold rounded-xl">
                        ค้นหา
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">กำลังโหลด...</div>
            ) : data.length === 0 ? (
                <div className="text-center py-20 text-slate-400">ไม่พบข้อมูล</div>
            ) : (
                <>
                    {/* 💻 DESKTOP VIEW: ปรับดีไซน์ Grid เส้นขอบ คมชัด มินิมอล ตามแบบในรูปภาพ */}
                    <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                                    <th className="w-[60px] px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-r border-slate-200 dark:border-slate-800 text-center">#</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-r border-slate-200 dark:border-slate-800">ชื่อร้าน / สถานที่</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-r border-slate-200 dark:border-slate-800">Place ID</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-r border-slate-200 dark:border-slate-800">เมือง / จังหวัด</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-r border-slate-200 dark:border-slate-800">ประเภทฟิลด์ติดต่อ</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-r border-slate-200 dark:border-slate-800">แก้ไขล่าสุดเมื่อ</th>
                                    <th className="w-[110px] px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => {
                                    // คำนวณลำดับข้อ record ให้รันต่อเนื่องตามเลขหน้า
                                    const recordIndex = (page - 1) * 20 + idx + 1;
                                    return (
                                        <tr key={`${row.place_id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                            {/* คอลัมน์ลำดับแถวแบบในภาพ */}
                                            <td className="px-4 py-3 text-center text-xs font-mono text-slate-400 dark:text-slate-500 border-b border-r border-slate-200 dark:border-slate-800">
                                                {recordIndex}
                                            </td>
                                            <td className="px-4 py-3 border-b border-r border-slate-200 dark:border-slate-800 truncate">
                                                <button
                                                    onClick={() => router.push(`/dashboard/${row.place_id}`)}
                                                    className="text-left font-semibold text-slate-800 dark:text-slate-200 text-sm hover:text-[#40BEB6] block truncate"
                                                >
                                                    {row.place_name}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 border-b border-r border-slate-200 dark:border-slate-800">
                                                <div className="flex items-center gap-1.5 group/copy">
                                                    <span className="text-xs font-mono bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/60 truncate">{row.place_id}</span>
                                                    <button
                                                        onClick={() => handleCopyId(row.place_id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#40BEB6] transition-opacity"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-b border-r border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 truncate">
                                                {row.city || '—'}
                                            </td>
                                            <td className="px-4 py-3 border-b border-r border-slate-200 dark:border-slate-800">
                                                <span className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                                                    {tableLabel(row.table_name)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 border-b border-r border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-400 dark:text-slate-500">
                                                {formatDate(row.changed_at)}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-center">
                                                <button
                                                    onClick={() => setModal({ placeId: row.place_id, placeName: row.place_name, contactType: row.table_name })}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#40BEB6] hover:text-white dark:hover:bg-[#40BEB6] dark:hover:text-white transition-all shadow-sm"
                                                >
                                                    ดูประวัติ
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 📱 MOBILE VIEW: การ์ดดีไซน์แยกชิ้นสไตล์มินิมอลเพื่อความสะดวกบนจอสัมผัส */}
                    <div className="block md:hidden space-y-4">
                        {data.map((row, idx) => {
                            const recordIndex = (page - 1) * 20 + idx + 1;
                            return (
                                <div
                                    key={`mobile-${row.place_id}-${idx}`}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">#{recordIndex}</span>
                                            <button
                                                onClick={() => router.push(`/dashboard/${row.place_id}`)}
                                                className="text-left font-bold text-slate-800 dark:text-slate-100 text-sm hover:text-[#40BEB6]"
                                            >
                                                {row.place_name}
                                            </button>
                                        </div>
                                        <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium shrink-0">
                                            {tableLabel(row.table_name)}
                                        </span>
                                    </div>
                                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Place ID</span>
                                            <span className="font-mono bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">{row.place_id}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">เมือง / จังหวัด</span>
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">{row.city || '—'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setModal({ placeId: row.place_id, placeName: row.place_name, contactType: row.table_name })}
                                        className="w-full py-2 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60 text-center"
                                    >
                                        🔎 ดูประวัติช่องทางนี้
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Pagination Component */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl max-w-sm mx-auto shadow-sm">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 text-slate-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-xs font-semibold font-mono text-slate-500">
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 text-slate-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            )}
        </div>
    )
}