import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { FileFolderColor } from '../../types'

const FOLDER_COLORS: { value: FileFolderColor; hex: string }[] = [
  { value: 'blue', hex: '#3b82f6' },
  { value: 'green', hex: '#22c55e' },
  { value: 'yellow', hex: '#eab308' },
  { value: 'red', hex: '#ef4444' },
  { value: 'purple', hex: '#a855f7' },
  { value: 'gray', hex: '#6b7280' },
]

interface FileContextMenuProps {
  x: number
  y: number
  type: 'file' | 'folder'
  hasShareId: boolean
  onClose: () => void
  onPreview?: () => void
  onDownload?: () => void
  onRename: () => void
  onMove: () => void
  onShare?: () => void
  onDelete: () => void
  onOpen?: () => void
  onChangeColor?: (color: FileFolderColor) => void
}

export default function FileContextMenu({
  x,
  y,
  type,
  hasShareId,
  onClose,
  onPreview,
  onDownload,
  onRename,
  onMove,
  onShare,
  onDelete,
  onOpen,
  onChangeColor,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 220)
  const adjustedY = Math.min(y, window.innerHeight - 320)

  const menuItem = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button
      key={label}
      onClick={() => { onClick(); onClose() }}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-52 glass-panel-solid rounded-xl shadow-2xl border border-gray-200/50 dark:border-white/10 py-1.5 animate-[scaleIn_0.1s_ease-out]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {type === 'folder' ? (
        <>
          {onOpen && menuItem('Open', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
          ), onOpen)}
          {menuItem('Rename', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          ), onRename)}
          {/* Color picker */}
          {onChangeColor && (
            <div className="px-3 py-1.5">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Color</span>
              <div className="flex gap-1.5 mt-1">
                {FOLDER_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { onChangeColor(c.value); onClose() }}
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm hover:scale-110 transition-transform"
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}
          {menuItem('Move to...', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
          ), onMove)}
          <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
          {menuItem('Delete', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          ), onDelete, true)}
        </>
      ) : (
        <>
          {onPreview && menuItem('Preview', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          ), onPreview)}
          {onDownload && menuItem('Download', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          ), onDownload)}
          {menuItem('Rename', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          ), onRename)}
          {menuItem('Move to...', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
          ), onMove)}
          <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
          {onShare && menuItem(hasShareId ? 'Manage Share Link' : 'Share Link', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          ), onShare)}
          <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
          {menuItem('Delete', (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          ), onDelete, true)}
        </>
      )}
    </div>,
    document.body
  )
}
