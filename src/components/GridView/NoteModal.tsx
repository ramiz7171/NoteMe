import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import NoteEditor from '../Editor/NoteEditor'
import type { Note, NoteType } from '../../types'

interface NoteModalProps {
  note: Note
  onClose: () => void
  onUpdate: (id: string, updates: { title?: string; content?: string; note_type?: NoteType }) => Promise<{ error: unknown } | undefined>
  onDelete: (id: string) => Promise<{ error: unknown } | undefined>
}

export default function NoteModal({ note, onClose, onUpdate, onDelete }: NoteModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  const [closing, setClosing] = useState(false)

  const animateClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 200)
  }, [onClose, closing])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') animateClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [animateClose])

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if both mousedown AND click happened on the backdrop
    if (e.target === backdropRef.current && mouseDownTargetRef.current === backdropRef.current) {
      animateClose()
    }
  }

  const handleDelete = async (id: string) => {
    const result = await onDelete(id)
    if (!result?.error) animateClose()
    return result
  }

  return createPortal(
    <div
      ref={backdropRef}
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'animate-[fadeIn_0.15s_ease-out]'
      }`}
    >
      <div
        className={`w-[95vw] max-w-6xl h-[80vh] glass-panel-solid rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          closing ? 'opacity-0 scale-95' : 'animate-[scaleIn_0.15s_ease-out]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal top bar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            {note.color && (
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
            )}
          </div>
          <button
            onClick={animateClose}
            className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <NoteEditor
            key={note.id}
            note={note}
            isNew={false}
            onSave={async () => {}}
            onUpdate={onUpdate}
            onDelete={handleDelete}
            noTitleIndex={0}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
