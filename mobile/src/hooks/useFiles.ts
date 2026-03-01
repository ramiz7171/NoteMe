import { useEffect, useState, useCallback, useMemo } from 'react'
import { AppState } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { FileFolder, UserFile, FileFolderColor } from '@shared/types'
import { MAX_FILE_SIZE } from '@shared/lib/constants'

export function useFiles() {
  const { user, profile } = useAuth()
  const [fileFolders, setFileFolders] = useState<FileFolder[]>([])
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const fetchFileFolders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('file_folders').select('*').eq('user_id', user.id).order('position').order('name')
    if (data) setFileFolders(data as unknown as FileFolder[])
  }, [user?.id])

  const fetchUserFiles = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('user_files').select('*').eq('user_id', user.id).order('position').order('created_at', { ascending: false })
    if (data) setUserFiles(data as unknown as UserFile[])
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
    const fCh = supabase.channel('file-folders-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'file_folders', filter: `user_id=eq.${user.id}` },
      (p) => {
        if (p.eventType === 'INSERT') setFileFolders(prev => prev.some(f => f.id === (p.new as any).id) ? prev : [...prev, p.new as FileFolder])
        else if (p.eventType === 'UPDATE') setFileFolders(prev => prev.map(f => f.id === (p.new as any).id ? p.new as FileFolder : f))
        else if (p.eventType === 'DELETE') setFileFolders(prev => prev.filter(f => f.id !== (p.old as any).id))
      }).subscribe()

    const uCh = supabase.channel('user-files-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'user_files', filter: `user_id=eq.${user.id}` },
      (p) => {
        if (p.eventType === 'INSERT') setUserFiles(prev => prev.some(f => f.id === (p.new as any).id) ? prev : [p.new as UserFile, ...prev])
        else if (p.eventType === 'UPDATE') setUserFiles(prev => prev.map(f => f.id === (p.new as any).id ? p.new as UserFile : f))
        else if (p.eventType === 'DELETE') setUserFiles(prev => prev.filter(f => f.id !== (p.old as any).id))
      }).subscribe()

    return () => { supabase.removeChannel(fCh); supabase.removeChannel(uCh) }
  }, [user?.id])

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') { fetchFileFolders(); fetchUserFiles() } })
    return () => sub.remove()
  }, [fetchFileFolders, fetchUserFiles])

  const createFileFolder = useCallback(async (name: string, parentFolderId: string | null, color: FileFolderColor = 'blue') => {
    if (!user) return
    const { data, error } = await supabase.from('file_folders').insert({ user_id: user.id, name, parent_folder_id: parentFolderId, color }).select().single()
    if (!error && data) setFileFolders(prev => [...prev, data as unknown as FileFolder])
    return { data, error }
  }, [user])

  const renameFileFolder = useCallback(async (id: string, name: string) => {
    setFileFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
    const { error } = await supabase.from('file_folders').update({ name }).eq('id', id)
    if (error) fetchFileFolders()
  }, [fetchFileFolders])

  const updateFileFolderColor = useCallback(async (id: string, color: FileFolderColor) => {
    setFileFolders(prev => prev.map(f => f.id === id ? { ...f, color } : f))
    const { error } = await supabase.from('file_folders').update({ color }).eq('id', id)
    if (error) fetchFileFolders()
  }, [fetchFileFolders])

  const deleteFileFolder = useCallback(async (id: string) => {
    const filesInFolder = userFiles.filter(f => f.folder_id === id)
    setFileFolders(prev => prev.filter(f => f.id !== id))
    setUserFiles(prev => prev.filter(f => f.folder_id !== id))
    for (const file of filesInFolder) {
      await supabase.storage.from('user-files').remove([file.storage_path])
    }
    await supabase.from('file_folders').delete().eq('id', id)
  }, [userFiles])

  const pickAndUploadFiles = useCallback(async (folderId: string | null): Promise<{ errors: string[] }> => {
    if (!user) return { errors: ['Not authenticated'] }
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true })
    if (result.canceled) return { errors: [] }
    const errors: string[] = []
    const isAdmin = profile?.is_admin ?? false

    for (let i = 0; i < result.assets.length; i++) {
      const asset = result.assets[i]
      const uploadId = `upload-${Date.now()}-${i}`

      if (!isAdmin && (asset.size ?? 0) > MAX_FILE_SIZE) {
        errors.push(`${asset.name}: File exceeds 15MB limit`)
        continue
      }

      setUploadProgress(prev => ({ ...prev, [uploadId]: 10 }))

      const randomSuffix = Math.random().toString(36).slice(2, 8)
      const storagePath = `${user.id}/${Date.now()}-${randomSuffix}/${asset.name}`
      const fileUri = asset.uri

      setUploadProgress(prev => ({ ...prev, [uploadId]: 30 }))

      // Read file as base64 for upload
      const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 })
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, byteArray, { contentType: asset.mimeType || 'application/octet-stream', cacheControl: '3600', upsert: false })

      if (uploadError) {
        errors.push(`${asset.name}: ${uploadError.message}`)
        setUploadProgress(prev => { const next = { ...prev }; delete next[uploadId]; return next })
        continue
      }

      setUploadProgress(prev => ({ ...prev, [uploadId]: 70 }))

      await supabase.from('user_files').insert({
        user_id: user.id, folder_id: folderId, file_name: asset.name,
        file_type: asset.mimeType || 'application/octet-stream', file_size: asset.size || 0, storage_path: storagePath,
      })

      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }))
      setTimeout(() => { setUploadProgress(prev => { const next = { ...prev }; delete next[uploadId]; return next }) }, 1000)
    }

    return { errors }
  }, [user, profile])

  const deleteFile = useCallback(async (id: string) => {
    const file = userFiles.find(f => f.id === id)
    setUserFiles(prev => prev.filter(f => f.id !== id))
    if (file) await supabase.storage.from('user-files').remove([file.storage_path])
    await supabase.from('user_files').delete().eq('id', id)
  }, [userFiles])

  const getFileUrl = useCallback((storagePath: string) => {
    const { data } = supabase.storage.from('user-files').getPublicUrl(storagePath)
    return data.publicUrl
  }, [])

  const downloadAndShareFile = useCallback(async (file: UserFile) => {
    const url = getFileUrl(file.storage_path)
    const localUri = FileSystem.cacheDirectory + file.file_name
    await FileSystem.downloadAsync(url, localUri)
    await Sharing.shareAsync(localUri)
  }, [getFileUrl])

  const generateShareLink = useCallback(async (fileId: string, expiresIn: '24h' | '7d' | '30d' | 'never', password?: string) => {
    const shareId = Math.random().toString(36).slice(2, 18)
    let shareExpiresAt: string | null = null
    if (expiresIn !== 'never') {
      const ms = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[expiresIn]
      shareExpiresAt = new Date(Date.now() + ms).toISOString()
    }
    setUserFiles(prev => prev.map(f => f.id === fileId ? { ...f, share_id: shareId, share_expires_at: shareExpiresAt } : f))
    const { error } = await supabase.from('user_files').update({ share_id: shareId, share_expires_at: shareExpiresAt }).eq('id', fileId)
    if (error) return null
    if (password) await supabase.rpc('set_share_password', { p_file_id: fileId, p_password: password })
    return shareId
  }, [])

  const revokeShareLink = useCallback(async (fileId: string) => {
    setUserFiles(prev => prev.map(f => f.id === fileId ? { ...f, share_id: null, share_expires_at: null } : f))
    await supabase.from('user_files').update({ share_id: null, share_expires_at: null }).eq('id', fileId)
    await supabase.rpc('set_share_password', { p_file_id: fileId, p_password: '' })
  }, [])

  const getFolderContents = useCallback((folderId: string | null) => ({
    folders: fileFolders.filter(f => f.parent_folder_id === folderId),
    files: userFiles.filter(f => f.folder_id === folderId),
  }), [fileFolders, userFiles])

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
    fileFolders, userFiles, loading, uploadProgress, isUploading,
    createFileFolder, renameFileFolder, updateFileFolderColor, deleteFileFolder,
    pickAndUploadFiles, deleteFile, getFileUrl, downloadAndShareFile,
    generateShareLink, revokeShareLink, getFolderContents, getBreadcrumbs,
  }
}
