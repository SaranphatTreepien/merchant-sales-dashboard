// AFTER
'use client'

import { useEffect, useState } from 'react'

type LogRow = {
    id: number
    place_id: string
    place_name: string
    city: string | null
    service_type: string | null
    country: string | null
    reference_code: string | null
    deal_status: string
    shop_created_at: string
    created_by_name: string | null
}

type Props = {
    open: boolean
    onClose: () => void
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Bangkok',
    })
}

export function CreateShopLogModal({ open, onClose }: Props) {
    const [data, setData] = useState<LogRow[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [hasNextPage, setHasNextPage] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) return
        setPage(1)
        fetchLog(1)
    }, [open])

    useEffect(() => {
        if (!open) return
        fetchLog(page)
    }, [page])

    const fetchLog = async (p: number) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/create-shop-log?page=${p}`)
            const json = await res.json()
            setData(json.data ?? [])
            setTotal(json.total ?? 0)
            setHasNextPage(json.hasNextPage ?? false)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            🏪 Create Shop History
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            ร้านที่เคย create shop แล้ว —{' '}
                            <span className="font-bold text-[#40BEB6]">{total.toLocaleString()} ร้าน</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
                            กำลังโหลด...
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
                            ยังไม่มีประวัติ
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/55 border-b border-slate-200 dark:border-white/10 text-left">
                                    {['#', 'ร้าน', 'เมือง', 'Service Type', 'Ref Code', 'Deal Status', 'Created By', 'วันที่'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/8">
                                {data.map((row, idx) => (
                                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                                        <td className="px-4 py-3 text-xs font-mono text-slate-400">
                                            {(page - 1) * 20 + idx + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[180px] truncate">
                                                {row.place_name}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">
                                                {row.place_id}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {row.city ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {row.service_type ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.reference_code ? (
                                                <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                                    {row.reference_code}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.deal_status === 'success' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                                    ✅ Success
                                                </span>
                                            )}
                                            {row.deal_status === 'pending' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                                                    🔵 Pending
                                                </span>
                                            )}
                                            {row.deal_status === 'stop' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                                                    🔴 Stop
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {row.created_by_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {formatDateTime(row.shop_created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer — Pagination */}
                <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-slate-200 dark:border-white/10 shrink-0">
                    <span className="text-xs text-slate-400">
                        {total.toLocaleString()} รายการ
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => p - 1)}
                            disabled={loading || page === 1}
                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >
                            ← ก่อนหน้า
                        </button>
                        <span className="text-xs text-slate-400 tabular-nums">หน้า {page}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={loading || !hasNextPage}
                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >
                            ถัดไป →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}