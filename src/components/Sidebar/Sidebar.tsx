import { useState } from 'react'
import type { Note, NoteType } from '../../types'

interface Props {
  basicNotes: Note[]
  codeNotes: Record<string, Note[]>
  selectedNoteId: string | null
  onSelectNote: (note: Note) => void
  onNewNote: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const CODE_LANGUAGES: { key: string; label: string; color: string }[] = [
  { key: 'java', label: 'Java', color: 'text-orange-500' },
  { key: 'javascript', label: 'JavaScript', color: 'text-yellow-500' },
  { key: 'python', label: 'Python', color: 'text-blue-500' },
  { key: 'sql', label: 'SQL', color: 'text-green-500' },
]

function NoteItem({ note, isSelected, onClick }: { note: Note; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className="font-medium truncate">{note.title}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        {new Date(note.updated_at).toLocaleDateString()}
      </div>
    </button>
  )
}

export default function Sidebar({ basicNotes, codeNotes, selectedNoteId, onSelectNote, onNewNote, searchQuery, onSearchChange }: Props) {
  const [expandedLangs, setExpandedLangs] = useState<Set<string>>(new Set(['java', 'javascript', 'python', 'sql']))

  const toggleLang = (lang: string) => {
    setExpandedLangs(prev => {
      const next = new Set(prev)
      if (next.has(lang)) next.delete(lang)
      else next.add(lang)
      return next
    })
  }

  const filterNotes = (notes: Note[]) =>
    searchQuery
      ? notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : notes

  return (
    <aside className="w-72 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col h-full shrink-0">
      {/* Search & New Note */}
      <div className="p-3 space-y-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={onNewNote}
          className="w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          + New Note
        </button>
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Basic Notes Section */}
        <div className="p-3">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Notes
          </h3>
          <div className="space-y-0.5">
            {filterNotes(basicNotes).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2">No notes yet</p>
            ) : (
              filterNotes(basicNotes).map(note => (
                <NoteItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onClick={() => onSelectNote(note)}
                />
              ))
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800 mx-3" />

        {/* Code Notes Section */}
        <div className="p-3">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Code Snippets
          </h3>
          <div className="space-y-1">
            {CODE_LANGUAGES.map(lang => {
              const notes = filterNotes(codeNotes[lang.key] || [])
              const isExpanded = expandedLangs.has(lang.key)

              return (
                <div key={lang.key}>
                  <button
                    onClick={() => toggleLang(lang.key)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${lang.color}`}>{lang.label}</span>
                      <span className="text-xs text-gray-400">({notes.length})</span>
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="ml-2 space-y-0.5">
                      {notes.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-1">No snippets</p>
                      ) : (
                        notes.map(note => (
                          <NoteItem
                            key={note.id}
                            note={note}
                            isSelected={selectedNoteId === note.id}
                            onClick={() => onSelectNote(note)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}
