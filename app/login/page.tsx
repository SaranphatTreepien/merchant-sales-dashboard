'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'เกิดข้อผิดพลาด')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .page {
          font-family: 'DM Sans', sans-serif;
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.4s ease;
        }
        .page.light { background: #ECEAE4; }
        .page.dark  { background: #111114; }

        .card {
          width: 100%;
          max-width: 400px;
          margin: 1.5rem;
          border-radius: 24px;
          overflow: hidden;
          transition: background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
        }
        .light .card {
          background: #fff;
          border: 1px solid #e2ddd7;
          box-shadow: 0 4px 32px rgba(0,0,0,0.07);
        }
        .dark .card {
          background: #1c1c22;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 4px 40px rgba(0,0,0,0.45);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 1.5rem;
          transition: background 0.4s ease, border-color 0.4s ease;
          border-bottom: 1px solid transparent;
        }
        .light .card-header { background: #f7f5f2; border-color: #e2ddd7; }
        .dark  .card-header { background: #16161b; border-color: rgba(255,255,255,0.06); }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          transition: color 0.4s;
        }
        .light .brand { color: #888; }
        .dark  .brand { color: #666; }

        .brand-emoji {
          font-size: 1rem;
          line-height: 1;
        }

        .toggle-wrap {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .toggle-lbl {
          font-size: 0.73rem;
          font-weight: 500;
          transition: color 0.4s;
        }
        .light .toggle-lbl { color: #bbb; }
        .dark  .toggle-lbl { color: #4a5258; }

        .toggle-btn {
          width: 42px; height: 24px;
          border-radius: 12px;
          border: none;
          padding: 3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background 0.35s ease;
          outline: none;
        }
        .light .toggle-btn { background: #dedad4; }
        .dark  .toggle-btn { background: #2c3540; }

        .toggle-knob {
          width: 18px; height: 18px;
          border-radius: 50%;
          font-size: 10px;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), background 0.35s ease;
          user-select: none;
        }
        .light .toggle-knob { background: #40BEB6; transform: translateX(0px); }
        .dark  .toggle-knob { background: #e8c84a; transform: translateX(18px); }

        .card-body { padding: 2.25rem 2rem 2rem; }

        .heading {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 1.75rem;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 0.35rem;
          transition: color 0.4s;
        }
        .light .heading { color: #111; }
        .dark  .heading { color: #f0ece4; }

        .sub {
          font-size: 0.875rem;
          margin-bottom: 2rem;
          transition: color 0.4s;
        }
        .light .sub { color: #9a9590; }
        .dark  .sub { color: #5a6068; }

        .field { margin-bottom: 1.1rem; }

        .lbl {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.45rem;
          transition: color 0.4s;
        }
        .light .lbl { color: #666; }
        .dark  .lbl { color: #6a7278; }

        .iw { position: relative; }

        .ii {
          position: absolute;
          left: 0.9rem; top: 50%;
          transform: translateY(-50%);
          font-size: 0.95rem;
          pointer-events: none;
        }

        .inp {
          width: 100%;
          padding: 0.8rem 1rem 0.8rem 2.6rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          border-radius: 12px;
          outline: none;
          transition: all 0.2s ease;
          border: 1.5px solid transparent;
        }
        .light .inp { background: #f4f2ee; color: #111; }
        .light .inp::placeholder { color: #c0bbb5; }
        .light .inp:focus { background: #fff; border-color: #40BEB6; box-shadow: 0 0 0 3px rgba(64,190,182,0.1); }
        .dark  .inp { background: rgba(255,255,255,0.05); color: #f0ece4; border-color: rgba(255,255,255,0.07); }
        .dark  .inp::placeholder { color: #404850; }
        .dark  .inp:focus { background: rgba(255,255,255,0.08); border-color: #40BEB6; box-shadow: 0 0 0 3px rgba(64,190,182,0.1); }

        .err {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.7rem 0.9rem;
          border-radius: 10px;
          font-size: 0.85rem; font-weight: 500;
          margin-bottom: 1rem;
          animation: fadeUp 0.2s ease;
        }
        .light .err { background: #fff1f1; color: #c0392b; border: 1px solid #fecaca; }
        .dark  .err { background: rgba(220,50,50,0.1); color: #f87171; border: 1px solid rgba(220,50,50,0.2); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .btn {
          width: 100%;
          margin-top: 0.75rem;
          padding: 0.875rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem; font-weight: 600;
          color: #fff;
          background: #40BEB6;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s, opacity 0.2s;
        }
        .btn:hover:not(:disabled) {
          background: #35a8a1;
          box-shadow: 0 4px 20px rgba(64,190,182,0.3);
          transform: translateY(-1px);
        }
        .btn:active:not(:disabled) { transform: scale(0.98); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spin {
          width: 17px; height: 17px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: rot 0.7s linear infinite;
        }
        @keyframes rot { to { transform: rotate(360deg); } }
      `}</style>

      <div className={`page ${mounted ? (isDark ? 'dark' : 'light') : 'light'}`}>
        <div className="card">

          {/* ── Header ── */}
          <div className="card-header">
            <div className="brand">
              <span className="brand-emoji">📊</span>
              Merchant Portal
            </div>

            {mounted && (
              <div className="toggle-wrap">
                <span className="toggle-lbl">{isDark ? 'Dark' : 'Light'}</span>
                <button
                  className="toggle-btn"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  aria-label="Toggle dark mode"
                >
                  <div className="toggle-knob">{isDark ? '☀️' : '🌙'}</div>
                </button>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div className="card-body">
            <h1 className="heading">Welcome back</h1>
            <p className="sub">Sign in to your account</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="lbl" htmlFor="email">Email</label>
                <div className="iw">
                  <span className="ii">✉️</span>
                  <input
                    id="email" type="email" className="inp"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required autoFocus autoComplete="email"
                  />
                </div>
              </div>

              <div className="field">
                <label className="lbl" htmlFor="password">Password</label>
                <div className="iw">
                  <span className="ii">🔒</span>
                  <input
                    id="password" type="password" className="inp"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="err">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn" disabled={loading}>
                {loading
                  ? <><div className="spin" /><span>กำลังเข้าสู่ระบบ...</span></>
                  : 'เข้าสู่ระบบ'
                }
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  )
}