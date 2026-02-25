import { useState } from 'react'
import { createPortal } from 'react-dom'
import TagInput from '../shared/TagInput'
import type { AgendaItem } from '../../types'

interface NewMeetingModalProps {
  onClose: () => void
  onCreate: (data: {
    title: string
    meeting_date?: string
    participants?: string[]
    tags?: string[]
    agenda?: AgendaItem[]
  }) => Promise<{ data?: unknown; error?: unknown } | null>
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function NewMeetingModal({ onClose, onCreate }: NewMeetingModalProps) {
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(toLocalDatetimeString(new Date()))
  const [participants, setParticipants] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [agendaItems, setAgendaItems] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)

  const animateClose = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 200)
  }

  const handleAddAgendaItem = () => {
    setAgendaItems(prev => [...prev, ''])
  }

  const handleUpdateAgendaItem = (index: number, value: string) => {
    setAgendaItems(prev => prev.map((item, i) => (i === index ? value : item)))
  }

  const handleRemoveAgendaItem = (index: number) => {
    setAgendaItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')

    const agenda: AgendaItem[] = agendaItems
      .filter(item => item.trim())
      .map(text => ({ text: text.trim(), completed: false }))

    const result = await onCreate({
      title: title.trim(),
      meeting_date: new Date(meetingDate).toISOString(),
      participants,
      tags,
      agenda,
    })

    if (result && 'error' in result && result.error) {
      setError('Failed to create meeting. Please try again.')
      setSaving(false)
    } else {
      animateClose()
    }
  }

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) animateClose() }}
      className={`fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'animate-[fadeIn_0.15s_ease-out]'
      }`}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg glass-panel-solid rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/5 transition-all duration-200 ${
          closing ? 'opacity-0 scale-95' : 'animate-[scaleIn_0.15s_ease-out]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-white/5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Meeting</h2>
          <button
            onClick={animateClose}
            className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Meeting title"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>

          {/* Date/time */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Participants</label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
              <TagInput tags={participants} onChange={setParticipants} placeholder="Add participant..." />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tags</label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
              <TagInput tags={tags} onChange={setTags} placeholder="Add tag..." />
            </div>
          </div>

          {/* Agenda items */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Agenda Items</label>
            <div className="space-y-2">
              {agendaItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-600 w-5 text-right shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={e => handleUpdateAgendaItem(idx, e.target.value)}
                    placeholder="Agenda item..."
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                  {agendaItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAgendaItem(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddAgendaItem}
                className="text-xs text-[var(--accent)] hover:underline font-medium"
              >
                + Add item
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={animateClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
