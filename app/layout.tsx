import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/ThemeToggle'
import { Providers } from '@/lib/providers'
import ReportIssueButton from '@/components/ReportIssueButton'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '700'] })

export const metadata: Metadata = {
  title: 'Merchant Acquirer for Restaurants',
  description: 'Sales Dashboard — Merchant Acquirer for Restaurants',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const isLoginPage = !user

  // shared class สำหรับทุก pill ทางขวา
  const pillBase = `
    flex h-8 items-center justify-center
    rounded-xl
    border border-slate-200 dark:border-white/[0.07]
    bg-slate-50 dark:bg-white/[0.04]
    transition-all duration-200
  `

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.className} min-h-screen bg-slate-100 dark:bg-[#0E0E12] text-slate-900 dark:text-slate-100 antialiased`}>
        <Providers>

          {!isLoginPage && (
            <header className="sticky top-0 z-50 w-full">
              <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/css/flag-icons.min.css" />
              <div className="min-h-14 w-full border-b border-slate-200/80 bg-white/90 shadow-sm shadow-black/[0.03] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#16161b]/90 dark:shadow-black/30">
                <div className="mx-auto flex min-h-14 max-w-screen-xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-0">

                  {/* ── Brand ── */}
                  <Link href="/dashboard" className="group flex shrink-0 items-center gap-2.5 mr-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#40BEB6] text-white shadow-md shadow-[#40BEB6]/30 transition-transform duration-200 group-hover:scale-105">
                      <span className="font-bold text-[11px] tracking-tight leading-none">MAR</span>
                    </div>
                    <div className="hidden sm:flex flex-col leading-none">
                      <span className="text-[13px] font-bold text-slate-800 dark:text-white group-hover:text-[#40BEB6] transition-colors duration-200">
                        Merchant Acquirer
                      </span>
                      <span className="mt-[3px] text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#40BEB6]/60">
                        for Restaurants
                      </span>
                    </div>
                  </Link>

                  {/* Divider */}
                  <div className="hidden h-5 w-px shrink-0 bg-slate-200 dark:bg-white/10 md:block" />

                  {/* ── Nav links ── */}
                  <nav className="hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
                    <NavLink href="/dashboard">Dashboard</NavLink>
                    <NavLink href="/notes">Note History</NavLink>
                    <NavLink href="/notes/all">Note History All</NavLink>
                    <NavLink href="/report">Report</NavLink>

                    {user?.role === 'admin' && (
                      <>
                        <div className="mx-2 h-4 w-px bg-slate-200 dark:bg-white/10 shrink-0" />
                        <span className="mr-1 px-1 text-[9px] font-bold uppercase tracking-[1.5px] text-slate-400 dark:text-white/25 shrink-0">
                          Admin
                        </span>

                        <NavLink href="/admin/requests">Requests</NavLink>
                        <NavLink href="/admin/contact-history">Contact History</NavLink>
                      </>
                    )}
                  </nav>

                  {/* ── Right side — ทุก pill สูง h-8 เท่ากัน ── */}
                  <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {/* Report Issue pill */}
                    <ReportIssueButton />

                    {user?.role === 'admin' && (
                      <Link
                        href="/admin/users"
                        className={`${pillBase} w-8 text-slate-400 dark:text-white/40 hover:text-[#40BEB6] hover:bg-[#40BEB6]/8 hover:border-[#40BEB6]/30`}
                        title="Manage Users"
                      >
                        <span className="text-[13px]">👥</span>
                      </Link>
                    )}

                    {/* Theme toggle pill — w-8 square */}
                    <div className={`${pillBase} w-8 text-slate-400 dark:text-white/40 hover:text-[#40BEB6] hover:bg-[#40BEB6]/8 hover:border-[#40BEB6]/30 cursor-pointer`}>
                      <ThemeToggle />
                    </div>

                    {/* User pill */}
                    <Link
                      href="/profile"
                      className={`${pillBase} gap-2 px-2.5 shrink-0 group hover:border-[#40BEB6]/40 hover:bg-[#40BEB6]/5`}
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#40BEB6] text-white text-[9px] font-bold">
                        {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
                      </div>
                      <div className="hidden sm:flex flex-col leading-none">
                        <span className="text-[11.5px] font-semibold text-slate-700 dark:text-white/80 group-hover:text-[#40BEB6] transition-colors">
                          {user?.name}
                        </span>
                        <span className="mt-[2px] text-[8.5px] font-bold uppercase tracking-[0.8px] text-[#40BEB6]/70 group-hover:hidden">
                          {user?.role}
                        </span>
                        <span className="mt-[2px] text-[8.5px] font-bold uppercase tracking-[0.8px] text-[#40BEB6] hidden group-hover:block">
                          Edit profile
                        </span>
                      </div>
                    </Link>

                    {/* Logout pill */}
                    <div className={`${pillBase} px-2.5 text-slate-500 dark:text-white/40 text-[12px] font-medium shrink-0 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/20 overflow-hidden sm:px-3`}>
                      <LogoutButton />
                    </div>

                  </div>
                </div>
              </div>

              {/* Teal accent line */}
              <div className="h-[1.5px] w-full bg-gradient-to-r from-[#40BEB6]/60 via-[#40BEB6]/15 to-transparent" />
            </header>
          )}

          <main className={`mx-auto max-w-screen-xl px-3 sm:px-6 ${isLoginPage ? 'py-0' : 'pb-24 pt-4 md:py-6'}`}>
            {children}
          </main>

          {!isLoginPage && (
            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#16161b]/95 md:hidden">
              <div className="mx-auto flex max-w-md items-center gap-1">
                <MobileNavLink href="/dashboard" icon="▦" label="Dashboard" />
                <MobileNavLink href="/notes" icon="✎" label="Notes" />
                <MobileNavLink href="/notes/all" icon="☷" label="All Notes" />
                <MobileNavLink href="/report" icon="◴" label="Report" />
                {user?.role === 'admin' && (
                  <>
                    <MobileNavLink href="/admin/requests" icon="!" label="Requests" />


                    <MobileNavLink href="/admin/contact-history" icon="🕐" label="History" />
                  </>
                )}
              </div>
            </nav>
          )}

        </Providers>
      </body>
    </html>
  )
}

function MobileNavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="
        flex min-w-0 flex-1 flex-col items-center justify-center gap-1
        rounded-2xl px-1.5 py-2
        text-[10px] font-bold leading-none text-slate-500
        transition-colors
        hover:bg-slate-100 hover:text-slate-900
        active:bg-[#40BEB6]/10 active:text-[#40BEB6]
        dark:text-white/45 dark:hover:bg-white/[0.06] dark:hover:text-white
      "
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-slate-100 text-[13px] text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
        {icon}
      </span>
      <span className="w-full truncate text-center">{label}</span>
    </Link>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="
  shrink-0 rounded-full px-3 py-1.5
  text-[12px] font-semibold
text-slate-700 dark:text-white/45
  border border-transparent
  transition-all duration-200
  hover:text-slate-900 dark:hover:text-white
  hover:bg-slate-100 dark:hover:bg-white/[0.06]
  hover:border-slate-200/80 dark:hover:border-white/[0.08]
"
    >
      {children}
    </Link>
  )
}
