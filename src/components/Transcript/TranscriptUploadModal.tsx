import { useState, useRef } from 'react'
import { transcribeWithSpeakers } from '../../lib/gemini'
import type { Transcript } from '../../types'

interface TranscriptUploadModalProps {
  onClose: () => void
  onCreate: (data: Partial<Transcript>) => Promise<any>
}

type UploadStep = 'select' | 'processing' | 'error'

export default function TranscriptUploadModal({ onClose, onCreate }: TranscriptUploadModalProps) {
  const [step, setStep] = useState<UploadStep>('select')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    // Auto-fill title from filename (remove extension)
    const name = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    if (!title.trim()) setTitle(name)
  }

  const handleUpload = async () => {
    if (!file) return
    setStep('processing')
    setErrorMsg('')

    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type })
      const result = await transcribeWithSpeakers(blob)

      await onCreate({
        title: title.trim() || 'Untitled Transcript',
        transcript_text: result.transcript,
        speaker_segments: result.segments,
        status: 'completed',
        duration_seconds: 0,
      })

      onClose()
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('429') || msg.includes('uota')) {
        setErrorMsg('Rate limit reached. Please try again later.')
      } else {
        setErrorMsg('Transcription failed. Please try again.')
      }
      setStep('error')
    }
  }

  const handleRetry = () => {
    setStep('select')
    setErrorMsg('')
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-[440px] glass-panel-solid rounded-2xl shadow-2xl p-5 space-y-4 animate-[scaleIn_0.15s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upload Audio</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'select' && (
          <>
            {/* Title input */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Transcript title..."
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* File picker */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Audio / Video File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                {file ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[260px]">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="text-xs">Click to select audio or video file</span>
                  </div>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file}
                className="px-4 py-1.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Upload & Transcribe
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-10 h-10 border-3 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Processing audio...</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Transcribing with speaker identification. This may take a moment.
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                className="px-4 py-1.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
