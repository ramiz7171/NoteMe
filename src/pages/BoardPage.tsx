import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react'
import getStroke from 'perfect-freehand'
import TabBar, { type Tab } from '../components/Layout/TabBar'
import { getSvgPathFromStroke, getStrokeOptions, renderStroke, renderAllStrokes, type StrokeData } from '../lib/drawUtils'
import type { Note, NoteType } from '../types'

type Tool = 'pen' | 'marker' | 'highlighter' | 'eraser'

interface BoardPageProps {
  boardNotes: Note[]
  loading: boolean
  createNote: (title: string, content: string, noteType: NoteType, expiresAt?: string | null) => Promise<{ error: unknown; data?: Note | null } | undefined>
  updateNote: (id: string, updates: { title?: string; content?: string; note_type?: NoteType; color?: string; position?: number; expires_at?: string | null }) => Promise<{ error: unknown }>
  deleteNote: (id: string) => Promise<{ error: unknown } | undefined>
}

const COLORS = [
  '#000000', '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#92400e', '#ffffff',
]

const SIZES = [
  { label: 'S', value: 2 },
  { label: 'M', value: 4 },
  { label: 'L', value: 8 },
  { label: 'XL', value: 16 },
]

const TOOL_ICONS: Record<Tool, React.ReactNode> = {
  pen: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  ),
  marker: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
    </svg>
  ),
  highlighter: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
    </svg>
  ),
  eraser: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M5.25 12.75l6-6 6 6-4.5 4.5H7.5a2.25 2.25 0 0 1-1.591-.659l-.659-.659Z" />
    </svg>
  ),
}

const TOOL_TITLES: Record<Tool, string> = {
  pen: 'Pen',
  marker: 'Marker',
  highlighter: 'Highlighter',
  eraser: 'Eraser',
}

/* ─── BoardCanvas ─────────────────────────────────────────────────── */

const BoardCanvas = memo(function BoardCanvas({ board, onSave }: { board: Note; onSave: (boardId: string, strokes: StrokeData[]) => void }) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null)
  const activeCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Stable ref for onSave to avoid re-render cycles from realtime updates
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [strokes, setStrokes] = useState<StrokeData[]>(() => {
    try { return JSON.parse(board.content || '[]') }
    catch { return [] }
  })
  const [undoneStrokes, setUndoneStrokes] = useState<StrokeData[]>([])
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const isDrawingRef = useRef(false)
  const currentPointsRef = useRef<[number, number, number][]>([])
  const rafRef = useRef(0)
  const strokesRef = useRef<StrokeData[]>(strokes)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { strokesRef.current = strokes }, [strokes])

  // Auto-save with debounce — uses ref to avoid re-render cycles
  const boardIdRef = useRef(board.id)
  boardIdRef.current = board.id

  const triggerSave = useCallback(() => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      onSaveRef.current(boardIdRef.current, strokesRef.current)
    }, 500)
  }, [])

  // Cleanup timer on unmount — flush save
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current)
      if (strokesRef.current.length > 0) {
        onSaveRef.current(boardIdRef.current, strokesRef.current)
      }
    }
  }, [])

  // Setup canvases
  useEffect(() => {
    const setup = () => {
      const container = containerRef.current
      const mainCanvas = mainCanvasRef.current
      const activeCanvas = activeCanvasRef.current
      if (!container || !mainCanvas || !activeCanvas) return

      const { width, height } = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      for (const canvas of [mainCanvas, activeCanvas]) {
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        const ctx = canvas.getContext('2d')!
        ctx.scale(dpr, dpr)
      }

      const ctx = mainCanvas.getContext('2d')!
      for (const stroke of strokesRef.current) {
        renderStroke(ctx, stroke)
      }
    }

    setup()
    window.addEventListener('resize', setup)
    return () => window.removeEventListener('resize', setup)
  }, [])

  const renderActiveStroke = useCallback(() => {
    const canvas = activeCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, width, height)

    if (currentPointsRef.current.length < 2) return

    const options = getStrokeOptions(tool, brushSize)
    const outlinePoints = getStroke(currentPointsRef.current, options)
    const pathData = getSvgPathFromStroke(outlinePoints)
    if (!pathData) return

    const path = new Path2D(pathData)
    ctx.save()

    if (tool === 'eraser') {
      ctx.globalAlpha = 0.25
      ctx.fillStyle = '#ef4444'
    } else if (tool === 'highlighter') {
      ctx.globalAlpha = 0.3
      ctx.fillStyle = color
    } else {
      ctx.globalAlpha = 1
      ctx.fillStyle = color
    }

    ctx.fill(path)
    ctx.restore()
  }, [tool, color, brushSize])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const canvas = activeCanvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    isDrawingRef.current = true

    const rect = canvas.getBoundingClientRect()
    currentPointsRef.current = [[e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]]
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return
    const canvas = activeCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const evt of events) {
      currentPointsRef.current.push([evt.clientX - rect.left, evt.clientY - rect.top, evt.pressure || 0.5])
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(renderActiveStroke)
  }, [renderActiveStroke])

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    if (currentPointsRef.current.length > 1) {
      const newStroke: StrokeData = {
        points: [...currentPointsRef.current],
        color: tool === 'eraser' ? '#000000' : color,
        size: brushSize,
        tool,
        opacity: tool === 'highlighter' ? 0.3 : 1,
      }

      setStrokes(prev => {
        const next = [...prev, newStroke]
        const mainCanvas = mainCanvasRef.current
        if (mainCanvas) {
          const ctx = mainCanvas.getContext('2d')
          if (ctx) {
            if (tool === 'eraser') {
              const { width, height } = mainCanvas.getBoundingClientRect()
              renderAllStrokes(ctx, next, width, height)
            } else {
              renderStroke(ctx, newStroke)
            }
          }
        }
        return next
      })
      setUndoneStrokes([])
      triggerSave()
    }

    const activeCanvas = activeCanvasRef.current
    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d')
      if (ctx) {
        const { width, height } = activeCanvas.getBoundingClientRect()
        ctx.clearRect(0, 0, width, height)
      }
    }
    currentPointsRef.current = []
  }, [tool, color, brushSize, triggerSave])

  const handleUndo = useCallback(() => {
    setStrokes(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setUndoneStrokes(u => [...u, last])
      const next = prev.slice(0, -1)
      const mainCanvas = mainCanvasRef.current
      if (mainCanvas) {
        const ctx = mainCanvas.getContext('2d')
        if (ctx) {
          const { width, height } = mainCanvas.getBoundingClientRect()
          renderAllStrokes(ctx, next, width, height)
        }
      }
      return next
    })
    triggerSave()
  }, [triggerSave])

  const handleRedo = useCallback(() => {
    setUndoneStrokes(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setStrokes(s => {
        const next = [...s, last]
        const mainCanvas = mainCanvasRef.current
        if (mainCanvas) {
          const ctx = mainCanvas.getContext('2d')
          if (ctx) {
            if (last.tool === 'eraser') {
              const { width, height } = mainCanvas.getBoundingClientRect()
              renderAllStrokes(ctx, next, width, height)
            } else {
              renderStroke(ctx, last)
            }
          }
        }
        return next
      })
      return prev.slice(0, -1)
    })
    triggerSave()
  }, [triggerSave])

  const handleClear = useCallback(() => {
    setStrokes([])
    setUndoneStrokes([])
    setShowClearConfirm(false)
    const mainCanvas = mainCanvasRef.current
    if (mainCanvas) {
      const ctx = mainCanvas.getContext('2d')
      if (ctx) {
        const { width, height } = mainCanvas.getBoundingClientRect()
        ctx.clearRect(0, 0, width, height)
      }
    }
    triggerSave()
  }, [triggerSave])

  const handleExport = useCallback(() => {
    const mainCanvas = mainCanvasRef.current
    if (!mainCanvas) return
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = mainCanvas.width
    tempCanvas.height = mainCanvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.fillStyle = '#ffffff'
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    tempCtx.drawImage(mainCanvas, 0, 0)
    tempCanvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${board.title || 'board'}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [board.title])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo, handleRedo])

  const divider = <div className="w-px h-6 bg-gray-200 dark:bg-white/10 shrink-0" />

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-2 border-b border-gray-200/50 dark:border-white/5 bg-white/60 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tools */}
          <div className="flex items-center gap-1">
            {(['pen', 'marker', 'highlighter', 'eraser'] as Tool[]).map(t => (
              <button
                key={t}
                onClick={() => setTool(t)}
                title={TOOL_TITLES[t]}
                className={`p-2 rounded-lg transition-colors ${
                  tool === t
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {TOOL_ICONS[t]}
              </button>
            ))}
          </div>

          {divider}

          {/* Colors */}
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === c ? 'border-black dark:border-white scale-110' : 'border-gray-300 dark:border-white/20'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          {divider}

          {/* Brush sizes */}
          <div className="flex items-center gap-1">
            {SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => setBrushSize(s.value)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  brushSize === s.value
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
                title={`${s.label} (${s.value}px)`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: Math.max(s.value * 1.5, 4), height: Math.max(s.value * 1.5, 4) }}
                />
              </button>
            ))}
          </div>

          {divider}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className={`p-1.5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 ${strokes.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={undoneStrokes.length === 0}
              className={`p-1.5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 ${undoneStrokes.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={strokes.length === 0}
              className={`p-1.5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 ${strokes.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Clear All"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>

          {divider}

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={strokes.length === 0}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 ${strokes.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4 inline -mt-0.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            PNG
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-white dark:bg-[#1e1e1e]"
        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
      >
        <canvas
          ref={mainCanvasRef}
          className="absolute inset-0"
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
        />
        <canvas
          ref={activeCanvasRef}
          className="absolute inset-0"
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Clear confirm */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="glass-panel-solid rounded-2xl p-5 w-[320px] space-y-4 animate-[scaleIn_0.15s_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Clear Board</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will erase everything on the board. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-1.5 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}, (prev, next) => prev.board.id === next.board.id)

/* ─── Board List Item ─────────────────────────────────────────────── */

function BoardListItem({
  board,
  isActive,
  onClick,
  onDelete,
  onRename,
}: {
  board: Note
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(board.title)

  const handleRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== board.title) onRename(trimmed)
    else setEditTitle(board.title)
    setEditing(false)
  }

  let strokeCount = 0
  try {
    const parsed = JSON.parse(board.content || '[]')
    strokeCount = Array.isArray(parsed) ? parsed.length : 0
  } catch { /* */ }

  return (
    <div
      className={`group relative flex items-center rounded-xl text-sm transition-all duration-150 mx-2 mb-0.5 ${
        isActive
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
              if (e.key === 'Escape') { setEditTitle(board.title); setEditing(false) }
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
            className="w-full bg-transparent font-medium text-sm focus:outline-none border-b border-[var(--accent)]"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0 text-[var(--accent)] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
            </svg>
            <span className="font-medium truncate">{board.title}</span>
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {strokeCount} stroke{strokeCount !== 1 ? 's' : ''} &middot; {new Date(board.updated_at).toLocaleDateString()}
        </div>
      </button>

      {!editing && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); setEditTitle(board.title); setEditing(true) }}
            className="p-1 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            title="Rename"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── BoardPage ───────────────────────────────────────────────────── */

export default function BoardPage({ boardNotes, loading, createNote, updateNote, deleteNote }: BoardPageProps) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupColors, setGroupColors] = useState<Record<string, string>>({})

  const boardCounter = useMemo(() => {
    const used = new Set<number>()
    for (const n of boardNotes) {
      const match = n.title.match(/^Board (\d+)$/)
      if (match) used.add(parseInt(match[1], 10))
    }
    let i = 1
    while (used.has(i)) i++
    return i
  }, [boardNotes])

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null
  const currentBoard = activeTab?.noteId ? boardNotes.find(n => n.id === activeTab.noteId) ?? null : null

  const groups = useMemo(() => {
    const set = new Set<string>()
    for (const t of tabs) { if (t.group) set.add(t.group) }
    return [...set]
  }, [tabs])

  // If active board was deleted externally, remove its tab
  useEffect(() => {
    setTabs(prev => {
      const boardIds = new Set(boardNotes.map(n => n.id))
      const orphans = prev.filter(t => t.noteId && !boardIds.has(t.noteId))
      if (orphans.length === 0) return prev
      const next = prev.filter(t => !t.noteId || boardIds.has(t.noteId))
      if (activeTabId && orphans.some(t => t.id === activeTabId)) {
        if (next.length > 0) setActiveTabId(next[next.length - 1].id)
        else setActiveTabId(null)
      }
      return next
    })
  }, [boardNotes, activeTabId])

  const handleNewBoard = useCallback(async () => {
    const title = `Board ${boardCounter}`
    const result = await createNote(title, '[]', 'board')
    if (result && 'data' in result && result.data) {
      const newTab: Tab = {
        id: `btab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        noteId: result.data.id,
        title,
        color: '',
        group: '',
      }
      setTabs(prev => [...prev, newTab])
      setActiveTabId(newTab.id)
    }
  }, [boardCounter, createNote])

  const openBoardInTab = useCallback((note: Note) => {
    const existing = tabs.find(t => t.noteId === note.id)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }
    const newTab: Tab = {
      id: `btab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      noteId: note.id,
      title: note.title,
      color: '',
      group: '',
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [tabs])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId) {
        if (next.length > 0) {
          setActiveTabId(next[Math.min(idx, next.length - 1)].id)
        } else {
          setActiveTabId(null)
        }
      }
      return next
    })
  }, [activeTabId])

  const handleDeleteBoard = useCallback(async (id: string) => {
    // Remove tab first
    setTabs(prev => {
      const idx = prev.findIndex(t => t.noteId === id)
      const next = prev.filter(t => t.noteId !== id)
      if (activeTabId && prev.find(t => t.id === activeTabId)?.noteId === id) {
        if (next.length > 0) {
          setActiveTabId(next[Math.min(Math.max(idx, 0), next.length - 1)].id)
        } else {
          setActiveTabId(null)
        }
      }
      return next
    })
    await deleteNote(id)
  }, [activeTabId, deleteNote])

  const handleSaveStrokes = useCallback(async (boardId: string, strokes: StrokeData[]) => {
    await updateNote(boardId, { content: JSON.stringify(strokes) })
  }, [updateNote])

  const handleRenameBoard = useCallback(async (id: string, title: string) => {
    await updateNote(id, { title })
    setTabs(prev => prev.map(t => t.noteId === id ? { ...t, title } : t))
  }, [updateNote])

  const filteredBoards = useMemo(() => {
    if (!searchQuery.trim()) return boardNotes
    const q = searchQuery.toLowerCase()
    return boardNotes.filter(n => n.title.toLowerCase().includes(q))
  }, [boardNotes, searchQuery])

  // Tab callbacks
  const handleReorder = useCallback((reordered: Tab[]) => setTabs(reordered), [])
  const handleUpdateTab = useCallback((tabId: string, updates: Partial<Pick<Tab, 'color' | 'group'>>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t))
  }, [])
  const handleRenameTab = useCallback(async (tabId: string, title: string) => {
    const tab = tabs.find(t => t.id === tabId)
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title } : t))
    if (tab?.noteId) await updateNote(tab.noteId, { title })
  }, [tabs, updateNote])
  const handleUpdateGroupColor = useCallback((group: string, color: string) => {
    setGroupColors(prev => ({ ...prev, [group]: color }))
  }, [])
  const handleRenameGroup = useCallback((oldName: string, newName: string) => {
    setTabs(prev => prev.map(t => t.group === oldName ? { ...t, group: newName } : t))
    setGroupColors(prev => {
      const next = { ...prev }
      if (next[oldName] !== undefined) { next[newName] = next[oldName]; delete next[oldName] }
      return next
    })
  }, [])

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Left sidebar */}
      <div className="w-[280px] shrink-0 border-r border-gray-200/50 dark:border-white/5 flex flex-col bg-white/60 dark:bg-white/[0.03]">
        <div className="p-3 space-y-2 shrink-0">
          <button
            onClick={handleNewBoard}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Board
          </button>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search boards..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full" />
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {searchQuery.trim() ? 'No boards found' : 'No boards yet'}
              </p>
            </div>
          ) : (
            filteredBoards.map(board => (
              <BoardListItem
                key={board.id}
                board={board}
                isActive={currentBoard?.id === board.id}
                onClick={() => openBoardInTab(board)}
                onDelete={() => handleDeleteBoard(board.id)}
                onRename={(title) => handleRenameBoard(board.id, title)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tabs.length > 0 && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onNewTab={handleNewBoard}
            onReorder={handleReorder}
            onUpdateTab={handleUpdateTab}
            onRenameTab={handleRenameTab}
            groups={groups}
            groupColors={groupColors}
            onUpdateGroupColor={handleUpdateGroupColor}
            onRenameGroup={handleRenameGroup}
          />
        )}

        {currentBoard ? (
          <BoardCanvas
            key={currentBoard.id}
            board={currentBoard}
            onSave={handleSaveStrokes}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1e1e1e]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {boardNotes.length === 0 ? 'No boards yet' : 'Select a board'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                {boardNotes.length === 0
                  ? 'Create your first board to start drawing.'
                  : 'Choose a board from the sidebar or create a new one.'}
              </p>
              {boardNotes.length === 0 && (
                <button
                  onClick={handleNewBoard}
                  className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
                >
                  + New Board
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
