'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
    >
      ออกจากระบบ
    </button>
  )
}