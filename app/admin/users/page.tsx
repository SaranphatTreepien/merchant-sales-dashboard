'use client'
import type { ReactNode } from 'react'
import { useEffect, useState, useCallback } from 'react'

type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'sale'
  created_at: string
}

type Modal =
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'reset_password'; user: User }
  | { type: 'delete'; user: User }
  | null

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function roleLabel(role: 'admin' | 'sale') {
  return role === 'admin' ? 'Admin' : 'Sale'
}

function roleBadgeClass(role: 'admin' | 'sale') {
  return role === 'admin'
    ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
    : 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
}

function FieldShell({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        {hint && <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ modal, onClose, onSuccess }: {
  modal: Modal
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(modal?.type === 'edit' ? modal.user.name : '')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'sale'>(modal?.type === 'edit' ? modal.user.role : 'sale')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!modal) return null

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    let res: Response

    try {
      if (modal.type === 'create') {
        if (!name || !email || !password) {
          setError('กรุณากรอกข้อมูลให้ครบ')
          setLoading(false)
          return
        }
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, role, password }),
        })
      } else if (modal.type === 'edit') {
        res = await fetch(`/api/admin/users/${modal.user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, role }),
        })
      } else if (modal.type === 'reset_password') {
        if (!newPassword) {
          setError('กรุณากรอก password ใหม่')
          setLoading(false)
          return
        }
        res = await fetch(`/api/admin/users/${modal.user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: newPassword }),
        })
      } else {
        res = await fetch(`/api/admin/users/${modal.user.id}`, { method: 'DELETE' })
      }

      const json = await res.json()
      setLoading(false)

      if (!res.ok) {
        setError(json.error || 'เกิดข้อผิดพลาด')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
      setLoading(false)
    }
  }

  const title = modal.type === 'create' ? 'สร้าง User ใหม่'
    : modal.type === 'edit' ? 'แก้ไขข้อมูล User'
    : modal.type === 'reset_password' ? 'Reset Password'
    : 'ลบชื่อผู้ใช้งาน'
    
  const subtitle = modal.type === 'create' ? 'ตั้งชื่อ, บทบาท และรหัสผ่านเริ่มต้นสำหรับเข้าสู่ระบบ'
    : modal.type === 'edit' ? 'แก้ไขชื่อแสดงผลหรือสิทธิ์ Role ของผู้ใช้นี้'
    : modal.type === 'reset_password' ? 'กำหนดรหัสผ่านชุดใหม่เพื่อความปลอดภัยของบัญชี'
    : 'โปรดตรวจสอบข้อมูลบัญชีอย่างละเอียดก่อนกดยืนยันการลบออกจากระบบ'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transform transition-all animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {modal.type === 'create' && <span className="text-blue-500">➕</span>}
            {modal.type === 'edit' && <span className="text-sky-500">✏️</span>}
            {modal.type === 'reset_password' && <span className="text-amber-500">🔒</span>}
            {modal.type === 'delete' && <span className="text-rose-500">🗑️</span>}
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 leading-normal">{subtitle}</p>
        </div>

        {/* Modal Content Form */}
        <div className="px-6 py-5 space-y-4">

          {/* Create State */}
          {modal.type === 'create' && (
            <div className="space-y-4">
              <FieldShell label="ชื่อผู้ใช้">
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </FieldShell>
              <FieldShell label="Email">
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                  placeholder="name@company.com"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </FieldShell>
              <FieldShell label="Role / สิทธิ์เข้าใช้งาน">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/40 dark:border-slate-800">
                  {(['sale', 'admin'] as const).map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`rounded-lg py-2 text-xs font-semibold tracking-wide transition-all ${
                        role === item
                          ? item === 'admin'
                            ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/10'
                            : 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      {roleLabel(item)}
                    </button>
                  ))}
                </div>
              </FieldShell>
              <FieldShell label="Password" hint="อย่างน้อย 6 ตัวอักษร">
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                  placeholder="ตั้งรหัสผ่านเริ่มต้น"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </FieldShell>
            </div>
          )}

          {/* Edit State */}
          {modal.type === 'edit' && (
            <div className="space-y-4">
              <FieldShell label="ชื่อผู้ใช้">
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                  placeholder="ชื่อ"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </FieldShell>
              <FieldShell label="Role / สิทธิ์เข้าใช้งาน">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/40 dark:border-slate-800">
                  {(['sale', 'admin'] as const).map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                        role === item
                          ? item === 'admin'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      {roleLabel(item)}
                    </button>
                  ))}
                </div>
              </FieldShell>
            </div>
          )}

          {/* Reset Password State */}
          {modal.type === 'reset_password' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/20 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-400 leading-relaxed">
                คุณกำลังทำการเปลี่ยนรหัสผ่านของบัญชีคุณ: <span className="font-bold underline">{modal.user.name}</span>
              </div>
              <FieldShell label="Password ใหม่" hint="อย่างน้อย 6 ตัวอักษร">
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 placeholder-slate-400"
                  placeholder="พิมพ์รหัสผ่านใหม่ที่ต้องการ"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </FieldShell>
            </div>
          )}

          {/* Delete State */}
          {modal.type === 'delete' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-500/5 dark:border-rose-500/20 px-4 py-4 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
              <p>
                ต้องการยืนยันที่จะลบบัญชีผู้ใช้ชื่อ <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{modal.user.name}</span> 
              </p>
              <p className="font-mono text-slate-400 dark:text-slate-500">อีเมลลงทะเบียน: {modal.user.email}</p>
              <div className="pt-2 text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                <span>⚠️</span> การดำเนินการนี้จะถูกลบถาวรและไม่สามารถกู้คืนได้
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="text-xs font-semibold text-rose-500 dark:text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20 flex items-center gap-1">
              <span>❌</span> {error}
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <button 
              onClick={onClose} 
              disabled={loading} 
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition disabled:opacity-40"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-40 active:scale-[0.99] ${
                modal.type === 'delete' 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10' 
                  : modal.type === 'reset_password' 
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10'
              }`}
            >
              {loading ? 'กำลังประมวลผล...' : modal.type === 'delete' ? 'ยืนยันลบข้อมูล' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [toast, setToast] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      setUsers(json.data || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    fetch('/api/admin/users')
      .then(res => res.json())
      .then(json => {
        if (ignore) return
        setUsers(json.data || [])
        setLoading(false)
      })
      .catch(() => {
        if (ignore) return
        setUsers([])
        setLoading(false)
      })

    return () => { ignore = true }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const adminCount = users.filter(u => u.role === 'admin').length
  const saleCount = users.filter(u => u.role === 'sale').length

  return (
    <div className="space-y-6 mx-auto max-w-6xl py-8 px-4 sm:px-6 text-slate-900 dark:text-slate-100 min-h-screen">
      {/* Dynamic Toast Alert */}
      {toast && (
        <div className="fixed left-4 right-4 top-5 z-50 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 text-sm font-semibold shadow-2xl border border-slate-800 dark:border-slate-100 sm:left-auto sm:right-6 sm:w-80 animate-fade-in flex items-center gap-2">
          {toast}
        </div>
      )}

      {/* Modal Renderer Container */}
      <Modal
        key={modal ? `${modal.type}-${modal.type === 'edit' || modal.type === 'reset_password' || modal.type === 'delete' ? modal.user.id : 'create'}` : 'closed'}
        modal={modal}
        onClose={() => setModal(null)}
        onSuccess={() => {
          fetchUsers()
          const msg = modal?.type === 'create' ? 'สร้างบัญชีผู้ใช้ใหม่เรียบร้อยแล้ว'
            : modal?.type === 'edit' ? 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว'
            : modal?.type === 'reset_password' ? 'รีเซ็ตรหัสผ่านสำเร็จแล้ว'
            : 'ลบบัญชีผู้ใช้ออกจากระบบแล้ว'
          showToast(msg)
        }}
      />

      {/* Overview Dashboard Card Header */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 dark:border-slate-800/60 pb-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Admin Panel / Settings</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl tracking-tight">จัดการผู้ใช้งาน</h1>
            <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-400">
              ดูรายชื่อ คอนโทรลสิทธิ์เปลี่ยนบทบาท รีเซ็ตรหัสผ่าน และเปิดบัญชีพนักงานทีมใหม่ทั้งหมดจากศูนย์กลางเดียว
            </p>
          </div>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-5 py-2.5 text-sm font-bold text-white transition-all shadow-sm shadow-blue-600/10 lg:w-auto shrink-0 gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            สร้างบัญชี Userใหม่
          </button>
        </div>

        {/* Counter Stat Boxes */}
        <div className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950 px-4 py-3.5 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">พนักงานในระบบทั้งหมด</div>
            <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-white font-mono">{users.length} <span className="text-xs font-normal text-slate-400">คน</span></div>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950 px-4 py-3.5 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">ระดับผู้ดูแล (Admin)</div>
            <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{adminCount} <span className="text-xs font-normal text-slate-400">คน</span></div>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950 px-4 py-3.5 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">ฝ่ายขาย (Sale)</div>
            <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">{saleCount} <span className="text-xs font-normal text-slate-400">คน</span></div>
          </div>
        </div>
      </section>

      {/* Main Container Lists */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        {/* List Actions Toolbar Subheader */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/20 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Users List</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">กดปุ่มแถวท้ายตารางเพื่อจัดการสถานะข้อมูลบัญชี</p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900/60 transition disabled:opacity-40"
          >
            <svg className={loading ? "animate-spin" : ""} xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            รีเฟรช
          </button>
        </div>

        {/* Contents Wrapper conditionally rendered */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2">
            <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            <p className="text-xs">กำลังเรียกข้อมูลผู้ใช้ในระบบ...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-sm">
            ไม่พบบัญชีผู้ใช้งานที่ลงทะเบียนไว้ในระบบ
          </div>
        ) : (
          <>
            {/* 💻 DESKTOP TABLE VIEW (แสดงในขนาดหน้าจอ md เป็นต้นไป) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white dark:bg-slate-900 text-sm border-collapse table-fixed">
                <thead className="bg-slate-50/40 dark:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left border-r border-slate-100 dark:border-slate-800/50">ชื่อพนักงาน</th>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left border-r border-slate-100 dark:border-slate-800/50">อีเมลใช้งาน</th>
                    <th className="w-[110px] px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left border-r border-slate-100 dark:border-slate-800/50">สิทธิ์เข้าใช้งาน</th>
                    <th className="w-[120px] px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left border-r border-slate-100 dark:border-slate-800/50 whitespace-nowrap">วันที่เข้าร่วม</th>
                    <th className="w-[240px] px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">จัดการคำสั่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                      <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800/50 truncate">{u.name}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/50 truncate font-mono text-xs">{u.email}</td>
                      <td className="px-5 py-3.5 border-r border-slate-100 dark:border-slate-800/50">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold border ${roleBadgeClass(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-mono text-xs border-r border-slate-100 dark:border-slate-800/50 whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex justify-center gap-1.5">
                          <button
                            onClick={() => setModal({ type: 'edit', user: u })}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all shadow-sm"
                          >
                            แก้ไขสิทธิ์
                          </button>
                          <button
                            onClick={() => setModal({ type: 'reset_password', user: u })}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all shadow-sm"
                          >
                            Reset PW
                          </button>
                          <button
                            onClick={() => setModal({ type: 'delete', user: u })}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shadow-sm"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 📱 MOBILE RESPONSIVE CARD VIEW (แสดงผลแบบการ์ดเฉพาะขนาดหน้าจอจอมือถือ) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {users.map(u => (
                <div key={`mob-${u.id}`} className="p-4 bg-white dark:bg-slate-900 space-y-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">{u.name}</p>
                      <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">{u.email}</p>
                    </div>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold border shrink-0 ${roleBadgeClass(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                    <span>ID บัญชี: #{u.id.slice(0, 8)}</span>
                    <span>สมัครเมื่อ: {formatDate(u.created_at)}</span>
                  </div>

                  {/* Mobile Action Buttons Bar */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => setModal({ type: 'edit', user: u })}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 active:bg-blue-50"
                    >
                      แก้ไขสิทธิ์
                    </button>
                    <button
                      onClick={() => setModal({ type: 'reset_password', user: u })}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 active:bg-amber-50"
                    >
                      Reset PW
                    </button>
                    <button
                      onClick={() => setModal({ type: 'delete', user: u })}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 text-center text-xs font-semibold text-rose-600 dark:text-rose-400 active:bg-rose-50"
                    >
                      ลบออก
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}