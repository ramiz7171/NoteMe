import type { FileFolder, UserFile } from '../../types'

const FOLDER_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  purple: '#a855f7',
  gray: '#6b7280',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getFileTypeLabel(fileType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (fileType.startsWith('image/')) return 'Image'
  if (fileType === 'application/pdf') return 'PDF'
  if (fileType.startsWith('video/')) return 'Video'
  if (fileType.startsWith('audio/')) return 'Audio'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archive'
  if (['xls', 'xlsx'].includes(ext)) return 'Spreadsheet'
  if (['csv'].includes(ext)) return 'CSV'
  if (['doc', 'docx'].includes(ext)) return 'Document'
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'sql', 'md'].includes(ext)) return ext.toUpperCase()
  if (['txt', 'log'].includes(ext)) return 'Text'
  return ext.toUpperCase() || 'File'
}

interface FileListViewProps {
  folders: FileFolder[]
  files: UserFile[]
  selectedItems: Set<string>
  onSelect: (id: string, type: 'file' | 'folder', e: React.MouseEvent) => void
  onOpenFolder: (id: string) => void
  onPreviewFile: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string, type: 'file' | 'folder') => void
  onDragStartFile: (e: React.DragEvent, id: string) => void
  onDragStartFolder: (e: React.DragEvent, id: string) => void
  onDropOnFolder: (e: React.DragEvent, folderId: string) => void
}

export default function FileListView({
  folders,
  files,
  selectedItems,
  onSelect,
  onOpenFolder,
  onPreviewFile,
  onContextMenu,
  onDragStartFile,
  onDragStartFolder,
  onDropOnFolder,
}: FileListViewProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 h-full animate-[fadeIn_0.2s_ease-out]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">This folder is empty</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Create a folder or drop files here to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-[slideInRight_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200/50 dark:border-white/5">
        <span className="flex-1 min-w-0">Name</span>
        <span className="w-20 text-right">Size</span>
        <span className="w-24 text-center">Type</span>
        <span className="w-28 text-right">Modified</span>
      </div>

      {/* Folders */}
      {folders.map(folder => {
        const color = FOLDER_COLORS[folder.color] || FOLDER_COLORS.blue
        const isSelected = selectedItems.has(folder.id)
        return (
          <div
            key={folder.id}
            className={`flex items-center px-5 py-2 cursor-pointer select-none transition-colors ${
              isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-gray-100/80 dark:hover:bg-white/5'
            }`}
            onClick={(e) => onSelect(folder.id, 'folder', e)}
            onDoubleClick={() => onOpenFolder(folder.id)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, folder.id, 'folder') }}
            draggable
            onDragStart={(e) => onDragStartFolder(e, folder.id)}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-[var(--accent)]/5') }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('bg-[var(--accent)]/5') }}
            onDrop={(e) => { e.currentTarget.classList.remove('bg-[var(--accent)]/5'); onDropOnFolder(e, folder.id) }}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill={color} opacity={0.85}>
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{folder.name}</span>
            </div>
            <span className="w-20 text-right text-[10px] text-gray-400">—</span>
            <span className="w-24 text-center text-[10px] text-gray-400">Folder</span>
            <span className="w-28 text-right text-[10px] text-gray-400">{formatDate(folder.updated_at)}</span>
          </div>
        )
      })}

      {/* Files */}
      {files.map(file => {
        const isSelected = selectedItems.has(file.id)
        return (
          <div
            key={file.id}
            className={`flex items-center px-5 py-2 cursor-pointer select-none transition-colors ${
              isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-gray-100/80 dark:hover:bg-white/5'
            }`}
            onClick={(e) => onSelect(file.id, 'file', e)}
            onDoubleClick={() => onPreviewFile(file.id)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file.id, 'file') }}
            draggable
            onDragStart={(e) => onDragStartFile(e, file.id)}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <svg className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-900 dark:text-white truncate">{file.file_name}</span>
              {file.share_id && (
                <svg className="w-3 h-3 shrink-0 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </div>
            <span className="w-20 text-right text-[10px] text-gray-400">{formatSize(file.file_size)}</span>
            <span className="w-24 text-center text-[10px] text-gray-400">{getFileTypeLabel(file.file_type, file.file_name)}</span>
            <span className="w-28 text-right text-[10px] text-gray-400">{formatDate(file.created_at)}</span>
          </div>
        )
      })}
    </div>
  )
}
