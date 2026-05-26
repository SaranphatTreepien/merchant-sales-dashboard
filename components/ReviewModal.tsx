'use client'

import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'

// ─── Types ────────────────────────────────────────────────────────────────────
type PhoneRow = {
    number: string
    is_primary: boolean
}

// AFTER
type PlaceFull = {
    place_id: string
    name: string
    address: string | null
    city: string | null
    country: string | null
    description: string | null
    dress_code: string | null
    google_map_url: string | null
    latitude: string | null
    longitude: string | null
    service_type: string | null
    email: string | null
    whatsapp: string | null
    telegram_url: string | null
    reference_code: string | null       // จาก place_payment_info (เดิม)
    deal_reference_code: string | null  // จาก deal_cases (ใหม่ — ใช้ส่ง aappoint)
    transfer_account: string | null
    transfer_name: string | null
    transfer_type: string | null
    phones: PhoneRow[]
    name_en: string
}

type ResultState = {
    place_id: string
    name: string
    status: 'idle' | 'loading' | 'success' | 'error'
    error?: string
}

type Props = {
    placeIds: string[]
    onClose: () => void
    onSuccess?: () => void  // ← เพิ่ม: เรียกหลัง submit สำเร็จทั้งหมด
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function Field({ label, value, required }: { label: string; value: string | null | undefined; required?: boolean }) {
    const isEmpty = !value
    return (
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 ${isEmpty
            ? 'bg-transparent'
            : 'bg-slate-50 dark:bg-white/[0.03]'
            }`}>
            <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
            </span>
            {isEmpty ? (
                <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
            ) : (
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-all">
                    {value}
                </span>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReviewModal({ placeIds, onClose, onSuccess }: Props) {
    const [places, setPlaces] = useState<PlaceFull[]>([])
    const [loading, setLoading] = useState(true)
    const [results, setResults] = useState<ResultState[]>([])
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        console.log('ReviewModal mounted, placeIds:', placeIds)

        const fetchAll = async () => {
            setLoading(true)
            try {
                const responses = await Promise.all(
                    placeIds.map(id => fetch(`/api/places/${id}`).then(r => r.json()))
                )
                const fetched: PlaceFull[] = responses.map(res => ({
                    ...res.place,
                    phones: res.phones ?? [],
                    name_en: res.place.name ?? '',
                    deal_reference_code: res.deal_reference_code ?? null,
                }))
                setPlaces(fetched)  // ← บรรทัดนี้หายไป

                setResults(fetched.map(p => ({
                    place_id: p.place_id,
                    name: p.name,
                    status: 'idle',
                })))
            } catch {
                // fetch failed
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [placeIds])
    function inputCls(value: string | null | undefined, mono = false) {
        const hasValue = !!value
        return [
            'flex-1 rounded-lg border-2 px-2.5 py-1.5 text-xs font-semibold outline-none transition-all',
            'focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
            mono ? 'font-mono' : '',
            hasValue
                ? 'border-emerald-400 dark:border-emerald-500/60 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-emerald-400/25'
                : 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-300/30',
        ].join(' ')
    }
    const updateNameEn = (place_id: string, value: string) => {
        setPlaces(prev => prev.map(p => p.place_id === place_id ? { ...p, name_en: value } : p))
    }
    const updateRefCode = (place_id: string, value: string) => {
        setPlaces(prev => prev.map(p => p.place_id === place_id ? { ...p, deal_reference_code: value } : p))
    }
    // AFTER
    // ส่ง batch เดียว → แต่ละร้านแสดง loading → parse results รายร้านจาก response เดียว
    const handleCreateShop = async () => {
        const confirm = await Swal.fire({
            title: 'ยืนยันการสร้างร้าน',
            html: `คุณกำลังจะส่งข้อมูล <b>${places.length} ร้าน</b> ไปยัง aappoint<br/><br/>พิมพ์ <b style="color:#40BEB6">CONFIRM</b> เพื่อยืนยัน`,
            icon: 'question',
            input: 'text',
            inputPlaceholder: 'พิมพ์ CONFIRM',
            inputAttributes: { autocomplete: 'off' },
            showCancelButton: true,
            confirmButtonText: '🏪 ส่งเลย',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#40BEB6',
            cancelButtonColor: '#94a3b8',
            preConfirm: (value: string) => {
                if (value !== 'CONFIRM') {
                    Swal.showValidationMessage('กรุณาพิมพ์ CONFIRM ให้ถูกต้อง')
                    return false
                }
                return true
            },
        })
        if (!confirm.isConfirmed) return

        setSubmitting(true)
        setSubmitted(true)

        // ทุกร้าน → loading พร้อมกัน
        setResults(prev => prev.map(r => ({ ...r, status: 'loading' })))

        // build payloads ทั้งหมดในครั้งเดียว
        const payloads = places.map(place => {
            const primaryPhone =
                place.phones.find(ph => ph.is_primary)?.number ??
                place.phones[0]?.number ??
                null

            return {
                name_th: place.name,
                name_en: place.name_en || place.name,
                service_type: place.service_type ?? 'other',
                address: place.address,
                city: place.city,
                country: place.country,
                latitude: place.latitude,
                longitude: place.longitude,
                google_map_url: place.google_map_url,
                google_place_id: place.place_id,
                description: place.description,
                dress_code: place.dress_code,
                phone: primaryPhone,
                email: place.email,
                reference_code: place.deal_reference_code ?? place.reference_code,
                transfer_account: place.transfer_account,
                transfer_name: place.transfer_name,
                transfer_type: place.transfer_type,
                timezone: 'Asia/Bangkok',
                status: 'request',
                allow_multi_booking: false,
            }
        })

        try {
            const res = await fetch('/api/create-shop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloads), // ← ส่ง batch เดียว
                credentials: 'include',
            })
            const json = await res.json()

            if (!res.ok) {
                // API-level error (auth, validation) → fail ทุกร้าน
                setResults(prev => prev.map(r => ({
                    ...r,
                    status: 'error',
                    error: json.error ?? 'Server error',
                })))
                setSubmitting(false)
                return
            }

            // map result รายร้านจาก response
            const resultMap = new Map<string, { success: boolean; error?: string }>(
                (json.results ?? []).map((r: { place_id: string; success: boolean; error?: string }) => [
                    r.place_id,
                    { success: r.success, error: r.error },
                ])
            )

            setResults(prev => prev.map(r => {
                const matched = resultMap.get(r.place_id)
                if (!matched) return { ...r, status: 'error', error: 'ไม่พบผลลัพธ์จาก server' }
                return matched.success
                    ? { ...r, status: 'success' }
                    : { ...r, status: 'error', error: matched.error ?? 'Unknown error' }
            }))

            // ถ้าสำเร็จทั้งหมด → notify parent
            const allSuccess = (json.results ?? []).every((r: { success: boolean }) => r.success)
            if (allSuccess && onSuccess) {
                onSuccess()
            }
        } catch {
            setResults(prev => prev.map(r => ({
                ...r,
                status: 'error',
                error: 'Network error',
            })))
        } finally {
            setSubmitting(false)
        }
    }

    const allDone = results.length > 0 && results.every(r => r.status === 'success' || r.status === 'error')
    const hasError = results.some(r => r.status === 'error')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            🏪 Review & Create Shop
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            ตรวจสอบข้อมูลก่อนส่ง —{' '}
                            <span className="font-bold text-[#40BEB6]">{placeIds.length} ร้าน</span>
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
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
                            กำลังโหลดข้อมูล...
                        </div>
                    ) : places.map((place) => {
                        const result = results.find(r => r.place_id === place.place_id)
                        const primaryPhone = place.phones.find(ph => ph.is_primary)?.number ?? place.phones[0]?.number ?? null

                        return (
                            <div
                                key={place.place_id}
                                className={`rounded-2xl border p-5 transition-all ${result?.status === 'success'
                                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5'
                                    : result?.status === 'error'
                                        ? 'border-red-300 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/5'
                                        : 'border-slate-200 dark:border-white/10'
                                    }`}
                            >
                                {/* Shop Header */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            {place.name}
                                        </h3>
                                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{place.place_id}</p>
                                    </div>
                                    {result?.status === 'success' && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-300/40">
                                            ✅ สำเร็จ
                                        </span>
                                    )}
                                    {result?.status === 'error' && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-300/40">
                                            ❌ {result.error}
                                        </span>
                                    )}
                                    {result?.status === 'loading' && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-300/40">
                                            ⏳ กำลังส่ง...
                                        </span>
                                    )}
                                </div>



                                <div className="rounded-xl border border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-white/[0.02] p-3 space-y-0.5">
                                    <Field label="name_th" value={place.name} required />
                                    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-white/5">
                                        <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">
                                            name_en
                                            <span className="text-red-400 ml-0.5">*</span>
                                        </span>
                                        <input
                                            type="text"
                                            value={place.name_en}
                                            onChange={e => updateNameEn(place.place_id, e.target.value)}
                                            disabled={submitted}
                                            placeholder={place.name}
                                            className={inputCls(place.name_en)}
                                        />
                                    </div>

                                    <Field label="service_type" value={place.service_type} required />
                                    <Field label="address" value={place.address} />
                                    <Field label="city" value={place.city} />
                                    <Field label="country" value={place.country} />
                                    <Field label="latitude" value={place.latitude} />
                                    <Field label="longitude" value={place.longitude} />
                                    <Field label="google_map_url" value={place.google_map_url} />
                                    <Field label="google_place_id" value={place.place_id} />
                                    <Field label="phone" value={primaryPhone} />
                                    <Field label="email" value={place.email} />
                                    <Field label="description" value={place.description} />
                                    <Field label="dress_code" value={place.dress_code} />

                                    {/* reference_code — กรอกได้ */}
                                    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-white/5">
                                        <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">
                                            reference_code
                                        </span>
                                        <input
                                            type="text"
                                            value={place.deal_reference_code ?? ''}
                                            onChange={e => updateRefCode(place.place_id, e.target.value)}
                                            disabled={submitted}
                                            placeholder="เช่น CICC2220"
                                            className={inputCls(place.deal_reference_code, true)}
                                        />
                                    </div>

                                    {/* transfer_account — กรอกได้ */}
                                    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-white/5">
                                        <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">
                                            transfer_account
                                        </span>
                                        <input
                                            type="text"
                                            value={place.transfer_account ?? ''}
                                            onChange={e => setPlaces(prev => prev.map(p => p.place_id === place.place_id ? { ...p, transfer_account: e.target.value || null } : p))}
                                            disabled={submitted}
                                            placeholder="เลขบัญชี..."
                                            className={inputCls(place.transfer_account)}
                                        />
                                    </div>

                                    {/* transfer_name — กรอกได้ */}
                                    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-white/5">
                                        <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">
                                            transfer_name
                                        </span>
                                        <input
                                            type="text"
                                            value={place.transfer_name ?? ''}
                                            onChange={e => setPlaces(prev => prev.map(p => p.place_id === place.place_id ? { ...p, transfer_name: e.target.value || null } : p))}
                                            disabled={submitted}
                                            placeholder="ชื่อบัญชี..."

                                            className={inputCls(place.transfer_name)}
                                        />
                                    </div>

                                    {/* transfer_type — กรอกได้ */}
                                    <div className="flex items-center gap-2 py-1.5">
                                        <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">
                                            transfer_type
                                        </span>
                                        <input
                                            type="text"
                                            value={place.transfer_type ?? ''}
                                            onChange={e => setPlaces(prev => prev.map(p => p.place_id === place.place_id ? { ...p, transfer_type: e.target.value || null } : p))}
                                            disabled={submitted}
                                            placeholder="เช่น promptpay..."
                                            className={inputCls(place.transfer_type)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-white/10 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                        {allDone ? 'ปิด' : 'ยกเลิก'}
                    </button>

                    {!submitted ? (
                        <button
                            onClick={handleCreateShop}
                            disabled={loading || submitting}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#40BEB6] hover:bg-[#35a8a1] text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            🏪 Create Shop ({placeIds.length} ร้าน)
                        </button>
                    ) : allDone ? (
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            {hasError ? (
                                <span className="text-red-500">❌ บางร้านส่งไม่สำเร็จ</span>
                            ) : (
                                <span className="text-emerald-500">✅ ส่งสำเร็จทั้งหมด</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm font-semibold text-slate-500">⏳ กำลังดำเนินการ...</span>
                    )}
                </div>
            </div>
        </div>
    )
}