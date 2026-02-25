import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  size?: 'sm' | 'md'
}

export default function CustomSelect({
  value,
  options,
  onChange,
  className = '',
  placeholder,
  size = 'sm',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const handleScroll = () => setOpen(false)
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = options.length * 32 + 12
      const top = spaceBelow > menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4
      setMenuPos({ top, left: rect.left, width: Math.max(rect.width, 140) })
    }
    setOpen(!open)
  }

  const padY = size === 'sm' ? 'py-1' : 'py-2'
  const padX = size === 'sm' ? 'px-2.5' : 'px-3'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center justify-between gap-1.5 ${padX} ${padY} ${textSize} font-medium rounded-xl bg-gray-100/80 dark:bg-white/10 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-200/80 dark:hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 cursor-pointer transition-all ${className}`}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? 'Select...'}</span>
        <svg className={`w-3 h-3 shrink-0 opacity-50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          className="fixed z-[9999] glass-panel-solid rounded-xl shadow-2xl border border-gray-200/50 dark:border-white/10 py-1.5 animate-[scaleIn_0.1s_ease-out] overflow-hidden"
          style={{ top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 ${textSize} transition-colors ${
                opt.value === value
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10'
              }`}
            >
              {opt.value === value && (
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {opt.value !== value && <span className="w-3" />}
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
