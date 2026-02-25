import { useState, useMemo } from 'react'
import { useMeetings } from '../hooks/useMeetings'
import MeetingDetailModal from '../components/Meetings/MeetingDetailModal'
import NewMeetingModal from '../components/Meetings/NewMeetingModal'
import StatusBadge from '../components/shared/StatusBadge'
import type { Meeting } from '../types'

type FilterMode = 'all' | 'upcoming' | 'completed' | 'cancelled'

function MeetingListItem({ meeting, isActive, onClick }: { meeting: Meeting; isActive: boolean; onClick: () => void }) {
  const date = new Date(meeting.meeting_date)
  const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 mx-2 rounded-xl text-sm transition-all duration-150 ${
        isActive
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] dark:text-[#00A1FF]'
          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5'
      }`}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate">{meeting.title}</span>
        <StatusBadge status={meeting.status} />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {formattedDate} at {formattedTime}
      </div>
    </button>
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
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Left sidebar */}
      <div className="w-[280px] shrink-0 border-r border-gray-200/50 dark:border-white/5 flex flex-col bg-white/60 dark:bg-white/[0.03]">
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

          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterMode)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
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
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
