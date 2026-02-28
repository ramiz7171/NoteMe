import { useState, useEffect } from 'react'

interface ExpirationBadgeProps {
  expiresAt: string
}

function formatRemaining(expiresAt: string): { text: string; color: string } {
  const diff = new Date(expiresAt).getTime() - Date.now()

  if (diff <= 0) {
    return { text: 'Expired', color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
  }

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  let text: string
  if (days >= 1) text = `${days}d`
  else if (hours >= 1) text = `${hours}h ${minutes % 60}m`
  else text = `${minutes}m`

  let color: string
  if (diff > 86400000) {
    color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  } else if (diff > 3600000) {
    color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  } else {
    color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  return { text, color }
}

export default function ExpirationBadge({ expiresAt }: ExpirationBadgeProps) {
  const [display, setDisplay] = useState(() => formatRemaining(expiresAt))

  useEffect(() => {
    setDisplay(formatRemaining(expiresAt))
    const interval = setInterval(() => {
      setDisplay(formatRemaining(expiresAt))
    }, 60000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${display.color}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {display.text}
    </span>
  )
}
