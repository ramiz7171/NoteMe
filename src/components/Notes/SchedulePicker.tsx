import { useState, useRef, useEffect } from 'react'
import { openGoogleCalendar, openOutlookCalendar, downloadICS } from '../../lib/calendar'

interface SchedulePickerProps {
  value: string | null
  noteTitle: string
  noteContent: string
  noteId?: string
  onChange: (scheduledAt: string | null) => void
}

export default function SchedulePicker({ value, noteTitle, noteContent, noteId, onChange }: SchedulePickerProps) {
  const [open, setOpen] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Sync local input when value changes
  useEffect(() => {
    if (value) {
      // Convert ISO to datetime-local format
      const d = new Date(value)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setDateValue(local)
    } else {
      setDateValue('')
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSet = () => {
    if (dateValue) {
      onChange(new Date(dateValue).toISOString())
    }
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setDateValue('')
    setOpen(false)
  }

  const calendarOpts = () => ({
    title: noteTitle || 'CriptNote Reminder',
    description: noteContent,
    startDate: new Date(value!),
    uid: noteId ? `${noteId}@criptnote.app` : undefined,
  })

  const handleGoogle = () => { if (value) openGoogleCalendar(calendarOpts()) }
  const handleOutlook = () => { if (value) openOutlookCalendar(calendarOpts()) }
  const handleICS = () => { if (value) downloadICS(calendarOpts()) }

  const formatDisplay = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (diffDays === 0) return `Today ${time}`
    if (diffDays === 1) return `Tomorrow ${time}`
    if (diffDays > 1 && diffDays < 7) return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          value
            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        title="Schedule & Calendar Sync"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        {value ? formatDisplay(value) : 'Schedule'}
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-3 min-w-[240px] animate-[scaleIn_0.15s_ease-out]">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule Date & Time</p>

          <input
            type="datetime-local"
            value={dateValue}
            onChange={e => setDateValue(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-2"
          />

          <div className="flex gap-1.5 mb-2">
            <button
              onClick={handleSet}
              disabled={!dateValue}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Set
            </button>
            {value && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {value && (
            <div className="border-t border-gray-200 dark:border-white/10 pt-2 mt-1 space-y-1">
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 px-1 mb-1">Sync to Calendar</p>
              <button
                onClick={handleGoogle}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8.25h15v11.25z"/>
                </svg>
                Google Calendar
              </button>
              <button
                onClick={handleOutlook}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.5 3h-7l-5 5v11.5c0 .828.672 1.5 1.5 1.5h10.5c.828 0 1.5-.672 1.5-1.5v-15c0-.828-.672-1.5-1.5-1.5zM17 15.5h-4v-1.5h4v1.5zm0-3h-4V11h4v1.5zM8 8l5-5H3.5C2.672 3 2 3.672 2 4.5v15c0 .828.672 1.5 1.5 1.5H8V8z"/>
                </svg>
                Outlook Calendar
              </button>
              <button
                onClick={handleICS}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download .ics file
              </button>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                .ics works with Apple, Windows &amp; other calendars
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
