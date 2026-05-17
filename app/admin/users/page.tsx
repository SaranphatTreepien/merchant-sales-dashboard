'use client'
import { useEffect, useState } from 'react'

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

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ modal, onClose, onSuccess }: {
  modal: Modal
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'sale'>('sale')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (modal?.type === 'edit') {
      setName(modal.user.name)
      setRole(modal.user.role)
    }
    setError('')
    setPassword('')
    setNewPassword('')
  }, [modal])

  if (!modal) return null

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    let res: Response

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
      // delete
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
  }

  const title = modal.type === 'create' ? '➕ สร้าง User ใหม่'
    : modal.type === 'edit' ? '✏️ แก้ไข User'
    : modal.type === 'reset_password' ? '🔒 Reset Password'
    : '🗑️ ลบ User'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>

        {/* Create */}
        {modal.type === 'create' && (
          <div className="flex flex-col gap-3">
            <input className="border border-gray-300 rounded px-3 py-2 text-sm" placeholder="ชื่อ" value={name} onChange={e => setName(e.target.value)} />
            <input className="border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <select className="border border-gray-300 rounded px-3 py-2 text-sm" value={role} onChange={e => setRole(e.target.value as 'admin' | 'sale')}>
              <option value="sale">Sale</option>
              <option value="admin">Admin</option>
            </select>
            <input className="border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Password (อย่างน้อย 6 ตัว)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        )}

        {/* Edit */}
        {modal.type === 'edit' && (
          <div className="flex flex-col gap-3">
            <input className="border border-gray-300 rounded px-3 py-2 text-sm" placeholder="ชื่อ" value={name} onChange={e => setName(e.target.value)} />
            <select className="border border-gray-300 rounded px-3 py-2 text-sm" value={role} onChange={e => setRole(e.target.value as 'admin' | 'sale')}>
              <option value="sale">Sale</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}

        {/* Reset Password */}
        {modal.type === 'reset_password' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">Reset password ของ <span className="font-medium text-gray-700">{modal.user.name}</span></p>
            <input className="border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Password ใหม่ (อย่างน้อย 6 ตัว)" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
        )}

        {/* Delete */}
        {modal.type === 'delete' && (
          <p className="text-sm text-gray-600">
            ยืนยันลบ <span className="font-semibold text-red-600">{modal.user.name}</span> ({modal.user.email}) ออกจากระบบ?
            <br />
            <span className="text-xs text-gray-400 mt-1 block">การกระทำนี้ไม่สามารถยกเลิกได้</span>
          </p>
        )}

        {error && <p className="text-xs text-red-500 mt-2">❌ {error}</p>}

        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40">
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-40 transition-colors ${
              modal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'กำลังดำเนินการ...' : modal.type === 'delete' ? 'ยืนยันลบ' : 'บันทึก'}
          </button>
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

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const json = await res.json()
    setUsers(json.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <Modal
        modal={modal}
        onClose={() => setModal(null)}
        onSuccess={() => {
          fetchUsers()
          const msg = modal?.type === 'create' ? '✅ สร้าง user แล้ว'
            : modal?.type === 'edit' ? '✅ แก้ไขแล้ว'
            : modal?.type === 'reset_password' ? '✅ Reset password แล้ว'
            : '✅ ลบ user แล้ว'
          showToast(msg)
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">👥 Admin — จัดการ Users</h1>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          ➕ สร้าง User
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">กำลังโหลด...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-4 py-3 text-gray-600 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 text-gray-600 font-semibold">Email</th>
                <th className="px-4 py-3 text-gray-600 font-semibold">Role</th>
                <th className="px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">สร้างเมื่อ</th>
                <th className="px-4 py-3 text-gray-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">ไม่มี user</td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Sale'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModal({ type: 'edit', user: u })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => setModal({ type: 'reset_password', user: u })}
                        className="text-xs text-amber-600 hover:underline"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', user: u })}
                        className="text-xs text-red-500 hover:underline"
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
      )}
    </div>
  )
}