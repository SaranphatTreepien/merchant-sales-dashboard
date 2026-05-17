import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import LogoutButton from '@/components/LogoutButton'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sales Dashboard',
  description: 'Merchant Sales Dashboard',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 text-gray-900 min-h-screen`}>

        {/* แสดง header เฉพาะตอน login แล้ว */}
        {user && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">

              {/* Logo */}
              <Link href="/dashboard" className="font-bold text-blue-600 text-lg hover:text-blue-700 transition-colors">
                📊 Sales
              </Link>

              {/* Nav */}
              <nav className="flex gap-1">
                <Link href="/dashboard"
                  className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                  Dashboard
                </Link>

                {/* Note History — sale เห็นของตัวเอง, admin เห็นทั้งคู่ */}
                <Link href="/notes"
                  className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                  Note History
                </Link>
                <Link href="/notes/all"
                  className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                  Note History All
                </Link>

                <Link href="/report"
                  className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                  Report
                </Link>

                {/* Requests — admin เท่านั้น */}
                {user.role === 'admin' && (
                  <>
                    <Link href="/admin/requests"
                      className="px-4 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                      Requests
                    </Link>
                    <Link href="/admin/users"
                      className="px-4 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                      Users
                    </Link>
                  </>
                )}
              </nav>

              {/* User info + Logout */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <a href="/profile" className="text-sm text-gray-600 hover:text-blue-600 hover:underline transition-colors">
                    {user.name}
                  </a>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === 'admin'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                    }`}>
                    {user.role === 'admin' ? 'Admin' : 'Sale'}
                  </span>
                </div>
                <LogoutButton />
              </div>

            </div>
          </header>
        )}

        <main className="max-w-screen-xl mx-auto px-6 py-6">
          {children}
        </main>

      </body>
    </html>
  )
}