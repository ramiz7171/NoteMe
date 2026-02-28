import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { FileFolder } from '../../types'

const FOLDER_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  purple: '#a855f7',
  gray: '#6b7280',
}

interface MoveFileModalProps {
  onClose: () => void
  onMove: (folderId: string | null) => void
  allFolders: FileFolder[]
  currentFolderId: string | null
  itemName: string
}

function FolderTreeItem({
  folder,
  allFolders,
  selectedId,
  onSelect,
  depth = 0,
}: {
  folder: FileFolder
  allFolders: FileFolder[]
  selectedId: string | null
  onSelect: (id: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const children = allFolders.filter(f => f.parent_folder_id === folder.id)
  const color = FOLDER_COLORS[folder.color] || FOLDER_COLORS.blue
  const isSelected = selectedId === folder.id

  return (
    <div>
      <button
        onClick={() => onSelect(folder.id)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
          isSelected ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {children.length > 0 && (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className="shrink-0 cursor-pointer"
          >
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
        {children.length === 0 && <span className="w-3" />}
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill={color} opacity={0.85}>
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded && children.map(child => (
        <FolderTreeItem
          key={child.id}
          folder={child}
          allFolders={allFolders}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export default function MoveFileModal({
  onClose,
  onMove,
  allFolders,
  currentFolderId,
  itemName,
}: MoveFileModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId)
  const rootFolders = allFolders.filter(f => !f.parent_folder_id)

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[92vw] max-w-80 max-h-[60vh] glass-panel-solid rounded-xl shadow-2xl flex flex-col animate-[scaleIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200/50 dark:border-white/5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Move "{itemName}"</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Select destination folder</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* Root option */}
          <button
            onClick={() => setSelectedId(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
              selectedId === null ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            My Files (root)
          </button>

          {rootFolders.map(folder => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              allFolders={allFolders}
              selectedId={selectedId}
              onSelect={setSelectedId}
              depth={0}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200/50 dark:border-white/5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onMove(selectedId); onClose() }}
            className="px-4 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
