'use client'
import React, { useEffect, useState, useCallback } from 'react'
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

// สีต่าง ๆ ต่อ sale (hash จากชื่อ)
const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
]
function avatarColor(name: string | null) {
    if (!name) return 'bg-gray-400'
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

        // sort แต่ละ group — note ที่แก้ล่าสุดขึ้นก่อน (client-side)
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

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="back"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">🗂️ Note History — ทุก Sale</h1>
                    <p className="text-sm text-gray-400 mt-0.5">อ่านอย่างเดียว · แสดงทุก note ของทุกคน</p>
                </div>
            </div>

            {/* Filter Bar */}
            <form
                onSubmit={handleSearch}
                className="flex gap-2 mb-5 flex-wrap items-end bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
            >
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">จากวันที่</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">ถึงวันที่</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>

                {currentUser?.role === 'admin' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Sale</label>
                        <select
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900"
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

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">ค้นหา</label>
                    <input
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900 placeholder-gray-400 w-64"
                        placeholder="ชื่อร้าน / จังหวัด / place_id..."
                        value={search}
                        onChange={(e) => {
                            const val = e.target.value
                            setSearch(val)
                            setPage(1)
                            fetchNotes(1, { search: val })
                        }}
                    />
                </div>

                <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 self-end transition-colors"
                >
                    Search
                </button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-1.5 bg-white border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 self-end transition-colors"
                >
                    Reset
                </button>

                {pagination && (
                    <span className="text-sm text-gray-400 self-end ml-auto">
                        {pagination.total.toLocaleString()} notes
                    </span>
                )}
            </form>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading...
                </div>
            ) : notes.length === 0 ? (
                <div className="text-center py-20 text-gray-400">ไม่มี note ที่ตรงกับ filter</div>
            ) : (
                <div className="space-y-6">
                    {Object.values(grouped).map((group) => (
                        <div
                            key={group.place_id}
                            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                        >
                            {/* Place Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">🏪</span>
                                    <button
                                        onClick={() => router.push(`/dashboard/${group.place_id}`)}
                                        className="font-semibold text-blue-700 hover:underline text-sm"
                                    >
                                        {group.place_name || group.place_id}
                                    </button>
                                    <span className="text-xs text-gray-400 font-mono">{group.place_id}</span>
                                </div>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {group.notes.length} notes
                                </span>
                            </div>

                            {/* Timeline */}
                            <div className="divide-y divide-gray-100">
                                {(() => {
                                    const latestUpdatedAt = group.notes
                                        .filter(n => n.updated_at !== n.created_at)
                                        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at

                                    return group.notes.map((n, idx) => {
                                        const isLatestEdited = !!latestUpdatedAt && n.updated_at === latestUpdatedAt
                                        return (
                                            <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                                {/* Timeline line + dot */}
                                                <div className="flex flex-col items-center pt-1 shrink-0">
                                                    <div
                                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(n.sale_name)}`}
                                                    >
                                                        {getInitials(n.sale_name)}
                                                    </div>
                                                    {idx < group.notes.length - 1 && (
                                                        <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />
                                                    )}
                                                </div>

                                                {/* Note content */}
                                                <div className="flex-1 min-w-0 pb-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {n.sale_name || '—'}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                                                        {isLatestEdited && (
                                                            <span className="text-xs text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                แก้ล่าสุด {formatDate(n.updated_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
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
                <div className="flex gap-2 mt-6 items-center">
                    <button
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 bg-white hover:bg-gray-50 transition-colors"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page === 1 || loading}
                    >
                        ← Prev
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {page} / {totalPages}
                    </span>
                    <button
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 bg-white hover:bg-gray-50 transition-colors"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages || loading}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    )
}