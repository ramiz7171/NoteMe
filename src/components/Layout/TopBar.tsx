import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useSecurity } from '../../context/SecurityContext'
import Logo from '../Logo'

interface TopBarProps {
  onToggleMobileSidebar?: () => void
  showMobileMenuBtn?: boolean
}

export default function TopBar({ onToggleMobileSidebar, showMobileMenuBtn }: TopBarProps) {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lockApp } = useSecurity()
  const [showMenu, setShowMenu] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const menuPos = btnRef.current?.getBoundingClientRect()

  return (
    <header className="h-12 md:h-14 glass-panel-solid flex items-center justify-between px-3 md:px-6 shrink-0 border-b border-gray-200/50 dark:border-white/5">
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        {showMobileMenuBtn && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <Logo className="h-8" />
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Lock Now button */}
        <button
          onClick={lockApp}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
          title="Lock app"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        {/* Username with dropdown */}
        <button
          ref={btnRef}
          onClick={() => setShowMenu(v => !v)}
          className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 rounded-xl transition-colors"
        >
          <span className="hidden sm:inline">{profile?.username}</span>
          <span className="sm:hidden w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-xs font-bold">
            {profile?.username?.charAt(0)?.toUpperCase() ?? '?'}
          </span>
          <svg className={`w-3.5 h-3.5 transition-transform hidden sm:block ${showMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && menuPos && createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 glass-panel rounded-xl shadow-xl py-1 min-w-[140px] animate-[scaleIn_0.1s_ease-out]"
            style={{
              top: menuPos.bottom + 6,
              right: window.innerWidth - menuPos.right,
            }}
          >
            <button
              onClick={() => { signOut(); setShowMenu(false) }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log out
            </button>
          </div>,
          document.body
        )}
      </div>
    </header>
  )
}
