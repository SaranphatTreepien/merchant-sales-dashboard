'use client'

import { useSyncExternalStore } from 'react'

const themeEvent = 'sales-dashboard-theme-change'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
}

function getSnapshot() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

const subscribe = (onStoreChange: () => void) => {
  const syncTheme = () => {
    applyTheme(getStoredTheme())
    onStoreChange()
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === 'theme') syncTheme()
  }

  queueMicrotask(syncTheme)
  window.addEventListener(themeEvent, onStoreChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(themeEvent, onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false)

  const toggleTheme = () => {
    const nextTheme: Theme = isDark ? 'light' : 'dark'
    window.localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)
    window.dispatchEvent(new Event(themeEvent))
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="h-full w-full flex items-center justify-center bg-transparent border-none outline-none cursor-pointer text-slate-400 dark:text-white/40 hover:text-[#40BEB6] transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {isDark ? '☀︎' : '◐'}
      </span>
    </button>
  )
}