import { useState, useCallback, useMemo, useRef } from 'react'
import { useFiles } from '../hooks/useFiles'
import FileShareHeader from '../components/FileShare/FileShareHeader'
import FileGridView from '../components/FileShare/FileGridView'
import FileListView from '../components/FileShare/FileListView'
import FileContextMenu from '../components/FileShare/FileContextMenu'
import FilePreviewModal from '../components/FileShare/FilePreviewModal'
import ShareLinkModal from '../components/FileShare/ShareLinkModal'
import NewFolderModal from '../components/FileShare/NewFolderModal'
import MoveFileModal from '../components/FileShare/MoveFileModal'
import DropZoneOverlay from '../components/FileShare/DropZoneOverlay'
import type { FileFolderColor } from '../types'

export default function FilesPage() {
  const {
    fileFolders, userFiles, loading, uploadProgress, isUploading,
    createFileFolder, renameFileFolder, updateFileFolderColor, moveFileFolder, deleteFileFolder,
    uploadFiles, renameFile, moveFile, bulkMoveFiles, deleteFile, bulkDeleteFiles,
    getFileUrl, downloadFile, generateShareLink, revokeShareLink,
    getFolderContents, getBreadcrumbs,
  } = useFiles()

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'file' | 'folder'; id: string } | null>(null)
  const [previewFileId, setPreviewFileId] = useState<string | null>(null)
  const [shareFileId, setShareFileId] = useState<string | null>(null)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null)
  const [moveTargets, setMoveTargets] = useState<{ ids: string[]; name: string; type: 'file' | 'folder' } | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null)
  const dragCounter = useRef(0)

  const breadcrumbs = useMemo(() => getBreadcrumbs(currentFolderId), [getBreadcrumbs, currentFolderId])
  const { folders: currentFolders, files: currentFiles } = useMemo(() => getFolderContents(currentFolderId), [getFolderContents, currentFolderId])

  // Search filter
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return currentFolders
    const q = searchQuery.toLowerCase()
    return currentFolders.filter(f => f.name.toLowerCase().includes(q))
  }, [currentFolders, searchQuery])

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return currentFiles
    const q = searchQuery.toLowerCase()
    return currentFiles.filter(f => f.file_name.toLowerCase().includes(q))
  }, [currentFiles, searchQuery])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Selection
  const handleSelect = useCallback((id: string, _type: 'file' | 'folder', e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedItems(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else if (e.shiftKey && lastSelectedId) {
      const allItems = [...filteredFolders.map(f => f.id), ...filteredFiles.map(f => f.id)]
      const start = allItems.indexOf(lastSelectedId)
      const end = allItems.indexOf(id)
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start]
        setSelectedItems(new Set(allItems.slice(from, to + 1)))
      }
    } else {
      setSelectedItems(new Set([id]))
    }
    setLastSelectedId(id)
  }, [lastSelectedId, filteredFolders, filteredFiles])

  // Navigation
  const handleOpenFolder = useCallback((id: string) => {
    setCurrentFolderId(id)
    setSelectedItems(new Set())
    setSearchQuery('')
  }, [])

  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId)
    setSelectedItems(new Set())
    setSearchQuery('')
  }, [])

  // Drag and drop for file uploads
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDraggingOver(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDraggingOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const { errors } = await uploadFiles(files, currentFolderId)
    if (errors.length > 0) {
      showToast(errors[0])
    }
  }

  // Upload via button
  const handleUploadFiles = async (files: File[]) => {
    const { errors } = await uploadFiles(files, currentFolderId)
    if (errors.length > 0) {
      showToast(errors[0])
    }
  }

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, id: string, type: 'file' | 'folder') => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, type, id })
  }, [])

  // Drag files/folders between folders
  const handleDragStartFile = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'file', id }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragStartFolder = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', id }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.type === 'file') {
        await moveFile(data.id, targetFolderId)
      } else if (data.type === 'folder' && data.id !== targetFolderId) {
        await moveFileFolder(data.id, targetFolderId)
      }
    } catch { /* external file drop, ignore */ }
  }

  // Context menu actions
  const contextFile = contextMenu?.type === 'file' ? userFiles.find(f => f.id === contextMenu.id) : null
  const contextFolder = contextMenu?.type === 'folder' ? fileFolders.find(f => f.id === contextMenu.id) : null

  // Preview
  const previewFile = previewFileId ? userFiles.find(f => f.id === previewFileId) : null

  // Share
  const shareFile = shareFileId ? userFiles.find(f => f.id === shareFileId) : null

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && selectedItems.size > 0) {
      const ids = Array.from(selectedItems)
      // Just delete (bulk)
      const fileIds = ids.filter(id => userFiles.some(f => f.id === id))
      const folderIds = ids.filter(id => fileFolders.some(f => f.id === id))
      if (fileIds.length) bulkDeleteFiles(fileIds)
      folderIds.forEach(id => deleteFileFolder(id))
      setSelectedItems(new Set())
    }
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const allIds = [...filteredFolders.map(f => f.id), ...filteredFiles.map(f => f.id)]
      setSelectedItems(new Set(allIds))
    }
  }, [selectedItems, userFiles, fileFolders, filteredFolders, filteredFiles, bulkDeleteFiles, deleteFileFolder])

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={(e) => {
        // Click on empty area clears selection
        if (e.target === e.currentTarget) setSelectedItems(new Set())
      }}
    >
      <FileShareHeader
        breadcrumbs={breadcrumbs}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onToggleView={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
        onNewFolder={() => setShowNewFolderModal(true)}
        onUploadFiles={handleUploadFiles}
        onNavigate={handleNavigate}
      />

      <main className="flex-1 overflow-y-auto" onClick={() => setSelectedItems(new Set())}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : viewMode === 'grid' ? (
          <FileGridView
            folders={filteredFolders}
            files={filteredFiles}
            selectedItems={selectedItems}
            onSelect={handleSelect}
            onOpenFolder={handleOpenFolder}
            onPreviewFile={setPreviewFileId}
            onContextMenu={handleContextMenu}
            onDragStartFile={handleDragStartFile}
            onDragStartFolder={handleDragStartFolder}
            onDropOnFolder={handleDropOnFolder}
            getFileUrl={getFileUrl}
          />
        ) : (
          <FileListView
            folders={filteredFolders}
            files={filteredFiles}
            selectedItems={selectedItems}
            onSelect={handleSelect}
            onOpenFolder={handleOpenFolder}
            onPreviewFile={setPreviewFileId}
            onContextMenu={handleContextMenu}
            onDragStartFile={handleDragStartFile}
            onDragStartFolder={handleDragStartFolder}
            onDropOnFolder={handleDropOnFolder}
          />
        )}
      </main>

      {/* Drop zone overlay */}
      {isDraggingOver && <DropZoneOverlay />}

      {/* Upload progress */}
      {isUploading && (
        <div className="absolute bottom-4 right-4 w-64 glass-panel-solid rounded-xl shadow-xl p-3 animate-[scaleIn_0.15s_ease-out] border border-gray-200/50 dark:border-white/10">
          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Uploading</p>
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <div key={id} className="mb-1.5">
              <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          hasShareId={contextFile?.share_id != null}
          onClose={() => setContextMenu(null)}
          onPreview={contextMenu.type === 'file' ? () => setPreviewFileId(contextMenu.id) : undefined}
          onDownload={contextFile ? () => downloadFile(contextFile) : undefined}
          onRename={() => {
            if (contextMenu.type === 'file' && contextFile) {
              setRenameModal({ id: contextFile.id, name: contextFile.file_name, type: 'file' })
            } else if (contextMenu.type === 'folder' && contextFolder) {
              setRenameModal({ id: contextFolder.id, name: contextFolder.name, type: 'folder' })
            }
          }}
          onMove={() => {
            if (contextMenu.type === 'file' && contextFile) {
              setMoveTargets({ ids: [contextFile.id], name: contextFile.file_name, type: 'file' })
            } else if (contextMenu.type === 'folder' && contextFolder) {
              setMoveTargets({ ids: [contextFolder.id], name: contextFolder.name, type: 'folder' })
            }
          }}
          onShare={contextMenu.type === 'file' ? () => setShareFileId(contextMenu.id) : undefined}
          onDelete={() => {
            if (contextMenu.type === 'file' && contextFile) {
              setConfirmDelete({ id: contextFile.id, name: contextFile.file_name, type: 'file' })
            } else if (contextMenu.type === 'folder' && contextFolder) {
              setConfirmDelete({ id: contextFolder.id, name: contextFolder.name, type: 'folder' })
            }
          }}
          onOpen={contextMenu.type === 'folder' ? () => handleOpenFolder(contextMenu.id) : undefined}
          onChangeColor={contextMenu.type === 'folder' ? (color: FileFolderColor) => updateFileFolderColor(contextMenu.id, color) : undefined}
        />
      )}

      {/* Preview modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          fileUrl={getFileUrl(previewFile.storage_path)}
          onClose={() => setPreviewFileId(null)}
          onDownload={() => downloadFile(previewFile)}
        />
      )}

      {/* Share modal */}
      {shareFile && (
        <ShareLinkModal
          file={shareFile}
          onClose={() => setShareFileId(null)}
          onGenerate={generateShareLink}
          onRevoke={revokeShareLink}
        />
      )}

      {/* New folder modal */}
      {showNewFolderModal && (
        <NewFolderModal
          onClose={() => setShowNewFolderModal(false)}
          onSubmit={(name, color) => createFileFolder(name, currentFolderId, color)}
        />
      )}

      {/* Rename modal */}
      {renameModal && (
        <NewFolderModal
          onClose={() => setRenameModal(null)}
          onSubmit={(name) => {
            if (renameModal.type === 'file') renameFile(renameModal.id, name)
            else renameFileFolder(renameModal.id, name)
          }}
          initialName={renameModal.name}
          isRename
        />
      )}

      {/* Move modal */}
      {moveTargets && (
        <MoveFileModal
          onClose={() => setMoveTargets(null)}
          onMove={(folderId) => {
            if (moveTargets.type === 'file') {
              if (moveTargets.ids.length === 1) moveFile(moveTargets.ids[0], folderId)
              else bulkMoveFiles(moveTargets.ids, folderId)
            } else {
              moveTargets.ids.forEach(id => moveFileFolder(id, folderId))
            }
          }}
          allFolders={fileFolders}
          currentFolderId={currentFolderId}
          itemName={moveTargets.name}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
        >
          <div className="w-80 glass-panel-solid rounded-xl shadow-2xl p-5 animate-[scaleIn_0.15s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Delete {confirmDelete.type}?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{confirmDelete.name}"?{' '}
              {confirmDelete.type === 'folder' && 'All files inside will also be deleted.'}
              {' '}This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'file') deleteFile(confirmDelete.id)
                  else deleteFileFolder(confirmDelete.id)
                  setConfirmDelete(null)
                  setSelectedItems(prev => { const n = new Set(prev); n.delete(confirmDelete.id); return n })
                }}
                className="px-4 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-lg shadow-xl animate-[scaleIn_0.15s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}
