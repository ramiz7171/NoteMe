import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { FileFolder, UserFile, FileFolderColor } from '../types'

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

interface UseFilesOptions {
  encryptFile?: (file: File) => Promise<Blob>
  decryptFile?: (blob: Blob, mimeType: string) => Promise<Blob>
  encryptionEnabled?: boolean
}

export function useFiles(opts?: UseFilesOptions) {
  const { user, profile } = useAuth()
  const [fileFolders, setFileFolders] = useState<FileFolder[]>([])
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const fetchFileFolders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('file_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('position')
      .order('name')
    if (data) setFileFolders(data as unknown as FileFolder[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const fetchUserFiles = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', user.id)
      .order('position')
      .order('created_at', { ascending: false })
    if (data) setUserFiles(data as unknown as UserFile[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchFileFolders(), fetchUserFiles()])
      setLoading(false)
    }
    load()
  }, [fetchFileFolders, fetchUserFiles])

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return

    const foldersChannel = supabase
      .channel('file-folders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'file_folders',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setFileFolders(prev => {
            if (prev.some(f => f.id === (payload.new as FileFolder).id)) return prev
            return [...prev, payload.new as FileFolder]
          })
        } else if (payload.eventType === 'UPDATE') {
          setFileFolders(prev => prev.map(f => f.id === (payload.new as FileFolder).id ? payload.new as FileFolder : f))
        } else if (payload.eventType === 'DELETE') {
          setFileFolders(prev => prev.filter(f => f.id !== (payload.old as { id: string }).id))
        }
      })
      .subscribe()

    const filesChannel = supabase
      .channel('user-files-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_files',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUserFiles(prev => {
            if (prev.some(f => f.id === (payload.new as UserFile).id)) return prev
            return [payload.new as UserFile, ...prev]
          })
        } else if (payload.eventType === 'UPDATE') {
          setUserFiles(prev => prev.map(f => f.id === (payload.new as UserFile).id ? payload.new as UserFile : f))
        } else if (payload.eventType === 'DELETE') {
          setUserFiles(prev => prev.filter(f => f.id !== (payload.old as { id: string }).id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(foldersChannel)
      supabase.removeChannel(filesChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Refetch when tab becomes visible again (handles missed realtime events during sleep/background)
  // Silent refetch — no loading spinner, data updates seamlessly in background
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Don't set loading=true — just silently refresh data in the background
        fetchFileFolders()
        fetchUserFiles()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchFileFolders, fetchUserFiles])

  // Folder CRUD
  const createFileFolder = useCallback(async (name: string, parentFolderId: string | null, color: FileFolderColor = 'blue') => {
    if (!user) return
    const { data, error } = await supabase
      .from('file_folders')
      .insert({ user_id: user.id, name, parent_folder_id: parentFolderId, color })
      .select()
      .single()
    if (!error && data) {
      setFileFolders(prev => [...prev, data as unknown as FileFolder])
    }
    return { data, error }
  }, [user])

  const renameFileFolder = useCallback(async (id: string, name: string) => {
    setFileFolders(prev => prev.map(f => f.id === id ? { ...f, name, updated_at: new Date().toISOString() } : f))
    const { error } = await supabase.from('file_folders').update({ name, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) fetchFileFolders()
  }, [fetchFileFolders])

  const updateFileFolderColor = useCallback(async (id: string, color: FileFolderColor) => {
    setFileFolders(prev => prev.map(f => f.id === id ? { ...f, color } : f))
    const { error } = await supabase.from('file_folders').update({ color }).eq('id', id)
    if (error) fetchFileFolders()
  }, [fetchFileFolders])

  const moveFileFolder = useCallback(async (id: string, parentFolderId: string | null) => {
    setFileFolders(prev => prev.map(f => f.id === id ? { ...f, parent_folder_id: parentFolderId } : f))
    const { error } = await supabase.from('file_folders').update({ parent_folder_id: parentFolderId }).eq('id', id)
    if (error) fetchFileFolders()
  }, [fetchFileFolders])

  const deleteFileFolder = useCallback(async (id: string) => {
    setFileFolders(prev => prev.filter(f => f.id !== id))
    // Also remove files in the folder from state (DB cascade handles storage)
    const filesInFolder = userFiles.filter(f => f.folder_id === id)
    setUserFiles(prev => prev.filter(f => f.folder_id !== id))
    // Delete storage objects for files in folder
    for (const file of filesInFolder) {
      await supabase.storage.from('user-files').remove([file.storage_path])
    }
    const { error } = await supabase.from('file_folders').delete().eq('id', id)
    if (error) {
      fetchFileFolders()
      fetchUserFiles()
    }
  }, [userFiles, fetchFileFolders, fetchUserFiles])

  // File CRUD
  const uploadFiles = useCallback(async (files: File[], folderId: string | null): Promise<{ errors: string[] }> => {
    if (!user) return { errors: ['Not authenticated'] }
    const errors: string[] = []
    const isAdmin = profile?.is_admin ?? false

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const uploadId = `upload-${Date.now()}-${i}`

      if (!isAdmin && file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File exceeds 15MB limit. Upgrade to admin for unlimited uploads.`)
        continue
      }

      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }))

      const randomSuffix = Math.random().toString(36).slice(2, 8)
      const storagePath = `${user.id}/${Date.now()}-${randomSuffix}/${file.name}`

      setUploadProgress(prev => ({ ...prev, [uploadId]: 30 }))

      // Encrypt file if encryption is enabled
      let uploadData: File | Blob = file
      if (opts?.encryptionEnabled && opts?.encryptFile) {
        uploadData = await opts.encryptFile(file)
      }

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, uploadData, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        errors.push(`${file.name}: ${uploadError.message}`)
        setUploadProgress(prev => {
          const next = { ...prev }
          delete next[uploadId]
          return next
        })
        continue
      }

      setUploadProgress(prev => ({ ...prev, [uploadId]: 70 }))

      const { error: dbError } = await supabase
        .from('user_files')
        .insert({
          user_id: user.id,
          folder_id: folderId,
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          storage_path: storagePath,
        })

      if (dbError) {
        errors.push(`${file.name}: ${dbError.message}`)
        await supabase.storage.from('user-files').remove([storagePath])
      }

      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }))

      // Clear after a short delay for visual feedback
      setTimeout(() => {
        setUploadProgress(prev => {
          const next = { ...prev }
          delete next[uploadId]
          return next
        })
      }, 1000)
    }

    return { errors }
  }, [user, profile, opts])

  const renameFile = useCallback(async (id: string, fileName: string) => {
    setUserFiles(prev => prev.map(f => f.id === id ? { ...f, file_name: fileName, updated_at: new Date().toISOString() } : f))
    const { error } = await supabase.from('user_files').update({ file_name: fileName, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) fetchUserFiles()
  }, [fetchUserFiles])

  const moveFile = useCallback(async (id: string, folderId: string | null) => {
    setUserFiles(prev => prev.map(f => f.id === id ? { ...f, folder_id: folderId } : f))
    const { error } = await supabase.from('user_files').update({ folder_id: folderId }).eq('id', id)
    if (error) fetchUserFiles()
  }, [fetchUserFiles])

  const bulkMoveFiles = useCallback(async (ids: string[], folderId: string | null) => {
    setUserFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, folder_id: folderId } : f))
    for (const id of ids) {
      await supabase.from('user_files').update({ folder_id: folderId }).eq('id', id)
    }
  }, [])

  const deleteFile = useCallback(async (id: string) => {
    const file = userFiles.find(f => f.id === id)
    setUserFiles(prev => prev.filter(f => f.id !== id))
    if (file) {
      await supabase.storage.from('user-files').remove([file.storage_path])
    }
    const { error } = await supabase.from('user_files').delete().eq('id', id)
    if (error) fetchUserFiles()
  }, [userFiles, fetchUserFiles])

  const bulkDeleteFiles = useCallback(async (ids: string[]) => {
    const filesToDelete = userFiles.filter(f => ids.includes(f.id))
    setUserFiles(prev => prev.filter(f => !ids.includes(f.id)))
    for (const file of filesToDelete) {
      await supabase.storage.from('user-files').remove([file.storage_path])
    }
    for (const id of ids) {
      await supabase.from('user_files').delete().eq('id', id)
    }
  }, [userFiles])

  const getFileUrl = useCallback((storagePath: string) => {
    const { data } = supabase.storage.from('user-files').getPublicUrl(storagePath)
    return data.publicUrl
  }, [])

  const downloadFile = useCallback(async (file: UserFile) => {
    if (opts?.encryptionEnabled && opts?.decryptFile) {
      // Download, decrypt, then offer as download
      const url = getFileUrl(file.storage_path)
      const response = await fetch(url)
      const encryptedBlob = await response.blob()
      const decryptedBlob = await opts.decryptFile(encryptedBlob, file.file_type)
      const blobUrl = URL.createObjectURL(decryptedBlob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } else {
      const url = getFileUrl(file.storage_path)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }, [getFileUrl, opts])

  // Share link operations
  const generateShareLink = useCallback(async (fileId: string, expiresIn: '24h' | '7d' | '30d' | 'never', password?: string) => {
    const shareId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    let shareExpiresAt: string | null = null

    if (expiresIn !== 'never') {
      const now = new Date()
      const ms = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[expiresIn]
      shareExpiresAt = new Date(now.getTime() + ms).toISOString()
    }

    setUserFiles(prev => prev.map(f => f.id === fileId ? { ...f, share_id: shareId, share_expires_at: shareExpiresAt } : f))
    const { error } = await supabase.from('user_files').update({ share_id: shareId, share_expires_at: shareExpiresAt }).eq('id', fileId)
    if (error) {
      fetchUserFiles()
      return null
    }

    // Set password if provided
    if (password) {
      await supabase.rpc('set_share_password', { p_file_id: fileId, p_password: password })
    }

    return `${window.location.origin}/share/${shareId}`
  }, [fetchUserFiles])

  const revokeShareLink = useCallback(async (fileId: string) => {
    setUserFiles(prev => prev.map(f => f.id === fileId ? { ...f, share_id: null, share_expires_at: null } : f))
    const { error } = await supabase.from('user_files').update({ share_id: null, share_expires_at: null }).eq('id', fileId)
    if (error) fetchUserFiles()
    // Also clear password
    await supabase.rpc('set_share_password', { p_file_id: fileId, p_password: '' })
  }, [fetchUserFiles])

  // Computed helpers
  const getFolderContents = useCallback((folderId: string | null) => {
    return {
      folders: fileFolders.filter(f => f.parent_folder_id === folderId),
      files: userFiles.filter(f => f.folder_id === folderId),
    }
  }, [fileFolders, userFiles])

  const getBreadcrumbs = useCallback((folderId: string | null): { id: string | null; name: string }[] => {
    const crumbs: { id: string | null; name: string }[] = []
    let currentId = folderId
    while (currentId) {
      const folder = fileFolders.find(f => f.id === currentId)
      if (!folder) break
      crumbs.unshift({ id: folder.id, name: folder.name })
      currentId = folder.parent_folder_id
    }
    crumbs.unshift({ id: null, name: 'My Files' })
    return crumbs
  }, [fileFolders])

  const isUploading = useMemo(() => Object.keys(uploadProgress).length > 0, [uploadProgress])

  return {
    fileFolders,
    userFiles,
    loading,
    uploadProgress,
    isUploading,
    createFileFolder,
    renameFileFolder,
    updateFileFolderColor,
    moveFileFolder,
    deleteFileFolder,
    uploadFiles,
    renameFile,
    moveFile,
    bulkMoveFiles,
    deleteFile,
    bulkDeleteFiles,
    getFileUrl,
    downloadFile,
    generateShareLink,
    revokeShareLink,
    getFolderContents,
    getBreadcrumbs,
  }
}
