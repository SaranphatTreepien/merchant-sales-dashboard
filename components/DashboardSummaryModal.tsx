'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { getCitiesByCountry, ALL_CITIES, COUNTRY_LABELS } from "@/lib/constants/regions";

// ─── Types ────────────────────────────────────────────────────────────────────
type ContactStats = {
    total_places: number
    has_phone: number
    has_line: number
    has_facebook: number
    has_instagram: number
    has_email: number
    has_whatsapp: number
    has_telegram: number
    has_booking: number
}

type DealStats = {
    deal_success: number
    deal_pending: number
    deal_stop: number
    deal_total: number
}

type Province = {
    city: string
    is_other: boolean        // ← เพิ่ม
    other_city_names: string[] | null  // ← เพิ่ม
    total_places: number
    has_phone: number
    has_line: number
    has_facebook: number
    has_instagram: number
    has_email: number
    has_whatsapp: number
    has_telegram: number
    has_booking: number
    deal_success: number
    deal_pending: number
    deal_stop: number
}

type ServiceStats = {
    restaurant_food: number
    cafe_drinks: number
    bar_nightlife: number
    accommodation: number
    health_beauty: number
    travel_tourism: number
}

type SummaryData = {
    contact_stats: ContactStats
    deal_stats: DealStats
    provinces: Province[]
    service_stats: ServiceStats
    is_all: boolean
}

type Props = {
    open: boolean
    onClose: () => void
    country: string  // ← เพิ่ม
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | undefined | null) {
    if (n === undefined || n === null) return '—'
    return n.toLocaleString('th-TH')
}

function pct(part: number, total: number) {
    if (!total) return '0%'
    return `${Math.round((part / total) * 100)}%`
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
    icon, label, value, sub, color,
}: {
    icon: string; label: string; value: number | undefined; sub?: string; color: string
}) {
    return (
        <div className={`rounded-xl border-2 bg-white dark:bg-slate-900/60 px-4 py-3.5 shadow-sm flex flex-col gap-1 ${color}`}>
            <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">{label}</span>

            </div>
            <p className="text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white">{fmt(value)}</p>
            {sub && <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{sub}</p>}
        </div>
    )
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export function DashboardSummaryModal({ open, onClose, country }: Props) {
    const [data, setData] = useState<SummaryData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const overviewRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)

    // fetch เมื่อ open
    useEffect(() => {
        if (!open || !country) return
        setLoading(true)
        setError(null)
        setData(null)
        fetch(`/api/dashboard/summary?country=${country}`)
            .then(r => r.json())
            .then((json) => {
                if (json.error) throw new Error(json.error)
                setData(json)
            })
            .catch(e => setError(e.message || 'โหลดข้อมูลไม่สำเร็จ'))
            .finally(() => setLoading(false))
    }, [open, country])
    // ESC close
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    // lock scroll
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    // Export PDF via print
    const [exporting, setExporting] = useState(false)

    const handleExportPDF = useCallback(async () => {
        if (!overviewRef.current || !tableRef.current) return
        setExporting(true)

        const root = document.documentElement
        root.classList.add('pdf-export-mode')
        await new Promise(r => setTimeout(r, 150))

        try {
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
            const pageW = pdf.internal.pageSize.getWidth()
            const pageH = pdf.internal.pageSize.getHeight()

            // ── หน้า 1: Overview (printRef) ──
            const overviewEl = overviewRef.current
            const prevOF = overviewEl.style.overflow
            const prevMH = overviewEl.style.maxHeight
            overviewEl.style.overflow = 'visible'
            overviewEl.style.maxHeight = 'none'
            await new Promise(r => setTimeout(r, 50))

            const canvas1 = await html2canvas(overviewEl, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: overviewEl.scrollWidth,
                windowHeight: overviewEl.scrollHeight,
                height: overviewEl.scrollHeight,
                width: overviewEl.scrollWidth,
            })
            overviewEl.style.overflow = prevOF
            overviewEl.style.maxHeight = prevMH

            const img1 = canvas1.toDataURL('image/png')
            const pageMargin = 8
            const w1 = pageW - pageMargin * 2
            const h1 = (canvas1.height * w1) / canvas1.width

            let y = 0
            let rem = h1

            while (rem > 0) {
                pdf.addImage(img1, 'PNG', pageMargin, pageMargin - y, w1, h1)

                rem -= (pageH - pageMargin)
                y += (pageH - pageMargin)

                if (rem > 0) pdf.addPage()
            }

            // ── หน้าถัดไป: ตารางจังหวัด (tableRef) ──
            pdf.addPage()
            const tableEl = tableRef.current
            const canvas2 = await html2canvas(tableEl, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: tableEl.scrollWidth,
                windowHeight: tableEl.scrollHeight,
                height: tableEl.scrollHeight,
                width: tableEl.scrollWidth,
            })

            const img2 = canvas2.toDataURL('image/png')
            const margin = 8 // mm margin รอบด้าน
            const tableW = pageW - margin * 2
            const h2 = (canvas2.height * tableW) / canvas2.width
            y = 0; rem = h2
            while (rem > 0) {
                pdf.addImage(img2, 'PNG', margin, margin - y, tableW, h2)
                rem -= (pageH - margin)
                y += (pageH - margin)
                if (rem > 0) pdf.addPage()
            }

            pdf.save('dashboard-summary.pdf')
        } catch (e) {
            console.error('Export PDF error:', e)
        } finally {
            root.classList.remove('pdf-export-mode')
            setExporting(false)
        }
    }, [])

    if (!open) return null

    const cs = data?.contact_stats
    const ds = data?.deal_stats
    const otherRow = data?.provinces.find(p => p.is_other) ?? null
    const allRows = data?.provinces ?? []
    const provinces = allRows
        .filter(p => !p.is_other)
        .filter(p => !search || p.city.toLowerCase().includes(search.toLowerCase()))

    return (
        <>
            <style>{`
        .pdf-export-mode * {
          color: #0f172a !important;
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
        }
        .pdf-export-mode .text-emerald-600,
        .pdf-export-mode .text-emerald-400 { color: #059669 !important; }
        .pdf-export-mode .text-blue-600,
        .pdf-export-mode .text-blue-400 { color: #2563eb !important; }
        .pdf-export-mode .text-red-600,
        .pdf-export-mode .text-red-400 { color: #dc2626 !important; }
        .pdf-export-mode .text-slate-400,
        .pdf-export-mode .text-slate-500 { color: #94a3b8 !important; }
        .pdf-export-mode .bg-slate-50 { background-color: #f8fafc !important; }
        .pdf-export-mode .bg-emerald-50 { background-color: #ecfdf5 !important; }
        .pdf-export-mode .bg-blue-50 { background-color: #eff6ff !important; }
        .pdf-export-mode .bg-red-50 { background-color: #fef2f2 !important; }
      `}</style>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                onClick={onClose}
            >
                {/* Panel */}
                <div
                    className="relative flex flex-col w-full max-w-7xl max-h-[92vh] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/8 shrink-0 no-print">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: '#40BEB6' }}>
                                📊
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Dashboard Summary</h2>
                                {country === 'ALL' ? (
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                        🌏 All Countries — ข้อมูลเรียลไทม์
                                    </p>
                                ) : (
                                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white">
                                        <img
                                            src={`https://flagcdn.com/24x18/${COUNTRY_LABELS[country]?.flag}.png`}
                                            alt={country}
                                            className="w-5 h-auto rounded-sm"
                                        />
                                        {COUNTRY_LABELS[country]?.name ?? country}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportPDF}
                                disabled={loading || !data || exporting}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-[#40BEB6]/40 hover:text-[#40BEB6] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                {exporting ? 'กำลัง Export...' : 'Export PDF'}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-lg leading-none"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* ── Scrollable Body ── */}
                    <div className="flex-1 overflow-y-auto" id="summary-print-area">

                        <div className="px-6 py-5 space-y-7">

                            {/* Loading / Error */}
                            {loading && (
                                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    <span className="text-sm">กำลังโหลดข้อมูล...</span>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 px-5 py-4 text-sm text-red-600 dark:text-red-400">
                                    ⚠️ {error}
                                </div>
                            )}

                            {data && (
                                <>
                                    {/* ── Section 1: Overview Cards ── */}
                                    <section ref={overviewRef}>
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                                            📋 ภาพรวม Contact
                                        </h3>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

                                            <StatCard icon="📞" label="Phone" value={cs?.has_phone}
                                                sub={pct(cs?.has_phone ?? 0, cs?.total_places ?? 0)}
                                                color="border-slate-900 dark:border-white/30" />
                                            <StatCard icon="💬" label="LINE" value={cs?.has_line}
                                                sub={pct(cs?.has_line ?? 0, cs?.total_places ?? 0)}
                                                color="border-slate-900 dark:border-white/30" />
                                            <StatCard icon="📘" label="Facebook" value={cs?.has_facebook}
                                                sub={pct(cs?.has_facebook ?? 0, cs?.total_places ?? 0)}
                                                color="border-slate-900 dark:border-white/30" />
                                            <StatCard icon="📸" label="Instagram" value={cs?.has_instagram}
                                                sub={pct(cs?.has_instagram ?? 0, cs?.total_places ?? 0)}
                                                color="border-slate-900 dark:border-white/30" />
                                            <StatCard icon="✉️" label="Email" value={cs?.has_email}
                                                sub={pct(cs?.has_email ?? 0, cs?.total_places ?? 0)}
                                                color="border-slate-900 dark:border-white/30" />
                                            <StatCard icon="💚" label="WhatsApp" value={cs?.has_whatsapp}
                                                sub={pct(cs?.has_whatsapp ?? 0, cs?.total_places ?? 0)}
                                                color="border-slate-900 dark:border-white/30" />
                                            <StatCard icon="✈️" label="Telegram" value={cs?.has_telegram}
                                                sub={pct(cs?.has_telegram ?? 0, cs?.total_places ?? 0)}
                                                color="bborder-slate-900 dark:border-white/30" />
                                            <StatCard icon="📅" label="Booking" value={cs?.has_booking}
                                                sub={pct(cs?.has_booking ?? 0, cs?.total_places ?? 0)}
                                                color="border-slate-900 dark:border-white/30" />
                                            <StatCard icon="🏪" label="Merchants" value={cs?.total_places}
                                                sub="ทั้งหมด"
                                                color="border-slate-900 dark:border-white/30" />
                                        </div>
                                        {/* ── Service Type Breakdown ── */}
                                        <div className="mt-4 border-t border-slate-100 dark:border-white/8 pt-4">
                                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                                                🏷️ ประเภทธุรกิจ
                                            </h4>
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                {[
                                                    { label: 'Restaurant & Food', icon: '🍽️', value: data.service_stats?.restaurant_food, color: 'border-orange-100 dark:border-orange-500/20' },
                                                    { label: 'Cafe & Drinks', icon: '☕', value: data.service_stats?.cafe_drinks, color: 'border-yellow-100 dark:border-yellow-500/20' },
                                                    { label: 'Bar & Nightlife', icon: '🍺', value: data.service_stats?.bar_nightlife, color: 'border-purple-100 dark:border-purple-500/20' },
                                                    { label: 'Accommodation', icon: '🏨', value: data.service_stats?.accommodation, color: 'border-blue-100 dark:border-blue-500/20' },
                                                    { label: 'Health & Beauty', icon: '💆', value: data.service_stats?.health_beauty, color: 'border-pink-100 dark:border-pink-500/20' },
                                                    { label: 'Travel & Tourism', icon: '✈️', value: data.service_stats?.travel_tourism, color: 'border-teal-100 dark:border-teal-500/20' },
                                                ].map(s => (
                                                    <div key={s.label} className="rounded-xl border-2 border-slate-900 dark:border-white/30 bg-white dark:bg-slate-900/60 px-3 py-3 shadow-sm flex flex-col gap-1">

                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-base">{s.icon}</span>
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 leading-tight">{s.label}</span>

                                                        </div>
                                                        <p className="text-xl font-extrabold tabular-nums text-slate-950 dark:text-white">{fmt(s.value)}</p>
                                                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">{pct(s.value ?? 0, cs?.total_places ?? 0)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* ── Top 5 จังหวัด Contact รวม ── */}
                                        <div className="mt-4 border-t border-slate-100 dark:border-white/8 pt-4">

                                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                                                🏆 Top 5 จังหวัด — Contact รวมมากสุด
                                            </h4>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[...(data?.provinces ?? [])]
                                                    .map(p => ({
                                                        ...p,
                                                        contact_total: p.has_phone + p.has_line + p.has_facebook + p.has_instagram + p.has_email + p.has_whatsapp + p.has_telegram,
                                                    }))
                                                    .sort((a, b) => b.contact_total - a.contact_total)
                                                    .slice(0, 5)
                                                    .map((p, i) => (
                                                        <div key={p.city} className="rounded-xl border-2 border-slate-900 dark:border-white/30 bg-white dark:bg-slate-900/60 px-3 py-3 flex flex-col gap-2 shadow-sm">

                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black text-slate-500 dark:text-slate-400 tabular-nums">#{i + 1}</span>
                                                                <span className="text-[11px] font-bold text-slate-950 dark:text-white truncate">{p.city}</span>
                                                            </div>
                                                            <p className="text-xl font-extrabold tabular-nums" style={{ color: '#40BEB6' }}>
                                                                {p.contact_total.toLocaleString('th-TH')}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {p.has_phone > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">📞 {p.has_phone.toLocaleString('th-TH')}</span>}
                                                                {p.has_line > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">💬 {p.has_line.toLocaleString('th-TH')}</span>}
                                                                {p.has_facebook > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">📘 {p.has_facebook.toLocaleString('th-TH')}</span>}
                                                                {p.has_instagram > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400">📸 {p.has_instagram.toLocaleString('th-TH')}</span>}
                                                                {p.has_email > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">✉️ {p.has_email.toLocaleString('th-TH')}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Deal Summary Row */}
                                        <div className="mt-3 grid grid-cols-3 gap-3"></div>
                                        {/* Deal Summary Row */}
                                        <div className="mt-3 grid grid-cols-3 gap-3">
                                            <div className="rounded-xl border-2 border-slate-900 dark:border-white/30 bg-white dark:bg-slate-900/60 px-4 py-3 flex items-center gap-3 shadow-sm">

                                                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-base shrink-0">✅</div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Deal Success</p>

                                                    <p className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(ds?.deal_success)}</p>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border-2 border-slate-900 dark:border-white/30 bg-white dark:bg-slate-900/60 px-4 py-3 flex items-center gap-3 shadow-sm">

                                                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-base shrink-0">🔵</div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">In Progress</p>
                                                    <p className="text-xl font-extrabold tabular-nums text-blue-600 dark:text-blue-400">{fmt(ds?.deal_pending)}</p>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border-2 border-slate-900 dark:border-white/30 bg-white dark:bg-slate-900/60 px-4 py-3 flex items-center gap-3 shadow-sm">
                                                <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-base shrink-0">🔴</div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Deal Stop</p>
                                                    <p className="text-xl font-extrabold tabular-nums text-red-600 dark:text-red-400">{fmt(ds?.deal_stop)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* ── Section 2: Province Table ── */}
                                    <section ref={tableRef}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 no-print">
                                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                                                {data.is_all ? `🌏 ตารางรายประเทศ (${provinces.length} ประเทศ)` : `📍 ตารางรายจังหวัด (${provinces.length} จังหวัด)`}
                                            </h3>
                                            <div className="relative w-full sm:w-60">
                                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </span>
                                                <input
                                                    type="text"
                                                    value={search}
                                                    onChange={e => setSearch(e.target.value)}
                                                    placeholder="ค้นหา..."
                                                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-700 dark:text-white outline-none focus:border-[#40BEB6] focus:ring-2 focus:ring-[#40BEB6]/10 placeholder-slate-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-xl border-2 border-slate-900 dark:border-white/30 overflow-hidden shadow-sm">

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm min-w-[900px]">
                                                    <thead>
                                                        <tr className="bg-slate-50 dark:bg-slate-900/80 border-b-2 border-slate-900 dark:border-white/30">

                                                            {/* Province */}
                                                            <th className="...">{data.is_all ? 'ประเทศ' : 'จังหวัด'}</th>
                                                            <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-700 w-[8%]">

                                                                ร้านทั้งหมด
                                                            </th>
                                                            {/* Contact columns */}
                                                            {['Phone', 'LINE', 'FB', 'IG', 'Email', 'WA', 'TG', 'Booking'].map(h => (
                                                                <th key={h} className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[7%]">
                                                                    {h}
                                                                </th>
                                                            ))}
                                                            {/* Deal columns */}
                                                            <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-500 w-[7%]">
                                                                ✅ OK
                                                            </th>
                                                            <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-blue-500 w-[7%]">
                                                                🔵 WIP
                                                            </th>
                                                            <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-red-500 w-[7%]">
                                                                🔴 Stop
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody className="divide-y divide-slate-300 dark:divide-white/20 bg-white dark:bg-transparent">
                                                        {provinces.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={12} className="text-center py-10 text-sm text-slate-400 dark:text-slate-500">
                                                                    ไม่พบจังหวัดที่ตรงกับการค้นหา
                                                                </td>
                                                            </tr>
                                                        ) : provinces.map((p, i) => {
                                                            const hasDeal = p.deal_success + p.deal_pending + p.deal_stop > 0
                                                            return (
                                                                <tr
                                                                    key={p.city}
                                                                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.025] ${i % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-white/[0.01]'}`}
                                                                >
                                                                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 z-10 border-r border-slate-100 dark:border-white/6">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-white whitespace-nowrap">{p.city}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-right">
                                                                        <span className="text-xs font-bold tabular-nums text-slate-950 dark:text-white">{fmt(p.total_places)}</span>

                                                                    </td>
                                                                    {/* Contact counts */}
                                                                    {[p.has_phone, p.has_line, p.has_facebook, p.has_instagram, p.has_email, p.has_whatsapp, p.has_telegram, p.has_booking].map((v, ci) => (
                                                                        <td key={ci} className="px-3 py-2.5 text-right">
                                                                            {v > 0
                                                                                ? <span className="text-[11px] tabular-nums text-slate-800 dark:text-slate-200 font-semibold">{fmt(v)}</span>

                                                                                : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                                                            }
                                                                        </td>
                                                                    ))}
                                                                    {/* Deal Success */}
                                                                    <td className="px-3 py-2.5 text-right">
                                                                        {p.deal_success > 0
                                                                            ? <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 tabular-nums">{fmt(p.deal_success)}</span>
                                                                            : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                                                        }
                                                                    </td>
                                                                    {/* Deal Pending */}
                                                                    <td className="px-3 py-2.5 text-right">
                                                                        {p.deal_pending > 0
                                                                            ? <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 tabular-nums">{fmt(p.deal_pending)}</span>
                                                                            : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                                                        }
                                                                    </td>
                                                                    {/* Deal Stop */}
                                                                    <td className="px-3 py-2.5 text-right">
                                                                        {p.deal_stop > 0
                                                                            ? <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 tabular-nums">{fmt(p.deal_stop)}</span>
                                                                            : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                                                        }
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>

                                                    {/* Totals footer */}
                                                    {provinces.length > 0 && (
                                                        <tfoot>
                                                            <tr className="border-t-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60">
                                                                <td className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200 dark:border-white/10">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">รวมทั้งหมด</span>

                                                                </td>
                                                                <td className="px-3 py-3 text-right">
                                                                    <span className="text-xs font-bold tabular-nums" style={{ color: '#40BEB6' }}>
                                                                        {fmt(provinces.reduce((s, p) => s + p.total_places, 0))}
                                                                    </span>
                                                                </td>
                                                                {[
                                                                    provinces.reduce((s, p) => s + p.has_phone, 0),
                                                                    provinces.reduce((s, p) => s + p.has_line, 0),
                                                                    provinces.reduce((s, p) => s + p.has_facebook, 0),
                                                                    provinces.reduce((s, p) => s + p.has_instagram, 0),
                                                                    provinces.reduce((s, p) => s + p.has_email, 0),
                                                                    provinces.reduce((s, p) => s + p.has_whatsapp, 0),
                                                                    provinces.reduce((s, p) => s + p.has_telegram, 0),
                                                                    provinces.reduce((s, p) => s + p.has_booking, 0),
                                                                ].map((v, i) => (
                                                                    <td key={i} className="px-3 py-3 text-right">
                                                                        <span className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">{fmt(v)}</span>

                                                                    </td>
                                                                ))}
                                                                <td className="px-3 py-3 text-right">
                                                                    <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                                        {fmt(provinces.reduce((s, p) => s + p.deal_success, 0))}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-3 text-right">
                                                                    <span className="text-[11px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                                                        {fmt(provinces.reduce((s, p) => s + p.deal_pending, 0))}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-3 text-right">
                                                                    <span className="text-[11px] font-bold tabular-nums text-red-600 dark:text-red-400">
                                                                        {fmt(provinces.reduce((s, p) => s + p.deal_stop, 0))}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {/* ── Other Row ── */}
                                                            {otherRow && otherRow.total_places > 0 && !search && (
                                                                <tr className="border-t-2 border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5">
                                                                    <td className="px-4 py-2.5 sticky left-0 bg-amber-50/60 dark:bg-amber-500/5 z-10 border-r border-amber-100 dark:border-amber-500/20">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                                                                    ⚠️ Other
                                                                                </span>
                                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                                                                    {otherRow.other_city_names?.length ?? 0} cities
                                                                                </span>
                                                                            </div>
                                                                            {otherRow.other_city_names && otherRow.other_city_names.length > 0 && (
                                                                                <div className="flex flex-wrap gap-1 max-w-[160px]">
                                                                                    {otherRow.other_city_names.slice(0, 5).map(c => (
                                                                                        <span key={c} className="text-[9px] px-1 py-0.5 rounded bg-amber-100/80 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                                                                            {c}
                                                                                        </span>
                                                                                    ))}
                                                                                    {otherRow.other_city_names.length > 5 && (
                                                                                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100/80 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                                                            +{otherRow.other_city_names.length - 5} more
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-right">
                                                                        <span className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">{fmt(otherRow.total_places)}</span>
                                                                    </td>
                                                                    {[otherRow.has_phone, otherRow.has_line, otherRow.has_facebook, otherRow.has_instagram,
                                                                    otherRow.has_email, otherRow.has_whatsapp, otherRow.has_telegram, otherRow.has_booking].map((v, ci) => (
                                                                        <td key={ci} className="px-3 py-2.5 text-right">
                                                                            {v > 0
                                                                                ? <span className="text-[11px] tabular-nums text-amber-600 dark:text-amber-400 font-medium">{fmt(v)}</span>
                                                                                : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                                                            }
                                                                        </td>
                                                                    ))}
                                                                    {[otherRow.deal_success, otherRow.deal_pending, otherRow.deal_stop].map((v, ci) => (
                                                                        <td key={ci} className="px-3 py-2.5 text-right">
                                                                            {v > 0
                                                                                ? <span className="text-[11px] tabular-nums font-bold text-amber-600 dark:text-amber-400">{fmt(v)}</span>
                                                                                : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                                                            }
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            )}
                                                        </tfoot>
                                                    )}
                                                </table>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}