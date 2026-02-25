import StatusBadge from '../shared/StatusBadge'
import type { Transcript } from '../../types'

interface TranscriptListProps {
  transcripts: Transcript[]
  selectedId: string | null
  onSelect: (id: string) => void
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

export default function TranscriptList({ transcripts, selectedId, onSelect, searchQuery }: TranscriptListProps) {
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
      {filtered.map(t => {
        const isSelected = t.id === selectedId
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-white/5 transition-colors ${
              isSelected
                ? 'bg-[var(--accent)]/10 border-l-2 border-l-[var(--accent)]'
                : 'hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className={`text-sm font-medium truncate ${
                isSelected
                  ? 'text-[var(--accent)]'
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {t.title || 'Untitled'}
              </h4>
              <StatusBadge status={t.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                {relativeDate(t.created_at)}
              </span>
              {(t.tags || []).length > 0 && (
                <div className="flex items-center gap-1 overflow-hidden">
                  {(t.tags || []).slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className="inline-block px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)] truncate max-w-[60px]"
                    >
                      {tag}
                    </span>
                  ))}
                  {(t.tags || []).length > 2 && (
                    <span className="text-[9px] text-gray-400 dark:text-gray-500">
                      +{(t.tags || []).length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
