'use client'

import { useState, useRef, useEffect } from 'react'

export default function ReportIssueButton() {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const popupRef = useRef<HTMLDivElement>(null)

    // focus textarea เมื่อ popup เปิด
    useEffect(() => {
        if (open) setTimeout(() => textareaRef.current?.focus(), 50)
    }, [open])

    // ปิด popup เมื่อคลิกข้างนอก
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleSend = async () => {
        if (!message.trim() || sending) return
        setSending(true)
        setError('')
        try {
            const res = await fetch('/api/report-issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            })
            if (!res.ok) throw new Error()
            setSent(true)
            setMessage('')
            setTimeout(() => {
                setSent(false)
                setOpen(false)
            }, 2000)
        } catch {
            setError('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง')
        }
        setSending(false)
    }

    return (
        <div className="relative" ref={popupRef}>
            {/* ── ปุ่ม ── */}
            <button
                onClick={() => setOpen(v => !v)}
                title="แจ้งปัญหา"
                className="
          flex h-8 w-8 items-center justify-center
          rounded-xl
          border border-slate-200 dark:border-white/[0.07]
          bg-slate-50 dark:bg-white/[0.04]
         text-orange-500 dark:text-orange-400
    bg-orange-50 dark:bg-orange-500/10
    border-orange-200 dark:border-orange-500/20
    hover:bg-orange-100 dark:hover:bg-orange-500/20
        "
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>

            {/* ── Popup ── */}
            {open && (
                <div className="
          absolute right-0 top-10 z-50
          w-72 sm:w-80
          rounded-2xl border border-slate-200 dark:border-white/[0.08]
          bg-white dark:bg-[#1c1c22]
          shadow-xl shadow-black/10 dark:shadow-black/40
          p-4
        ">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-base">🚨</span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-white/80">
                                แจ้งปัญหา
                            </span>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-slate-300 hover:text-slate-500 dark:text-white/20 dark:hover:text-white/50 text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {sent ? (
                        // Success state
                        <div className="flex flex-col items-center gap-2 py-4">
                            <span className="text-2xl">✅</span>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                ส่งสำเร็จแล้วครับ!
                            </p>
                            <p className="text-xs text-slate-400">ทีมงานจะรับทราบทาง Telegram</p>
                        </div>
                    ) : (
                        <>
                            <textarea
                                ref={textareaRef}
                                className="
                  w-full rounded-xl border border-slate-200 dark:border-white/[0.08]
                  bg-slate-50 dark:bg-white/[0.04]
                  px-3 py-2.5 text-sm text-slate-800 dark:text-white/80
                  placeholder-slate-300 dark:placeholder-white/20
                  resize-none focus:outline-none
                  focus:ring-2 focus:ring-orange-300/50 dark:focus:ring-orange-500/30
                  focus:border-orange-300 dark:focus:border-orange-500/40
                  transition-all
                "
                                placeholder="อธิบายปัญหาที่พบ..."
                                rows={4}
                                value={message}
                                onChange={e => { setMessage(e.target.value); setError('') }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend()
                                }}
                                maxLength={500}
                            />

                            {/* char count + error */}
                            <div className="flex items-center justify-between mt-1 mb-3">
                                {error
                                    ? <p className="text-xs text-red-500">{error}</p>
                                    : <span />
                                }
                                <span className="text-xs text-slate-300 dark:text-white/20 ml-auto">
                                    {message.length}/500
                                </span>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={sending || !message.trim()}
                                className="
                  w-full rounded-xl py-2 text-sm font-semibold
                  bg-orange-500 hover:bg-orange-600
                  text-white
                  transition-colors duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
                            >
                                {sending ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        กำลังส่ง...
                                    </span>
                                ) : '📨 ส่งแจ้งปัญหา'}
                            </button>
                            <p className="text-center text-[10px] text-slate-300 dark:text-white/20 mt-2">
                                Ctrl+Enter เพื่อส่งเร็ว
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}