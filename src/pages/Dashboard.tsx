import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import TopBar from '../components/Layout/TopBar'
import Logo from '../components/Logo'
import NavRail, { type NavSection } from '../components/Layout/NavRail'
import TabBar, { type Tab } from '../components/Layout/TabBar'
import Sidebar from '../components/Sidebar/Sidebar'
import NoteEditor from '../components/Editor/NoteEditor'
import GridView from '../components/GridView/GridView'
import InfiniteView from '../components/InfiniteView/InfiniteView'
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

/* ─── New Note Modal (resizable) ────────────────────────────────── */
function NewNoteModal({ onClose, onSave, onUpdate, onDelete, noTitleCounter }: {
  onClose: () => void
  onSave: (title: string, content: string, noteType: NoteType, expiresAt?: string | null, scheduledAt?: string | null) => Promise<void>
  onUpdate: (id: string, updates: { title?: string; content?: string; note_type?: NoteType; expires_at?: string | null; scheduled_at?: string | null }) => Promise<{ error: unknown } | undefined>
  onDelete: (id: string) => Promise<{ error: unknown } | undefined>
  noTitleCounter: number
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const resizing = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return
      e.preventDefault()
      const dx = e.clientX - resizing.current.startX
      const dy = e.clientY - resizing.current.startY
      const newW = Math.max(400, Math.min(resizing.current.startW + dx * 2, window.innerWidth * 0.95))
      const newH = Math.max(300, Math.min(resizing.current.startH + dy * 2, window.innerHeight * 0.95))
      setSize({ w: newW, h: newH })
    }
    const onMouseUp = () => {
      if (resizing.current) {
        resizing.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const panel = (e.currentTarget as HTMLElement).parentElement!
    const rect = panel.getBoundingClientRect()
    resizing.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height }
    document.body.style.cursor = 'nwse-resize'
    document.body.style.userSelect = 'none'
  }

  const panelStyle: React.CSSProperties = size ? { width: size.w, height: size.h } : {}

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={(e) => { (e.currentTarget as any).__mouseDownTarget = e.target }}
      onClick={(e) => { if (e.target === e.currentTarget && (e.currentTarget as any).__mouseDownTarget === e.currentTarget) onClose() }}
    >
      <div
        style={panelStyle}
        className={`${size ? '' : 'w-[92vw] max-w-5xl h-[80vh]'} glass-panel-solid rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[scaleIn_0.15s_ease-out] relative`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-gray-200/50 dark:border-white/5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">New Note</span>
          <button
            onClick={onClose}
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
            onSave={onSave}
            onUpdate={onUpdate}
            onDelete={onDelete}
            noTitleIndex={noTitleCounter}
          />
        </div>
        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-10 hidden md:block group"
          title="Drag to resize"
        >
          <svg
            className="w-full h-full text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M17 17L7 17L17 7z" opacity="0.3" />
            <path d="M14 17h1v-3h-1zm3-6v1h-3v-1zm-3 3h1v-3h-1zm3-6v1h-3v-1z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const deleteSoundRef = useRef<HTMLAudioElement | null>(null)
  const editorMainRef = useRef<HTMLElement>(null)
  const { encryptString, decryptString, isEncryptionEnabled, isUnlocked } = useEncryption()
  const encryptOpts = isEncryptionEnabled && isUnlocked
    ? { encrypt: encryptString, decrypt: decryptString }
    : undefined
  const { notes, basicNotes, boardNotes, codeNotes, archivedNotes, deletedNotes, folderNotes, loading, createNote, updateNote, updateNoteColor, updatePositions, deleteNote, permanentDeleteNote, permanentDeleteAll, restoreNote, archiveNote, unarchiveNote, pinNote, moveToFolder, bulkMoveToFolder, bulkDelete, bulkArchive } = useNotes(encryptOpts)
  const { folders, createFolder, renameFolder, deleteFolder, updateFolderColor } = useFolders()
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupColors, setGroupColors] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'infinite'>('grid')
  const [modalNoteId, setModalNoteId] = useState<string | null>(null)
  const [showNewNoteModal, setShowNewNoteModal] = useState(false)
  const [navSection, setNavSection] = useState<NavSection>('notes')
  const [macOpenOrigin, setMacOpenOrigin] = useState<string>('center center')
  const [gridSelectedIds, setGridSelectedIds] = useState<Set<string>>(new Set())
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)

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

  const handleSaveNew = useCallback(async (title: string, content: string, noteType: NoteType, expiresAt?: string | null, scheduledAt?: string | null) => {
    const result = await createNote(title, content, noteType, expiresAt, scheduledAt)
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

  // Filter notes by active folder + search query
  const filteredNotes = useMemo(() => {
    let result = allActiveNotes
    if (activeFolderId) {
      result = result.filter(n => n.folder_id === activeFolderId)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [allActiveNotes, activeFolderId, searchQuery])

  // In list (tab) mode, auto-populate tabs from all active notes
  useEffect(() => {
    if (viewMode !== 'list') return

    setTabs(prev => {
      const byNoteId = new Map<string, Tab>()
      for (const t of prev) {
        if (t.noteId) byNoteId.set(t.noteId, t)
      }

      const result: Tab[] = allActiveNotes.map(note => {
        const existing = byNoteId.get(note.id)
        if (existing) return { ...existing, title: note.title }
        return {
          id: `tab-${note.id}`,
          noteId: note.id,
          title: note.title,
          color: note.color || '',
          group: '',
        }
      })

      // Keep unsaved "new note" tabs
      for (const t of prev) {
        if (!t.noteId) result.push(t)
      }

      return result
    })
  }, [viewMode, allActiveNotes])

  // Auto-select first tab when entering list mode with no active tab
  useEffect(() => {
    if (viewMode === 'list' && !activeTabId && allActiveNotes.length > 0) {
      setActiveTabId(`tab-${allActiveNotes[0].id}`)
    }
  }, [viewMode, activeTabId, allActiveNotes])

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

  const handleUpdate = async (id: string, updates: { title?: string; content?: string; note_type?: NoteType; expires_at?: string | null; scheduled_at?: string | null }) => {
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

  // Close mobile sidebar when selecting a note
  const handleMobileSelectNote = useCallback((note: Note) => {
    if (viewMode === 'list') {
      openNoteInTab(note)
    } else {
      handleGridSelectNote(note)
    }
    setMobileSidebarOpen(false)
  }, [viewMode, handleGridSelectNote, openNoteInTab])

  return (
    <div className="h-screen flex flex-col bg-app-gradient">
      <TopBar
        onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
        showMobileMenuBtn={navSection === 'notes'}
      />

      <div className="flex flex-1 overflow-hidden pb-14 md:pb-0">
        <NavRail active={navSection} onChange={(s) => { setNavSection(s); setMobileSidebarOpen(false) }} />

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
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <Sidebar
              basicNotes={basicNotes}
              boardNotes={boardNotes}
              codeNotes={codeNotes}
              archivedNotes={archivedNotes}
              deletedNotes={deletedNotes}
              selectedNoteId={currentNote?.id ?? null}
              onSelectNote={viewMode === 'list' ? openNoteInTab : handleGridSelectNote}
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
              onNewNote={viewMode === 'list' ? openNewTabAnimated : (_e: React.MouseEvent) => setShowNewNoteModal(true)}
              viewMode={viewMode}
              onToggleView={() => setViewMode(prev => prev === 'grid' ? 'list' : prev === 'list' ? 'infinite' : 'grid')}
              isHidden={false}
              activeFolderId={activeFolderId}
              onSelectFolder={setActiveFolderId}
            />
          </div>

          {/* Mobile sidebar drawer */}
          {mobileSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-[100]">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="absolute inset-y-0 left-0 w-[65vw] max-w-[260px] animate-[slideDrawerIn_0.25s_ease-out] bg-white dark:bg-[#1a1a1a] flex flex-col">
                {/* Logo at top of drawer */}
                <div className="flex items-center justify-center py-1.5 shrink-0 border-b border-gray-200/50 dark:border-white/5">
                  <Logo className="h-8" />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                <Sidebar
                  basicNotes={basicNotes}
                  boardNotes={boardNotes}
                  codeNotes={codeNotes}
                  archivedNotes={archivedNotes}
                  deletedNotes={deletedNotes}
                  selectedNoteId={currentNote?.id ?? null}
                  onSelectNote={handleMobileSelectNote}
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
                  onNewNote={(e) => { setShowNewNoteModal(true); setMobileSidebarOpen(false); e.stopPropagation() }}
                  viewMode={viewMode}
                  onToggleView={() => setViewMode(prev => prev === 'grid' ? 'list' : prev === 'list' ? 'infinite' : 'grid')}
                  isHidden={false}
                  activeFolderId={activeFolderId}
                  onSelectFolder={setActiveFolderId}
                />
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* View toggle — top right corner (hidden on mobile, use sidebar toggle instead) */}
          <div className="absolute top-px right-2 z-10 hidden md:flex items-center gap-1.5">
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
              <div className="w-px h-4 bg-gray-200/60 dark:bg-white/10" />
              <button
                onClick={() => setViewMode('infinite')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'infinite'
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <ellipse cx="12" cy="12" rx="9" ry="4" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                Infinite
              </button>
            </div>
          </div>
          {viewMode === 'infinite' ? (
            <main className="flex-1 overflow-hidden relative">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                </div>
              ) : (
                <InfiniteView
                  notes={filteredNotes}
                  onSelectNote={handleGridSelectNote}
                />
              )}
            </main>
          ) : viewMode === 'grid' ? (
            <main className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                </div>
              ) : (
                <GridView
                  notes={filteredNotes}
                  folders={folders}
                  folderNotes={folderNotes}
                  activeFolderId={activeFolderId}
                  onSetActiveFolder={setActiveFolderId}
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
                  onCreateFolder={createFolder}
                  onRenameFolder={renameFolder}
                  onDeleteFolder={deleteFolder}
                  onUpdateFolderColor={updateFolderColor}
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
        <NewNoteModal
          onClose={() => setShowNewNoteModal(false)}
          onSave={async (title, content, noteType) => {
            await handleSaveNew(title, content, noteType)
            setShowNewNoteModal(false)
          }}
          onUpdate={handleUpdate}
          onDelete={handleDeleteNote}
          noTitleCounter={noTitleCounter}
        />
      )}
    </div>
  )
}
