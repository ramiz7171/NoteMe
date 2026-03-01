import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useEncryption } from '../../../src/context/EncryptionContext'
import { useNotes } from '../../../src/hooks/useNotes'
import type { NoteType } from '@shared/types'
import * as Haptics from 'expo-haptics'

const NOTE_TYPES: { value: NoteType; label: string; icon: string }[] = [
  { value: 'basic', label: 'Note', icon: 'document-text' },
  { value: 'checkbox', label: 'Checklist', icon: 'checkbox' },
  { value: 'javascript', label: 'JavaScript', icon: 'logo-javascript' },
  { value: 'python', label: 'Python', icon: 'logo-python' },
  { value: 'java', label: 'Java', icon: 'code-slash' },
  { value: 'sql', label: 'SQL', icon: 'server' },
]

export default function NewNoteScreen() {
  const { colors } = useTheme()
  const { encryptString, decryptString, isEncryptionEnabled, isUnlocked } = useEncryption()
  const encrypt = isEncryptionEnabled && isUnlocked ? encryptString : undefined
  const decrypt = isEncryptionEnabled && isUnlocked ? decryptString : undefined
  const { createNote } = useNotes({ encrypt, decrypt })
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('basic')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    setSaving(true)
    const { data, error } = await createNote(title || 'Untitled', '', noteType)
    setSaving(false)
    if (!error && data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace(`/(tabs)/(notes)/${data.id}`)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>New Note</Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.accent} /> : <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>Create</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Title</Text>
        <TextInput
          style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}
          value={title} onChangeText={setTitle} placeholder="Note title" placeholderTextColor={colors.textSecondary} autoFocus
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 }}>Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {NOTE_TYPES.map(t => (
            <TouchableOpacity key={t.value} onPress={() => { setNoteType(t.value); Haptics.selectionAsync() }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                backgroundColor: noteType === t.value ? colors.accent : colors.surfaceSecondary, borderWidth: 1, borderColor: noteType === t.value ? colors.accent : colors.border }}>
              <Ionicons name={t.icon as any} size={16} color={noteType === t.value ? '#fff' : colors.text} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: noteType === t.value ? '#fff' : colors.text }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
