import { useState } from 'react'
import TopBar from '../components/Layout/TopBar'
import Sidebar from '../components/Sidebar/Sidebar'
import NoteEditor from '../components/Editor/NoteEditor'
import NewNoteModal from '../components/Notes/NewNoteModal'
import { useNotes } from '../hooks/useNotes'
import type { Note } from '../types'

export default function Dashboard() {
  const { basicNotes, codeNotes, loading, createNote, updateNote, deleteNote } = useNotes()
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showNewNote, setShowNewNote] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note)
  }

  const handleDeleteNote = async (id: string) => {
    const result = await deleteNote(id)
    if (!result?.error && selectedNote?.id === id) {
      setSelectedNote(null)
    }
    return result
  }

  // Keep selected note in sync with realtime updates
  const allNotes = [...basicNotes, ...Object.values(codeNotes).flat()]
  const currentNote = selectedNote ? allNotes.find(n => n.id === selectedNote.id) || selectedNote : null

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          basicNotes={basicNotes}
          codeNotes={codeNotes}
          selectedNoteId={currentNote?.id ?? null}
          onSelectNote={handleSelectNote}
          onNewNote={() => setShowNewNote(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : currentNote ? (
            <NoteEditor
              note={currentNote}
              onUpdate={updateNote}
              onDelete={handleDeleteNote}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">Select a note or create a new one</p>
                <button
                  onClick={() => setShowNewNote(true)}
                  className="mt-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  + New Note
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {showNewNote && (
        <NewNoteModal
          onClose={() => setShowNewNote(false)}
          onCreate={createNote}
        />
      )}
    </div>
  )
}
