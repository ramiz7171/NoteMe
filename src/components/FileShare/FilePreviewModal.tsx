import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import hljs from 'highlight.js'
import type { UserFile } from '../../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const TEXT_EXTENSIONS = ['txt', 'log', 'md', 'json', 'xml', 'yaml', 'yml', 'csv', 'env', 'gitignore', 'editorconfig', 'toml', 'ini', 'cfg']
const CODE_EXTENSIONS = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'html', 'css', 'scss', 'less', 'sql', 'sh', 'bash', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'swift', 'kt', 'dart', 'vue', 'svelte']

function getPreviewType(fileType: string, fileName: string): 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'unsupported' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (fileType.startsWith('image/')) return 'image'
  if (fileType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (fileType.startsWith('video/')) return 'video'
  if (fileType.startsWith('audio/')) return 'audio'
  if (fileType.startsWith('text/') || TEXT_EXTENSIONS.includes(ext) || CODE_EXTENSIONS.includes(ext)) return 'text'
  return 'unsupported'
}

function TextPreview({ url, fileName }: { url: string; fileName: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const codeRef = useRef<HTMLElement>(null)
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(text => setContent(text))
      .catch(() => setError(true))
  }, [url])

  useEffect(() => {
    if (content && codeRef.current) {
      try {
        hljs.highlightElement(codeRef.current)
      } catch { /* ignore highlight errors */ }
    }
  }, [content])

  if (error) return <p className="text-sm text-gray-400">Failed to load file content</p>
  if (content === null) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" /></div>

  return (
    <pre className="w-full h-full overflow-auto p-4 bg-gray-50 dark:bg-black/30 rounded-lg text-xs leading-relaxed">
      <code ref={codeRef} className={CODE_EXTENSIONS.includes(ext) ? `language-${ext}` : ''}>
        {content}
      </code>
    </pre>
  )
}

function PdfPreview({ url }: { url: string }) {
  return (
    <iframe
      src={`${url}#toolbar=1`}
      className="w-full h-full rounded-lg border border-gray-200/50 dark:border-white/10"
      title="PDF preview"
    />
  )
}

interface FilePreviewModalProps {
  file: UserFile
  fileUrl: string
  onClose: () => void
  onDownload: () => void
}

export default function FilePreviewModal({ file, fileUrl, onClose, onDownload }: FilePreviewModalProps) {
  const previewType = getPreviewType(file.file_type, file.file_name)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[90vw] max-w-5xl h-[85vh] glass-panel-solid rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[scaleIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200/50 dark:border-white/5 shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{file.file_name}</h3>
            <p className="text-[10px] text-gray-400">{formatSize(file.file_size)} &bull; {new Date(file.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {previewType === 'image' && (
            <div className="w-full h-full flex items-center justify-center bg-gray-50/50 dark:bg-black/20 rounded-xl overflow-auto">
              <img src={fileUrl} alt={file.file_name} className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {previewType === 'pdf' && (
            <PdfPreview url={fileUrl} />
          )}

          {previewType === 'video' && (
            <div className="w-full h-full flex items-center justify-center bg-black rounded-xl">
              <video src={fileUrl} controls className="max-w-full max-h-full rounded-xl">
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {previewType === 'audio' && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
              <div className="w-24 h-24 rounded-3xl bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-12 h-12 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <audio src={fileUrl} controls className="w-full max-w-md">
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {previewType === 'text' && (
            <TextPreview url={fileUrl} fileName={file.file_name} />
          )}

          {previewType === 'unsupported' && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Preview not available for this file type</p>
              <button
                onClick={onDownload}
                className="px-5 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
