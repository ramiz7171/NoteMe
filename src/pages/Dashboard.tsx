import { useState, useCallback, useMemo, useRef } from 'react'
import TopBar from '../components/Layout/TopBar'
import NavRail, { type NavSection } from '../components/Layout/NavRail'
import TabBar, { type Tab } from '../components/Layout/TabBar'
import Sidebar from '../components/Sidebar/Sidebar'
import NoteEditor from '../components/Editor/NoteEditor'
import GridView from '../components/GridView/GridView'
import NoteModal from '../components/GridView/NoteModal'
import SettingsPage from './SettingsPage'
import TranscriptPage from './TranscriptPage'
import MeetingsPage from './MeetingsPage'
import BoardPage from './BoardPage'
import FilesPage from './FilesPage'
import { useNotes } from '../hooks/useNotes'
import { useFolders } from '../hooks/useFolders'
import { useEncryption } from '../context/EncryptionContext'
import deleteSoundFile from '../assets/note delete.wav'
import type { Note, NoteType } from '../types'

export default function Dashboard() {
  const deleteSoundRef = useRef<HTMLAudioElement | null>(null)
  const editorMainRef = useRef<HTMLElement>(null)
  const { encryptString, decryptString, isEncryptionEnabled, isUnlocked } = useEncryption()
  const encryptOpts = isEncryptionEnabled && isUnlocked
    ? { encrypt: encryptString, decrypt: decryptString }
    : undefined
  const { notes, basicNotes, boardNotes, codeNotes, archivedNotes, deletedNotes, folderNotes, loading, createNote, updateNote, updateNoteColor, updatePositions, deleteNote, permanentDeleteNote, permanentDeleteAll, restoreNote, archiveNote, unarchiveNote, pinNote, moveToFolder, bulkMoveToFolder, bulkDelete, bulkArchive } = useNotes(encryptOpts)
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders()
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupColors, setGroupColors] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [modalNoteId, setModalNoteId] = useState<string | null>(null)
  const [showNewNoteModal, setShowNewNoteModal] = useState(false)
  const [navSection, setNavSection] = useState<NavSection>('notes')
  const [macOpenOrigin, setMacOpenOrigin] = useState<string>('center center')
  const [gridSelectedIds, setGridSelectedIds] = useState<Set<string>>(new Set())


  // Compute noTitleCounter dynamically: find the next available "No title N"
  // Only count active notes (not deleted), so if "No title 1" is in trash, it's available
  const noTitleCounter = useMemo(() => {
    const activeNotes = notes.filter(n => !n.deleted_at)
    const usedNumbers = new Set<number>()
    for (const n of activeNotes) {
      const match = n.title.match(/^No title (\d+)$/)
      if (match) usedNumbers.add(parseInt(match[1], 10))
    }
    let i = 1
    while (usedNumbers.has(i)) i++
    return i
  }, [notes])

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  const groups = useMemo(() => {
    const set = new Set<string>()
    for (const t of tabs) {
      if (t.group) set.add(t.group)
    }
    return [...set]
  }, [tabs])

  const removeNoteFromTabs = useCallback((noteId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.noteId === noteId)
      const next = prev.filter(t => t.noteId !== noteId)
      if (activeTabId && prev.find(t => t.id === activeTabId)?.noteId === noteId) {
        if (next.length > 0) {
          const newIdx = Math.min(Math.max(idx, 0), next.length - 1)
          setActiveTabId(next[newIdx].id)
        } else {
          setActiveTabId(null)
        }
      }
      return next
    })
  }, [activeTabId])

  const openNoteInTab = useCallback((note: Note) => {
    const existing = tabs.find(t => t.noteId === note.id)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }
    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      noteId: note.id,
      title: note.title,
      color: '',
      group: '',
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [tabs])

  const openNewTab = useCallback(() => {
    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      noteId: null,
      title: 'New Note',
      color: '',
      group: '',
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [])

  const openNewTabAnimated = useCallback((e: React.MouseEvent) => {
    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const main = editorMainRef.current
    if (main) {
      const mainRect = main.getBoundingClientRect()
      const x = btn.left + btn.width / 2 - mainRect.left
      const y = btn.top + btn.height / 2 - mainRect.top
      setMacOpenOrigin(`${x}px ${y}px`)
    }
    openNewTab()
  }, [openNewTab])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId) {
        if (next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1)
          setActiveTabId(next[newIdx].id)
        } else {
          setActiveTabId(null)
        }
      }
      return next
    })
  }, [activeTabId])

  const handleReorder = useCallback((reordered: Tab[]) => {
    setTabs(reordered)
  }, [])

  const handleUpdateTab = useCallback((tabId: string, updates: Partial<Pick<Tab, 'color' | 'group'>>) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId)
      // Sync tab color to note color
      if (updates.color !== undefined && tab?.noteId && tab.noteId !== '__pending__') {
        updateNoteColor(tab.noteId, updates.color)
      }
      return prev.map(t => t.id === tabId ? { ...t, ...updates } : t)
    })
  }, [updateNoteColor])

  const handleSaveNew = useCallback(async (title: string, content: string, noteType: NoteType, expiresAt?: string | null) => {
    const result = await createNote(title, content, noteType, expiresAt)
    if (result?.error || !result?.data) return

    // Directly link the tab to the new note using the returned ID
    const newNoteId = result.data.id
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId && t.noteId === null) {
        return { ...t, title, noteId: newNoteId }
      }
      return t
    }))
  }, [createNote, activeTabId])

  const handleDeleteNote = async (id: string) => {
    const result = await deleteNote(id)
    if (!result?.error) removeNoteFromTabs(id)
    return result
  }

  const handleSidebarDelete = async (id: string) => {
    const result = await deleteNote(id)
    if (!result?.error) removeNoteFromTabs(id)
  }

  const handleArchiveNote = async (id: string) => {
    await archiveNote(id)
    removeNoteFromTabs(id)
  }

  const handleUnarchiveNote = async (id: string) => {
    await unarchiveNote(id)
  }

  const handlePinNote = async (id: string) => {
    await pinNote(id)
  }

  const playDeleteSound = () => {
    if (!deleteSoundRef.current) {
      deleteSoundRef.current = new Audio(deleteSoundFile)
    }
    const audio = deleteSoundRef.current
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  const handlePermanentDelete = async (id: string) => {
    await permanentDeleteNote(id)
    playDeleteSound()
  }

  const handlePermanentDeleteAll = async () => {
    await permanentDeleteAll()
    playDeleteSound()
  }

  const handleRestoreNote = async (id: string) => {
    const noteToRestore = notes.find(n => n.id === id)
    if (noteToRestore) {
      const activeNotes = notes.filter(n => !n.deleted_at && n.id !== id)
      const titleExists = activeNotes.some(n => n.title === noteToRestore.title)
      if (titleExists) {
        // Auto-rename with a unique suffix to avoid conflict
        const suffix = `_${String(Date.now()).slice(-6)}`
        const newTitle = noteToRestore.title + suffix
        await restoreNote(id)
        await updateNote(id, { title: newTitle })
        return
      }
    }
    await restoreNote(id)
  }

  const handleMoveToFolder = async (noteId: string, folderId: string | null) => {
    await moveToFolder(noteId, folderId)
  }

  const handleBulkMoveToFolder = async (noteIds: string[], folderId: string | null) => {
    await bulkMoveToFolder(noteIds, folderId)
  }

  const handleBulkDelete = async (noteIds: string[]) => {
    await bulkDelete(noteIds)
    noteIds.forEach(id => removeNoteFromTabs(id))
  }

  const handleBulkArchive = async (noteIds: string[]) => {
    await bulkArchive(noteIds)
    noteIds.forEach(id => removeNoteFromTabs(id))
  }

  const handleUpdateGroupColor = useCallback((group: string, color: string) => {
    setGroupColors(prev => ({ ...prev, [group]: color }))
  }, [])

  const handleRenameGroup = useCallback((oldName: string, newName: string) => {
    setTabs(prev => prev.map(t => t.group === oldName ? { ...t, group: newName } : t))
    setGroupColors(prev => {
      const next = { ...prev }
      if (next[oldName] !== undefined) {
        next[newName] = next[oldName]
        delete next[oldName]
      }
      return next
    })
  }, [])

  const handleUpdateNoteColor = async (noteId: string, color: string) => {
    await updateNoteColor(noteId, color)
    // Also sync to any open tab
    setTabs(prev => prev.map(t => t.noteId === noteId ? { ...t, color } : t))
  }

  const handleGridReorder = async (updates: { id: string; position: number }[]) => {
    await updatePositions(updates)
  }

  // All active notes for grid view (flattened from basic + code + folder, excluding board)
  const allActiveNotes = useMemo(() => {
    const all: Note[] = []
    const seen = new Set<string>()
    const addNotes = (list: Note[]) => {
      for (const n of list) {
        if (!seen.has(n.id) && n.note_type !== 'board') {
          seen.add(n.id)
          all.push(n)
        }
      }
    }
    addNotes(basicNotes)
    addNotes(codeNotes.java)
    addNotes(codeNotes.javascript)
    addNotes(codeNotes.python)
    addNotes(codeNotes.sql)
    for (const fid of Object.keys(folderNotes)) {
      addNotes(folderNotes[fid])
    }
    // Sort by position (if set), then by updated_at
    // Sort: pinned first, then by position, then oldest first (newest at rightmost/end)
    return all.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (a.position > 0 && b.position > 0) return a.position - b.position
      if (a.position > 0) return -1
      if (b.position > 0) return 1
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    })
  }, [basicNotes, codeNotes, folderNotes])

  // Filter notes by search query (title + content)
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return allActiveNotes
    const q = searchQuery.toLowerCase()
    return allActiveNotes.filter(n =>
      n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
    )
  }, [allActiveNotes, searchQuery])

  const handleGridSelectNote = useCallback((note: Note) => {
    setModalNoteId(note.id)
  }, [])

  const handleToggleGridSelect = useCallback((id: string) => {
    setGridSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAllGrid = useCallback(() => {
    setGridSelectedIds(new Set(filteredNotes.map(n => n.id)))
  }, [filteredNotes])

  const handleClearGridSelection = useCallback(() => {
    setGridSelectedIds(new Set())
  }, [])

  const handleRenameNote = async (id: string, title: string) => {
    await updateNote(id, { title })
    setTabs(prev => prev.map(t => t.noteId === id ? { ...t, title } : t))
  }

  const handleRenameTab = async (tabId: string, title: string) => {
    const tab = tabs.find(t => t.id === tabId)
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title } : t))
    if (tab?.noteId && tab.noteId !== '__pending__') {
      await updateNote(tab.noteId, { title })
    }
  }

  const handleUpdate = async (id: string, updates: { title?: string; content?: string; note_type?: NoteType; expires_at?: string | null }) => {
    const result = await updateNote(id, updates)
    if (!result?.error && updates.title) {
      setTabs(prev => prev.map(t =>
        t.noteId === id ? { ...t, title: updates.title! } : t
      ))
    }
    return result
  }

  const currentNote = activeTab?.noteId && activeTab.noteId !== '__pending__'
    ? notes.find(n => n.id === activeTab.noteId) ?? null
    : null
  const isNewNote = activeTab?.noteId === null

  // Modal note for grid view editing
  const modalNote = modalNoteId ? notes.find(n => n.id === modalNoteId) ?? null : null

  const handleModalDelete = async (id: string) => {
    const result = await deleteNote(id)
    if (!result?.error) {
      setModalNoteId(null)
      removeNoteFromTabs(id)
    }
    return result
  }

  return (
    <div className="h-screen flex flex-col bg-app-gradient">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <NavRail active={navSection} onChange={setNavSection} />

        {navSection === 'transcript' && <TranscriptPage />}
        {navSection === 'meetings' && <MeetingsPage />}
        {navSection === 'board' && (
          <BoardPage
            boardNotes={boardNotes}
            loading={loading}
            createNote={createNote}
            updateNote={updateNote}
            deleteNote={deleteNote}
          />
        )}
        {navSection === 'files' && <FilesPage />}
        {navSection === 'settings' && <SettingsPage />}

        {navSection === 'notes' && <>
          <Sidebar
            basicNotes={basicNotes}
            boardNotes={boardNotes}
            codeNotes={codeNotes}
            archivedNotes={archivedNotes}
            deletedNotes={deletedNotes}
            selectedNoteId={currentNote?.id ?? null}
            onSelectNote={viewMode === 'grid' ? handleGridSelectNote : openNoteInTab}
            onDeleteNote={handleSidebarDelete}
            onArchiveNote={handleArchiveNote}
            onUnarchiveNote={handleUnarchiveNote}
            onPinNote={handlePinNote}
            onRenameNote={handleRenameNote}
            onPermanentDelete={handlePermanentDelete}
            onPermanentDeleteAll={handlePermanentDeleteAll}
            onRestoreNote={handleRestoreNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            folders={folders}
            folderNotes={folderNotes}
            onCreateFolder={async (name) => { await createFolder(name) }}
            onRenameFolder={async (id, name) => { await renameFolder(id, name) }}
            onDeleteFolder={async (id) => { await deleteFolder(id) }}
            onMoveToFolder={handleMoveToFolder}
            onBulkMoveToFolder={handleBulkMoveToFolder}
            onBulkDelete={handleBulkDelete}
            onBulkArchive={handleBulkArchive}
            onNewNote={viewMode === 'grid' ? (_e: React.MouseEvent) => setShowNewNoteModal(true) : openNewTabAnimated}
            viewMode={viewMode}
            onToggleView={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
            isHidden={false}
          />

          <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* View toggle — top right corner */}
          <div className="absolute top-px right-2 z-10 flex items-center gap-1.5">
            {/* View toggle — segmented control */}
            <div className="flex items-center rounded-lg bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-gray-200/60 dark:border-white/10 shadow-sm overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Grid
              </button>
              <div className="w-px h-4 bg-gray-200/60 dark:bg-white/10" />
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="4" rx="1" />
                  <rect x="2" y="10" width="12" height="4" rx="1" />
                  <rect x="2" y="17" width="16" height="4" rx="1" />
                </svg>
                Tab
              </button>
            </div>
          </div>
          {viewMode === 'grid' ? (
            <main className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                </div>
              ) : (
                <GridView
                  notes={filteredNotes}
                  folders={folders}
                  selectedNoteId={currentNote?.id ?? null}
                  searchQuery={searchQuery}
                  gridSelectedIds={gridSelectedIds}
                  onToggleGridSelect={handleToggleGridSelect}
                  onSelectAllGrid={handleSelectAllGrid}
                  onClearGridSelection={handleClearGridSelection}
                  onSelectNote={handleGridSelectNote}
                  onDeleteNote={handleSidebarDelete}
                  onArchiveNote={handleArchiveNote}
                  onPinNote={handlePinNote}
                  onRenameNote={handleRenameNote}
                  onMoveToFolder={handleMoveToFolder}
                  onUpdateColor={handleUpdateNoteColor}
                  onReorder={handleGridReorder}
                  onCreateNote={() => setShowNewNoteModal(true)}
                  onBulkDelete={handleBulkDelete}
                  onBulkArchive={handleBulkArchive}
                  onBulkMoveToFolder={handleBulkMoveToFolder}
                />
              )}
            </main>
          ) : (
            <>
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCloseTab={closeTab}
                onNewTab={openNewTab}
                onReorder={handleReorder}
                onUpdateTab={handleUpdateTab}
                onRenameTab={handleRenameTab}
                groups={groups}
                groupColors={groupColors}
                onUpdateGroupColor={handleUpdateGroupColor}
                onRenameGroup={handleRenameGroup}
              />

              <main
                ref={editorMainRef}
                className={`flex-1 overflow-hidden bg-white dark:bg-[#1e1e1e]${isNewNote ? ' animate-[macOpen_0.45s_cubic-bezier(0.16,1,0.3,1)]' : ''}`}
                key={isNewNote ? activeTab?.id : undefined}
                style={isNewNote ? { transformOrigin: macOpenOrigin } : undefined}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                  </div>
                ) : activeTab ? (
                  <NoteEditor
                    key={activeTab.id}
                    note={currentNote}
                    isNew={isNewNote}
                    onSave={handleSaveNew}
                    onUpdate={handleUpdate}
                    onDelete={handleDeleteNote}
                    noTitleIndex={noTitleCounter}
                    tabTitle={activeTab.title}
                    onTitleChange={(title) => {
                      setTabs(prev => prev.map(t =>
                        t.id === activeTab.id ? { ...t, title: title || 'New Note' } : t
                      ))
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Select a note or create a new one</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Open a note from the sidebar or start fresh.</p>
                      <button
                        onClick={openNewTab}
                        className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-medium rounded-lg transition-colors"
                      >
                        + New Note
                      </button>
                    </div>
                  </div>
                )}
              </main>
            </>
          )}
        </div>
        </>}
      </div>

      {/* Note edit modal for grid view */}
      {modalNote && (
        <NoteModal
          key={modalNote.id}
          note={modalNote}
          onClose={() => setModalNoteId(null)}
          onUpdate={handleUpdate}
          onDelete={handleModalDelete}
        />
      )}

      {/* New note modal for grid view */}
      {showNewNoteModal && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onMouseDown={(e) => { (e.currentTarget as any).__mouseDownTarget = e.target }}
          onClick={(e) => { if (e.target === e.currentTarget && (e.currentTarget as any).__mouseDownTarget === e.currentTarget) setShowNewNoteModal(false) }}
        >
          <div
            className="w-[95vw] max-w-6xl h-[80vh] glass-panel-solid rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[scaleIn_0.15s_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-gray-200/50 dark:border-white/5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">New Note</span>
              <button
                onClick={() => setShowNewNoteModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <NoteEditor
                key="new-note-modal"
                note={null}
                isNew={true}
                onSave={async (title, content, noteType) => {
                  await handleSaveNew(title, content, noteType)
                  setShowNewNoteModal(false)
                }}
                onUpdate={handleUpdate}
                onDelete={handleDeleteNote}
                noTitleIndex={noTitleCounter}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
