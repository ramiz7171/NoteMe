import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MAX_DURATION = 3600 * 1000 // 60 minutes in ms

export function useVoiceRecorder() {
  const { user } = useAuth()
  const [recording, setRecording] = useState(false)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    await Audio.requestPermissionsAsync()
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )
    recordingRef.current = recording
    setRecording(true)
    setAudioUri(null)
    setDuration(0)

    timerRef.current = setInterval(() => {
      setDuration(prev => {
        if (prev >= 3600) {
          stopRecording()
          return prev
        }
        return prev + 1
      })
    }, 1000)
  }, [])

  const stopRecording = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (!recordingRef.current) return

    await recordingRef.current.stopAndUnloadAsync()
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
    const uri = recordingRef.current.getURI()
    recordingRef.current = null
    setRecording(false)
    if (uri) setAudioUri(uri)
  }, [])

  const uploadAudio = useCallback(async (): Promise<string | null> => {
    if (!audioUri || !user) return null
    setUploading(true)

    const ext = 'm4a'
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const base64 = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 })
    const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

    const { error } = await supabase.storage.from('note-audio').upload(fileName, byteArray, {
      cacheControl: '3600', contentType: 'audio/m4a',
    })
    setUploading(false)
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('note-audio').getPublicUrl(fileName)
    return publicUrl
  }, [audioUri, user])

  const getAudioBase64 = useCallback(async (): Promise<{ base64: string; mimeType: string } | null> => {
    if (!audioUri) return null
    const base64 = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 })
    return { base64, mimeType: 'audio/m4a' }
  }, [audioUri])

  const reset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setAudioUri(null)
    setRecording(false)
    setDuration(0)
  }, [])

  return { recording, audioUri, uploading, duration, startRecording, stopRecording, uploadAudio, getAudioBase64, reset, maxDuration: 3600 }
}
