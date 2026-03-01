import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useMeetings } from '../../../src/hooks/useMeetings'
import * as Haptics from 'expo-haptics'

export default function NewMeeting() {
  const { colors } = useTheme()
  const { createMeeting } = useMeetings()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [participants, setParticipants] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title) return
    setSaving(true)
    const result = await createMeeting({
      title,
      meeting_date: new Date().toISOString(),
      participants: participants.split(',').map(p => p.trim()).filter(Boolean),
    })
    setSaving(false)
    if (result && 'data' in result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>New Meeting</Text>
          <TouchableOpacity onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.accent} /> : <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>Create</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Title</Text>
          <TextInput style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }} value={title} onChangeText={setTitle} placeholder="Meeting title" placeholderTextColor={colors.textSecondary} autoFocus />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Participants (comma separated)</Text>
          <TextInput style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }} value={participants} onChangeText={setParticipants} placeholder="John, Jane, Bob" placeholderTextColor={colors.textSecondary} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}
