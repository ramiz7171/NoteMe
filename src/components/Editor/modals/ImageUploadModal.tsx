import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { useImageUpload } from '../hooks/useImageUpload'

interface ImageUploadModalProps {
  editor: Editor
  onClose: () => void
}

export default function ImageUploadModal({ editor, onClose }: ImageUploadModalProps) {
  const { uploadImage, uploading } = useImageUpload()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleInsert = async () => {
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) {
      editor.chain().focus().setImage({ src: publicUrl }).run()
    }
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-[28rem] glass-panel-solid rounded-xl shadow-2xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Insert Image</h3>

        {!preview ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              dragOver
                ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/30'
            }`}
          >
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400">Drop image here or click to browse</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        ) : (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full max-h-52 object-contain rounded-lg bg-gray-50 dark:bg-white/5" />
            <button
              onClick={() => { setPreview(null); setFile(null) }}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!file || uploading}
            className="px-4 py-1.5 text-sm bg-[var(--accent)] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {uploading ? 'Uploading...' : 'Insert'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
