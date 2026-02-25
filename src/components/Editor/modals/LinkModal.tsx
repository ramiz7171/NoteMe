import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'

interface LinkModalProps {
  editor: Editor
  onClose: () => void
}

export default function LinkModal({ editor, onClose }: LinkModalProps) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isActive = editor.isActive('link')

  useEffect(() => {
    if (isActive) {
      const attrs = editor.getAttributes('link')
      setUrl(attrs.href || '')
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [editor, isActive])

  const handleApply = () => {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
    } else {
      const href = url.startsWith('http') ? url : `https://${url}`
      editor.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank' }).run()
    }
    onClose()
  }

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply()
    if (e.key === 'Escape') onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-96 glass-panel-solid rounded-xl shadow-2xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {isActive ? 'Edit Link' : 'Insert Link'}
        </h3>

        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          className="w-full px-3 py-2 text-sm bg-gray-100/80 dark:bg-white/10 rounded-lg border border-gray-200/50 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />

        <div className="flex items-center justify-between">
          {isActive && (
            <button
              onClick={handleRemove}
              className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Remove Link
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-sm bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
