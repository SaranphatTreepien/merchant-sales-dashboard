'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Note = {
    id: string
    note: string
    created_at: string
    updated_at: string
    place_id: string
    place_name: string | null
    user_id: string
    sale_name: string | null
}

type Pagination = {
    page: number
    limit: number
    total: number
    total_pages: number
}

type SaleOption = {
    id: string
    name: string
}

function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok',
    })
}

// ตัดชื่อย่อ Sale เพื่อแสดง avatar
function getInitials(name: string | null) {
    if (!name) return '?'
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// สีต่าง ๆ ต่อ sale (hash จากชื่อ) - ปรับโทนสีให้สดใสทั้งโหมดมืดและสว่าง
const AVATAR_COLORS = [
    'bg-blue-500 dark:bg-blue-600',
    'bg-emerald-500 dark:bg-emerald-600',
    'bg-violet-500 dark:bg-violet-600',
    'bg-amber-500 dark:bg-amber-600',
    'bg-rose-500 dark:bg-rose-600',
    'bg-cyan-500 dark:bg-cyan-600',
    'bg-pink-500 dark:bg-pink-600',
    'bg-indigo-500 dark:bg-indigo-600',
]
function avatarColor(name: string | null) {
    if (!name) return 'bg-gray-400 dark:bg-slate-600'
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function NotesAllPage() {
    const router = useRouter()

    const [notes, setNotes] = useState<Note[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(false)

    // filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [saleId, setSaleId] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    const [sales, setSales] = useState<SaleOption[]>([])
    const [currentUser, setCurrentUser] = useState<{ id: string, role: string } | null>(null)

    // group notes by place
    const grouped = notes.reduce(
        (acc, n) => {
            if (!acc[n.place_id])
                acc[n.place_id] = { place_name: n.place_name, place_id: n.place_id, notes: [] }
            acc[n.place_id].notes.push(n)
            return acc
        },
        {} as Record<string, { place_name: string | null; place_id: string; notes: Note[] }>
    )

    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(j => setCurrentUser(j.user))
    }, [])

    useEffect(() => {
        fetch('/api/filters?type=sales')
            .then((r) => r.json())
            .then((j) => setSales(j.sales || []))
            .catch(() => { })
    }, [])

    const fetchNotes = async (p = page, overrides: { search?: string } = {}) => {
        setLoading(true)
        const params = new URLSearchParams()
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)
        if (saleId) params.set('user_id', saleId)
        const searchVal = 'search' in overrides ? overrides.search : search
        if (searchVal) params.set('search', searchVal)
        params.set('page', String(p))

        const res = await fetch(`/api/notes?${params}`)
        const json = await res.json()
        const data: Note[] = json.data || []

        setNotes(data)
        setPagination(json.pagination || null)
        setLoading(false)
    }

    useEffect(() => {
        fetchNotes(page)
    }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchNotes(1)
    }

    const handleReset = () => {
        setDateFrom('')
        setDateTo('')
        setSaleId('')
        setSearch('')
        setPage(1)
        fetchNotes(1, { search: '' })
    }

    const totalPages = pagination?.total_pages ?? 1

    // คลาสกลางสำหรับ Input เพื่อความคลีนและรองรับ Dark Mode
    const inputClassName = "w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-950 dark:text-slate-50 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20"

    return (
        <div className="min-h-screen p-1 text-gray-900 dark:text-slate-100 transition-colors duration-200">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label="back"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                        🗂️ Note History 
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        โหมดอ่านอย่างเดียว · แสดงบันทึกข้อมูลทั้งหมดของทีมงาน
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <form
                onSubmit={handleSearch}
                className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-wrap xl:items-end">
                    
                    <div className="flex flex-col gap-1.5 xl:w-44">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">จากวันที่</label>
                        <input
                            type="date"
                            className={inputClassName}
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 xl:w-44">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">ถึงวันที่</label>
                        <input
                            type="date"
                            className={inputClassName}
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>

                    {currentUser?.role === 'admin' && (
                        <div className="flex flex-col gap-1.5 xl:w-52">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">พนักงานขาย (Sale)</label>
                            <select
                                className={inputClassName}
                                value={saleId}
                                onChange={(e) => { setSaleId(e.target.value); setPage(1); setTimeout(() => fetchNotes(1), 0) }}
                            >
                                <option value="">ทุก Sale</option>
                                {sales.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1 xl:flex-1 xl:min-w-[260px]">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">ค้นหา</label>
                        <input
                            className={inputClassName}
                            placeholder="ชื่อร้าน / จังหวัด / ID..."
                            value={search}
                            onChange={(e) => {
                                const val = e.target.value
                                setSearch(val)
                                setPage(1)
                                fetchNotes(1, { search: val })
                            }}
                        />
                    </div>

                    {/* Buttons Action */}
                    <div className="flex gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-1 xl:ml-auto pt-2 xl:pt-0">
                        <button
                            type="submit"
                            className="flex-1 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 active:scale-[0.98] xl:flex-none"
                        >
                            Search
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-all hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 xl:flex-none"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {pagination && (
                    <div className="mt-4 border-t border-gray-100 pt-3 text-right text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">
                        พบทั้งหมด <span className="font-bold text-gray-700 dark:text-slate-300">{pagination.total.toLocaleString()}</span> บันทึก
                    </div>
                )}
            </form>

            {/* Content Section */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400 dark:text-slate-500">
                    <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm font-medium">กำลังดึงข้อมูล...</span>
                </div>
            ) : notes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 py-24 text-center text-gray-400 dark:text-slate-500">
                    <span className="text-3xl block mb-2">🔍</span>
                    ไม่พบข้อมูล Note ที่ตรงกับเงื่อนไขการค้นหา
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.values(grouped).map((group) => (
                        <div
                            key={group.place_id}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800"
                        >
                            {/* Place Header */}
                            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-base">🏪</span>
                                    <button
                                        onClick={() => router.push(`/dashboard/${group.place_id}`)}
                                        className="break-words text-left text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        {group.place_name || group.place_id}
                                    </button>
                                    <span className="rounded bg-gray-200/60 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                                        {group.place_id}
                                    </span>
                                </div>
                                <span className="self-start rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 sm:self-center">
                                    {group.notes.length} {group.notes.length > 1 ? 'notes' : 'note'}
                                </span>
                            </div>

                            {/* Timeline List */}
                            <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                {(() => {
                                    const latestUpdatedAt = group.notes.length > 1
                                        ? [...group.notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at
                                        : null

                                    return group.notes.map((n, idx) => {
                                        const isLatestEdited = !!latestUpdatedAt && n.updated_at === latestUpdatedAt
                                        return (
                                            <div key={n.id} className="group flex gap-4 px-5 py-4.5 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                                
                                                {/* Line & Dot Indicator */}
                                                <div className="flex flex-col items-center shrink-0 pt-0.5">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ring-4 ring-white dark:ring-slate-800 ${avatarColor(n.sale_name)}`}>
                                                        {getInitials(n.sale_name)}
                                                    </div>
                                                    {idx < group.notes.length - 1 && (
                                                        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-700 mt-2 min-h-[24px]" />
                                                    )}
                                                </div>

                                                {/* Content Wrapper */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                                                            {n.sale_name || 'ไม่ระบุชื่อ'}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-slate-500">
                                                            • {formatDate(n.created_at)}
                                                        </span>
                                                        
                                                        {isLatestEdited && (
                                                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/40 dark:border-amber-500/20">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                                แก้ไขล่าสุด: {formatDate(n.updated_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                                                        {n.note}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8 border-t border-gray-100 pt-6 dark:border-slate-800">
                    <button
                        className="flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:disabled:hover:bg-slate-900"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page === 1 || loading}
                    >
                        ← ก่อนหน้า
                    </button>
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                        หน้า {page} จาก {totalPages}
                    </span>
                    <button
                        className="flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:disabled:hover:bg-slate-900"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages || loading}
                    >
                        ถัดไป →
                    </button>
                </div>
            )}
        </div>
    )
}