import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranscripts } from '../hooks/useTranscripts'
import TranscriptList from '../components/Transcript/TranscriptList'
import TranscriptViewer from '../components/Transcript/TranscriptViewer'
import TranscriptUploadModal from '../components/Transcript/TranscriptUploadModal'
import TranscriptRecordModal from '../components/Transcript/TranscriptRecordModal'
import type { Transcript } from '../types'

export default function TranscriptPage() {
  const { transcripts, loading, createTranscript, updateTranscript, deleteTranscript } = useTranscripts()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const newMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false)
      }
    }
    if (showNewMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNewMenu])

  const selectedTranscript = useMemo(() => {
    if (!selectedId) return null
    return transcripts.find(t => t.id === selectedId) ?? null
  }, [selectedId, transcripts])

  // If the selected transcript was deleted, clear selection
  useEffect(() => {
    if (selectedId && !transcripts.find(t => t.id === selectedId)) {
      setSelectedId(null)
    }
  }, [selectedId, transcripts])

  const handleCreate = async (data: Partial<Transcript>) => {
    const result = await createTranscript(data as any)
    if (result && 'data' in result && result.data) {
      setSelectedId(result.data.id)
    }
    return result
  }

  const handleUpdate = async (id: string, updates: Partial<Transcript>) => {
    return updateTranscript(id, updates)
  }

  const handleDelete = async (id: string) => {
    await deleteTranscript(id)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left sidebar panel — hidden on mobile when viewing a transcript */}
      <div className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-[280px] shrink-0 border-b md:border-b-0 md:border-r border-gray-200/50 dark:border-white/5 flex-col bg-white/60 dark:bg-white/[0.03]`}>
        {/* Search + New button */}
        <div className="p-3 space-y-2 shrink-0">
          {/* New transcript button */}
          <div className="relative" ref={newMenuRef}>
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Transcript
            </button>

            {showNewMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 glass-panel-solid rounded-lg shadow-xl border border-gray-200/50 dark:border-white/10 overflow-hidden z-10">
                <button
                  onClick={() => { setShowNewMenu(false); setShowUploadModal(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload Audio
                </button>
                <button
                  onClick={() => { setShowNewMenu(false); setShowRecordModal(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  Record
                </button>
              </div>
            )}
          </div>

          {/* Search input */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search transcripts..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>
        </div>

        {/* Transcript list */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full" />
          </div>
        ) : (
          <TranscriptList
            transcripts={transcripts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRename={(id, title) => handleUpdate(id, { title })}
            onDelete={handleDelete}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Right content panel — hidden on mobile when nothing selected */}
      <div className={`${!selectedId ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
        {selectedTranscript && (
          <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-200/50 dark:border-white/5 shrink-0 bg-white/60 dark:bg-white/[0.03]">
            <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{selectedTranscript.title}</span>
          </div>
        )}
        {selectedTranscript ? (
          <TranscriptViewer
            key={selectedTranscript.id}
            transcript={selectedTranscript}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {transcripts.length === 0 ? 'No transcripts yet' : 'Select a transcript'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                {transcripts.length === 0
                  ? 'Upload an audio file or start recording to create your first transcript.'
                  : 'Choose a transcript from the sidebar to view it here.'}
              </p>
              {transcripts.length === 0 && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
                >
                  + New Transcript
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUploadModal && (
        <TranscriptUploadModal
          onClose={() => setShowUploadModal(false)}
          onCreate={handleCreate}
        />
      )}
      {showRecordModal && (
        <TranscriptRecordModal
          onClose={() => setShowRecordModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
