import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useTranscripts } from '../../../src/hooks/useTranscripts'
import { useVoiceRecorder } from '../../../src/hooks/useVoiceRecorder'
import { transcribeWithSpeakersBase64 } from '../../../src/lib/gemini'
import * as Haptics from 'expo-haptics'

export default function RecordScreen() {
  const { colors } = useTheme()
  const { createTranscript } = useTranscripts()
  const { recording, audioUri, duration, startRecording, stopRecording, uploadAudio, getAudioBase64, reset } = useVoiceRecorder()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const handleTranscribe = async () => {
    setProcessing(true)
    try {
      const audioData = await getAudioBase64()
      if (!audioData) throw new Error('No audio')

      const audioUrl = await uploadAudio()
      const result = await transcribeWithSpeakersBase64(audioData.base64, audioData.mimeType)

      await createTranscript({
        title: `Recording ${new Date().toLocaleDateString()}`,
        transcript_text: result.transcript,
        speaker_segments: result.segments,
        audio_url: audioUrl || '',
        status: 'completed',
        duration_seconds: duration,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      reset()
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Transcription failed')
    }
    setProcessing(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => { reset(); router.back() }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Record Audio</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'], marginBottom: 40 }}>{formatTime(duration)}</Text>

        {recording ? (
          <TouchableOpacity onPress={() => { stopRecording(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy) }}
            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
            <Ionicons name="stop" size={32} color="#fff" />
          </TouchableOpacity>
        ) : audioUri ? (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={handleTranscribe} disabled={processing}
              style={{ backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, opacity: processing ? 0.7 : 1 }}>
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Transcribe</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { reset(); Haptics.selectionAsync() }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Re-record</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { startRecording(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy) }}
            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="mic" size={32} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
