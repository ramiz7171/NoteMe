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

function getFileIcon(fileType: string, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (fileType.startsWith('image/')) return { icon: '🖼️', bg: '#dbeafe' }
  if (fileType === 'application/pdf' || ext === 'pdf') return { icon: '📄', bg: '#fee2e2' }
  if (fileType.startsWith('video/')) return { icon: '🎬', bg: '#ede9fe' }
  if (fileType.startsWith('audio/')) return { icon: '🎵', bg: '#fef3c7' }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: '📦', bg: '#f3e8ff' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: '📊', bg: '#d1fae5' }
  if (['doc', 'docx'].includes(ext)) return { icon: '📝', bg: '#dbeafe' }
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'sql', 'md'].includes(ext)) return { icon: '💻', bg: '#e0e7ff' }
  if (['txt', 'log'].includes(ext)) return { icon: '📝', bg: '#f3f4f6' }
  return { icon: '📎', bg: '#f3f4f6' }
}

interface FileGridViewProps {
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
  getFileUrl: (storagePath: string) => string
}

export default function FileGridView({
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
  getFileUrl,
}: FileGridViewProps) {
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-5 animate-[slideInRight_0.2s_ease-out]">
      {/* Folders first */}
      {folders.map(folder => {
        const color = FOLDER_COLORS[folder.color] || FOLDER_COLORS.blue
        const isSelected = selectedItems.has(folder.id)
        return (
          <div
            key={folder.id}
            className={`glass-card rounded-xl p-3 cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] ${
              isSelected ? 'ring-2 ring-[var(--accent)] shadow-lg' : ''
            }`}
            onClick={(e) => onSelect(folder.id, 'folder', e)}
            onDoubleClick={() => onOpenFolder(folder.id)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, folder.id, 'folder') }}
            draggable
            onDragStart={(e) => onDragStartFolder(e, folder.id)}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-[var(--accent)]/50', 'scale-[1.03]') }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-[var(--accent)]/50', 'scale-[1.03]') }}
            onDrop={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-[var(--accent)]/50', 'scale-[1.03]'); onDropOnFolder(e, folder.id) }}
          >
            <div className="flex flex-col items-center gap-2 py-2">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color} opacity={0.85}>
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full">{folder.name}</span>
            </div>
          </div>
        )
      })}

      {/* Files */}
      {files.map(file => {
        const isSelected = selectedItems.has(file.id)
        const { icon, bg } = getFileIcon(file.file_type, file.file_name)
        const isImage = file.file_type.startsWith('image/')
        return (
          <div
            key={file.id}
            className={`glass-card rounded-xl p-3 cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] ${
              isSelected ? 'ring-2 ring-[var(--accent)] shadow-lg' : ''
            }`}
            onClick={(e) => onSelect(file.id, 'file', e)}
            onDoubleClick={() => onPreviewFile(file.id)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file.id, 'file') }}
            draggable
            onDragStart={(e) => onDragStartFile(e, file.id)}
          >
            <div className="flex flex-col items-center gap-2 py-1">
              {isImage ? (
                <div className="w-full h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <img
                    src={getFileUrl(file.storage_path)}
                    alt={file.file_name}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: bg }}>
                  <span className="dark:drop-shadow-sm">{icon}</span>
                </div>
              )}
              <div className="w-full text-center">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{file.file_name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatSize(file.file_size)}</p>
              </div>
              {file.share_id && (
                <div className="absolute top-2 right-2">
                  <div className="w-4 h-4 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
