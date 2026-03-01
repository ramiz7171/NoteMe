import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useSettings } from '../../src/hooks/useSettings'
import * as Haptics from 'expo-haptics'

const TONES = ['professional', 'casual', 'concise', 'detailed']
const LENGTHS = ['short', 'medium', 'long']

export default function AIPreferencesScreen() {
  const { colors } = useTheme()
  const { settings, updateSettings } = useSettings()
  const router = useRouter()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>AI Preferences</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>AI Tone</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {TONES.map(t => (
            <TouchableOpacity key={t} onPress={() => { updateSettings({ ai_tone: t as any }); Haptics.selectionAsync() }}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: settings?.ai_tone === t ? colors.accent : colors.surfaceSecondary, borderWidth: 1, borderColor: settings?.ai_tone === t ? colors.accent : colors.border }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: settings?.ai_tone === t ? '#fff' : colors.text, textTransform: 'capitalize' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>Summary Length</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {LENGTHS.map(l => (
            <TouchableOpacity key={l} onPress={() => { updateSettings({ summary_length: l as any }); Haptics.selectionAsync() }}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: settings?.summary_length === l ? colors.accent : colors.surfaceSecondary, borderWidth: 1, borderColor: settings?.summary_length === l ? colors.accent : colors.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: settings?.summary_length === l ? '#fff' : colors.text, textTransform: 'capitalize' }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
