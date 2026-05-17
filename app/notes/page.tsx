'use client'
import React from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

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

function formatTimeOnly(iso: string) {
    return new Date(iso).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok',
    })
}

function isSameDay(a: string, b: string) {
    const da = new Date(a).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
    const db = new Date(b).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
    return da === db
}

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(false)

    // filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [saleId, setSaleId] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    // sale dropdown options
    const [sales, setSales] = useState<SaleOption[]>([])
    const [currentUser, setCurrentUser] = useState<{ id: string, role: string } | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')

    const handleEdit = (n: Note) => {
        setEditingId(n.id)
        setEditText(n.note)
    }

    const handleSave = async (id: string) => {
        await fetch(`/api/notes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: editText }),
        })
        setEditingId(null)
        fetchNotes(page)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('ลบ note นี้?')) return
        await fetch(`/api/notes/${id}`, { method: 'DELETE' })
        fetchNotes(page)
    }
    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(j => setCurrentUser(j.user))
    }, [])
    const pathname = usePathname()
    const router = useRouter()

    const grouped = notes.reduce((acc, n) => {
        if (!acc[n.place_id]) acc[n.place_id] = { place_name: n.place_name, place_id: n.place_id, notes: [] }
        acc[n.place_id].notes.push(n)
        return acc
    }, {} as Record<string, { place_name: string | null; place_id: string; notes: Note[] }>)

    // sort แต่ละ group — note ที่แก้ล่าสุดขึ้นก่อน
    Object.values(grouped).forEach(group => {
        group.notes.sort((a, b) => {
            const aTime = new Date(a.updated_at).getTime()
            const bTime = new Date(b.updated_at).getTime()
            return bTime - aTime
        })
    })

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
        setNotes(json.data || [])
        setPagination(json.pagination || null)
        setLoading(false)
    }  // ← ปิด fetchNotes ตรงนี้

    // useEffect, handleSearch, handleReset, return อยู่ข้างนอก
    useEffect(() => {
        fetchNotes(page)
    }, [page])

    useEffect(() => {
        setPage(1)
        fetchNotes(1)
    }, [pathname])

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
            <h1 className="text-2xl font-bold mb-4 text-gray-800">📝 Note History</h1>

            {/* Filter Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4 flex-wrap items-end">
                {/* วันที่เริ่ม */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">จากวันที่</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                    />
                </div>

                {/* วันที่สิ้นสุด */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">ถึงวันที่</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                    />
                </div>

                {/* Sale dropdown — admin เท่านั้น */}
                {currentUser?.role === 'admin' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Sale</label>
                        <select
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900"
                            value={saleId}
                            onChange={e => { setSaleId(e.target.value); setPage(1); setTimeout(() => fetchNotes(1), 0) }}
                        >
                            <option value="">ทุก Sale</option>
                            {sales.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* ค้นหา ชื่อร้าน / จังหวัด / place_id */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">ค้นหา</label>
                    <input
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900 placeholder-gray-400 w-64"
                        placeholder="ชื่อร้าน / จังหวัด / place_id..."
                        value={search}
                        onChange={e => {
                            const val = e.target.value
                            setSearch(val)
                            setPage(1)
                            fetchNotes(1, { search: val })
                        }}
                    />
                </div>

                <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 self-end"
                >
                    Search
                </button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-1.5 bg-white border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 self-end"
                >
                    Reset
                </button>

                {pagination && (
                    <span className="text-sm text-gray-500 self-end ml-2">
                        Total: {pagination.total.toLocaleString()} notes
                    </span>
                )}
            </form>

            {/* Table */}
            {/* Table */}
            <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                <table className="w-full text-sm bg-white">
                    <thead className="bg-gray-50 text-left border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 text-gray-600 font-semibold whitespace-nowrap">วันที่/เวลา</th>
                            <th className="px-4 py-2 text-gray-600 font-semibold">ร้าน</th>
                            <th className="px-4 py-2 text-gray-600 font-semibold whitespace-nowrap">Sale</th>
                            <th className="px-4 py-2 text-gray-600 font-semibold">Note</th>
                            <th className="px-4 py-2 text-gray-600 font-semibold whitespace-nowrap">แก้ไขล่าสุด</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td>
                            </tr>
                        ) : notes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-400">ไม่มี note</td>
                            </tr>
                        ) : Object.values(grouped).map((group) => (
                            <React.Fragment key={group.place_id}>
                                <tr className="bg-blue-50 border-t border-blue-100">
                                    <td colSpan={5} className="px-4 py-2">
                                        <a onClick={(e) => { e.preventDefault(); router.push(`/dashboard/${group.place_id}`) }}
                                            href={`/dashboard/${group.place_id}`}
                                            className="font-semibold text-blue-700 hover:underline text-sm cursor-pointer"
                                        >
                                            {group.place_name || group.place_id}
                                        </a>
                                        <span className="ml-2 text-xs text-blue-400">{group.notes.length} notes</span>
                                    </td>
                                </tr>
                                {(() => {
                                    const latestUpdatedAt = group.notes
                                        .filter(n => n.updated_at !== n.created_at)
                                        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at

                                    return group.notes.map((n) => {
                                        const isLatestEdited = !!latestUpdatedAt && n.updated_at === latestUpdatedAt
                                        return (
                                            <tr key={n.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-500 whitespace-nowrap pl-8">
                                                    {formatDate(n.created_at)}
                                                </td>
                                                <td className="px-4 py-2 text-xs text-gray-400 max-w-[160px] truncate">
                                                    {group.place_id}
                                                </td>
                                                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                                                    {n.sale_name || '—'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-800 max-w-md">
                                                    {editingId === n.id ? (
                                                        <div className="flex flex-col gap-1">
                                                            <textarea
                                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                                value={editText}
                                                                onChange={e => setEditText(e.target.value)}
                                                                rows={3}
                                                            />
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleSave(n.id)} className="text-xs text-green-600 hover:underline">บันทึก</button>
                                                                <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">ยกเลิก</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="flex items-start gap-2">
                                                                <span className="whitespace-pre-wrap break-words">{n.note}</span>
                                                                {isLatestEdited && (
                                                                    <span className="shrink-0 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                                                        แก้ล่าสุด
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(currentUser?.role === 'admin' || currentUser?.id === n.user_id) && (
                                                                <div className="flex gap-2 mt-1">
                                                                    <button onClick={() => handleEdit(n)} className="text-xs text-blue-500 hover:underline">แก้</button>
                                                                    <button onClick={() => handleDelete(n.id)} className="text-xs text-red-500 hover:underline">ลบ</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-gray-400 whitespace-nowrap text-xs">
                                                    {n.updated_at !== n.created_at
                                                        ? isSameDay(n.updated_at, n.created_at)
                                                            ? formatTimeOnly(n.updated_at)
                                                            : formatDate(n.updated_at)
                                                        : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })
                                })()}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex gap-2 mt-4 items-center">
                <button
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 bg-white hover:bg-gray-50"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1 || loading}
                >
                    ← Prev
                </button>
                <span className="text-sm text-gray-600">
                    Page {page} / {totalPages}
                </span>
                <button
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 bg-white hover:bg-gray-50"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages || loading}
                >
                    Next →
                </button>
            </div>
        </div >
    )
}