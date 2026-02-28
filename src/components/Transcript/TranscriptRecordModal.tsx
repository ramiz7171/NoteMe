import { useState, useEffect, useRef } from 'react'
import { useTranscriptVoiceRecorder } from '../../hooks/useTranscriptVoiceRecorder'
import { transcribeWithSpeakers } from '../../lib/gemini'
import type { Transcript } from '../../types'

interface TranscriptRecordModalProps {
  onClose: () => void
  onCreate: (data: Partial<Transcript>) => Promise<any>
}

type RecordStep = 'idle' | 'recording' | 'preview' | 'processing' | 'error'

export default function TranscriptRecordModal({ onClose, onCreate }: TranscriptRecordModalProps) {
  const {
    recording,
    audioBlob,
    audioUrl,
    uploading,
    startRecording,
    stopRecording,
    uploadAudio,
    reset,
    maxDuration,
  } = useTranscriptVoiceRecorder()

  const [step, setStep] = useState<RecordStep>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [title, setTitle] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (recording) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [recording])

  // Sync step with recorder state
  useEffect(() => {
    if (recording) setStep('recording')
    else if (audioUrl) setStep('preview')
  }, [recording, audioUrl])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    try {
      await startRecording()
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone access and try again.')
      setStep('error')
    }
  }

  const handleStop = () => {
    stopRecording()
  }

  const handleReRecord = () => {
    reset()
    setElapsed(0)
    setStep('idle')
  }

  const handleSave = async () => {
    if (!audioBlob) return
    setStep('processing')
    setErrorMsg('')

    try {
      // Upload audio file
      const url = await uploadAudio()

      // Transcribe with speaker identification
      const result = await transcribeWithSpeakers(audioBlob)

      await onCreate({
        title: title.trim() || 'Untitled Recording',
        transcript_text: result.transcript,
        speaker_segments: result.segments,
        audio_url: url || '',
        status: 'completed',
        duration_seconds: elapsed,
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

  const handleClose = () => {
    if (recording) stopRecording()
    reset()
    onClose()
  }

  const handleRetry = () => {
    setErrorMsg('')
    if (audioUrl) {
      setStep('preview')
    } else {
      setStep('idle')
    }
  }

  const remaining = maxDuration - elapsed
  const isNearLimit = remaining <= 60

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={handleClose}
    >
      <div
        className="w-[92vw] max-w-[440px] glass-panel-solid rounded-2xl shadow-2xl p-5 space-y-4 animate-[scaleIn_0.15s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Record Audio</h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Idle: show start button */}
        {step === 'idle' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <button
              onClick={handleStart}
              className="w-16 h-16 rounded-full bg-black dark:bg-white hover:opacity-90 text-white dark:text-black flex items-center justify-center transition-opacity shadow-lg"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Click to start recording ({formatTime(maxDuration)} max)
            </span>
          </div>
        )}

        {/* Recording */}
        {step === 'recording' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className={`text-2xl font-mono ${isNearLimit ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                {formatTime(elapsed)}
              </span>
            </div>
            <span className={`text-xs ${isNearLimit ? 'text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
              {isNearLimit ? `${formatTime(remaining)} remaining` : 'Recording...'}
            </span>
            <button
              onClick={handleStop}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Click to stop recording</span>
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <>
            <div className="flex flex-col items-center gap-3 py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Recording ({formatTime(elapsed)})
              </span>
              {audioUrl && <audio src={audioUrl} controls className="w-full" />}
              <button
                onClick={handleReRecord}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Re-record
              </button>
            </div>

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

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="px-4 py-1.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Save & Transcribe'}
              </button>
            </div>
          </>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-10 h-10 border-3 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Processing recording...</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Uploading audio and transcribing with speaker identification.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">{errorMsg}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
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
