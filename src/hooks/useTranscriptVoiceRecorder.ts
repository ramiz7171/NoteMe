import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MAX_DURATION = 3600 // 60 minutes

export function useTranscriptVoiceRecorder() {
  const { user } = useAuth()
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getMimeType = () => {
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
      if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg'
    }
    return 'audio/webm'
  }

  const stopRecording = useCallback(() => {
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null }
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }, [])

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = getMimeType()
    const recorder = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
      stream.getTracks().forEach(t => t.stop())
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setRecording(true)
    setAudioBlob(null)
    setAudioUrl(null)

    autoStopRef.current = setTimeout(() => {
      recorder.stop()
      setRecording(false)
    }, MAX_DURATION * 1000)
  }, [])

  const uploadAudio = useCallback(async (): Promise<string | null> => {
    if (!audioBlob || !user) return null
    setUploading(true)
    const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp4') ? 'mp4' : 'ogg'
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('note-audio').upload(fileName, audioBlob, {
      cacheControl: '3600', contentType: audioBlob.type,
    })
    setUploading(false)
    if (error) { console.error('Audio upload error:', error); return null }
    const { data: { publicUrl } } = supabase.storage.from('note-audio').getPublicUrl(fileName)
    return publicUrl
  }, [audioBlob, user])

  const reset = useCallback(() => {
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null }
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setRecording(false)
  }, [audioUrl])

  return { recording, audioBlob, audioUrl, uploading, startRecording, stopRecording, uploadAudio, reset, maxDuration: MAX_DURATION }
}
