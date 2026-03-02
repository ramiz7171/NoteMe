import { useState, useMemo, useRef, useEffect } from 'react'
import { useMeetings } from '../hooks/useMeetings'
import MeetingDetailModal from '../components/Meetings/MeetingDetailModal'
import NewMeetingModal from '../components/Meetings/NewMeetingModal'
import StatusBadge from '../components/shared/StatusBadge'
import CustomSelect from '../components/shared/CustomSelect'
import type { Meeting } from '../types'

type FilterMode = 'all' | 'upcoming' | 'completed' | 'cancelled'

function MeetingListItem({ meeting, isActive, onClick, onRename, onDelete }: {
  meeting: Meeting; isActive: boolean; onClick: () => void
  onRename: (title: string) => void; onDelete: () => void
}) {
  const date = new Date(meeting.meeting_date)
  const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(meeting.title)
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
    if (trimmed && trimmed !== meeting.title) onRename(trimmed)
    else setEditTitle(meeting.title)
    setEditing(false)
  }

  const startRename = () => {
    setMenuOpen(false)
    setEditTitle(meeting.title)
    setEditing(true)
  }

  return (
    <div
      className={`group relative mx-2 rounded-xl text-sm transition-all duration-150 ${
        isActive
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] dark:text-[#00A1FF]'
          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5'
      }`}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <button onClick={onClick} className="w-full text-left px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 pr-5">
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setEditTitle(meeting.title); setEditing(false) }
              }}
              onClick={e => e.stopPropagation()}
              autoFocus
              className="flex-1 min-w-0 bg-transparent font-medium text-sm focus:outline-none border-b border-[var(--accent)]"
            />
          ) : (
            <span className="font-medium truncate">{meeting.title}</span>
          )}
          <StatusBadge status={meeting.status} />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {formattedDate} at {formattedTime}
        </div>
      </button>

      {/* 3-dot menu button */}
      {!editing && (
        <button
          ref={btnRef}
          onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-opacity"
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

export default function MeetingsPage() {
  const { meetings, loading, upcomingMeetings, completedMeetings, createMeeting, updateMeeting, deleteMeeting } = useMeetings()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  // Filter + search
  const filteredMeetings = useMemo(() => {
    let list: Meeting[]
    switch (filter) {
      case 'upcoming':
        list = upcomingMeetings
        break
      case 'completed':
        list = completedMeetings
        break
      case 'cancelled':
        list = meetings.filter(m => m.status === 'cancelled')
        break
      default:
        list = meetings
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.participants || []).some(p => p.toLowerCase().includes(q)) ||
        (m.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }

    return list
  }, [meetings, upcomingMeetings, completedMeetings, filter, search])

  const selectedMeeting = selectedMeetingId
    ? meetings.find(m => m.id === selectedMeetingId) ?? null
    : null

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left sidebar — full width on mobile */}
      <div className="w-full md:w-[280px] shrink-0 border-b md:border-b-0 md:border-r border-gray-200/50 dark:border-white/5 flex flex-col bg-white/60 dark:bg-white/[0.03]">
        <div className="p-3 space-y-2 shrink-0">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Meeting
          </button>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>

          <CustomSelect
            value={filter}
            onChange={val => setFilter(val as FilterMode)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            size="md"
            className="w-full"
          />
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {search.trim() || filter !== 'all' ? 'No meetings found' : 'No meetings yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredMeetings.map(meeting => (
                <MeetingListItem
                  key={meeting.id}
                  meeting={meeting}
                  isActive={selectedMeetingId === meeting.id}
                  onClick={() => setSelectedMeetingId(meeting.id)}
                  onRename={(title) => updateMeeting(meeting.id, { title })}
                  onDelete={() => { deleteMeeting(meeting.id); if (selectedMeetingId === meeting.id) setSelectedMeetingId(null) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right content — hidden on mobile since detail is shown in a modal */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {meetings.length === 0
                ? 'No meetings yet'
                : selectedMeeting
                ? ''
                : 'Select a meeting'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              {meetings.length === 0
                ? 'Create your first meeting to get started.'
                : 'Choose a meeting from the sidebar to view details.'}
            </p>
            {meetings.length === 0 && (
              <button
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-medium rounded-lg transition-colors"
              >
                + New Meeting
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          key={selectedMeeting.id}
          meeting={selectedMeeting}
          onUpdate={updateMeeting}
          onDelete={deleteMeeting}
          onClose={() => setSelectedMeetingId(null)}
        />
      )}

      {/* New meeting modal */}
      {showNewModal && (
        <NewMeetingModal
          onClose={() => setShowNewModal(false)}
          onCreate={createMeeting}
        />
      )}
    </div>
  )
}
