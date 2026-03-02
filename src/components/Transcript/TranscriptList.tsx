import { useState, useRef, useEffect } from 'react'
import StatusBadge from '../shared/StatusBadge'
import type { Transcript } from '../../types'

interface TranscriptListProps {
  transcripts: Transcript[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  searchQuery: string
}

function relativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TranscriptItem({ transcript, isSelected, onSelect, onRename, onDelete }: {
  transcript: Transcript
  isSelected: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(transcript.title)
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== transcript.title) onRename(trimmed)
    else setEditTitle(transcript.title)
    setEditing(false)
  }

  const startRename = () => {
    setMenuOpen(false)
    setEditTitle(transcript.title)
    setEditing(true)
  }

  return (
    <div
      className={`group relative transition-colors ${
        isSelected
          ? 'bg-[var(--accent)]/10 border-l-2 border-l-[var(--accent)]'
          : 'hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
    >
      <button
        onClick={onSelect}
        className="w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-white/5"
      >
        <div className="flex items-start justify-between gap-2 pr-6">
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setEditTitle(transcript.title); setEditing(false) }
              }}
              onClick={e => e.stopPropagation()}
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none border-b border-[var(--accent)]"
            />
          ) : (
            <h4 className={`text-sm font-medium truncate ${
              isSelected
                ? 'text-[var(--accent)]'
                : 'text-gray-800 dark:text-gray-200'
            }`}>
              {transcript.title || 'Untitled'}
            </h4>
          )}
          <StatusBadge status={transcript.status} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
            {relativeDate(transcript.created_at)}
          </span>
          {(transcript.tags || []).length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {(transcript.tags || []).slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="inline-block px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)] truncate max-w-[60px]"
                >
                  {tag}
                </span>
              ))}
              {(transcript.tags || []).length > 2 && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500">
                  +{(transcript.tags || []).length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* 3-dot menu button */}
      {!editing && (
        <button
          ref={btnRef}
          onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="absolute right-1.5 top-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 w-44 glass-panel rounded-xl shadow-xl py-1 animate-[scaleIn_0.1s_ease-out]"
        >
          <button
            onClick={startRename}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>

          <div className="border-t border-gray-100 dark:border-white/10 my-1" />

          <button
            onClick={() => { setMenuOpen(false); onDelete() }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function TranscriptList({ transcripts, selectedId, onSelect, onRename, onDelete, searchQuery }: TranscriptListProps) {
  const filtered = searchQuery.trim()
    ? transcripts.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : transcripts

  if (filtered.length === 0) {
    if (!searchQuery.trim()) return <div className="flex-1" />
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          No transcripts match your search
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map(t => (
        <TranscriptItem
          key={t.id}
          transcript={t}
          isSelected={t.id === selectedId}
          onSelect={() => onSelect(t.id)}
          onRename={(title) => onRename(t.id, title)}
          onDelete={() => onDelete(t.id)}
        />
      ))}
    </div>
  )
}
