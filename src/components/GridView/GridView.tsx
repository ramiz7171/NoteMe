import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Note, Folder } from '../../types'
import { TAB_COLORS } from '../Layout/TabBar'
import ExpirationBadge from '../Notes/ExpirationBadge'

const FOLDER_COLORS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#6b7280' },
]

interface GridViewProps {
  notes: Note[]
  folders: Folder[]
  folderNotes: Record<string, Note[]>
  activeFolderId: string | null
  onSetActiveFolder: (id: string | null) => void
  selectedNoteId: string | null
  searchQuery?: string
  gridSelectedIds: Set<string>
  onToggleGridSelect: (id: string) => void
  onSelectAllGrid: () => void
  onClearGridSelection: () => void
  onSelectNote: (note: Note) => void
  onDeleteNote: (id: string) => void
  onArchiveNote: (id: string) => void
  onPinNote: (id: string) => void
  onRenameNote: (id: string, title: string) => void
  onMoveToFolder: (noteId: string, folderId: string | null) => void
  onUpdateColor: (noteId: string, color: string) => void
  onReorder: (updates: { id: string; position: number }[]) => void
  onCreateNote: () => void
  onBulkDelete: (ids: string[]) => void
  onBulkArchive: (ids: string[]) => void
  onBulkMoveToFolder: (ids: string[], folderId: string | null) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onUpdateFolderColor: (id: string, color: string | null) => void
}

function highlightText(text: string, query: string): React.ReactNode {
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

const NOTE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: 'Basic', color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  java: { label: 'Java', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  javascript: { label: 'JS', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
  python: { label: 'Python', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  sql: { label: 'SQL', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
}

/* ─── Folder Card ─── */
function FolderCard({
  folder,
  noteCount,
  onOpen,
  onRename,
  onDelete,
  onUpdateColor,
  isDragOver,
  onDragOver,
  onDrop,
  onDragLeave,
}: {
  folder: Folder
  noteCount: number
  onOpen: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onUpdateColor: (color: string | null) => void
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragLeave: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setShowColorPicker(false)
      }
    }
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); setShowColorPicker(false) } }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler) }
  }, [menuOpen])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const adjustedX = Math.min(e.clientX, window.innerWidth - 220)
    const adjustedY = Math.min(e.clientY, window.innerHeight - 320)
    setMenuPos({ x: adjustedX, y: adjustedY })
    setMenuOpen(true)
    setShowColorPicker(false)
  }

  const handleRename = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== folder.name) onRename(trimmed)
    else setEditName(folder.name)
    setEditing(false)
  }

  const folderColor = folder.color || '#6b7280'

  const menuContent = menuOpen && menuPos && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-48 glass-panel-solid rounded-xl shadow-xl py-1 animate-[scaleIn_0.1s_ease-out]"
      style={{ left: menuPos.x, top: menuPos.y }}
    >
      <button
        onClick={() => { setMenuOpen(false); onOpen() }}
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
        Open
      </button>
      <button
        onClick={() => { setMenuOpen(false); setEditName(folder.name); setEditing(true) }}
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Rename
      </button>
      {/* Color picker */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker) }}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
        >
          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: folderColor }} />
          Color
          <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {showColorPicker && (
          <div className="px-3 py-2 border-t border-gray-100 dark:border-white/10">
            <div className="flex flex-wrap gap-1.5">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => { onUpdateColor(c.value); setMenuOpen(false) }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    folder.color === c.value ? 'ring-2 ring-offset-1 ring-[var(--accent)]' : ''
                  }`}
                  style={{ backgroundColor: c.value, borderColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 dark:border-white/10 my-1" />
      <button
        onClick={() => { setMenuOpen(false); onDelete() }}
        className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Folder
      </button>
    </div>,
    document.body
  )

  return (
    <>
      <div
        onClick={onOpen}
        onContextMenu={handleContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        className={`group relative glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center h-[160px] sm:h-[200px] cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
          isDragOver ? 'ring-2 ring-[var(--accent)] scale-[1.05] shadow-lg' : ''
        }`}
        style={{ borderColor: `${folderColor}40` }}
      >
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setEditName(folder.name); setEditing(false) }
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
            className="w-full bg-transparent font-semibold text-sm text-center focus:outline-none border-b border-[var(--accent)] text-gray-900 dark:text-white"
          />
        ) : (
          <>
            <svg className="w-10 h-10 sm:w-12 sm:h-12 mb-2" fill={folderColor} viewBox="0 0 24 24" stroke="none" opacity={0.85}>
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="font-semibold text-[11px] sm:text-sm text-gray-900 dark:text-white truncate max-w-full text-center">
              {folder.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {noteCount} {noteCount === 1 ? 'note' : 'notes'}
            </span>
          </>
        )}
      </div>
      {menuContent}
    </>
  )
}

/* ─── Grid Card (note) ─── */
function GridCard({
  note,
  isSelected,
  folders,
  searchQuery = '',
  isChecked,
  hasAnySelection,
  onSelect,
  onDelete,
  onArchive,
  onPin,
  onRename,
  onMoveToFolder,
  onUpdateColor,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: {
  note: Note
  isSelected: boolean
  folders: Folder[]
  searchQuery?: string
  isChecked: boolean
  hasAnySelection: boolean
  onSelect: () => void
  onDelete: () => void
  onArchive: () => void
  onPin: () => void
  onRename: (title: string) => void
  onMoveToFolder: (folderId: string | null) => void
  onUpdateColor: (color: string) => void
  onToggleSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  isDragOver: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          menuBtnRef.current && !menuBtnRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setShowColorPicker(false)
        setShowFolderPicker(false)
      }
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setShowColorPicker(false); setShowFolderPicker(false) }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler) }
  }, [menuOpen])

  const openMenu = (x: number, y: number) => {
    const adjustedX = x + 220 > window.innerWidth ? x - 220 : x
    const adjustedY = y + 320 > window.innerHeight ? y - 320 : y
    setMenuPos({ x: adjustedX, y: adjustedY })
    setMenuOpen(true)
    setShowColorPicker(false)
    setShowFolderPicker(false)
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openMenu(rect.right + 4, rect.top)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openMenu(e.clientX, e.clientY)
  }

  const handleRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== note.title) onRename(trimmed)
    else setEditTitle(note.title)
    setEditing(false)
  }

  const typeInfo = NOTE_TYPE_LABELS[note.note_type] || NOTE_TYPE_LABELS.basic

  const cardBgStyle: React.CSSProperties = note.color ? {
    backgroundColor: `${note.color}12`,
    borderColor: `${note.color}30`,
  } : {}

  // Strip HTML/markdown for preview
  const plainContent = (note.content || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[#*_~`>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-48 glass-panel-solid rounded-xl shadow-xl py-1 animate-[scaleIn_0.1s_ease-out]"
      style={{ left: menuPos?.x, top: menuPos?.y }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onToggleSelect() }}
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isChecked ? 'Deselect' : 'Select'}
      </button>

      <div className="border-t border-gray-100 dark:border-white/10 my-1" />

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setEditTitle(note.title); setEditing(true) }}
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Rename
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onPin() }}
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill={note.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
        </svg>
        {note.pinned ? 'Unpin' : 'Pin'}
      </button>

      {/* Move to Folder */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowFolderPicker(!showFolderPicker); setShowColorPicker(false) }}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Move to Folder
          <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {showFolderPicker && (
          <div className="px-2 py-1 space-y-0.5 border-t border-gray-100 dark:border-white/10">
            {note.folder_id && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMoveToFolder(null) }}
                className="w-full text-left px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg"
              >
                Unfiled
              </button>
            )}
            {folders.map(f => (
              <button
                key={f.id}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMoveToFolder(f.id) }}
                className={`w-full text-left px-2 py-1 text-xs rounded-lg hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-1.5 ${
                  note.folder_id === f.id ? 'text-[var(--accent)] font-medium' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {f.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />}
                {f.name}
              </button>
            ))}
            {folders.length === 0 && (
              <p className="px-2 py-1 text-[10px] text-gray-400 italic">No folders yet</p>
            )}
          </div>
        )}
      </div>

      {/* Set Color */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); setShowFolderPicker(false) }}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
        >
          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-500" style={note.color ? { backgroundColor: note.color, borderColor: note.color } : {}} />
          Set Color
          <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {showColorPicker && (
          <div className="px-3 py-2 border-t border-gray-100 dark:border-white/10">
            <div className="flex flex-wrap gap-1.5">
              {TAB_COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={(e) => { e.stopPropagation(); onUpdateColor(c.value); setMenuOpen(false) }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    note.color === c.value ? 'ring-2 ring-offset-1 ring-[var(--accent)]' : ''
                  }`}
                  style={c.value ? { backgroundColor: c.value, borderColor: c.value } : { borderColor: '#9ca3af' }}
                  title={c.label}
                >
                  {!c.value && (
                    <svg className="w-full h-full text-gray-400" viewBox="0 0 20 20">
                      <line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive() }}
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        Archive
      </button>

      <div className="border-t border-gray-100 dark:border-white/10 my-1" />

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
        className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  )

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={hasAnySelection ? (e) => { e.stopPropagation(); onToggleSelect() } : onSelect}
        onContextMenu={handleContextMenu}
        style={cardBgStyle}
        className={`group relative glass-card rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-col h-[160px] sm:h-[200px] cursor-pointer transition-all duration-200 hover:scale-[1.02] overflow-hidden pb-3 sm:pb-5 ${
          isSelected ? 'ring-2 ring-[var(--accent)] shadow-md' : ''
        } ${isDragOver ? 'ring-2 ring-[var(--accent)]/50 scale-[1.03]' : ''} ${isChecked ? 'ring-2 ring-[var(--accent)]' : ''}`}
      >
        {(isChecked || hasAnySelection) && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            className={`absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-20 w-4 sm:w-5 h-4 sm:h-5 rounded-md flex items-center justify-center shadow-sm transition-all ${
              isChecked
                ? 'bg-[var(--accent)]'
                : 'border-2 border-gray-300 dark:border-gray-500 bg-white/80 dark:bg-white/10 opacity-0 group-hover:opacity-100'
            }`}
          >
            {isChecked && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}

        <button
          ref={menuBtnRef}
          onClick={handleMenuClick}
          className={`absolute top-1.5 sm:top-3 p-1 sm:p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-all z-10 ${
            hasAnySelection ? 'right-7 sm:right-10' : 'right-1.5 sm:right-3'
          }`}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {note.pinned && (
          <div className="absolute top-1.5 sm:top-3 left-1.5 sm:left-3">
            <span className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 rounded-full bg-[var(--accent)] block" />
          </div>
        )}

        <div className="pr-6 sm:pr-8 mb-1 sm:mb-2">
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
              className="w-full bg-transparent font-semibold text-[11px] sm:text-sm focus:outline-none border-b border-[var(--accent)] text-gray-900 dark:text-white"
            />
          ) : (
            <h3 className="font-semibold text-[11px] sm:text-sm text-gray-900 dark:text-white truncate">
              {highlightText(note.title, searchQuery)}
            </h3>
          )}
        </div>

        <p className="flex-1 min-h-0 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 sm:line-clamp-3 leading-relaxed overflow-hidden break-words">
          {plainContent ? highlightText(plainContent, searchQuery) : 'Empty note'}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className={`text-[8px] sm:text-[10px] font-medium px-1 sm:px-2 py-0.5 rounded-full ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            {note.expires_at && <span className="hidden sm:inline"><ExpirationBadge expiresAt={note.expires_at} /></span>}
            {note.scheduled_at && (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] text-blue-500 dark:text-blue-400" title={`Scheduled: ${new Date(note.scheduled_at).toLocaleString()}`}>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
              </span>
            )}
          </div>
          <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(note.updated_at).toLocaleDateString()}
          </span>
        </div>

        {note.color && (
          <div
            className="absolute bottom-0 left-2 sm:left-4 right-2 sm:right-4 h-0.5 rounded-full"
            style={{ backgroundColor: note.color }}
          />
        )}
      </div>

      {menuOpen && menuPos && createPortal(menuContent, document.body)}
    </>
  )
}

/* ─── Main GridView ─── */
export default function GridView({
  notes,
  folders,
  folderNotes,
  activeFolderId,
  onSetActiveFolder,
  selectedNoteId,
  searchQuery = '',
  gridSelectedIds,
  onToggleGridSelect,
  onSelectAllGrid,
  onClearGridSelection,
  onSelectNote,
  onDeleteNote,
  onArchiveNote,
  onPinNote,
  onRenameNote,
  onMoveToFolder,
  onUpdateColor,
  onReorder,
  onCreateNote,
  onBulkDelete,
  onBulkArchive,
  onBulkMoveToFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onUpdateFolderColor,
}: GridViewProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [bgMenuOpen, setBgMenuOpen] = useState(false)
  const [bgMenuPos, setBgMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showOnlyNotes, setShowOnlyNotes] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bgMenuRef = useRef<HTMLDivElement>(null)

  // In "All" view (no active folder), show only unfiled notes alongside folder cards.
  // In "Only Notes" mode or inside a specific folder, show all passed notes.
  const displayNotes = useMemo(() => {
    if (!activeFolderId && !showOnlyNotes) {
      return notes.filter(n => !n.folder_id)
    }
    return notes
  }, [notes, activeFolderId, showOnlyNotes])

  // Close background context menu
  useEffect(() => {
    if (!bgMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (bgMenuRef.current && !bgMenuRef.current.contains(e.target as Node)) setBgMenuOpen(false)
    }
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setBgMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler) }
  }, [bgMenuOpen])

  // Ctrl+A to select all, Escape to clear, Delete to bulk delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) &&
          document.activeElement !== containerRef.current) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        onSelectAllGrid()
      }
      if (e.key === 'Escape' && gridSelectedIds.size > 0) {
        onClearGridSelection()
      }
      if (e.key === 'Delete' && gridSelectedIds.size > 0) {
        onBulkDelete(Array.from(gridSelectedIds))
        onClearGridSelection()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSelectAllGrid, onClearGridSelection, onBulkDelete, gridSelectedIds])

  // Background right-click
  const handleBgContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const adjustedX = Math.min(e.clientX, window.innerWidth - 220)
    const adjustedY = Math.min(e.clientY, window.innerHeight - 300)
    setBgMenuPos({ x: adjustedX, y: adjustedY })
    setBgMenuOpen(true)
  }, [])

  const handleDragStart = useCallback((idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
    e.dataTransfer.setData('application/criptnote-note', 'true')
    const el = e.currentTarget as HTMLElement
    requestAnimationFrame(() => { el.style.opacity = '0.4' })
  }, [])

  const handleDragOver = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }, [])

  const handleDrop = useCallback((targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const sourceIdx = dragIdx
    if (sourceIdx === null || sourceIdx === targetIdx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }

    const reordered = [...displayNotes]
    const [moved] = reordered.splice(sourceIdx, 1)
    reordered.splice(targetIdx, 0, moved)

    const updates = reordered.map((n, i) => ({ id: n.id, position: i + 1 }))
    onReorder(updates)

    setDragIdx(null)
    setDragOverIdx(null)
  }, [dragIdx, displayNotes, onReorder])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDragOverIdx(null)
    setDragOverFolderId(null)
    document.querySelectorAll('[draggable="true"]').forEach(el => {
      (el as HTMLElement).style.opacity = '1'
    })
  }, [])

  // Drag onto folder card
  const handleFolderDragOver = useCallback((folderId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolderId(folderId)
  }, [])

  const handleFolderDrop = useCallback((folderId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverFolderId(null)
    if (dragIdx !== null && displayNotes[dragIdx]) {
      // Move the dragged note (and any selected) into this folder
      if (gridSelectedIds.size > 0 && gridSelectedIds.has(displayNotes[dragIdx].id)) {
        onBulkMoveToFolder(Array.from(gridSelectedIds), folderId)
        onClearGridSelection()
      } else {
        onMoveToFolder(displayNotes[dragIdx].id, folderId)
      }
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }, [dragIdx, displayNotes, gridSelectedIds, onMoveToFolder, onBulkMoveToFolder, onClearGridSelection])

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolderId(null)
  }, [])

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim()
    if (trimmed) {
      onCreateFolder(trimmed)
      setNewFolderName('')
      setCreatingFolder(false)
    }
  }

  const hasSelection = gridSelectedIds.size > 0
  const allSelected = hasSelection && gridSelectedIds.size === displayNotes.length
  const showingAll = !activeFolderId
  const activeFolder = activeFolderId ? folders.find(f => f.id === activeFolderId) : null

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-full overflow-y-auto pt-4 md:pt-6 px-3 md:px-6 pb-6 outline-none"
      onContextMenu={handleBgContextMenu}
    >
      {/* Back button when inside a folder */}
      {activeFolder && (
        <div className="flex items-center gap-2 mb-3 px-1 animate-[fadeInUp_0.2s_ease-out_both]">
          <button
            onClick={() => onSetActiveFolder(null)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill={activeFolder.color || '#6b7280'} viewBox="0 0 24 24" stroke="none">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{activeFolder.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">({notes.length})</span>
          </div>
        </div>
      )}

      {/* View toggle: All | Only Notes + Folder filter chips */}
      {folders.length > 0 && !activeFolder && (
        <div className="flex items-center gap-2 mb-4 px-1">
          {/* All / Only Notes toggle */}
          <div className="flex items-center rounded-lg bg-gray-100 dark:bg-white/5 p-0.5 shrink-0">
            <button
              onClick={() => setShowOnlyNotes(false)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                !showOnlyNotes
                  ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setShowOnlyNotes(true)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                showOnlyNotes
                  ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Only Notes
            </button>
          </div>

          <div className="w-px h-4 bg-gray-200 dark:bg-white/10 shrink-0" />

          {/* Folder chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap">
            <button
              onClick={() => onSetActiveFolder(null)}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                showingAll
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              All
            </button>
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => onSetActiveFolder(f.id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                  activeFolderId === f.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {f.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />}
                {f.name}
                <span className="opacity-60">({(folderNotes[f.id] || []).length})</span>
              </button>
            ))}
            <button
              onClick={() => { setCreatingFolder(true); setNewFolderName('') }}
              className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-[var(--accent)] rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Inline new folder input */}
      {creatingFolder && (
        <div className="flex items-center gap-2 mb-4 px-1 animate-[fadeInUp_0.2s_ease-out_both]">
          <svg className="w-4 h-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') setCreatingFolder(false)
            }}
            onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false) }}
            autoFocus
            placeholder="Folder name..."
            className="flex-1 bg-transparent text-sm font-medium focus:outline-none border-b border-[var(--accent)] text-gray-900 dark:text-white placeholder-gray-400"
          />
          <button
            onClick={handleCreateFolder}
            className="px-3 py-1 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:opacity-90"
          >
            Create
          </button>
          <button
            onClick={() => setCreatingFolder(false)}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Selection action bar */}
      {hasSelection && (
        <div className="flex items-center gap-3 mb-4 px-1 flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {gridSelectedIds.size} selected
          </span>
          <button
            onClick={allSelected ? onClearGridSelection : onSelectAllGrid}
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>

          <button
            onClick={() => { onBulkMoveToFolder(Array.from(gridSelectedIds), null); onClearGridSelection() }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Move All
          </button>
          <button
            onClick={() => { onBulkArchive(Array.from(gridSelectedIds)); onClearGridSelection() }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Archive All
          </button>
          <button
            onClick={() => { onBulkDelete(Array.from(gridSelectedIds)); onClearGridSelection() }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Delete All
          </button>
          <button
            onClick={onClearGridSelection}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ml-auto"
          >
            Cancel
          </button>
        </div>
      )}

      {notes.length === 0 && folders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-full animate-[fadeIn_0.2s_ease-out]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No notes yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Right-click to create a note or folder</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {/* Folder cards — only when showing all and not "Only Notes" mode */}
          {showingAll && !showOnlyNotes && folders.map((folder, idx) => (
            <div
              key={`folder-${folder.id}`}
              className="animate-[fadeInUp_0.4s_ease-out_both]"
              style={{ animationDelay: `${Math.min(idx * 50, 400)}ms` }}
            >
              <FolderCard
                folder={folder}
                noteCount={(folderNotes[folder.id] || []).length}
                onOpen={() => onSetActiveFolder(folder.id)}
                onRename={(name) => onRenameFolder(folder.id, name)}
                onDelete={() => onDeleteFolder(folder.id)}
                onUpdateColor={(color) => onUpdateFolderColor(folder.id, color)}
                isDragOver={dragOverFolderId === folder.id}
                onDragOver={handleFolderDragOver(folder.id)}
                onDrop={handleFolderDrop(folder.id)}
                onDragLeave={handleFolderDragLeave}
              />
            </div>
          ))}

          {/* Note cards */}
          {displayNotes.map((note, idx) => (
            <div
              key={note.id}
              className="animate-[fadeInUp_0.4s_ease-out_both]"
              style={{ animationDelay: `${Math.min((idx + (showingAll && !showOnlyNotes ? folders.length : 0)) * 50, 600)}ms` }}
            >
              <GridCard
                note={note}
                isSelected={selectedNoteId === note.id}
                folders={folders}
                searchQuery={searchQuery}
                isChecked={gridSelectedIds.has(note.id)}
                hasAnySelection={hasSelection}
                onSelect={() => onSelectNote(note)}
                onDelete={() => onDeleteNote(note.id)}
                onArchive={() => onArchiveNote(note.id)}
                onPin={() => onPinNote(note.id)}
                onRename={(title) => onRenameNote(note.id, title)}
                onMoveToFolder={(folderId) => onMoveToFolder(note.id, folderId)}
                onUpdateColor={(color) => onUpdateColor(note.id, color)}
                onToggleSelect={() => onToggleGridSelect(note.id)}
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDrop={handleDrop(idx)}
                onDragEnd={handleDragEnd}
                isDragOver={dragOverIdx === idx && dragIdx !== idx}
              />
            </div>
          ))}

          {/* Add Note card */}
          <button
            onClick={onCreateNote}
            className="flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200 hover:scale-[1.02] h-[160px] sm:h-[200px] animate-[fadeInUp_0.4s_ease-out_both]"
            style={{ animationDelay: `${Math.min((displayNotes.length + (showingAll && !showOnlyNotes ? folders.length : 0)) * 50, 650)}ms` }}
          >
            <svg className="w-5 h-5 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] sm:text-sm font-medium">New Note</span>
          </button>
        </div>
      )}

      {/* Background context menu */}
      {bgMenuOpen && bgMenuPos && createPortal(
        <div
          ref={bgMenuRef}
          className="fixed z-[9999] w-52 glass-panel-solid rounded-xl shadow-2xl border border-gray-200/50 dark:border-white/10 py-1.5 animate-[scaleIn_0.1s_ease-out]"
          style={{ left: bgMenuPos.x, top: bgMenuPos.y }}
        >
          <button
            onClick={() => { setBgMenuOpen(false); onCreateNote() }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Note
          </button>
          <button
            onClick={() => { setBgMenuOpen(false); setCreatingFolder(true); setNewFolderName('') }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            New Folder
          </button>

          <div className="border-t border-gray-200/50 dark:border-white/10 my-1" />

          <button
            onClick={() => { setBgMenuOpen(false); if (displayNotes.length > 0) onToggleGridSelect(displayNotes[0].id) }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Select
          </button>
          <button
            onClick={() => { setBgMenuOpen(false); onSelectAllGrid() }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            Select All
          </button>

          {activeFolderId && (
            <>
              <div className="border-t border-gray-200/50 dark:border-white/10 my-1" />
              <button
                onClick={() => { setBgMenuOpen(false); onSetActiveFolder(null) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Show All Notes
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
