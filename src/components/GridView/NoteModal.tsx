import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import NoteEditor from '../Editor/NoteEditor'
import type { Note, NoteType } from '../../types'

interface NoteModalProps {
  note: Note
  onClose: () => void
  onUpdate: (id: string, updates: { title?: string; content?: string; note_type?: NoteType; expires_at?: string | null }) => Promise<{ error: unknown } | undefined>
  onDelete: (id: string) => Promise<{ error: unknown } | undefined>
}

const MIN_W = 400
const MIN_H = 300

export default function NoteModal({ note, onClose, onUpdate, onDelete }: NoteModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  const [closing, setClosing] = useState(false)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const resizing = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)

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

  // Resize handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return
      e.preventDefault()
      const dx = e.clientX - resizing.current.startX
      const dy = e.clientY - resizing.current.startY
      const newW = Math.max(MIN_W, Math.min(resizing.current.startW + dx * 2, window.innerWidth * 0.95))
      const newH = Math.max(MIN_H, Math.min(resizing.current.startH + dy * 2, window.innerHeight * 0.95))
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

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current && mouseDownTargetRef.current === backdropRef.current) {
      animateClose()
    }
  }

  const handleDelete = async (id: string) => {
    const result = await onDelete(id)
    if (!result?.error) animateClose()
    return result
  }

  const panelStyle: React.CSSProperties = size
    ? { width: size.w, height: size.h }
    : {}

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
        style={panelStyle}
        className={`${size ? '' : 'w-[92vw] max-w-5xl h-[80vh] md:h-[75vh]'} glass-panel-solid rounded-2xl shadow-2xl flex flex-col overflow-hidden relative ${
          closing ? 'opacity-0 scale-95 transition-all duration-200' : 'animate-[scaleIn_0.15s_ease-out]'
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

        {/* Resize handle — bottom-right corner */}
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
    </div>,
    document.body
  )
}
