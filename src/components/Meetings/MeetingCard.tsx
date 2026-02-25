import StatusBadge from '../shared/StatusBadge'
import type { Meeting } from '../../types'

interface MeetingCardProps {
  meeting: Meeting
  onClick: () => void
}

export default function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  const date = new Date(meeting.meeting_date)
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  const agendaArr = meeting.agenda || []
  const participantsArr = meeting.participants || []
  const tagsArr = meeting.tags || []

  const completedAgenda = agendaArr.filter(a => a.completed).length
  const totalAgenda = agendaArr.length

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl p-4 text-left w-full hover:scale-[1.02] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
    >
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1">
          {meeting.title}
        </h3>
        <StatusBadge status={meeting.status} />
      </div>

      {/* Date & time */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {formattedDate} at {formattedTime}
      </p>

      {/* Participants */}
      {participantsArr.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{participantsArr.length} participant{participantsArr.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Agenda progress */}
      {totalAgenda > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>{completedAgenda}/{totalAgenda} items</span>
        </div>
      )}

      {/* Transcript indicator */}
      {meeting.transcript_id && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--accent)]">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>Transcript linked</span>
        </div>
      )}

      {/* Tags */}
      {tagsArr.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tagsArr.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
          {tagsArr.length > 2 && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
              +{tagsArr.length - 2}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
