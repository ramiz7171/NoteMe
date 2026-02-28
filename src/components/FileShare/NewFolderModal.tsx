import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { FileFolderColor } from '../../types'

const COLORS: { value: FileFolderColor; hex: string; label: string }[] = [
  { value: 'blue', hex: '#3b82f6', label: 'Blue' },
  { value: 'green', hex: '#22c55e', label: 'Green' },
  { value: 'yellow', hex: '#eab308', label: 'Yellow' },
  { value: 'red', hex: '#ef4444', label: 'Red' },
  { value: 'purple', hex: '#a855f7', label: 'Purple' },
  { value: 'gray', hex: '#6b7280', label: 'Gray' },
]

interface NewFolderModalProps {
  onClose: () => void
  onSubmit: (name: string, color: FileFolderColor) => void
  initialName?: string
  initialColor?: FileFolderColor
  isRename?: boolean
}

export default function NewFolderModal({
  onClose,
  onSubmit,
  initialName = '',
  initialColor = 'blue',
  isRename = false,
}: NewFolderModalProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<FileFolderColor>(initialColor)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (isRename) inputRef.current?.select()
  }, [isRename])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), color)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-[92vw] max-w-80 glass-panel-solid rounded-xl shadow-2xl p-5 animate-[scaleIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {isRename ? 'Rename Folder' : 'New Folder'}
        </h3>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 mb-3"
        />

        {!isRename && (
          <div className="mb-4">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Color</span>
            <div className="flex gap-2 mt-1.5">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-[var(--accent)] dark:ring-offset-gray-800 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ background: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
          >
            {isRename ? 'Rename' : 'Create'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
