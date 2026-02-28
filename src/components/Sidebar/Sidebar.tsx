import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Note, Folder } from '../../types'

interface Props {
  basicNotes: Note[]
  boardNotes: Note[]
  codeNotes: Record<string, Note[]>
  archivedNotes: Note[]
  deletedNotes: Note[]
  selectedNoteId: string | null
  onSelectNote: (note: Note) => void
  onDeleteNote: (id: string) => void
  onArchiveNote: (id: string) => void
  onUnarchiveNote: (id: string) => void
  onPinNote: (id: string) => void
  onRenameNote: (id: string, title: string) => void
  onPermanentDelete: (id: string) => void
  onPermanentDeleteAll: () => void
  onRestoreNote: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  folders: Folder[]
  folderNotes: Record<string, Note[]>
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onMoveToFolder: (noteId: string, folderId: string | null) => void
  onBulkMoveToFolder: (noteIds: string[], folderId: string | null) => void
  onBulkDelete: (noteIds: string[]) => void
  onBulkArchive: (noteIds: string[]) => void
  onNewNote: (e: React.MouseEvent) => void
  viewMode: 'list' | 'grid'
  onToggleView: () => void
  isHidden: boolean
}

const CODE_LANGUAGES: { key: string; label: string; color: string }[] = [
  { key: 'java', label: 'Java', color: 'text-orange-400' },
  { key: 'javascript', label: 'JavaScript', color: 'text-yellow-400' },
  { key: 'python', label: 'Python', color: 'text-blue-400' },
  { key: 'sql', label: 'SQL', color: 'text-green-400' },
]

function sidebarHighlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} style={{ backgroundColor: '#facc15', color: 'inherit', borderRadius: '2px', padding: '0 2px' }}>{part}</span>
      : part
  )
}

function NoteItem({
  note, isSelected, onClick, onDelete, onArchive, onUnarchive, onPin, onRename, isArchived,
  selectMode, isChecked, onToggleCheck, folders, onMoveToFolder, searchQuery = '',
}: {
  note: Note
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
  onArchive?: () => void
  onUnarchive?: () => void
  onPin?: () => void
  onRename: (title: string) => void
  isArchived?: boolean
  selectMode?: boolean
  isChecked?: boolean
  onToggleCheck?: () => void
  folders?: Folder[]
  onMoveToFolder?: (folderId: string | null) => void
  searchQuery?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setShowFolderPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== note.title) onRename(trimmed)
    else setEditTitle(note.title)
    setEditing(false)
  }

  const startRename = () => {
    setMenuOpen(false)
    setEditTitle(note.title)
    setEditing(true)
  }

  const noteColorStyle: React.CSSProperties = note.color ? {
    borderLeft: `3px solid ${note.color}`,
    backgroundColor: `${note.color}10`,
  } : {}

  if (selectMode) {
    return (
      <div
        onClick={onToggleCheck}
        style={noteColorStyle}
        className={`group relative flex items-center rounded-xl text-sm transition-all duration-150 cursor-pointer ${
          isChecked
            ? 'bg-[var(--accent)]/15 text-[var(--accent)] dark:text-[#00A1FF]'
            : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5'
        }`}
      >
        <div className="pl-3 py-2.5 flex items-center">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            isChecked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-gray-300 dark:border-gray-600'
          }`}>
            {isChecked && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1 px-2 py-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            {note.pinned && <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />}
            <span className="font-medium truncate">{sidebarHighlight(note.title, searchQuery)}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date(note.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={noteColorStyle}
      className={`group relative flex items-center rounded-xl text-sm transition-all duration-150 ${
        isSelected
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] dark:text-[#00A1FF]'
          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5'
      }`}
    >
      <button onClick={onClick} className="flex-1 text-left px-3 py-2.5 min-w-0">
        {editing ? (
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setEditTitle(note.title); setEditing(false) }
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
            className="w-full bg-transparent font-medium text-sm focus:outline-none border-b border-[var(--accent)]"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            {note.pinned && (
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
            )}
            <span className="font-medium truncate">{sidebarHighlight(note.title, searchQuery)}</span>
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {new Date(note.updated_at).toLocaleDateString()}
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

          {!isArchived && onPin && (
            <button
              onClick={() => { setMenuOpen(false); onPin() }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill={note.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
              {note.pinned ? 'Unpin' : 'Pin'}
            </button>
          )}

          {/* Move to Folder */}
          {!isArchived && onMoveToFolder && folders && (
            <div className="relative">
              <button
                onClick={() => setShowFolderPicker(!showFolderPicker)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Move to Folder
              </button>
              {showFolderPicker && (
                <div className="px-2 py-1 space-y-0.5">
                  {note.folder_id && (
                    <button
                      onClick={() => { setMenuOpen(false); setShowFolderPicker(false); onMoveToFolder(null) }}
                      className="w-full text-left px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg"
                    >
                      Unfiled
                    </button>
                  )}
                  {folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { setMenuOpen(false); setShowFolderPicker(false); onMoveToFolder(f.id) }}
                      className={`w-full text-left px-2 py-1 text-xs rounded-lg hover:bg-gray-100/80 dark:hover:bg-white/10 ${
                        note.folder_id === f.id ? 'text-[var(--accent)] font-medium' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                  {folders.length === 0 && (
                    <p className="px-2 py-1 text-[10px] text-gray-400 italic">No folders yet</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!isArchived && onArchive && (
            <button
              onClick={() => { setMenuOpen(false); onArchive() }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Archive
            </button>
          )}

          {isArchived && onUnarchive && (
            <button
              onClick={() => { setMenuOpen(false); onUnarchive() }}
              className="w-full text-left px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Unarchive
            </button>
          )}

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

function DeletedNoteItem({ note, onRestore, onDelete }: { note: Note; onRestore: () => void; onDelete: () => void }) {
  const daysLeft = note.deleted_at
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(note.deleted_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="group relative flex items-center rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all duration-150">
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <span className="font-medium truncate block opacity-60">{note.title}</span>
        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
        </div>
      </div>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onRestore}
          className="p-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 text-gray-500 dark:text-gray-400 hover:text-green-500 transition-colors"
          title="Restore"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
          title="Delete permanently"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({
  basicNotes, boardNotes, codeNotes, archivedNotes, deletedNotes, selectedNoteId,
  onSelectNote, onDeleteNote, onArchiveNote, onUnarchiveNote, onPinNote, onRenameNote,
  onPermanentDelete, onPermanentDeleteAll, onRestoreNote,
  searchQuery, onSearchChange,
  folders, folderNotes, onCreateFolder, onRenameFolder, onDeleteFolder,
  onMoveToFolder, onBulkMoveToFolder, onBulkDelete, onBulkArchive,
  onNewNote, viewMode: _viewMode, onToggleView: _onToggleView, isHidden,
}: Props) {
  const [expandedLangs, setExpandedLangs] = useState<Set<string>>(new Set(['java', 'javascript', 'python', 'sql']))
  const [showBoard, setShowBoard] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // Folder state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null)
  const folderMenuRef = useRef<HTMLDivElement>(null)

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkFolderPicker, setShowBulkFolderPicker] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'archive' | 'move' | 'empty-trash'; folderId?: string | null } | null>(null)
  const bulkFolderBtnRef = useRef<HTMLButtonElement>(null)
  const bulkFolderMenuRef = useRef<HTMLDivElement>(null)
  const [bulkFolderPos, setBulkFolderPos] = useState<{ x: number; y: number } | null>(null)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
    setShowBulkFolderPicker(false)
  }

  // Close folder menu on outside click
  useEffect(() => {
    if (!folderMenuId) return
    const handler = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setFolderMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [folderMenuId])

  // Close bulk folder picker on outside click
  useEffect(() => {
    if (!showBulkFolderPicker) return
    const handler = (e: MouseEvent) => {
      if (bulkFolderMenuRef.current && !bulkFolderMenuRef.current.contains(e.target as Node) &&
          bulkFolderBtnRef.current && !bulkFolderBtnRef.current.contains(e.target as Node)) {
        setShowBulkFolderPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBulkFolderPicker])

  const toggleLang = (lang: string) => {
    setExpandedLangs(prev => {
      const next = new Set(prev)
      if (next.has(lang)) next.delete(lang)
      else next.add(lang)
      return next
    })
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim()
    if (trimmed) {
      onCreateFolder(trimmed)
      setNewFolderName('')
      setCreatingFolder(false)
    }
  }

  const handleRenameFolder = (id: string) => {
    const trimmed = editFolderName.trim()
    if (trimmed && trimmed !== folders.find(f => f.id === id)?.name) {
      onRenameFolder(id, trimmed)
    }
    setEditingFolderId(null)
  }

  const getAllVisibleIds = () => {
    const allIds: string[] = []
    filterNotes(basicNotes).forEach(n => allIds.push(n.id))
    CODE_LANGUAGES.forEach(lang => {
      filterNotes(codeNotes[lang.key] || []).forEach(n => allIds.push(n.id))
    })
    folders.forEach(f => {
      filterNotes(folderNotes[f.id] || []).forEach(n => allIds.push(n.id))
    })
    return allIds
  }

  const isAllSelected = () => {
    const allIds = getAllVisibleIds()
    return allIds.length > 0 && allIds.every(id => selectedIds.has(id))
  }

  const confirmAndExecute = (action: typeof confirmAction) => {
    if (isAllSelected()) {
      setConfirmAction(action)
    } else if (action?.type === 'delete') {
      onBulkDelete([...selectedIds])
      exitSelectMode()
    } else if (action?.type === 'archive') {
      onBulkArchive([...selectedIds])
      exitSelectMode()
    } else if (action?.type === 'move') {
      onBulkMoveToFolder([...selectedIds], action.folderId ?? null)
      setShowBulkFolderPicker(false)
      exitSelectMode()
    }
  }

  const executeConfirmedAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'delete') {
      onBulkDelete([...selectedIds])
    } else if (confirmAction.type === 'archive') {
      onBulkArchive([...selectedIds])
    } else if (confirmAction.type === 'move') {
      onBulkMoveToFolder([...selectedIds], confirmAction.folderId ?? null)
      setShowBulkFolderPicker(false)
    } else if (confirmAction.type === 'empty-trash') {
      onPermanentDeleteAll()
    }
    setConfirmAction(null)
    if (confirmAction.type !== 'empty-trash') exitSelectMode()
  }

  const handleBulkDelete = () => {
    confirmAndExecute({ type: 'delete' })
  }

  const handleBulkArchive = () => {
    confirmAndExecute({ type: 'archive' })
  }

  const handleBulkMoveToFolder = (folderId: string | null) => {
    confirmAndExecute({ type: 'move', folderId })
  }

  const filterNotes = (notes: Note[]) => {
    if (!searchQuery) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    )
  }

  const renderNoteItem = (note: Note, isArchived = false) => (
    <NoteItem
      key={note.id}
      note={note}
      isSelected={selectedNoteId === note.id}
      onClick={() => onSelectNote(note)}
      onDelete={() => onDeleteNote(note.id)}
      onArchive={isArchived ? undefined : () => onArchiveNote(note.id)}
      onUnarchive={isArchived ? () => onUnarchiveNote(note.id) : undefined}
      onPin={isArchived ? undefined : () => onPinNote(note.id)}
      onRename={(title) => onRenameNote(note.id, title)}
      isArchived={isArchived}
      selectMode={selectMode}
      isChecked={selectedIds.has(note.id)}
      onToggleCheck={() => toggleSelect(note.id)}
      folders={folders}
      onMoveToFolder={(folderId) => onMoveToFolder(note.id, folderId)}
      searchQuery={searchQuery}
    />
  )

  return (
    <aside className={`w-full md:w-[280px] shrink-0 border-r border-gray-200/50 dark:border-white/5 flex flex-col h-full bg-white dark:bg-[#1a1a1a] md:bg-white/60 md:dark:bg-white/[0.03] relative sidebar-slide ${isHidden ? 'sidebar-hidden' : ''}`}>
      {/* New Note + Search */}
      <div className="p-3 space-y-2 shrink-0">
        <button
          onClick={(e) => onNewNote(e)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Note
        </button>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${selectMode ? 'pb-16' : ''}`}>
        {/* Folders Section */}
        {(folders.length > 0 || creatingFolder) && (
          <>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Folders</h3>
                <button
                  onClick={() => { setCreatingFolder(true); setNewFolderName('') }}
                  className="p-0.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                  title="New folder"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* New folder input */}
              {creatingFolder && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
                  <svg className="w-4 h-4 text-[var(--accent)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); else handleCreateFolder() }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateFolder()
                      if (e.key === 'Escape') setCreatingFolder(false)
                    }}
                    autoFocus
                    placeholder="Folder name..."
                    className="flex-1 min-w-0 text-sm bg-transparent font-medium focus:outline-none border-b border-[var(--accent)] text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              )}

              {/* Folder list */}
              <div className="space-y-0.5">
                {folders.map(folder => {
                  const notes = filterNotes(folderNotes[folder.id] || [])
                  const isExpanded = expandedFolders.has(folder.id)
                  const isEditing = editingFolderId === folder.id

                  return (
                    <div key={folder.id}>
                      <div className="group relative flex items-center">
                        <button
                          onClick={() => toggleFolder(folder.id)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[var(--accent)] shrink-0" fill={isExpanded ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFolderName}
                              onChange={e => setEditFolderName(e.target.value)}
                              onBlur={() => handleRenameFolder(folder.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameFolder(folder.id)
                                if (e.key === 'Escape') setEditingFolderId(null)
                              }}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                              className="flex-1 min-w-0 bg-transparent font-medium text-sm focus:outline-none border-b border-[var(--accent)] text-gray-900 dark:text-white"
                            />
                          ) : (
                            <>
                              <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{folder.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">({notes.length})</span>
                            </>
                          )}
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ml-auto shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        {/* Folder 3-dot menu */}
                        {!isEditing && (
                          <button
                            onClick={e => { e.stopPropagation(); setFolderMenuId(folderMenuId === folder.id ? null : folder.id) }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-opacity"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>
                        )}

                        {folderMenuId === folder.id && (
                          <div
                            ref={folderMenuRef}
                            className="absolute right-0 top-full mt-1 z-50 w-32 glass-panel rounded-xl shadow-xl py-1 animate-[scaleIn_0.1s_ease-out]"
                          >
                            <button
                              onClick={() => {
                                setFolderMenuId(null)
                                setEditFolderName(folder.name)
                                setEditingFolderId(folder.id)
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => { setFolderMenuId(null); onDeleteFolder(folder.id) }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="ml-4 space-y-0.5">
                          {notes.length === 0 ? (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 px-3 py-1 italic">Empty folder</p>
                          ) : (
                            notes.map(note => renderNoteItem(note))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-200/50 dark:border-white/5 mx-3" />
          </>
        )}

        {/* "New Folder" button when no folders exist */}
        {folders.length === 0 && !creatingFolder && (
          <>
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={() => { setCreatingFolder(true); setNewFolderName('') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium">New Folder</span>
              </button>
            </div>
            <div className="border-t border-gray-200/50 dark:border-white/5 mx-3" />
          </>
        )}

        {/* Notes (unfiled) */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Notes</h3>
            <div className="flex items-center gap-1">
              {selectMode && (
                <button
                  onClick={() => {
                    // Select All visible notes (basic + code + folder notes)
                    const allIds = new Set<string>()
                    filterNotes(basicNotes).forEach(n => allIds.add(n.id))
                    CODE_LANGUAGES.forEach(lang => {
                      filterNotes(codeNotes[lang.key] || []).forEach(n => allIds.add(n.id))
                    })
                    folders.forEach(f => {
                      filterNotes(folderNotes[f.id] || []).forEach(n => allIds.add(n.id))
                    })
                    // Toggle: if all selected, deselect all; else select all
                    const allSelected = [...allIds].every(id => selectedIds.has(id))
                    setSelectedIds(allSelected ? new Set() : allIds)
                  }}
                  className="text-[10px] font-medium text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 px-1.5 py-0.5 rounded-lg transition-colors"
                >
                  {(() => {
                    const allIds: string[] = []
                    filterNotes(basicNotes).forEach(n => allIds.push(n.id))
                    CODE_LANGUAGES.forEach(lang => {
                      filterNotes(codeNotes[lang.key] || []).forEach(n => allIds.push(n.id))
                    })
                    folders.forEach(f => {
                      filterNotes(folderNotes[f.id] || []).forEach(n => allIds.push(n.id))
                    })
                    return allIds.length > 0 && allIds.every(id => selectedIds.has(id)) ? 'Deselect All' : 'Select All'
                  })()}
                </button>
              )}
              <button
                onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-lg transition-colors ${
                  selectMode
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          </div>
          <div className="space-y-0.5">
            {filterNotes(basicNotes).length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-500 px-3 py-2">No notes yet</p>
            ) : (
              filterNotes(basicNotes).map(note => renderNoteItem(note))
            )}
          </div>
        </div>

        {/* Code Snippets */}
        {CODE_LANGUAGES.some(lang => (codeNotes[lang.key] || []).length > 0) && (
          <>
            <div className="border-t border-gray-200/50 dark:border-white/5 mx-3" />

            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">Code Snippets</h3>
              <div className="space-y-1">
                {CODE_LANGUAGES.filter(lang => (codeNotes[lang.key] || []).length > 0).map(lang => {
                  const notes = filterNotes(codeNotes[lang.key] || [])
                  const isExpanded = expandedLangs.has(lang.key)
                  return (
                    <div key={lang.key}>
                      <button
                        onClick={() => toggleLang(lang.key)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${lang.color}`}>{lang.label}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">({notes.length})</span>
                        </span>
                        <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="ml-2 space-y-0.5">
                          {notes.map(note => renderNoteItem(note))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Board Drawings */}
        {boardNotes.length > 0 && (
          <>
            <div className="border-t border-gray-200/50 dark:border-white/5 mx-3" />
            <div className="p-3">
              <button
                onClick={() => setShowBoard(!showBoard)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Board</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({boardNotes.length})</span>
                </span>
                <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showBoard ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {showBoard && (
                <div className="mt-1 space-y-0.5">
                  {filterNotes(boardNotes).length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-500 px-3 py-2">No board drawings</p>
                  ) : (
                    filterNotes(boardNotes).map(note => renderNoteItem(note))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="border-t border-gray-200/50 dark:border-white/5 mx-3" />

        {/* Archived */}
        <div className="p-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Archived</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">({archivedNotes.length})</span>
            </span>
            <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showArchived ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {showArchived && (
            <div className="mt-1 space-y-0.5">
              {filterNotes(archivedNotes).length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-500 px-3 py-2">No archived notes</p>
              ) : (
                filterNotes(archivedNotes).map(note => renderNoteItem(note, true))
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200/50 dark:border-white/5 mx-3" />

        {/* Recently Deleted */}
        <div className="p-3">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Recently Deleted</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">({deletedNotes.length})</span>
            </span>
            <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showDeleted ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {showDeleted && (
            <div className="mt-1 space-y-0.5">
              {deletedNotes.length > 0 && (
                <button
                  onClick={() => setConfirmAction({ type: 'empty-trash' })}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All
                </button>
              )}
              {deletedNotes.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-500 px-3 py-2">No deleted notes</p>
              ) : (
                deletedNotes.map(note => (
                  <DeletedNoteItem
                    key={note.id}
                    note={note}
                    onRestore={() => onRestoreNote(note.id)}
                    onDelete={() => onPermanentDelete(note.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar for multi-select */}
      {selectMode && (
        <div className="absolute bottom-0 left-0 right-0 p-3 glass-panel border-t border-gray-200/50 dark:border-white/5 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-1">
              {/* Move to Folder */}
              <button
                ref={bulkFolderBtnRef}
                disabled={selectedIds.size === 0}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setBulkFolderPos({ x: rect.left, y: rect.top })
                  setShowBulkFolderPicker(!showBulkFolderPicker)
                }}
                className={`p-2 rounded-lg transition-colors ${selectedIds.size === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]'}`}
                title="Move to folder"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>

              {/* Archive */}
              <button
                onClick={handleBulkArchive}
                disabled={selectedIds.size === 0}
                className={`p-2 rounded-lg transition-colors ${selectedIds.size === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:bg-orange-500/10 hover:text-orange-500'}`}
                title="Archive selected"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>

              {/* Delete */}
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className={`p-2 rounded-lg transition-colors ${selectedIds.size === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-500'}`}
                title="Delete selected"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk folder picker portal */}
      {showBulkFolderPicker && bulkFolderPos && createPortal(
        <div
          ref={bulkFolderMenuRef}
          className="fixed z-[9999] w-44 glass-panel rounded-xl shadow-xl py-1 animate-[scaleIn_0.1s_ease-out]"
          style={{ left: bulkFolderPos.x, top: bulkFolderPos.y - (folders.length * 28 + 40) }}
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Move to</div>
          <button
            onClick={() => handleBulkMoveToFolder(null)}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10"
          >
            Unfiled
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => handleBulkMoveToFolder(f.id)}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10"
            >
              {f.name}
            </button>
          ))}
          {folders.length === 0 && (
            <p className="px-3 py-1.5 text-[10px] text-gray-400 italic">No folders yet</p>
          )}
        </div>,
        document.body
      )}

      {/* Confirmation dialog for bulk actions on all notes */}
      {confirmAction && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-[scaleIn_0.15s_ease-out]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {confirmAction.type === 'empty-trash' ? 'Empty trash?' : confirmAction.type === 'delete' ? 'Delete all notes?' : confirmAction.type === 'archive' ? 'Archive all notes?' : 'Move all notes?'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {confirmAction.type === 'empty-trash'
                ? 'This will permanently delete all notes in the trash. This action cannot be undone.'
                : `You have selected all ${selectedIds.size} notes. Are you sure you want to ${confirmAction.type === 'delete' ? 'delete' : confirmAction.type === 'archive' ? 'archive' : 'move'} them?`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
                  confirmAction.type === 'delete' || confirmAction.type === 'empty-trash' ? 'bg-red-500 hover:bg-red-600' : 'bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
                }`}
              >
                {confirmAction.type === 'empty-trash' ? 'Delete All' : confirmAction.type === 'delete' ? 'Delete All' : confirmAction.type === 'archive' ? 'Archive All' : 'Move All'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  )
}
