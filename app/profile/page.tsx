'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)

  // form state
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // feedback
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        setUser(j.user)
        setName(j.user?.name || '')
      })
  }, [])

  const handleSaveName = async () => {
    if (!name.trim()) return
    setSaving(true)
    setNameMsg(null)
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) {
      setNameMsg({ ok: true, text: 'บันทึกชื่อเรียบร้อย' })
      setUser(json.user)
    } else {
      setNameMsg({ ok: false, text: json.error || 'เกิดข้อผิดพลาด' })
    }
  }

  const handleSavePassword = async () => {
    setPassMsg(null)
    if (!currentPassword || !newPassword) {
      setPassMsg({ ok: false, text: 'กรุณากรอกข้อมูลให้ครบ' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ ok: false, text: 'password ใหม่ไม่ตรงกัน' })
      return
    }
    if (newPassword.length < 6) {
      setPassMsg({ ok: false, text: 'password ใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) {
      setPassMsg({ ok: true, text: 'เปลี่ยน password เรียบร้อย' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPassMsg({ ok: false, text: json.error || 'เกิดข้อผิดพลาด' })
    }
  }

  if (!user) return <div className="text-gray-400 py-10 text-center">Loading...</div>

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">👤 โปรไฟล์</h1>
      </div>

      {/* Info */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 text-sm text-gray-500 flex gap-4">
        <span>📧 {user.email}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {user.role === 'admin' ? 'Admin' : 'Sale'}
        </span>
      </div>

      {/* แก้ชื่อ */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">✏️ แก้ไขชื่อ</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ชื่อ"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || !name.trim() || name === user.name}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            บันทึก
          </button>
        </div>
        {nameMsg && (
          <p className={`text-xs mt-2 ${nameMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
            {nameMsg.ok ? '✅' : '❌'} {nameMsg.text}
          </p>
        )}
      </div>

      {/* เปลี่ยน password */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🔒 เปลี่ยน Password</h2>
        <div className="flex flex-col gap-2">
          <input
            type="password"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Password ปัจจุบัน"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Password ใหม่"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="ยืนยัน Password ใหม่"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          <button
            onClick={handleSavePassword}
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            เปลี่ยน Password
          </button>
        </div>
        {passMsg && (
          <p className={`text-xs mt-2 ${passMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
            {passMsg.ok ? '✅' : '❌'} {passMsg.text}
          </p>
        )}
      </div>
    </div>
  )
}