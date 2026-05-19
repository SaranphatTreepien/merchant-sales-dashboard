'use client'
import Link from 'next/link'
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

    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [saleId, setSaleId] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    const [sales, setSales] = useState<SaleOption[]>([])
    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
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

    Object.values(grouped).forEach(group => {
        group.notes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
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
    }

    useEffect(() => { fetchNotes(page) }, [page])
    useEffect(() => { setPage(1); fetchNotes(1) }, [pathname])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchNotes(1)
    }

    const handleReset = () => {
        setDateFrom(''); setDateTo(''); setSaleId(''); setSearch('')
        setPage(1)
        fetchNotes(1, { search: '' })
    }

    const totalPages = pagination?.total_pages ?? 1

    return (
        <div className="min-h-screen px-4 py-6 sm:px-6">

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
                        📝 Note History
                    </h1>

                </div>
            </div>
            <div className="mb-6">

                {pagination && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {pagination.total.toLocaleString()} notes ทั้งหมด
                    </p>
                )}
            </div>

            {/* Filter Bar */}
            <form
                onSubmit={handleSearch}
                className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">จากวันที่</label>
                    <input
                        type="date"
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">ถึงวันที่</label>
                    <input
                        type="date"
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                    />
                </div>

                {currentUser?.role === 'admin' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sale</label>
                        <select
                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-white"
                            value={saleId}
                            onChange={e => { setSaleId(e.target.value); setPage(1); setTimeout(() => fetchNotes(1), 0) }}
                        >
                            <option value="">ทุก Sale</option>
                            {sales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">ค้นหา</label>
                    <input
                        className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder-gray-500"
                        placeholder="ชื่อร้าน / จังหวัด / place_id…"
                        value={search}
                        onChange={e => { const v = e.target.value; setSearch(v); setPage(1); fetchNotes(1, { search: v }) }}
                    />
                </div>

                <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Search
                </button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                    Reset
                </button>
            </form>

            {/* Mobile Cards */}
            <div className="space-y-4 md:hidden">
                {loading ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400 dark:border-white/10 dark:bg-white/5">
                        Loading…
                    </div>
                ) : notes.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400 dark:border-white/10 dark:bg-white/5">
                        ไม่มี note
                    </div>
                ) : Object.values(grouped).map(group => (
                    <div key={group.place_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1e2433]">
                        {/* Group Header */}
                        <button
                            onClick={() => router.push(`/dashboard/${group.place_id}`)}
                            className="flex w-full items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-left dark:border-white/5 dark:bg-white/5"
                        >
                            <span className="h-4 w-1 shrink-0 rounded-full bg-blue-500" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {group.place_name || group.place_id}
                                </p>
                                <p className="truncate font-mono text-[10px] text-gray-400">{group.place_id}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                                {group.notes.length}
                            </span>
                        </button>

                        {/* Notes */}
                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                            {group.notes.map(n => (
                                <div key={n.id} className="px-4 py-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{n.sale_name || '—'}</span>
                                            <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                                            <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                                        </div>
                                        {group.notes.length > 1 && n.updated_at === [...group.notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at && (
                                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                                ล่าสุด {formatDate(n.updated_at)}
                                            </span>
                                        )}
                                    </div>

                                    {editingId === n.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSave(n.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">บันทึก</button>
                                                <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">ยกเลิก</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-800 dark:text-gray-100">{n.note}</p>
                                            {(currentUser?.role === 'admin' || currentUser?.id === n.user_id) && (
                                                <div className="mt-2 flex gap-3">
                                                    <button onClick={() => handleEdit(n)} className="text-xs font-semibold text-blue-500 hover:text-blue-600">แก้ไข</button>
                                                    <button onClick={() => handleDelete(n.id)} className="text-xs font-semibold text-red-500 hover:text-red-600">ลบ</button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-white/10">
                    <table className="w-full min-w-[700px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">วันที่/เวลา</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sale</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Note</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">แก้ไขล่าสุด</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white dark:divide-white/5 dark:bg-[#13161e]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-sm text-gray-400">Loading…</td>
                                </tr>
                            ) : notes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-sm text-gray-400">ไม่มี note</td>
                                </tr>
                            ) : Object.values(grouped).map(group => {
                                const latestUpdatedAt = group.notes.length > 1
                                    ? group.notes
                                        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at
                                    : null

                                return (
                                    <React.Fragment key={group.place_id}>
                                        {/* Group Header Row */}
                                        <tr className="bg-gray-50/80 dark:bg-white/[0.03]">
                                            <td colSpan={5} className="px-4 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="h-4 w-1 rounded-full bg-blue-500" />
                                                    <button
                                                        onClick={() => router.push(`/dashboard/${group.place_id}`)}
                                                        className="text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
                                                    >
                                                        {group.place_name || group.place_id}
                                                    </button>
                                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                                                        {group.notes.length} notes
                                                    </span>
                                                    <span className="font-mono text-xs text-gray-400">{group.place_id}</span>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Note Rows */}
                                        {group.notes.map(n => {
                                            const isLatestEdited = !!latestUpdatedAt && n.updated_at === latestUpdatedAt
                                            const canEdit = currentUser?.role === 'admin' || currentUser?.id === n.user_id

                                            return (
                                                <tr key={n.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                    {/* วันที่ */}
                                                    <td className="whitespace-nowrap px-4 py-3 pl-9 text-xs text-gray-500 dark:text-gray-400">
                                                        {formatDate(n.created_at)}
                                                    </td>

                                                    {/* Sale */}
                                                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {n.sale_name || '—'}
                                                    </td>

                                                    {/* Note */}
                                                    <td className="px-4 py-3">
                                                        {editingId === n.id ? (
                                                            <div className="flex flex-col gap-1.5">
                                                                <textarea
                                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                                    value={editText}
                                                                    onChange={e => setEditText(e.target.value)}
                                                                    rows={3}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleSave(n.id)} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700">บันทึก</button>
                                                                    <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400">ยกเลิก</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-start gap-2">
                                                                <p className="max-w-md whitespace-pre-wrap break-words text-sm leading-6 text-gray-800 dark:text-gray-100">
                                                                    {n.note}
                                                                </p>
                                                                {isLatestEdited && (
                                                                    <span className="mt-1 shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                                                        ล่าสุด {formatDate(n.updated_at)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* แก้ไขล่าสุด */}
                                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                                                        {n.updated_at !== n.created_at
                                                            ? isSameDay(n.updated_at, n.created_at)
                                                                ? formatTimeOnly(n.updated_at)
                                                                : formatDate(n.updated_at)
                                                            : '—'}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="whitespace-nowrap px-4 py-3 text-right">
                                                        {canEdit && editingId !== n.id && (
                                                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <button
                                                                    onClick={() => handleEdit(n)}
                                                                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                                                                >
                                                                    แก้ไข
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(n.id)}
                                                                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                                                >
                                                                    ลบ
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center gap-3">
                <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1 || loading}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                    ← Prev
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} / {totalPages}
                </span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages || loading}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                    Next →
                </button>
            </div>
        </div>
    )
}