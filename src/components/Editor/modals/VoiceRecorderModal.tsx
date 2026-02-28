import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { transcribeAudio } from '../../../lib/gemini'

interface VoiceRecorderModalProps {
  editor: Editor
  onClose: () => void
}

const MAX_SECONDS = 180

export default function VoiceRecorderModal({ editor, onClose }: VoiceRecorderModalProps) {
  const { recording, audioBlob, audioUrl, uploading, startRecording, stopRecording, uploadAudio, reset } = useVoiceRecorder()
  const [elapsed, setElapsed] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (recording) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [recording])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleInsert = async () => {
    const publicUrl = await uploadAudio()
    if (publicUrl) {
      editor.commands.setAudio({ src: publicUrl })
    }
    onClose()
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return
    setTranscribing(true)
    setError(null)
    try {
      const text = await transcribeAudio(audioBlob)
      editor.chain().focus().insertContent(text).run()
      onClose()
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('429') || msg.includes('uota')) {
        setError('Rate limit — try again later')
      } else {
        setError('Transcription failed')
      }
      setTimeout(() => setError(null), 4000)
    } finally {
      setTranscribing(false)
    }
  }

  const handleClose = () => {
    if (recording) stopRecording()
    reset()
    onClose()
  }

  const remaining = MAX_SECONDS - elapsed
  const isNearLimit = remaining <= 30

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" onClick={handleClose}>
      <div
        className="w-[92vw] max-w-96 glass-panel-solid rounded-xl shadow-2xl p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Voice Recording</h3>

        {/* Recording state */}
        <div className="flex flex-col items-center gap-3 py-4">
          {recording ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className={`text-lg font-mono ${isNearLimit ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{formatTime(elapsed)}</span>
              </div>
              <span className={`text-xs ${isNearLimit ? 'text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                {isNearLimit ? `${formatTime(remaining)} remaining` : `${formatTime(MAX_SECONDS)} max`}
              </span>
              <button
                onClick={stopRecording}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">Click to stop recording</span>
            </>
          ) : audioUrl ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">Preview recording ({formatTime(elapsed)})</span>
              <audio src={audioUrl} controls className="w-full" />
              <button
                onClick={() => { reset(); setElapsed(0); setError(null) }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Re-record
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startRecording}
                className="w-14 h-14 rounded-full bg-black dark:bg-white hover:opacity-90 text-white dark:text-black flex items-center justify-center transition-opacity shadow-lg"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">Click to start recording ({formatTime(MAX_SECONDS)} max)</span>
            </>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 text-center font-medium">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {audioUrl && (
            <>
              <button
                onClick={handleTranscribe}
                disabled={transcribing || uploading}
                className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {transcribing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                    </svg>
                    Transcribe
                  </>
                )}
              </button>
              <button
                onClick={handleInsert}
                disabled={uploading || transcribing}
                className="px-4 py-1.5 text-sm bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {uploading ? 'Uploading...' : 'Insert Audio'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
