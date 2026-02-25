import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Note, Folder } from '../../types'
import { TAB_COLORS } from '../Layout/TabBar'

interface GridViewProps {
  notes: Note[]
  folders: Folder[]
  selectedNoteId: string | null
  onSelectNote: (note: Note) => void
  onDeleteNote: (id: string) => void
  onArchiveNote: (id: string) => void
  onPinNote: (id: string) => void
  onRenameNote: (id: string, title: string) => void
  onMoveToFolder: (noteId: string, folderId: string | null) => void
  onUpdateColor: (noteId: string, color: string) => void
  onReorder: (updates: { id: string; position: number }[]) => void
  onCreateNote: () => void
}

const NOTE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: 'Basic', color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  java: { label: 'Java', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  javascript: { label: 'JS', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
  python: { label: 'Python', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  sql: { label: 'SQL', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
}

function GridCard({
  note,
  isSelected,
  folders,
  onSelect,
  onDelete,
  onArchive,
  onPin,
  onRename,
  onMoveToFolder,
  onUpdateColor,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: {
  note: Note
  isSelected: boolean
  folders: Folder[]
  onSelect: () => void
  onDelete: () => void
  onArchive: () => void
  onPin: () => void
  onRename: (title: string) => void
  onMoveToFolder: (folderId: string | null) => void
  onUpdateColor: (color: string) => void
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
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ x: rect.right + 4, y: rect.top })
    setMenuOpen(!menuOpen)
    setShowColorPicker(false)
    setShowFolderPicker(false)
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
  const plainContent = note.content
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_~`>-]/g, '')
    .trim()

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        style={cardBgStyle}
        className={`group relative glass-card rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
          isSelected ? 'ring-2 ring-[var(--accent)] shadow-md' : ''
        } ${isDragOver ? 'ring-2 ring-[var(--accent)]/50 scale-[1.03]' : ''}`}
      >
        {/* 3-dot menu */}
        <button
          ref={menuBtnRef}
          onClick={handleMenuClick}
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-all z-10"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {/* Pin indicator */}
        {note.pinned && (
          <div className="absolute top-3 left-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] block" />
          </div>
        )}

        {/* Title */}
        <div className="pr-8 mb-2">
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
              className="w-full bg-transparent font-semibold text-sm focus:outline-none border-b border-[var(--accent)] text-gray-900 dark:text-white"
            />
          ) : (
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {note.title}
            </h3>
          )}
        </div>

        {/* Content preview */}
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3 leading-relaxed min-h-[3rem]">
          {plainContent || 'Empty note'}
        </p>

        {/* Footer: type badge + date */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(note.updated_at).toLocaleDateString()}
          </span>
        </div>

        {/* Color bar at bottom */}
        {note.color && (
          <div
            className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
            style={{ backgroundColor: note.color }}
          />
        )}
      </div>

      {/* Dropdown menu via portal */}
      {menuOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-48 glass-panel rounded-xl shadow-xl py-1 animate-[scaleIn_0.1s_ease-out]"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
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
        </div>,
        document.body
      )}
    </>
  )
}

export default function GridView({
  notes,
  folders,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
  onArchiveNote,
  onPinNote,
  onRenameNote,
  onMoveToFolder,
  onUpdateColor,
  onReorder,
  onCreateNote,
}: GridViewProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleDragStart = useCallback((idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
    // Make the dragged element semi-transparent
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

    const reordered = [...notes]
    const [moved] = reordered.splice(sourceIdx, 1)
    reordered.splice(targetIdx, 0, moved)

    const updates = reordered.map((n, i) => ({ id: n.id, position: i + 1 }))
    onReorder(updates)

    setDragIdx(null)
    setDragOverIdx(null)
  }, [dragIdx, notes, onReorder])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDragOverIdx(null)
    // Restore opacity on all cards
    document.querySelectorAll('[draggable="true"]').forEach(el => {
      (el as HTMLElement).style.opacity = '1'
    })
  }, [])

  return (
    <div className="h-full overflow-y-auto p-6">
      {notes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <p className="text-lg font-medium">No notes yet</p>
            <button
              onClick={onCreateNote}
              className="mt-4 px-5 py-2.5 text-sm bg-black dark:bg-white hover:opacity-90 text-white dark:text-black font-medium rounded-xl transition-all"
            >
              + New Note
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {notes.map((note, idx) => (
            <GridCard
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              folders={folders}
              onSelect={() => onSelectNote(note)}
              onDelete={() => onDeleteNote(note.id)}
              onArchive={() => onArchiveNote(note.id)}
              onPin={() => onPinNote(note.id)}
              onRename={(title) => onRenameNote(note.id, title)}
              onMoveToFolder={(folderId) => onMoveToFolder(note.id, folderId)}
              onUpdateColor={(color) => onUpdateColor(note.id, color)}
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverIdx === idx && dragIdx !== idx}
            />
          ))}

          {/* Add Note card */}
          <button
            onClick={onCreateNote}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200 hover:scale-[1.02] min-h-[160px]"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">New Note</span>
          </button>
        </div>
      )}
    </div>
  )
}
