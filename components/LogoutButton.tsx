'use client'

import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const result = await Swal.fire({
      title: 'ออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#40BEB6',
      reverseButtons: true,
      customClass: {
        popup: '!rounded-2xl !font-sans',
        confirmButton: '!rounded-xl !text-sm !font-semibold !px-5',
        cancelButton: '!rounded-xl !text-sm !font-semibold !px-5',
        title: '!text-base !font-bold',
        htmlContainer: '!text-sm !text-slate-500',
      },
    })

    if (!result.isConfirmed) return

    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="h-full w-full cursor-pointer text-[12px] font-medium text-slate-500 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-transparent border-none outline-none"
    >
      ออกจากระบบ
    </button>
  )
}
