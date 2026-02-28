import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { UserFile } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function getPreviewType(fileType: string, fileName: string): 'image' | 'pdf' | 'video' | 'audio' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (fileType.startsWith('image/')) return 'image'
  if (fileType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (fileType.startsWith('video/')) return 'video'
  if (fileType.startsWith('audio/')) return 'audio'
  return 'other'
}

export default function SharedFilePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const [file, setFile] = useState<UserFile | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'found' | 'expired' | 'not_found'>('loading')

  useEffect(() => {
    if (!shareId) { setStatus('not_found'); return }

    const load = async () => {
      const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('share_id', shareId)
        .single()

      if (error || !data) {
        setStatus('not_found')
        return
      }

      const f = data as unknown as UserFile
      if (f.share_expires_at && new Date(f.share_expires_at).getTime() < Date.now()) {
        setStatus('expired')
        return
      }

      setFile(f)
      const { data: urlData } = supabase.storage.from('user-files').getPublicUrl(f.storage_path)
      setFileUrl(urlData.publicUrl)
      setStatus('found')
    }

    load()
  }, [shareId])

  const handleDownload = () => {
    if (!file || !fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = file.file_name
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">File Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">This shared link doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Link Expired</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">This shared link has expired and is no longer accessible.</p>
        </div>
      </div>
    )
  }

  if (!file || !fileUrl) return null

  const previewType = getPreviewType(file.file_type, file.file_name)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 border-b border-gray-200/50 dark:border-white/5 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900 dark:text-white">CriptNote</span>
            <span className="text-xs text-gray-400">Shared File</span>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </header>

      {/* File info */}
      <div className="shrink-0 px-6 py-3 bg-white/50 dark:bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{file.file_name}</h1>
          <p className="text-[10px] text-gray-400 mt-0.5">{formatSize(file.file_size)} &bull; {new Date(file.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Preview */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl max-h-[70vh]">
          {previewType === 'image' && (
            <div className="flex items-center justify-center bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 max-h-[70vh] overflow-auto">
              <img src={fileUrl} alt={file.file_name} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            </div>
          )}
          {previewType === 'pdf' && (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              className="w-full h-[70vh] rounded-xl shadow-lg border border-gray-200/50 dark:border-white/10"
              title="PDF preview"
            />
          )}
          {previewType === 'video' && (
            <div className="bg-black rounded-xl shadow-lg overflow-hidden">
              <video src={fileUrl} controls className="w-full max-h-[70vh]">
                Your browser does not support video playback.
              </video>
            </div>
          )}
          {previewType === 'audio' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <audio src={fileUrl} controls className="w-full max-w-md" />
            </div>
          )}
          {previewType === 'other' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Preview not available</p>
              <button
                onClick={handleDownload}
                className="px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
