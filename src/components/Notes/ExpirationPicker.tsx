import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

type ExpiryOption = 'never' | '1h' | '24h' | '7d' | '30d'

interface ExpirationPickerProps {
  value: string | null
  onChange: (expiresAt: string | null) => void
}

const OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

function computeExpiresAt(option: ExpiryOption): string | null {
  if (option === 'never') return null
  const now = Date.now()
  const ms: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  return new Date(now + ms[option]).toISOString()
}

function currentOption(value: string | null): ExpiryOption {
  if (!value) return 'never'
  const diff = new Date(value).getTime() - Date.now()
  if (diff <= 0) return 'never'
  if (diff <= 2 * 60 * 60 * 1000) return '1h'
  if (diff <= 36 * 60 * 60 * 1000) return '24h'
  if (diff <= 10 * 24 * 60 * 60 * 1000) return '7d'
  return '30d'
}

export default function ExpirationPicker({ value, onChange }: ExpirationPickerProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleToggle = () => {
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect()
      if (r) setMenuPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(prev => !prev)
  }

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // Use setTimeout to avoid closing from the same click that opened
    const timer = setTimeout(() => {
      document.addEventListener('click', close)
      document.addEventListener('keydown', esc)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const selected = currentOption(value)

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
          value
            ? 'border-amber-300/50 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-400'
            : 'border-gray-200/50 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
        title="Set note expiration"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {value ? 'Expires' : 'Expiry'}
      </button>

      {open && menuPos && createPortal(
        <div
          style={{ top: menuPos.top, left: menuPos.left }}
          className="fixed z-[9999] w-40 py-1 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-white/10 rounded-xl shadow-lg animate-[scaleIn_0.1s_ease-out]"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {OPTIONS.map(opt => (
            <button
              type="button"
              key={opt.value}
              onClick={() => {
                onChange(computeExpiresAt(opt.value))
                setOpen(false)
              }}
              className={`w-full px-3 py-2.5 text-xs text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                selected === opt.value ? 'text-[var(--accent)] font-medium' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {opt.label}
              {selected === opt.value && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
