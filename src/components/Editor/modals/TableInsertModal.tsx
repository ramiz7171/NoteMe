import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'

interface TableInsertModalProps {
  editor: Editor
  onClose: () => void
  anchorRect?: DOMRect | null
}

const MAX_ROWS = 8
const MAX_COLS = 8

export default function TableInsertModal({ editor, onClose, anchorRect }: TableInsertModalProps) {
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)

  const handleInsert = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    onClose()
  }

  const style: React.CSSProperties = anchorRect
    ? { position: 'fixed', top: anchorRect.bottom + 4, left: anchorRect.left, zIndex: 9999 }
    : {}

  const content = (
    <div
      className="glass-panel-solid rounded-xl shadow-2xl p-3 space-y-2"
      style={anchorRect ? style : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {hoverRow > 0 ? `${hoverRow} x ${hoverCol} Table` : 'Select size'}
      </span>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}>
        {Array.from({ length: MAX_ROWS }, (_, r) =>
          Array.from({ length: MAX_COLS }, (_, c) => (
            <button
              key={`${r}-${c}`}
              onMouseEnter={() => { setHoverRow(r + 1); setHoverCol(c + 1) }}
              onClick={() => handleInsert(r + 1, c + 1)}
              className={`w-5 h-5 rounded-sm border transition-colors ${
                r < hoverRow && c < hoverCol
                  ? 'bg-[var(--accent)]/30 border-[var(--accent)]/50'
                  : 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10'
              }`}
            />
          ))
        )}
      </div>
    </div>
  )

  if (anchorRect) {
    return createPortal(
      <div className="fixed inset-0 z-[9999]" onClick={onClose}>
        {content}
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" onClick={onClose}>
      {content}
    </div>,
    document.body
  )
}
